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

  it('toda foto com crédito traz autor, licença e links https', () => {
    for (const entry of manifest.data!.artists) {
      if (entry.credit) {
        expect(entry.credit.licenseUrl).toMatch(/^https:\/\//);
        expect(entry.credit.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });
});

describe('crédito no manifesto', () => {
  const base = { slug: 'banda', file: 'banda/foto.jpg' };
  const credit = {
    author: 'Fulana de Tal',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Foto.jpg',
  };
  const parse = (entry: object) =>
    imageManifestSchema.safeParse({ artists: [entry], releases: [] });

  it('aceita o crédito completo e também a foto sem crédito', () => {
    expect(parse({ ...base, credit }).success).toBe(true);
    expect(parse(base).success).toBe(true);
  });

  it('recusa crédito sem autor ou com link que não é https', () => {
    expect(parse({ ...base, credit: { ...credit, author: ' ' } }).success).toBe(
      false,
    );
    expect(
      parse({
        ...base,
        credit: { ...credit, sourceUrl: 'http://exemplo.com/x' },
      }).success,
    ).toBe(false);
    expect(
      parse({ ...base, credit: { ...credit, licenseUrl: 'javascript:alert(1)' } })
        .success,
    ).toBe(false);
  });
});
