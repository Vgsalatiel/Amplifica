const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Tira o código do vídeo (11 caracteres) de um link do YouTube ou de um código solto. Aceita
 * `watch?v=`, `youtu.be/`, `embed/`, `shorts/` e `live/`, inclusive de music.youtube.com. Devolve
 * `null` para qualquer outra coisa: o código vira parte de um endereço, então só passa o que tem
 * exatamente esse formato.
 */
export function parseYouTubeId(value: string): string | null {
  const text = value.trim();
  if (VIDEO_ID.test(text)) {
    return text;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (
    host === 'youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const [, kind, id] = url.pathname.split('/');
    if (kind === 'watch') {
      candidate = url.searchParams.get('v');
    } else if (['embed', 'shorts', 'live', 'v'].includes(kind ?? '')) {
      candidate = id ?? null;
    }
  }
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}
