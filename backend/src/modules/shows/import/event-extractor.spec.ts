import { describe, expect, it } from 'vitest';
import { cleanText, extractEventDraft } from './event-extractor.js';

const NOW = new Date('2026-11-13T12:00:00Z');
const PAGE = 'https://www.exemplo-ingressos.test/evento/33641/titas';

const page = (...blocks: unknown[]) =>
  `<html><head><title>Página</title>${blocks
    .map(
      (block) =>
        `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
    )
    .join('')}</head><body></body></html>`;

const musicEvent = {
  '@context': 'https://schema.org',
  '@type': 'MusicEvent',
  name: 'Titãs Cabeça Dinossauro 40 Anos',
  url: 'https://www.exemplo-ingressos.test/evento/33641/titas',
  startDate: '2027-01-09T22:00:00-03:00',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: 'Stone House',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Leopoldina',
      addressRegion: 'MG',
      addressCountry: 'BR',
    },
  },
  performer: [{ '@type': 'MusicGroup', name: 'Titãs' }],
  offers: {
    '@type': 'AggregateOffer',
    availability: 'https://schema.org/InStock',
  },
};

describe('extractEventDraft', () => {
  it('lê um evento musical completo', () => {
    const draft = extractEventDraft(page(musicEvent), PAGE, NOW);

    expect(draft).toMatchObject({
      name: 'Titãs Cabeça Dinossauro 40 Anos',
      date: '2027-01-09',
      startTime: '22:00',
      venue: 'Stone House',
      city: 'Leopoldina',
      state: 'MG',
      ticketUrl: 'https://www.exemplo-ingressos.test/evento/33641/titas',
      status: 'CONFIRMED',
      performers: ['Titãs'],
      structured: true,
    });
    expect(draft.warnings).toEqual([]);
  });

  it('acha o evento dentro de @graph e entre outros tipos', () => {
    const draft = extractEventDraft(
      page(
        { '@type': 'Organization', name: 'Site' },
        { '@graph': [{ '@type': 'WebSite' }, musicEvent] },
      ),
      PAGE,
      NOW,
    );
    expect(draft.name).toBe('Titãs Cabeça Dinossauro 40 Anos');
  });

  it('usa a hora do local como escrita, e converte UTC para Brasília', () => {
    const local = extractEventDraft(
      page({ ...musicEvent, startDate: '2027-03-15T20:30:00-03:00' }),
      PAGE,
      NOW,
    );
    expect([local.date, local.startTime]).toEqual(['2027-03-15', '20:30']);

    // 01:30 UTC de 16/03 é 22:30 de 15/03 em São Paulo.
    const utc = extractEventDraft(
      page({ ...musicEvent, startDate: '2027-03-16T01:30:00Z' }),
      PAGE,
      NOW,
    );
    expect([utc.date, utc.startTime]).toEqual(['2027-03-15', '22:30']);
  });

  it('trata data sem horário e meia-noite como "sem horário"', () => {
    expect(
      extractEventDraft(
        page({ ...musicEvent, startDate: '2027-03-15' }),
        PAGE,
        NOW,
      ),
    ).toMatchObject({
      date: '2027-03-15',
      startTime: null,
    });
    expect(
      extractEventDraft(
        page({ ...musicEvent, startDate: '2027-03-15T00:00:00-03:00' }),
        PAGE,
        NOW,
      ).startTime,
    ).toBeNull();
  });

  it('avisa quando a data não existe ou já passou', () => {
    const invalid = extractEventDraft(
      page({ ...musicEvent, startDate: '2027-02-30T20:00:00-03:00' }),
      PAGE,
      NOW,
    );
    expect(invalid.date).toBeNull();
    expect(invalid.warnings.join(' ')).toMatch(/data/);

    const past = extractEventDraft(
      page({ ...musicEvent, startDate: '2020-05-01T20:00:00-03:00' }),
      PAGE,
      NOW,
    );
    expect(past.date).toBe('2020-05-01');
    expect(past.warnings.join(' ')).toMatch(/já passou/);
  });

  it('entende cancelado, esgotado e reagendado', () => {
    const cancelled = extractEventDraft(
      page({ ...musicEvent, eventStatus: 'https://schema.org/EventCancelled' }),
      PAGE,
      NOW,
    );
    expect(cancelled.status).toBe('CANCELLED');

    const soldOut = extractEventDraft(
      page({
        ...musicEvent,
        offers: [
          { availability: 'https://schema.org/SoldOut' },
          { availability: 'SoldOut' },
        ],
      }),
      PAGE,
      NOW,
    );
    expect(soldOut.status).toBe('SOLD_OUT');

    // Basta uma oferta disponível para o show não contar como esgotado.
    const partial = extractEventDraft(
      page({
        ...musicEvent,
        offers: [
          { availability: 'https://schema.org/SoldOut' },
          { availability: 'https://schema.org/InStock' },
        ],
      }),
      PAGE,
      NOW,
    );
    expect(partial.status).toBe('CONFIRMED');

    const rescheduled = extractEventDraft(
      page({
        ...musicEvent,
        eventStatus: 'https://schema.org/EventRescheduled',
      }),
      PAGE,
      NOW,
    );
    expect(rescheduled.status).toBe('CONFIRMED');
    expect(rescheduled.warnings.join(' ')).toMatch(/reagendado/);
  });

  it('converte o nome do estado em sigla e avisa quando não reconhece', () => {
    const named = extractEventDraft(
      page({
        ...musicEvent,
        location: {
          name: 'Arena',
          address: { addressLocality: 'Campinas', addressRegion: 'São Paulo' },
        },
      }),
      PAGE,
      NOW,
    );
    expect(named.state).toBe('SP');

    const unknown = extractEventDraft(
      page({
        ...musicEvent,
        location: {
          name: 'Arena',
          address: { addressRegion: 'Texas', addressCountry: 'US' },
        },
      }),
      PAGE,
      NOW,
    );
    expect(unknown.state).toBeNull();
    expect(unknown.warnings.join(' ')).toMatch(/Texas/);
    expect(unknown.warnings.join(' ')).toMatch(/outro país/);
  });

  it('avisa quando não há bandas e quando há vários eventos', () => {
    const noPerformer = extractEventDraft(
      page({ ...musicEvent, performer: undefined }),
      PAGE,
      NOW,
    );
    expect(noPerformer.performers).toEqual([]);
    expect(noPerformer.warnings.join(' ')).toMatch(/bandas/);

    const many = extractEventDraft(
      page(musicEvent, { ...musicEvent, name: 'Outro' }),
      PAGE,
      NOW,
    );
    expect(many.name).toBe('Titãs Cabeça Dinossauro 40 Anos');
    expect(many.warnings.join(' ')).toMatch(/2 eventos/);
  });

  it('só aceita link http/https; sem link do evento, usa o da página', () => {
    const draft = extractEventDraft(
      page({ ...musicEvent, url: 'javascript:alert(1)', offers: undefined }),
      PAGE,
      NOW,
    );
    expect(draft.ticketUrl).toBe(PAGE);
  });

  it('aceita performer como texto e como lista de nomes', () => {
    expect(
      extractEventDraft(
        page({ ...musicEvent, performer: 'Banda Solo' }),
        PAGE,
        NOW,
      ).performers,
    ).toEqual(['Banda Solo']);
    expect(
      extractEventDraft(
        page({ ...musicEvent, performer: [{ name: 'A' }, { name: 'B' }] }),
        PAGE,
        NOW,
      ).performers,
    ).toEqual(['A', 'B']);
  });

  it('ignora JSON-LD quebrado sem falhar', () => {
    const html = `<script type="application/ld+json">{ não é json </script>${page(musicEvent)}`;
    expect(extractEventDraft(html, PAGE, NOW).name).toBe(
      'Titãs Cabeça Dinossauro 40 Anos',
    );
  });

  it('sem dados estruturados, devolve só o título e avisa', () => {
    const html =
      '<html><head><title>Bangers Open Air 2027</title><meta property="og:title" content="Bangers &amp; Cia 2027"></head></html>';
    const draft = extractEventDraft(
      html,
      'https://www.exemplo-ingressos.test/evento/bangers',
      NOW,
    );

    expect(draft).toMatchObject({
      name: 'Bangers & Cia 2027',
      date: null,
      venue: null,
      structured: false,
      ticketUrl: 'https://www.exemplo-ingressos.test/evento/bangers',
    });
    expect(draft.warnings.join(' ')).toMatch(/à mão/);
  });

  it('corta nomes muito longos no limite da API', () => {
    const draft = extractEventDraft(
      page({ ...musicEvent, name: 'A'.repeat(300) }),
      PAGE,
      NOW,
    );
    expect(draft.name).toHaveLength(120);
  });
});

describe('cleanText', () => {
  it('decodifica entidades e junta espaços', () => {
    expect(
      cleanText('  Rock &amp; Roll &#39;27 &#x41;\n  &quot;ao vivo&quot;  '),
    ).toBe('Rock & Roll \'27 A "ao vivo"');
  });

  it('devolve null para o que não é texto ou está vazio', () => {
    expect(cleanText(42)).toBeNull();
    expect(cleanText('   ')).toBeNull();
    expect(cleanText(undefined)).toBeNull();
  });
});
