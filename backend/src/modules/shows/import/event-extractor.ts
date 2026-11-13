import type { ShowStatus } from '../../../generated/prisma/client.js';
import { formatShowDate, parseShowDate, todayInBrazil } from '../show-date.js';
import { toStateCode } from '../states.js';

/** O que se consegue ler de uma página de evento. Tudo é sugestão: quem revisa é a pessoa no admin. */
export interface EventDraft {
  name: string | null;
  /** "AAAA-MM-DD". */
  date: string | null;
  /** "HH:MM", ou `null` se a página não informa (ou informa só meia-noite). */
  startTime: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  ticketUrl: string | null;
  status: ShowStatus;
  performers: string[];
  /** A página publica os dados do evento em formato estruturado (schema.org). */
  structured: boolean;
  warnings: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asList = (value: unknown): unknown[] =>
  Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Texto de página: entidades HTML viram caracteres e espaços repetidos viram um só. */
export function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const decoded = value
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) =>
      safeChar(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_m, dec: string) => safeChar(Number(dec)))
    .replace(
      /&([a-z]+);/gi,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    )
    .replace(/\s+/g, ' ')
    .trim();
  return decoded === '' ? null : decoded;
}

function safeChar(code: number): string {
  return Number.isInteger(code) && code > 0 && code < 0x110000
    ? String.fromCodePoint(code)
    : '';
}

function jsonLdNodes(html: string): Json[] {
  const nodes: Json[] = [];
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse((script[1] ?? '').trim());
    } catch {
      continue;
    }
    for (const item of asList(parsed)) {
      if (!isObject(item)) {
        continue;
      }
      nodes.push(item);
      for (const inner of asList(item['@graph'])) {
        if (isObject(inner)) {
          nodes.push(inner);
        }
      }
    }
  }
  return nodes;
}

const isEvent = (node: Json) =>
  asList(node['@type']).some(
    (type) =>
      typeof type === 'string' &&
      (type.endsWith('Event') || type === 'Festival'),
  );

/** "2027-01-09T22:00:00-03:00" → dia e hora do local do show, como escritos. "…Z" vira horário de Brasília. */
function readStart(value: unknown): {
  date: string | null;
  time: string | null;
} {
  if (typeof value !== 'string') {
    return { date: null, time: null };
  }
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(
      value.trim(),
    );
  if (!match) {
    return { date: null, time: null };
  }
  let date = match[1] as string;
  let time = match[2] ? `${match[2]}:${match[3]}` : null;

  if (match[4]?.toUpperCase() === 'Z' && time) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(`${date}T${time}:00Z`));
    const part = (type: string) =>
      parts.find((entry) => entry.type === type)?.value ?? '';
    date = `${part('year')}-${part('month')}-${part('day')}`;
    time = `${part('hour')}:${part('minute')}`;
  }

  if (!parseShowDate(date)) {
    return { date: null, time: null };
  }
  // Muitos sites usam 00:00 para "sem horário".
  return { date, time: time === '00:00' ? null : time };
}

function httpUrl(value: unknown): string | null {
  const text = cleanText(value);
  return text && /^https?:\/\/[^\s]+$/i.test(text) ? text : null;
}

function names(value: unknown): string[] {
  return asList(value)
    .map((entry) =>
      isObject(entry) ? cleanText(entry['name']) : cleanText(entry),
    )
    .filter((entry): entry is string => entry !== null);
}

function statusOf(node: Json, warnings: string[]): ShowStatus {
  const eventStatus = stringOf(node['eventStatus']);
  if (eventStatus.endsWith('EventCancelled')) {
    return 'CANCELLED';
  }
  if (/EventPostponed$|EventRescheduled$/.test(eventStatus)) {
    warnings.push(
      'O site marca este evento como adiado ou reagendado: confira a data na página antes de salvar.',
    );
  }
  const offers = asList(node['offers']).filter(isObject);
  const soldOut =
    offers.length > 0 &&
    offers.every((offer) =>
      stringOf(offer['availability']).endsWith('SoldOut'),
    );
  return soldOut ? 'SOLD_OUT' : 'CONFIRMED';
}

function placeOf(node: Json, warnings: string[]) {
  const place = asList(node['location']).find(isObject);
  if (!place) {
    return { venue: null, city: null, state: null };
  }
  const address = isObject(place['address']) ? place['address'] : null;

  const country = address?.['addressCountry'];
  const countryName = cleanText(isObject(country) ? country['name'] : country);
  if (countryName && !/^(br|brasil|brazil)$/i.test(countryName)) {
    warnings.push(`O endereço do evento indica outro país (${countryName}).`);
  }

  const region = cleanText(address?.['addressRegion']);
  const state = region ? toStateCode(region) : null;
  if (region && !state) {
    warnings.push(
      `Não reconheci o estado "${region}": escolha o estado à mão.`,
    );
  }
  return {
    venue: cleanText(place['name']),
    city: cleanText(address?.['addressLocality']),
    state,
  };
}

function metaContent(html: string, property: string): string | null {
  const tag = new RegExp(
    `<meta[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`,
    'i',
  ).exec(html)?.[0];
  return tag
    ? cleanText(
        /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i
          .exec(tag)
          ?.slice(1)
          .find(Boolean),
      )
    : null;
}

/**
 * Lê os dados do evento que a própria página publica para os buscadores (JSON-LD, schema.org).
 * Sem esses dados, devolve só o título e avisa que o resto precisa ser preenchido à mão.
 */
export function extractEventDraft(
  html: string,
  pageUrl: string,
  now: Date = new Date(),
): EventDraft {
  const warnings: string[] = [];
  const events = jsonLdNodes(html).filter(isEvent);

  const event = events[0];
  if (!event) {
    const title =
      metaContent(html, 'og:title') ??
      cleanText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]);
    warnings.push(
      'Esta página não publica os dados do evento em formato legível: preencha data, local e bandas à mão.',
    );
    return {
      name: title,
      date: null,
      startTime: null,
      venue: null,
      city: null,
      state: null,
      ticketUrl: httpUrl(pageUrl),
      status: 'CONFIRMED',
      performers: [],
      structured: false,
      warnings,
    };
  }

  if (events.length > 1) {
    warnings.push(
      `A página lista ${events.length} eventos; usei o primeiro. Confira se é o certo.`,
    );
  }

  const { date, time } = readStart(event['startDate']);
  if (!date) {
    warnings.push('Não consegui ler a data do evento: digite-a à mão.');
  } else if (date < formatShowDate(todayInBrazil(now))) {
    warnings.push(
      'A data lida já passou. Confira se a página é de um evento antigo.',
    );
  }

  const place = placeOf(event, warnings);
  const performers = names(event['performer']);
  if (performers.length === 0) {
    warnings.push('A página não informa as bandas: adicione-as à mão.');
  }
  const offers = asList(event['offers']).find(isObject);

  return {
    name: cleanText(event['name'])?.slice(0, 120) ?? null,
    date,
    startTime: time,
    ...place,
    ticketUrl:
      httpUrl(event['url']) ?? httpUrl(offers?.['url']) ?? httpUrl(pageUrl),
    status: statusOf(event, warnings),
    performers,
    structured: true,
    warnings,
  };
}
