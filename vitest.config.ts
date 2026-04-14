import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    clearMocks: true,
    exclude: ['.claude/**', '**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**'],
      exclude: [
        'src/test/**',
        'src/assets/**',
        'src/styles/**',
        'src/types/**',
        '**/.DS_Store',
        '**/*.css.ts',
        'src/constants/**',
        'src/main.tsx',
        'src/testUtils.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    {
      name: 'mock-css-ts',
      enforce: 'pre',
      transform(_code, id) {
        if (id.endsWith('.css.ts')) {
          return { code: 'export default {}', map: null };
        }
      },
      resolveId(id) {
        if (id.endsWith('.css.ts') || id.endsWith('.css')) {
          return null;
        }
      },
    },
  ],
});
