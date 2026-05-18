import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appWebRoot = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Ensure `.env` is always loaded from this app (avoids empty import.meta.env when cwd differs, e.g. turbo/monorepo).
  root: appWebRoot,
  envDir: appWebRoot,
  plugins: [react()],
  resolve: {
    // Single React instance — required when npm workspaces hoist a different copy than a nested dependency (invalid hook call).
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    alias: {
      '@session': path.join(appWebRoot, 'src/services/session'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');
          if (!normalizedId.includes('/node_modules/')) return undefined;
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/react-router/') ||
            normalizedId.includes('/node_modules/react-router-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-framework';
          }
          if (
            normalizedId.includes('/node_modules/framer-motion/') ||
            normalizedId.includes('/node_modules/motion-dom/') ||
            normalizedId.includes('/node_modules/motion-utils/')
          ) {
            return 'vendor-motion';
          }
          if (normalizedId.includes('/node_modules/@supabase/')) return 'vendor-supabase';
          if (
            normalizedId.includes('/node_modules/lottie-react/') ||
            normalizedId.includes('/node_modules/lottie-web/')
          ) {
            return 'vendor-lottie';
          }
          if (normalizedId.includes('/node_modules/recharts/')) return 'vendor-charts';
          if (normalizedId.includes('/node_modules/react-icons/io5/')) return 'vendor-icons-core';
          if (
            normalizedId.includes('/node_modules/react-icons/fa/') ||
            normalizedId.includes('/node_modules/react-icons/gi/') ||
            normalizedId.includes('/node_modules/react-icons/si/') ||
            normalizedId.includes('/node_modules/react-icons/lu/') ||
            normalizedId.includes('/node_modules/react-icons/hi2/') ||
            normalizedId.includes('/node_modules/react-icons/fi/')
          ) {
            return 'vendor-icons-extra';
          }
          return undefined;
        },
      },
    },
  },
})
