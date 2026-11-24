import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      'figma:shaders': fileURLToPath(new URL('./src/figma-shaders.js', import.meta.url)),
    },
  },
});
