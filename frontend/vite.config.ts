import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Em desenvolvimento, o Vite encaminha /api para o NestJS. O navegador só fala
    // com localhost:5173, o que reproduz o comportamento de produção (rewrite na Vercel)
    // e evita problemas de CORS e de cookies entre origens.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
