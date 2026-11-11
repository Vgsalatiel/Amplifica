import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Valores fictícios: a validação de ambiente exige as variáveis,
    // mas os testes e2e não se conectam a um banco real.
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
});
