import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clipsFileSchema } from './load-clips.js';

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
});
