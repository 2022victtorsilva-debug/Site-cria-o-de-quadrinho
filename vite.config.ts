import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Site-cria-o-de-quadrinho/',
  plugins: [react()],
  server: { port: 4173, host: true },
  preview: { port: 4173, host: true },
  build: { sourcemap: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
