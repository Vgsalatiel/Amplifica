import { parseYoutubeVideoId } from './youtube.js';

describe('parseYoutubeVideoId', () => {
  it.each([
    ['dQw4w9WgXcQ', 'o próprio id'],
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'link da barra de endereço',
    ],
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=42s',
      'link com outros parâmetros',
    ],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'link curto de compartilhar'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube Music'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'embed'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'shorts'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'sem https'],
    ['  https://youtu.be/dQw4w9WgXcQ  ', 'com espaços em volta'],
  ])('aceita %s (%s)', (input) => {
    expect(parseYoutubeVideoId(input)).toBe('dQw4w9WgXcQ');
  });

  it.each([
    ['https://vimeo.com/123456789', 'outro site'],
    ['https://www.youtube.com/@canal', 'página de canal'],
    ['https://www.youtube.com/playlist?list=PL123', 'playlist sem vídeo'],
    ['https://evil.example/watch?v=dQw4w9WgXcQ', 'domínio que imita o YouTube'],
    ['https://www.youtube.com/watch?v=curto', 'id com tamanho errado'],
    ['não é link', 'texto qualquer'],
    ['', 'vazio'],
  ])('recusa %s (%s)', (input) => {
    expect(parseYoutubeVideoId(input)).toBeNull();
  });
});
