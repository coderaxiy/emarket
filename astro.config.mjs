// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// `astro build` / `astro check` pre-bundle deps in production mode. Sharing
// node_modules/.vite with a running `astro dev` makes every island throw
// `_jsxDEV is not a function`, so production tooling gets its own cache dir.
const isProductionTooling = ['build', 'check'].includes(process.argv[2] ?? '');

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  env: {
    schema: {
      PUBLIC_API_BASE_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
        default: 'http://localhost:8000/api/v1',
      }),
      PUBLIC_YANDEX_MAPS_API_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_YANDEX_SUGGEST_API_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_USE_FIXTURES: envField.boolean({
        context: 'client',
        access: 'public',
        default: false,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    cacheDir: isProductionTooling ? 'node_modules/.vite-build' : 'node_modules/.vite',
  },
});
