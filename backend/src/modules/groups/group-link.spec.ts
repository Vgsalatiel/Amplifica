import { parseGroupLink } from './group-link.js';

describe('parseGroupLink', () => {
  it.each([
    ['https://chat.whatsapp.com/AbCdEf123456', 'WHATSAPP', 'https://chat.whatsapp.com/AbCdEf123456'],
    ['  https://chat.whatsapp.com/AbCdEf123456?mode=r_c#x ', 'WHATSAPP', 'https://chat.whatsapp.com/AbCdEf123456'],
    ['https://t.me/emoshow', 'TELEGRAM', 'https://t.me/emoshow'],
    ['https://t.me/+AbC123xyz', 'TELEGRAM', 'https://t.me/+AbC123xyz'],
    ['https://t.me/joinchat/AbC123xyz/', 'TELEGRAM', 'https://t.me/joinchat/AbC123xyz'],
    ['https://discord.gg/abcDEF', 'DISCORD', 'https://discord.gg/abcDEF'],
    ['https://discord.com/invite/abcDEF', 'DISCORD', 'https://discord.com/invite/abcDEF'],
    ['https://CHAT.WHATSAPP.COM/AbCdEf123456', 'WHATSAPP', 'https://chat.whatsapp.com/AbCdEf123456'],
  ])('aceita %s', (input, platform, url) => {
    expect(parseGroupLink(input)).toEqual({ platform, url });
  });

  it.each([
    'http://chat.whatsapp.com/AbCdEf123456',
    'https://chat.whatsapp.com/',
    'https://chat.whatsapp.com/a/b',
    'https://whatsapp.com/AbCdEf123456',
    'https://chat.whatsapp.com.golpe.example/AbCdEf123456',
    'https://user:pass@chat.whatsapp.com/AbCdEf123456',
    'https://chat.whatsapp.com:8443/AbCdEf123456',
    'https://discord.com/channels/1/2',
    'https://instagram.com/emotourbrasil',
    'javascript:alert(1)',
    'não é link',
    '',
  ])('recusa %s', (input) => {
    expect(parseGroupLink(input)).toBeNull();
  });
});
