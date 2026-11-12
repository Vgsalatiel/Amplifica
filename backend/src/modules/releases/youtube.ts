const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Extrai o id de um vídeo do YouTube a partir do que o admin colar: o link da barra
 * de endereço, o link curto de "compartilhar", um embed ou o próprio id.
 * Devolve `null` quando o texto não é um vídeo do YouTube.
 */
export function parseYoutubeVideoId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) {
    return text;
  }

  let url: URL;
  try {
    url = new URL(text.includes('://') ? text : `https://${text}`);
  } catch {
    return null;
  }

  let candidate: string | null | undefined;
  if (url.hostname === 'youtu.be') {
    candidate = url.pathname.split('/')[1];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const [, first, second] = url.pathname.split('/');
    candidate =
      first === 'watch'
        ? url.searchParams.get('v')
        : first === 'embed' || first === 'shorts' || first === 'live'
          ? second
          : null;
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}
