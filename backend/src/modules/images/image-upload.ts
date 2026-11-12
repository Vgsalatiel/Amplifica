import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from './images.service.js';

/**
 * Recebe um arquivo no campo `file` de um formulário multipart, mantido em memória
 * (as imagens são pequenas e passam pelo redimensionamento antes de serem gravadas).
 * Arquivos acima do limite são recusados com 413 antes de ocupar memória.
 */
export const ImageUpload = () =>
  FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });
