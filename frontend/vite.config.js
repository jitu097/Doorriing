import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const dropConsole = env.VITE_DROP_CONSOLE !== 'false';

  return {
    base: '/',
    plugins: [
      react(),
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html'
      })
    ],
  
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        }
      }
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'terser',
      
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',

          // STEP 5 PHASE 7: Manual vendor chunk splitting for long-term browser caching.
          // These vendor chunks are stable across app updates, so users only re-download
          // the app chunk when business logic changes — not when deps haven't changed.
          manualChunks(id) {
            // React core — check before any generic vendor-misc fallthrough
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }

            // React Router — separate from React so router upgrades don't bust React cache
            if (
              id.includes('/node_modules/react-router') ||
              id.includes('/node_modules/@remix-run/')
            ) {
              return 'vendor-router';
            }

            // Firebase — large library, rarely changes independently
            if (
              id.includes('/node_modules/firebase/') ||
              id.includes('/node_modules/@firebase/')
            ) {
              return 'vendor-firebase';
            }

            // Framer Motion — used only in LoadingScreen, keep in its own cache unit
            if (id.includes('/node_modules/framer-motion')) {
              return 'vendor-motion';
            }

            // Zustand — tiny, but separate to keep it stable
            if (id.includes('/node_modules/zustand')) {
              return 'vendor-state';
            }

            // Everything else in node_modules goes into a shared vendor chunk
            if (id.includes('/node_modules/')) {
              return 'vendor-misc';
            }
          },
        }
      },
      
      terserOptions: {
        compress: {
          drop_console: dropConsole,
          drop_debugger: true,
          // STEP 5 PHASE 7: Two terser passes for more aggressive dead code elimination.
          // Second pass catches dead code exposed after the first pass's inlining.
          // Cost: ~15% slower build. Benefit: ~3-5% smaller output bundle.
          passes: 2,
          // Remove unused function arguments
          unused: true,
          // Collapse single-use variables
          collapse_vars: true,
        },
        mangle: true,
        format: {
          comments: false,
        },
      },
      
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      reportCompressedSize: true,
      target: 'es2019', // Slightly broader WebView compatibility vs es2020, no bundle size cost
    },

    // STEP 5 PHASE 7: Optimized dependency pre-bundling.
    // Only pre-bundle deps that are actually imported (removes axios, lottie-react).
    // - axios: not directly imported anywhere in src/ (verified with grep)
    // - lottie-react: already dynamically imported in animationOptimization.js
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'framer-motion',
        'date-fns',
        'jwt-decode'
        // NOTE: 'axios' removed — not used in src/ (uses native fetch via api.js)
        // NOTE: 'lottie-react' removed — already dynamic import in animationOptimization.js
      ],
      exclude: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
      
      esbuildOptions: {
        target: 'es2019',
        keepNames: false, // Allow aggressive mangling
      }
    }
  };
});
