import { describe, expect, it } from 'vitest'
import { parseYouTubeId } from './youtube'

describe('parseYouTubeId', () => {
  it.each([
    ['3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/watch?v=3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/watch?v=3psvNDHQv7Y&list=abc&t=10s', '3psvNDHQv7Y'],
    ['https://youtu.be/3psvNDHQv7Y?si=xyz', '3psvNDHQv7Y'],
    ['https://music.youtube.com/watch?v=3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/embed/3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['https://www.youtube.com/shorts/3psvNDHQv7Y', '3psvNDHQv7Y'],
    ['  https://m.youtube.com/watch?v=3psvNDHQv7Y  ', '3psvNDHQv7Y'],
  ])('reconhece %s', (input, expected) => expect(parseYouTubeId(input)).toBe(expected))

  it.each([
    null,
    undefined,
    '',
    'https://www.youtube.com/watch?v=curto',
    'https://www.youtube.com/@canal',
    'https://exemplo.com/watch?v=3psvNDHQv7Y',
    'javascript:alert(1)',
    'não é link',
  ])('recusa %s', (input) => expect(parseYouTubeId(input)).toBeNull())
})
