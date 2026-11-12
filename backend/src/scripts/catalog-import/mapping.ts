import type { ReleaseType } from '../../generated/prisma/client.js';
import type { CatalogRelease } from './catalog-file.js';

/** Os campos do MusicBrainz que o mapeamento usa. */
export interface MbReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string | null;
  'secondary-types'?: string[];
  'first-release-date'?: string;
}

export interface MbReleaseSummary {
  id: string;
  title: string;
  status?: string | null;
  date?: string;
  media?: Array<{ 'track-count'?: number }>;
}

export interface MbMedium {
  position?: number;
  tracks?: Array<{ position?: number; title?: string; length?: number | null }>;
}

/**
 * O MusicBrainz separa o tipo principal (álbum, EP, single) dos secundários (ao vivo,
 * coletânea, remix, demo). Nosso modelo tem cinco tipos, então o mapeamento é este:
 * ao vivo vira LIVE; coletânea e álbum de remixes viram COMPILATION; remix e demo em
 * EP continuam EP. Quem quiser outra classificação ajusta no arquivo de dados.
 */
export function mapReleaseType(
  primary: string | null | undefined,
  secondary: string[] = [],
): ReleaseType | null {
  if (primary !== 'Album' && primary !== 'EP' && primary !== 'Single') {
    return null;
  }
  // O tipo principal vem primeiro: um single gravado ao vivo continua sendo um single.
  if (primary === 'Single') {
    return 'SINGLE';
  }
  if (secondary.includes('Live')) {
    return 'LIVE';
  }
  if (
    primary === 'Album' &&
    (secondary.includes('Compilation') || secondary.includes('Remix'))
  ) {
    return 'COMPILATION';
  }
  return primary === 'EP' ? 'EP' : 'ALBUM';
}

function trackCount(release: MbReleaseSummary): number {
  return (release.media ?? []).reduce(
    (sum, medium) => sum + (medium['track-count'] ?? 0),
    0,
  );
}

/**
 * Escolhe a edição de que as faixas serão lidas: entre as oficiais, a mais antiga (a edição
 * original, não uma versão de luxo posterior); no empate, a de menos faixas (a edição
 * padrão, sem faixas bônus). Sem nenhuma oficial, usa as demais.
 */
export function pickRepresentativeRelease(
  releases: MbReleaseSummary[],
): MbReleaseSummary | null {
  const official = releases.filter((release) => release.status === 'Official');
  const pool = official.length > 0 ? official : releases;

  return (
    [...pool].sort((a, b) => {
      // Sem data vai para o fim: "9" ordena depois de qualquer ano.
      const byDate = (a.date || '9').localeCompare(b.date || '9');
      return byDate !== 0 ? byDate : trackCount(a) - trackCount(b);
    })[0] ?? null
  );
}

/** Faixas de todos os discos de uma edição, com disco, posição e duração em milissegundos. */
export function toTracks(media: MbMedium[]): CatalogRelease['tracks'] {
  return media.flatMap((medium, mediumIndex) =>
    (medium.tracks ?? []).map((track, trackIndex) => ({
      title: (track.title ?? '').trim(),
      discNumber: medium.position ?? mediumIndex + 1,
      position: track.position ?? trackIndex + 1,
      durationMs: track.length && track.length > 0 ? track.length : null,
    })),
  );
}

/** "2013" e "2013-03" são datas parciais válidas no nosso formato; datas ausentes não são. */
export function hasUsableDate(group: MbReleaseGroup): boolean {
  return /^\d{4}(-\d{2}(-\d{2})?)?$/.test(group['first-release-date'] ?? '');
}

const MAX_TITLE = 200;

/**
 * A API limita títulos a 200 caracteres. Títulos maiores (existem, de propósito) são
 * cortados em um separador e o título completo vai para a descrição, para não perder nada.
 * Quem revisa o arquivo pode trocar por um título curto mais conhecido.
 */
export function fitTitle(title: string): {
  title: string;
  description: string | null;
} {
  const full = title.trim();
  if (full.length <= MAX_TITLE) {
    return { title: full, description: null };
  }
  const head = full.slice(0, MAX_TITLE - 1);
  const cut = Math.max(head.lastIndexOf('~'), head.lastIndexOf(' '));
  const short = (cut > 0 ? head.slice(0, cut) : head).trimEnd();
  return { title: `${short}…`, description: `Título completo: ${full}` };
}
