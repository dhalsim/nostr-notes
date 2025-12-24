import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    solidPlugin(),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: ['**/deps/**'],
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  build: {
    target: 'esnext',
  },
});
