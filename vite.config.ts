import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src/app',
  publicDir: 'assets',
  build: {
    outDir: '../../dist',
    emptyOutDir: false, // Don't empty - we need tsc output for browser tests
    assetsInlineLimit: 100000, // Inline assets up to 100KB
    rollupOptions: {
      output: {
        // Inline everything into single file
        inlineDynamicImports: true,
        entryFileNames: 'navigator.js',
        assetFileNames: 'navigator.[ext]'
      }
    },
    // Increase chunk size warning limit (we want one big file)
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    viteSingleFile()
  ]
});
