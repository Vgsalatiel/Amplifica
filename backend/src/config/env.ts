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
}

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
  };
}
