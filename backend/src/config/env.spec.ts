import { validateEnv } from './env.js';

const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:pass@host/db',
  JWT_ACCESS_SECRET: 'x'.repeat(48),
};

describe('validateEnv', () => {
  it('devolve as variáveis tipadas quando tudo está presente', () => {
    expect(validateEnv(valid)).toEqual({ ...valid, PORT: 3000 });
  });

  it('usa valores padrão para NODE_ENV e PORT', () => {
    const env = validateEnv({
      CORS_ORIGIN: valid.CORS_ORIGIN,
      DATABASE_URL: valid.DATABASE_URL,
      JWT_ACCESS_SECRET: valid.JWT_ACCESS_SECRET,
    });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
  });

  it('lista todas as variáveis que faltam em um único erro', () => {
    expect(() => validateEnv({})).toThrow(/CORS_ORIGIN[\s\S]*DATABASE_URL/);
  });

  it('recusa segredo de JWT curto demais', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'curto' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('recusa DATABASE_URL que não é PostgreSQL', () => {
    expect(() =>
      validateEnv({ ...valid, DATABASE_URL: 'mysql://host/db' }),
    ).toThrow(/postgresql:\/\//);
  });
});
