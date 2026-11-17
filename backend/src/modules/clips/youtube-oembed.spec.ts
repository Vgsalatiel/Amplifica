import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VideoCheckFailedError,
  VideoNotUsableError,
  YouTubeOEmbed,
} from './youtube-oembed.js';

const reply = (status: number, body?: unknown) =>
  Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );

describe('YouTubeOEmbed', () => {
  const oembed = new YouTubeOEmbed();
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('devolve título e canal, consultando só www.youtube.com com o código do vídeo', async () => {
    fetchMock.mockReturnValue(
      reply(200, { title: '  Tentar De Novo  ', author_name: ' Fresno ' }),
    );

    const info = await oembed.lookup('3psvNDHQv7Y');

    expect(info).toEqual({ title: 'Tentar De Novo', channelName: 'Fresno' });
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin).toBe('https://www.youtube.com');
    expect(url.pathname).toBe('/oembed');
    expect(url.searchParams.get('url')).toBe(
      'https://www.youtube.com/watch?v=3psvNDHQv7Y',
    );
  });

  it('corta títulos e canais enormes', async () => {
    fetchMock.mockReturnValue(
      reply(200, { title: 'a'.repeat(500), author_name: 'b'.repeat(500) }),
    );

    const info = await oembed.lookup('3psvNDHQv7Y');

    expect(info.title).toHaveLength(200);
    expect(info.channelName).toHaveLength(120);
  });

  it.each([400, 401, 403, 404])(
    'o status %i significa vídeo que não serve (privado, apagado ou sem incorporação)',
    async (status) => {
      fetchMock.mockReturnValue(reply(status));
      await expect(oembed.lookup('3psvNDHQv7Y')).rejects.toBeInstanceOf(
        VideoNotUsableError,
      );
    },
  );

  it.each([429, 500, 503])(
    'o status %i significa que não deu para conferir agora',
    async (status) => {
      fetchMock.mockReturnValue(reply(status));
      await expect(oembed.lookup('3psvNDHQv7Y')).rejects.toBeInstanceOf(
        VideoCheckFailedError,
      );
    },
  );

  it('falha de rede, tempo esgotado e resposta estranha também viram "não deu para conferir"', async () => {
    fetchMock.mockRejectedValueOnce(new Error('rede'));
    await expect(oembed.lookup('3psvNDHQv7Y')).rejects.toBeInstanceOf(
      VideoCheckFailedError,
    );

    fetchMock.mockReturnValueOnce(reply(200, { title: 1 }));
    await expect(oembed.lookup('3psvNDHQv7Y')).rejects.toBeInstanceOf(
      VideoCheckFailedError,
    );
  });
});
