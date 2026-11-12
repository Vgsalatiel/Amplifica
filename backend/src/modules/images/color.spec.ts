import {
  contrastWithWhite,
  extractAccentColor,
  hslToHex,
  MIN_CONTRAST,
  rgbToHsl,
} from './color.js';

/** Monta uma "imagem" a partir de áreas de cor sólida: [[r, g, b], quantidade de pixels]. */
function image(
  ...areas: Array<[[number, number, number], number]>
): Uint8Array {
  const total = areas.reduce((sum, [, count]) => sum + count, 0);
  const pixels = new Uint8Array(total * 3);
  let offset = 0;
  for (const [color, count] of areas) {
    for (let index = 0; index < count; index += 1) {
      pixels.set(color, offset);
      offset += 3;
    }
  }
  return pixels;
}

function hueOf(hex: string): number {
  return rgbToHsl(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ).h;
}

describe('extractAccentColor', () => {
  it('escolhe a cor viva mesmo quando o fundo neutro ocupa quase toda a capa', () => {
    // 90% de cinza claro, 10% de vermelho: como a capa de exemplo do projeto.
    const accent = extractAccentColor(
      image([[185, 193, 196], 900], [[215, 38, 27], 100]),
    );

    expect(accent).not.toBeNull();
    const hue = hueOf(accent!);
    expect(hue < 20 || hue > 340).toBe(true);
  });

  it('devolve sempre uma cor legível sobre branco', () => {
    const covers = [
      image([[255, 235, 59], 1000]), // amarelo-claro
      image([[129, 212, 250], 1000]), // azul-claro
      image([[255, 138, 128], 1000]), // rosa
      image([[0, 230, 118], 1000]), // verde neon
    ];

    for (const cover of covers) {
      expect(
        contrastWithWhite(extractAccentColor(cover)!),
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it('mantém o matiz ao escurecer', () => {
    const accent = extractAccentColor(image([[129, 212, 250], 1000]))!;

    expect(Math.abs(hueOf(accent) - 199)).toBeLessThan(12);
  });

  it('devolve null para capas em preto e branco', () => {
    expect(
      extractAccentColor(image([[20, 20, 20], 500], [[240, 240, 240], 500])),
    ).toBeNull();
    expect(extractAccentColor(image([[128, 128, 128], 1000]))).toBeNull();
  });

  it('ignora um traço de cor pequeno demais para representar a capa', () => {
    expect(
      extractAccentColor(image([[250, 250, 250], 990], [[215, 38, 27], 10])),
    ).toBeNull();
  });

  it('entre duas cores, fica com a que ocupa mais área', () => {
    const accent = extractAccentColor(
      image([[30, 90, 200], 700], [[215, 38, 27], 300]),
    )!;

    expect(Math.abs(hueOf(accent) - 219)).toBeLessThan(15);
  });

  it('devolve null para imagem vazia', () => {
    expect(extractAccentColor(new Uint8Array())).toBeNull();
  });
});

describe('conversões de cor', () => {
  it('converte ida e volta sem perder a cor', () => {
    const { h, s, l } = rgbToHsl(86, 48, 208);

    expect(hslToHex({ h, s, l })).toBe('#5630D0');
  });

  it('calcula o contraste contra o branco', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 0);
    expect(contrastWithWhite('#FFFFFF')).toBeCloseTo(1, 1);
    expect(contrastWithWhite('#5630D0')).toBeCloseTo(7.7, 1);
  });
});
