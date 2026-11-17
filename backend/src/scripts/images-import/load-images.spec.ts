import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { imageManifestSchema, toAcceptedFormat } from './load-images.js';

describe('toAcceptedFormat', () => {
  const base = () =>
    sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 200, g: 30, b: 30 },
      },
    });

  it('mantém JPEG, PNG e WebP como estão', async () => {
    for (const buffer of [
      await base().jpeg().toBuffer(),
      await base().png().toBuffer(),
      await base().webp().toBuffer(),
    ]) {
      expect(await toAcceptedFormat(buffer)).toBe(buffer);
    }
  });

  it('converte AVIF para JPEG, porque a API não aceita AVIF', async () => {
    const avif = await base().avif().toBuffer();

    const converted = await toAcceptedFormat(avif);

    expect((await sharp(converted).metadata()).format).toBe('jpeg');
  });
});

describe('prisma/data/images/band-images.json', () => {
  const manifest = imageManifestSchema.safeParse(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'prisma', 'data', 'images', 'band-images.json'),
        'utf8',
      ),
    ),
  );

  it('segue o formato do manifesto', () => {
    expect(manifest.error?.issues ?? []).toEqual([]);
  });

  it('não repete endereços nem arquivos', () => {
    const entries = [...manifest.data!.artists, ...manifest.data!.releases];
    expect(new Set(entries.map((entry) => entry.slug)).size).toBe(
      entries.length,
    );
    expect(new Set(entries.map((entry) => entry.file)).size).toBe(
      entries.length,
    );
  });
});
