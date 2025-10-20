import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['pyodide']
  },
  resolve: {
    alias: {
      'pyodide': 'pyodide/pyodide.js'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['pyodide'],
      output: {
        manualChunks: undefined
      }
    }
  }
});
