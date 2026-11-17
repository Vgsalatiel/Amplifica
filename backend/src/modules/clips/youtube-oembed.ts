import { Injectable } from '@nestjs/common';

export interface VideoInfo {
  title: string;
  channelName: string;
}

/** O vídeo não existe, é privado ou o dono não deixa incorporá-lo em outros sites. */
export class VideoNotUsableError extends Error {}

/** Não foi possível falar com o YouTube agora (fora do ar, lento ou limitando consultas). */
export class VideoCheckFailedError extends Error {}

const TIMEOUT_MS = 8000;

/**
 * Confere um vídeo no endpoint oEmbed do YouTube e devolve título e canal. O endereço consultado é
 * sempre `www.youtube.com`, montado com o código já validado, então a pessoa não escolhe para onde o
 * servidor faz a consulta. Um vídeo com a incorporação desligada responde 401, e um privado ou
 * apagado, 404; nos dois casos ele não serve para a playlist.
 */
@Injectable()
export class YouTubeOEmbed {
  async lookup(videoId: string): Promise<VideoInfo> {
    const watch = `https://www.youtube.com/watch?v=${videoId}`;
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new VideoCheckFailedError('YouTube não respondeu.');
    }

    if ([400, 401, 403, 404].includes(response.status)) {
      throw new VideoNotUsableError(`YouTube respondeu ${response.status}.`);
    }
    if (!response.ok) {
      throw new VideoCheckFailedError(`YouTube respondeu ${response.status}.`);
    }

    const body = (await response.json().catch(() => null)) as {
      title?: unknown;
      author_name?: unknown;
    } | null;
    if (
      !body ||
      typeof body.title !== 'string' ||
      typeof body.author_name !== 'string'
    ) {
      throw new VideoCheckFailedError('Resposta inesperada do YouTube.');
    }
    return {
      title: body.title.trim().slice(0, 200),
      channelName: body.author_name.trim().slice(0, 120),
    };
  }
}
