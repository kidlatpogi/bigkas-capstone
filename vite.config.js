import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appWebRoot = path.dirname(fileURLToPath(import.meta.url))

function htmlPerformanceHintsPlugin() {
  return {
    name: 'bigkas-html-performance-hints',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html'];
      if (!htmlAsset || htmlAsset.type !== 'asset' || typeof htmlAsset.source !== 'string') return;

      htmlAsset.source = htmlAsset.source.replace(
        /<link rel="stylesheet" crossorigin href="\/assets\/(index-[^"]+\.css)">/,
        (match, fileName) => {
          const bundleKey = `assets/${fileName}`;
          const cssAsset = bundle[bundleKey];
          if (!cssAsset || cssAsset.type !== 'asset' || typeof cssAsset.source !== 'string') return match;
          delete bundle[bundleKey];
          return `<style data-inline-entry-css>${cssAsset.source}</style>`;
        },
      );

      const routePreloadConfigs = [
        {
          route: '/activity',
          desktopChunkPattern: /^assets\/ActivityPage-[^/]+\.js$/,
          mobileChunkPattern: /^assets\/ActivityPageMobile-[^/]+\.js$/,
          imageHrefs: [],
        },
        {
          route: '/progress',
          desktopChunkPattern: /^assets\/ProgressPage-[^/]+\.js$/,
          mobileChunkPattern: /^assets\/ProgressPageMobile-[^/]+\.js$/,
          imageHrefs: [],
        },
        {
          route: '/training',
          desktopChunkPattern: /^assets\/TrainingPage-[^/]+\.js$/,
          mobileChunkPattern: /^assets\/TrainingPage-[^/]+\.js$/,
          imageHrefs: [],
        },
        {
          route: '/frameworks',
          desktopChunkPattern: /^assets\/FrameworksPage-[^/]+\.js$/,
          mobileChunkPattern: /^assets\/FrameworksPage-[^/]+\.js$/,
          imageHrefs: [],
        },
        {
          route: '/achievements',
          desktopChunkPattern: /^assets\/AchievementsPage-[^/]+\.js$/,
          mobileChunkPattern: /^assets\/AchievementsPageMobile-[^/]+\.js$/,
          imageHrefs: ['https://assets.bigkas.site/Sprites/Thropies/Trophy_Level_4.webp'],
        },
      ];

      const findChunkHref = (chunkPattern) => {
        const routeChunk = Object.values(bundle).find((asset) => (
          asset.type === 'chunk' &&
          asset.isEntry === false &&
          chunkPattern.test(asset.fileName)
        ));
        return routeChunk?.fileName ? `/${routeChunk.fileName}` : null;
      };

      const routePreloads = routePreloadConfigs.flatMap(({
        route,
        desktopChunkPattern,
        mobileChunkPattern,
        imageHrefs,
      }) => {
        const desktopChunkHref = findChunkHref(desktopChunkPattern);
        const mobileChunkHref = findChunkHref(mobileChunkPattern);
        if (!desktopChunkHref && !mobileChunkHref) return [];
        return [{
          route,
          desktopHrefs: [...new Set([desktopChunkHref, ...imageHrefs].filter(Boolean))],
          mobileHrefs: [...new Set([mobileChunkHref, ...imageHrefs].filter(Boolean))],
          imageHrefs,
        }];
      });

      if (routePreloads.length > 0) {
        const preloadsJson = JSON.stringify(routePreloads);
        const preloadScript = [
          '<script>',
          '!function(){',
          'var p=location.pathname;',
          'var isMobile=window.matchMedia&&window.matchMedia("(max-width: 1023px)").matches;',
          `var routes=${preloadsJson};`,
          'routes.forEach(function(r){',
          'if(p===r.route||p.indexOf(r.route+"/")===0){',
          'var hrefs=isMobile?r.mobileHrefs:r.desktopHrefs;',
          'hrefs.forEach(function(h){',
          'var l=document.createElement("link");',
          'l.href=h;',
          'if(r.imageHrefs.indexOf(h)!==-1){',
          'l.rel="preload";',
          'l.as="image";',
          'l.fetchPriority="high";',
          '}else{',
          'l.rel="modulepreload";',
          'l.crossOrigin="";',
          '}',
          'document.head.appendChild(l);',
          '});',
          '}',
          '});',
          '}();',
          '</script>',
        ].join('');

        htmlAsset.source = htmlAsset.source.replace(
          /(\s*<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>)/,
          `\n    ${preloadScript}$1`,
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // Ensure `.env` is always loaded from this app (avoids empty import.meta.env when cwd differs, e.g. turbo/monorepo).
  root: appWebRoot,
  envDir: appWebRoot,
  plugins: [react(), htmlPerformanceHintsPlugin()],
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
    target: 'es2019',
    cssTarget: 'chrome61',
    sourcemap: false,
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
