import { slugify, uniqueSlug } from '../../common/slug.js';
import { parseShowDate } from '../../modules/shows/show-date.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ShowEntry, ShowsFile } from './shows-file.js';

export interface LoadShowsOptions {
  /** Atualiza o que já existe a partir do arquivo. Sem isto, o que existe é mantido como está. */
  update: boolean;
}

export interface LoadShowsReport {
  created: number;
  updated: number;
  kept: number;
  /** Bandas do arquivo cujo endereço não existe no catálogo: o show entra sem o link para a banda. */
  unlinkedArtists: string[];
}

/**
 * Grava no banco os shows de um arquivo de dados. É seguro repetir: um show é reconhecido
 * por dia, cidade, local e primeira banda, então rodar duas vezes não duplica nada.
 */
export async function loadShows(
  prisma: PrismaService,
  data: ShowsFile,
  options: LoadShowsOptions,
): Promise<LoadShowsReport> {
  const genreSlugs = [...new Set(data.shows.flatMap((show) => show.genres))];
  const genres = await prisma.genre.findMany({
    where: { slug: { in: genreSlugs } },
  });
  const missingGenres = genreSlugs.filter(
    (slug) => !genres.some((genre) => genre.slug === slug),
  );
  if (missingGenres.length > 0) {
    throw new Error(
      `Gêneros que não existem no banco: ${missingGenres.join(', ')}. Rode "npm run seed:genres" ou cadastre-os no admin.`,
    );
  }
  const genreId = new Map(genres.map((genre) => [genre.slug, genre.id]));

  const artistSlugs = [
    ...new Set(
      data.shows.flatMap((show) =>
        show.acts.flatMap((act) => (act.artist ? [act.artist] : [])),
      ),
    ),
  ];
  const artists = await prisma.artist.findMany({
    where: { slug: { in: artistSlugs } },
    select: { id: true, slug: true },
  });
  const artistId = new Map(artists.map((artist) => [artist.slug, artist.id]));
  const unlinkedArtists = artistSlugs.filter((slug) => !artistId.has(slug));

  const report: LoadShowsReport = {
    created: 0,
    updated: 0,
    kept: 0,
    unlinkedArtists,
  };

  for (const entry of data.shows) {
    const fields = toFields(entry);
    const rows = {
      acts: entry.acts.map((act, position) => ({
        position,
        name: act.name,
        artistId: (act.artist && artistId.get(act.artist)) || null,
      })),
      genres: entry.genres.map((slug) => ({
        genreId: genreId.get(slug) as string,
      })),
    };

    const existing = await prisma.show.findFirst({
      where: {
        date: fields.date,
        city: { equals: entry.city, mode: 'insensitive' },
        venue: { equals: entry.venue, mode: 'insensitive' },
        acts: {
          some: {
            position: 0,
            name: { equals: entry.acts[0]?.name, mode: 'insensitive' },
          },
        },
      },
      select: { id: true },
    });

    if (existing) {
      if (!options.update) {
        report.kept += 1;
        continue;
      }
      await prisma.show.update({
        where: { id: existing.id },
        data: {
          ...fields,
          acts: { deleteMany: {}, create: rows.acts },
          genres: { deleteMany: {}, create: rows.genres },
        },
      });
      report.updated += 1;
      continue;
    }

    const slug = await uniqueSlug(
      slugify(
        `${entry.name ?? entry.acts[0]?.name} ${entry.city} ${entry.date}`,
      ),
      async (candidate) =>
        (await prisma.show.count({ where: { slug: candidate } })) > 0,
    );
    await prisma.show.create({
      data: {
        ...fields,
        slug,
        acts: { create: rows.acts },
        genres: { create: rows.genres },
      },
    });
    report.created += 1;
  }

  return report;
}

function toFields(entry: ShowEntry) {
  return {
    name: entry.name ?? null,
    date: parseShowDate(entry.date) as Date,
    startTime: entry.startTime ?? null,
    venue: entry.venue,
    city: entry.city,
    state: entry.state,
    ticketUrl: entry.ticketUrl,
    status: entry.status,
    verifiedAt: parseShowDate(entry.verifiedAt) as Date,
  };
}
