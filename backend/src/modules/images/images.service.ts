import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { detectContentType, StorageDisk } from '@nestjs/storage';
import sharp, { type Sharp } from 'sharp';
import { apiError } from '../../common/api-error.js';
import type { Env } from '../../config/env.js';
import { extractAccentColor } from './color.js';
import { resolveStorageMode, type StorageMode } from './storage.config.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** As duas versões guardadas de cada imagem. */
export interface ImageSet {
  large: string;
  small: string;
}

export type ImageKind = 'covers' | 'artists' | 'avatars';

interface Variant {
  width: number;
  height: number;
  /** `cover` recorta para preencher o quadro; `inside` só reduz, sem recortar. */
  fit: 'cover' | 'inside';
}

const VARIANTS: Record<ImageKind, { large: Variant; small: Variant }> = {
  covers: {
    large: { width: 1200, height: 1200, fit: 'inside' },
    small: { width: 400, height: 400, fit: 'inside' },
  },
  artists: {
    large: { width: 1600, height: 1600, fit: 'inside' },
    small: { width: 600, height: 600, fit: 'inside' },
  },
  avatars: {
    large: { width: 400, height: 400, fit: 'cover' },
    small: { width: 96, height: 96, fit: 'cover' },
  },
};

export interface StoredImage {
  /** Caminho base gravado no banco. As URLs são montadas a partir dele. */
  path: string;
  /** Cor de destaque extraída da imagem; `null` se ela não tiver cor marcante. */
  accentColor: string | null;
}

/**
 * Recebe uma imagem enviada, confere que é mesmo uma imagem, gera duas versões em
 * WebP e grava no armazenamento. É o único lugar da API que conhece o disco de arquivos.
 */
@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly mode: StorageMode;

  constructor(
    private readonly disk: StorageDisk,
    config: ConfigService<Env, true>,
  ) {
    this.mode = resolveStorageMode({
      NODE_ENV: config.get('NODE_ENV', { infer: true }),
      STORAGE_S3_BUCKET: config.get('STORAGE_S3_BUCKET', { infer: true }),
    } as Env);
  }

  /** URLs públicas de uma imagem, ou `null` quando não há imagem. */
  toSet(path: string | null | undefined): ImageSet | null {
    return path
      ? {
          large: this.disk.url(`${path}-lg.webp`),
          small: this.disk.url(`${path}-sm.webp`),
        }
      : null;
  }

  async store(
    kind: ImageKind,
    ownerId: string,
    file: Express.Multer.File | undefined,
  ): Promise<StoredImage> {
    if (this.mode === 'disabled') {
      throw new ServiceUnavailableException(
        apiError(
          'storage_not_configured',
          'O envio de imagens ainda não está configurado neste servidor.',
        ),
      );
    }
    if (!file || file.size === 0) {
      throw new BadRequestException(
        apiError('image_required', 'Escolha uma imagem para enviar.', [
          { field: 'file', message: 'Escolha uma imagem para enviar.' },
        ]),
      );
    }

    // O tipo é lido dos primeiros bytes do arquivo. O nome e o tipo declarados pelo
    // navegador não são confiáveis: um "foto.png" pode conter qualquer coisa.
    const type = detectContentType(file.buffer.subarray(0, 32));
    if (!type || !ACCEPTED_TYPES.has(type)) {
      throw invalidImage('Envie uma imagem JPEG, PNG ou WebP.');
    }

    let large: Buffer;
    let small: Buffer;
    let pixels: Buffer;
    try {
      const variants = VARIANTS[kind];
      [large, small, pixels] = await Promise.all([
        this.resize(file.buffer, variants.large),
        this.resize(file.buffer, variants.small),
        this.pipeline(file.buffer)
          .resize(64, 64, { fit: 'cover' })
          .removeAlpha()
          .raw()
          .toBuffer(),
      ]);
    } catch (error) {
      this.logger.warn(
        `Imagem recusada: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw invalidImage(
        'Não foi possível ler essa imagem. Tente outro arquivo.',
      );
    }

    // O nome inclui um resumo do conteúdo: uma imagem nova tem endereço novo, então
    // navegadores e CDN podem guardar cada arquivo em cache para sempre.
    const digest = createHash('sha256')
      .update(large)
      .digest('hex')
      .slice(0, 16);
    const path = `${kind}/${ownerId}/${digest}`;
    const options = {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    };
    await Promise.all([
      this.disk.put(`${path}-lg.webp`, large, options),
      this.disk.put(`${path}-sm.webp`, small, options),
    ]);

    return { path, accentColor: extractAccentColor(pixels) };
  }

  /** Apaga as duas versões de uma imagem. Falhas não interrompem a operação principal. */
  async remove(path: string | null | undefined): Promise<void> {
    if (!path) {
      return;
    }
    try {
      await this.disk.delete([`${path}-lg.webp`, `${path}-sm.webp`]);
    } catch (error) {
      this.logger.warn(
        `Não foi possível apagar ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private pipeline(input: Buffer): Sharp {
    // limitInputPixels barra "bombas de descompressão": arquivos pequenos que viram
    // imagens gigantescas na memória. rotate() aplica a orientação gravada pela câmera.
    return sharp(input, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
    }).rotate();
  }

  private resize(input: Buffer, variant: Variant): Promise<Buffer> {
    return this.pipeline(input)
      .resize(variant.width, variant.height, {
        fit: variant.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  }
}

function invalidImage(message: string): BadRequestException {
  return new BadRequestException(
    apiError('invalid_image', message, [{ field: 'file', message }]),
  );
}
