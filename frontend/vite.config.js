
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
      open: true,
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
        // Name format for chunks
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // Chunking strategy - keep it simple to prevent empty chunks
        manualChunks(id) {
          // Split node modules into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react'
            } else if (id.includes('firebase')) {
              return 'vendor-firebase'
            } else if (id.includes('framer-motion') || id.includes('lottie-react')) {
              return 'vendor-ui'
            } else if (id.includes('zustand') || id.includes('axios') || id.includes('date-fns') || id.includes('jwt-decode')) {
              return 'vendor-common'
            } else {
              return 'vendor-misc'
            }
          }
        }
      }
    },
    
    terserOptions: {
      compress: {
        drop_console: dropConsole,
        drop_debugger: true,
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
    target: 'es2020',
  },

  // Stage 5: Aggressive dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
      'framer-motion',
      'lottie-react',
      'date-fns',
      'jwt-decode'
    ],
    exclude: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
    
    // Force aggressive pre-bundling
    esbuildOptions: {
      target: 'es2020',
      keepNames: false, // Allow aggressive mangling
    }
  }
  };
})