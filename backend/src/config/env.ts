/**
 * Variáveis de ambiente da API, já validadas e tipadas.
 * A validação roda na inicialização: se faltar algo, a API se recusa a subir
 * com uma mensagem clara, em vez de falhar mais tarde no meio de uma requisição.
 */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  /** Segredo HMAC que assina os tokens de acesso. Mínimo de 32 caracteres. */
  JWT_ACCESS_SECRET: string;
  /**
   * Armazenamento de imagens compatível com S3 (Cloudflare R2). Opcional: sem estas
   * variáveis, o desenvolvimento grava em disco local e a produção recusa uploads.
   */
  STORAGE_S3_ENDPOINT?: string;
  STORAGE_S3_BUCKET?: string;
  STORAGE_S3_ACCESS_KEY_ID?: string;
  STORAGE_S3_SECRET_ACCESS_KEY?: string;
  /** Endereço público do bucket, de onde o navegador carrega as imagens. */
  STORAGE_PUBLIC_URL?: string;
}

const STORAGE_KEYS = [
  'STORAGE_S3_ENDPOINT',
  'STORAGE_S3_BUCKET',
  'STORAGE_S3_ACCESS_KEY_ID',
  'STORAGE_S3_SECRET_ACCESS_KEY',
  'STORAGE_PUBLIC_URL',
] as const;

const NODE_ENVS = ['development', 'test', 'production'] as const;

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];

  const readString = (key: string): string => {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key} é obrigatória`);
      return '';
    }
    return value.trim();
  };

  const nodeEnv = (raw['NODE_ENV'] ?? 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    errors.push(`NODE_ENV deve ser um de: ${NODE_ENVS.join(', ')}`);
  }

  const port = Number(raw['PORT'] ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT deve ser um número de porta válido');
  }

  const corsOrigin = readString('CORS_ORIGIN');

  const databaseUrl = readString('DATABASE_URL');
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL deve começar com postgresql://');
  }

  const jwtAccessSecret = readString('JWT_ACCESS_SECRET');
  if (jwtAccessSecret && jwtAccessSecret.length < 32) {
    errors.push('JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres');
  }

  // As variáveis de armazenamento valem em conjunto: ou todas, ou nenhuma.
  const storage: Partial<Record<(typeof STORAGE_KEYS)[number], string>> = {};
  for (const key of STORAGE_KEYS) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') {
      storage[key] = value.trim();
    }
  }
  const storageSet = Object.keys(storage).length;
  if (storageSet > 0 && storageSet < STORAGE_KEYS.length) {
    const missing = STORAGE_KEYS.filter((key) => !storage[key]);
    errors.push(`Armazenamento incompleto, falta: ${missing.join(', ')}`);
  }
  for (const key of ['STORAGE_S3_ENDPOINT', 'STORAGE_PUBLIC_URL'] as const) {
    if (storage[key] && !/^https?:\/\//.test(storage[key])) {
      errors.push(`${key} deve começar com https://`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuração de ambiente inválida:\n- ${errors.join('\n- ')}\n` +
        'Confira o arquivo backend/.env (modelo em backend/.env.example).',
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGIN: corsOrigin,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    ...storage,
  };
}
