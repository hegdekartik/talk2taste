import { defineConfig } from 'vite';

export default defineConfig({
  // Vercel handles routing, but Vite handles building the assets.
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});
