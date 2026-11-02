import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { allowedHosts: ['terminal.local'] },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Vendor code changes rarely; separate chunks stay cached across content deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
