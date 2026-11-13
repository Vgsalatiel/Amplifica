import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { apiError } from '../../../common/api-error.js';
import { artistIdsMatching } from '../../../common/search.js';
import type { ShowStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { parseShowDate } from '../show-date.js';
import { extractEventDraft } from './event-extractor.js';
import { PageFetcher, PageFetchError } from './page-fetcher.js';

/** Sugestão de show lida de uma página. Nada é gravado: a pessoa confere e salva pelo formulário. */
export interface ShowImportPreview {
  /** Site de onde vieram os dados, como "www.ticket360.com.br". */
  source: string;
  /** A página lida, depois de redirecionamentos. */
  sourceUrl: string;
  /** A página publica os dados do evento de forma legível. Sem isso, só o título vem preenchido. */
  structured: boolean;
  name: string | null;
  date: string | null;
  startTime: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  ticketUrl: string | null;
  status: ShowStatus;
  /** Bandas lidas da página; `artistId` quando o nome bate com uma banda do catálogo. */
  acts: Array<{ name: string; artistId: string | null }>;
  /** Avisos para quem vai conferir (data que passou, evento reagendado, dado que faltou). */
  warnings: string[];
  /** Se já existe um show igual cadastrado, o endereço dele. */
  existingShowSlug: string | null;
}

@Injectable()
export class ShowImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: PageFetcher,
  ) {}

  async preview(url: string): Promise<ShowImportPreview> {
    const page = await this.fetch(url);
    const draft = extractEventDraft(page.html, page.url);

    const acts = await this.matchArtists(draft.performers);
    // Se a página só repete o nome da banda como nome do evento, o show fica sem nome.
    const name =
      draft.name && acts.length === 1 && sameName(draft.name, acts[0]?.name)
        ? null
        : draft.name;

    return {
      source: new URL(page.url).hostname,
      sourceUrl: page.url,
      structured: draft.structured,
      name,
      date: draft.date,
      startTime: draft.startTime,
      venue: draft.venue,
      city: draft.city,
      state: draft.state,
      ticketUrl: draft.ticketUrl,
      status: draft.status,
      acts,
      warnings: draft.warnings,
      existingShowSlug: await this.findExisting(draft, acts),
    };
  }

  private async fetch(url: string) {
    try {
      return await this.fetcher.fetchHtml(url);
    } catch (error) {
      if (!(error instanceof PageFetchError)) {
        throw error;
      }
      const body = apiError(`import_${error.code}`, error.message);
      if (error.code === 'unsafe_url') {
        throw new BadRequestException(body);
      }
      if (error.code === 'blocked_by_robots') {
        throw new UnprocessableEntityException(body);
      }
      throw new BadGatewayException(body);
    }
  }

  /** Liga cada banda lida ao catálogo quando o nome é o mesmo (sem diferenciar acento nem maiúsculas). */
  private async matchArtists(
    performers: string[],
  ): Promise<Array<{ name: string; artistId: string | null }>> {
    const acts: Array<{ name: string; artistId: string | null }> = [];
    for (const name of performers) {
      const ids = await artistIdsMatching(this.prisma, name);
      const candidates = ids.length
        ? await this.prisma.artist.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          })
        : [];
      const match = candidates.find((artist) => sameName(artist.name, name));
      acts.push({ name, artistId: match?.id ?? null });
    }
    return acts;
  }

  private async findExisting(
    draft: { date: string | null; city: string | null; venue: string | null },
    acts: Array<{ name: string }>,
  ): Promise<string | null> {
    const date = draft.date ? parseShowDate(draft.date) : null;
    const first = acts[0];
    if (!date || !draft.city || !draft.venue || !first) {
      return null;
    }
    const show = await this.prisma.show.findFirst({
      where: {
        date,
        city: { equals: draft.city, mode: 'insensitive' },
        venue: { equals: draft.venue, mode: 'insensitive' },
        acts: {
          some: {
            position: 0,
            name: { equals: first.name, mode: 'insensitive' },
          },
        },
      },
      select: { slug: true },
    });
    return show?.slug ?? null;
  }
}

/** Compara nomes ignorando acento, maiúsculas e pontuação: "Titãs" = "TITAS". */
function sameName(a: string, b: string | undefined): boolean {
  const plain = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  return b !== undefined && plain(a) === plain(b) && plain(a) !== '';
}
