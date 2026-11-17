import { parseYouTubeId } from './youtube.js';

describe('parseYouTubeId', () => {
  it.each([
    ['3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/watch?v=3psvNDHQv7Y', '3psvNDHQv7Y'],
    [
      'https://www.youtube.com/watch?v=3psvNDHQv7Y&list=abc&t=10s',
      '3psvNDHQv7Y',
    ],
    ['https://youtu.be/3psvNDHQv7Y?si=xyz', '3psvNDHQv7Y'],
    ['https://music.youtube.com/watch?v=3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://m.youtube.com/watch?v=3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/embed/3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/shorts/3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['  https://youtu.be/3psvNDHQv7Y  ', '3psvNDHQv7Y'],
  ])('reconhece %s', (input, expected) => {
    expect(parseYouTubeId(input)).toBe(expected);
  });

  it.each([
    '',
    'curto',
    'https://www.youtube.com/watch?v=curto',
    'https://www.youtube.com/@canal',
    'https://www.youtube.com/playlist?list=PLabcdefghijk',
    'https://exemplo.com/watch?v=3psvNDHQv7Y',
    'https://youtube.com.exemplo.com/watch?v=3psvNDHQv7Y',
    'javascript:alert(1)',
    'ftp://youtu.be/3psvNDHQv7Y',
    '3psvNDHQv7Y"><script>',
  ])('recusa "%s"', (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});
