import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    server: { deps: { inline: ['@supabase/auth-ui-react'] } },
    maxWorkers: 1,
    minWorkers: 1,
  },
});
