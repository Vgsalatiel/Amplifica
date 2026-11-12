import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from '@nestjs/storage';
import type { Env } from '../../config/env.js';
import { ImagesService } from './images.service.js';
import { createDisk } from './storage.config.js';

@Global()
@Module({
  imports: [
    StorageModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        disks: {
          default: createDisk({
            NODE_ENV: config.get('NODE_ENV', { infer: true }),
            PORT: config.get('PORT', { infer: true }),
            STORAGE_S3_ENDPOINT: config.get('STORAGE_S3_ENDPOINT', {
              infer: true,
            }),
            STORAGE_S3_BUCKET: config.get('STORAGE_S3_BUCKET', { infer: true }),
            STORAGE_S3_ACCESS_KEY_ID: config.get('STORAGE_S3_ACCESS_KEY_ID', {
              infer: true,
            }),
            STORAGE_S3_SECRET_ACCESS_KEY: config.get(
              'STORAGE_S3_SECRET_ACCESS_KEY',
              { infer: true },
            ),
            STORAGE_PUBLIC_URL: config.get('STORAGE_PUBLIC_URL', {
              infer: true,
            }),
          } as Env),
        },
      }),
    }),
  ],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
