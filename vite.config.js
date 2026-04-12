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
})
