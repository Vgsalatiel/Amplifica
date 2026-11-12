/**
 * Busca no MusicBrainz a discografia de um artista e escreve um arquivo de dados para
 * REVISÃO. Nada vai para o banco aqui; a carga é o passo seguinte (`npm run catalog:seed`).
 *
 *   npm run catalog:fetch -- --mbid <id do artista> --genres deathcore,metalcore
 *
 * Opções: --out <arquivo>, --slug <endereço>, --types album,ep,live,compilation,single
 * Por padrão entram álbuns, EPs, ao vivo e coletâneas, sem singles.
 *
 * O MusicBrainz pede um User-Agent que identifique quem consulta. Defina o seu em
 * MUSICBRAINZ_USER_AGENT, no formato "Nome/versão ( contato )"; sem isso, usa um genérico.
 * Dados principais do MusicBrainz são CC0 (https://musicbrainz.org/doc/About/Data_License).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { slugify } from '../common/slug.js';
import type {
  CatalogFile,
  CatalogRelease,
} from './catalog-import/catalog-file.js';
import {
  fitTitle,
  hasUsableDate,
  mapReleaseType,
  pickRepresentativeRelease,
  toTracks,
  type MbMedium,
  type MbReleaseGroup,
  type MbReleaseSummary,
} from './catalog-import/mapping.js';
import { MusicBrainzClient } from './catalog-import/musicbrainz-client.js';

const DEFAULT_USER_AGENT =
  'catalog-import/0.1 (projeto pessoal, sem fins comerciais)';

const { values } = parseArgs({
  options: {
    mbid: { type: 'string' },
    genres: { type: 'string', default: '' },
    out: { type: 'string' },
    slug: { type: 'string' },
    types: { type: 'string', default: 'album,ep,live,compilation' },
  },
});

if (!values.mbid) {
  console.error(
    'Informe o artista: npm run catalog:fetch -- --mbid <id> --genres a,b',
  );
  process.exit(1);
}

const wanted = new Set(
  values.types!.split(',').map((type) => type.trim().toUpperCase()),
);
const client = new MusicBrainzClient(
  process.env['MUSICBRAINZ_USER_AGENT'] ?? DEFAULT_USER_AGENT,
);

interface MbArtist {
  name: string;
  type?: string | null;
  country?: string | null;
  'life-span'?: { begin?: string | null; end?: string | null };
  'begin-area'?: { name?: string } | null;
}

const artist = await client.get<MbArtist>(`/artist/${values.mbid}`);
console.log(`Artista: ${artist.name}`);

// --- lançamentos (release groups), paginados
const groups: MbReleaseGroup[] = [];
for (let offset = 0; ; offset += 100) {
  const page = await client.get<{
    'release-groups': MbReleaseGroup[];
    'release-group-count': number;
  }>('/release-group', {
    artist: values.mbid,
    limit: '100',
    offset: String(offset),
  });
  groups.push(...page['release-groups']);
  if (
    groups.length >= page['release-group-count'] ||
    page['release-groups'].length === 0
  ) {
    break;
  }
}
console.log(`${groups.length} release groups no MusicBrainz.`);

const selected = groups
  .map((group) => ({
    group,
    type: mapReleaseType(group['primary-type'], group['secondary-types']),
  }))
  .filter(
    ({ group, type }) =>
      type !== null && wanted.has(type) && hasUsableDate(group),
  )
  .sort((a, b) =>
    (a.group['first-release-date'] ?? '').localeCompare(
      b.group['first-release-date'] ?? '',
    ),
  );
console.log(`${selected.length} selecionados (${[...wanted].join(', ')}).\n`);

async function coverUrlFor(groupId: string): Promise<string | null> {
  const url = `https://coverartarchive.org/release-group/${groupId}/front-1200`;
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

const releases: CatalogRelease[] = [];
for (const { group, type } of selected) {
  const date = group['first-release-date']!;
  process.stdout.write(`- ${date} ${group.title.slice(0, 60)} ... `);

  // Edições deste lançamento; as oficiais primeiro, e todas se não houver nenhuma oficial.
  let editions = (
    await client.get<{ releases: MbReleaseSummary[] }>('/release', {
      'release-group': group.id,
      inc: 'media',
      status: 'official',
      limit: '100',
    })
  ).releases;
  if (editions.length === 0) {
    editions = (
      await client.get<{ releases: MbReleaseSummary[] }>('/release', {
        'release-group': group.id,
        inc: 'media',
        limit: '100',
      })
    ).releases;
  }

  const edition = pickRepresentativeRelease(editions);
  const tracks = edition
    ? toTracks(
        (
          await client.get<{ media: MbMedium[] }>(`/release/${edition.id}`, {
            inc: 'recordings',
          })
        ).media,
      )
    : [];

  const { title, description } = fitTitle(group.title);
  releases.push({
    mbid: group.id,
    releaseMbid: edition?.id ?? null,
    title,
    type: type!,
    releaseDate: date,
    description,
    coverUrl: await coverUrlFor(group.id),
    tracks,
  });
  console.log(
    `${type}, ${tracks.length} faixa(s)${edition ? '' : ' (SEM edição para ler faixas)'}`,
  );
}

const slug = values.slug ?? slugify(artist.name);
const file: CatalogFile = {
  generatedAt: new Date().toISOString(),
  source: 'MusicBrainz (dados principais em CC0)',
  artist: {
    mbid: values.mbid,
    name: artist.name,
    slug,
    type: artist.type === 'Person' ? 'SOLO' : 'BAND',
    country: artist.country ?? null,
    city: artist['begin-area']?.name ?? null,
    formedYear: artist['life-span']?.begin
      ? Number(artist['life-span'].begin.slice(0, 4))
      : null,
    disbandedYear: artist['life-span']?.end
      ? Number(artist['life-span'].end.slice(0, 4))
      : null,
    // A bio é escrita à parte, a partir de fontes lidas por uma pessoa.
    bio: null,
    sources: [
      {
        name: 'MusicBrainz',
        url: `https://musicbrainz.org/artist/${values.mbid}`,
      },
    ],
    genres: values
      .genres!.split(',')
      .map((genre) => genre.trim())
      .filter(Boolean),
  },
  releases,
  pending: [],
};

const out = resolve(values.out ?? `prisma/data/${slug}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);
console.log(`\nArquivo escrito: ${out}`);
console.log(
  `${releases.length} lançamentos, ${releases.reduce((sum, release) => sum + release.tracks.length, 0)} faixas.`,
);
