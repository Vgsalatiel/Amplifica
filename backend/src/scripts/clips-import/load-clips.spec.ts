import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clipsFileSchema, loadClips } from './load-clips.js';

describe('prisma/data/clips/clips.json', () => {
  const parsed = clipsFileSchema.safeParse(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'prisma', 'data', 'clips', 'clips.json'),
        'utf8',
      ),
    ),
  );

  it('segue o formato dos clipes fixos', () => {
    expect(parsed.error?.issues ?? []).toEqual([]);
  });

  it('não repete o mesmo vídeo', () => {
    const ids = parsed.data!.clips.map((clip) => clip.youtubeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo clipe do catálogo aponta para uma banda, e toda banda do catálogo tem pelo menos um clipe', () => {
    const catalog = parsed.data!.clips.filter((clip) => clip.catalog);
    expect(catalog.every((clip) => Boolean(clip.artist))).toBe(true);
    const withClip = new Set(parsed.data!.clips.map((clip) => clip.artist));
    const dataDir = join(process.cwd(), 'prisma', 'data');
    const bands = readdirSync(dataDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));
    expect(bands.filter((band) => !withClip.has(band))).toEqual([]);
  });

  it('os clipes de uma mesma banda ficam um ao lado do outro (Pain Remains I, II e III tocam em sequência)', () => {
    const artists = parsed.data!.clips.filter((clip) => clip.catalog).map((clip) => clip.artist);
    const closed = new Set<string>();
    let previous: string | null | undefined;
    for (const artist of artists) {
      if (artist !== previous && previous) closed.add(previous);
      expect(closed.has(artist!)).toBe(false);
      previous = artist;
    }
  });
});

describe('loadClips', () => {
  interface Row {
    id: string;
    youtubeId: string;
    pinned: boolean;
    position: number;
    submittedById: string | null;
  }
  const fakePrisma = (rows: Row[]) => ({
    clip: {
      findUnique: ({ where }: { where: { youtubeId: string } }) =>
        Promise.resolve(rows.find((row) => row.youtubeId === where.youtubeId) ?? null),
      create: ({ data }: { data: Row }) => {
        rows.push({ ...data, id: `n${rows.length}`, submittedById: null });
        return Promise.resolve();
      },
      update: ({ where, data }: { where: { id: string }; data: { position: number } }) => {
        rows.find((row) => row.id === where.id)!.position = data.position;
        return Promise.resolve();
      },
    },
    artist: { findUnique: () => Promise.resolve({ id: 'a1' }) },
  });
  const id = (n: number) => `ID${String(n).padStart(9, '0')}`.slice(0, 11);
  const entry = (n: number) => ({ youtubeId: id(n), title: `t${n}`, channelName: 'c', artist: 'x', catalog: true });

  it('cria os novos e refaz a posição dos clipes do catálogo, sem mexer em sugestões nem nos de abertura', async () => {
    const rows: Row[] = [
      { id: 'r1', youtubeId: id(1), pinned: false, position: 1001, submittedById: null },
      { id: 'r2', youtubeId: id(2), pinned: false, position: 1002, submittedById: null },
      { id: 'sug', youtubeId: id(3), pinned: false, position: 0, submittedById: 'u1' },
    ];
    // Um clipe novo entra no meio: 1, novo, 2, sugestão (que o arquivo também cita).
    const file = { clips: [entry(0), entry(1), entry(9), entry(2), entry(3)] };
    const report = await loadClips(fakePrisma(rows) as never, file as never);

    expect(report).toMatchObject({ created: 2, kept: 3 });
    expect(rows.find((row) => row.id === 'r1')!.position).toBe(1001);
    expect(rows.find((row) => row.id === 'r2')!.position).toBe(1003);
    expect(rows.find((row) => row.id === 'sug')!.position).toBe(0);
    expect(report.reordered).toBe(1);
  });
});
