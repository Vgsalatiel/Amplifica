import { resolve } from 'node:path';
import {
  InMemoryDisk,
  LocalDisk,
  S3Disk,
  type StorageDisk,
} from '@nestjs/storage';
import type { Env } from '../../config/env.js';

/**
 * Onde as imagens ficam, decidido pelas variáveis de ambiente:
 *
 * - `s3`: bucket compatível com S3 (Cloudflare R2). É o modo de produção.
 * - `local`: pasta backend/storage, servida pela própria API. Para desenvolvimento.
 * - `memory`: nada é gravado em disco. Para os testes.
 * - `disabled`: produção sem bucket configurado. Os uploads são recusados com uma
 *   mensagem clara, em vez de irem para o disco do servidor, que é apagado a cada deploy.
 */
export type StorageMode = 's3' | 'local' | 'memory' | 'disabled';

export const LOCAL_STORAGE_ROOT = resolve('storage');
export const LOCAL_FILES_ROUTE = '/api/v1/files';

export function resolveStorageMode(env: Env): StorageMode {
  if (env.STORAGE_S3_BUCKET) {
    return 's3';
  }
  if (env.NODE_ENV === 'test') {
    return 'memory';
  }
  return env.NODE_ENV === 'production' ? 'disabled' : 'local';
}

export function createDisk(env: Env): StorageDisk {
  switch (resolveStorageMode(env)) {
    case 's3':
      return new S3Disk({
        bucket: env.STORAGE_S3_BUCKET!,
        endpoint: env.STORAGE_S3_ENDPOINT,
        // O R2 não tem regiões; "auto" é o valor que ele espera.
        region: 'auto',
        credentials: {
          accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID!,
          secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY!,
        },
        publicUrl: env.STORAGE_PUBLIC_URL,
        timeout: '30s',
      });
    case 'local':
      return new LocalDisk({
        root: LOCAL_STORAGE_ROOT,
        publicUrl: `http://localhost:${env.PORT}${LOCAL_FILES_ROUTE}`,
      });
    default:
      return new InMemoryDisk({ publicUrl: 'https://files.test' });
  }
}
