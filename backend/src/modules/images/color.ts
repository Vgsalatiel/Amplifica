/**
 * Cor de destaque a partir da capa de um álbum.
 *
 * A "cor dominante" pura de uma imagem costuma ser o fundo (preto, branco, cinza).
 * O que se quer é a cor que dá identidade à capa. Por isso os pixels são agrupados
 * por matiz e cada um pesa conforme a sua saturação: um vermelho vivo conta mais
 * que um cinza levemente avermelhado.
 */

/** Contraste mínimo de texto normal sobre fundo branco (WCAG AA). */
export const MIN_CONTRAST = 4.5;

const HUE_BUCKETS = 24;
/** Abaixo disto, a capa é tratada como preto e branco: não há cor para extrair. */
const MIN_COLORFUL_SHARE = 0.03;

interface Hsl {
  h: number; // 0–360
  s: number; // 0–1
  l: number; // 0–1
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: Math.min(1, s), l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Contraste de uma cor #RRGGBB contra o branco, de 1 (nenhum) a 21 (preto). */
export function contrastWithWhite(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}

/** Escurece a cor, mantendo o matiz, até que seja legível sobre branco. */
function darkenUntilReadable(color: Hsl): string {
  let lightness = Math.min(color.l, 0.5);
  let hex = hslToHex({ ...color, l: lightness });
  while (contrastWithWhite(hex) < MIN_CONTRAST && lightness > 0.05) {
    lightness -= 0.02;
    hex = hslToHex({ ...color, l: lightness });
  }
  return hex;
}

/**
 * Recebe os pixels da capa (RGB, 3 bytes por pixel) e devolve a cor de destaque em
 * #RRGGBB, já com contraste suficiente sobre branco. Devolve `null` para capas sem
 * cor (preto e branco, tons de cinza): a página usa então a cor padrão do site.
 */
export function extractAccentColor(pixels: Uint8Array): string | null {
  const buckets = Array.from({ length: HUE_BUCKETS }, () => ({
    weight: 0,
    x: 0, // o matiz é um ângulo: a média é feita com seno e cosseno
    y: 0,
    saturation: 0,
    lightness: 0,
  }));

  const pixelCount = Math.floor(pixels.length / 3);
  let colorfulPixels = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const { h, s, l } = rgbToHsl(
      pixels[index * 3],
      pixels[index * 3 + 1],
      pixels[index * 3 + 2],
    );
    // Quase preto, quase branco e quase cinza não têm matiz confiável.
    if (s < 0.25 || l < 0.12 || l > 0.9) {
      continue;
    }

    colorfulPixels += 1;
    const bucket = buckets[Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS];
    const radians = (h * Math.PI) / 180;
    bucket.weight += s;
    bucket.x += Math.cos(radians) * s;
    bucket.y += Math.sin(radians) * s;
    bucket.saturation += s * s;
    bucket.lightness += l * s;
  }

  if (pixelCount === 0 || colorfulPixels / pixelCount < MIN_COLORFUL_SHARE) {
    return null;
  }

  const winner = buckets.reduce((best, bucket) =>
    bucket.weight > best.weight ? bucket : best,
  );

  const hue = ((Math.atan2(winner.y, winner.x) * 180) / Math.PI + 360) % 360;
  return darkenUntilReadable({
    h: hue,
    // Mantém a cor viva, mas sem chegar ao neon.
    s: Math.min(0.85, Math.max(0.45, winner.saturation / winner.weight)),
    l: winner.lightness / winner.weight,
  });
}
