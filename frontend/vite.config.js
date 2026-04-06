
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
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
    // Enable minification with terser
    minify: 'terser',
    
    // Code splitting configuration with tree-shaking optimization
    rollupOptions: {
      // Advanced tree-shaking configuration
      treeshake: {
        moduleSideEffects: false, // Assume modules have no side effects
        propertyReadSideEffects: false, // Don't assume property reads have side effects
        tryCatchDeoptimization: false, // Don't disable optimization in try-catch
      },
      
      output: {
        // Name format for chunks
        chunkFileNames: 'chunk-[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // Improved chunking strategy
        manualChunks(id) {
          // Split node modules into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            } else if (id.includes('firebase')) {
              return 'vendor-firebase';
            } else if (id.includes('framer-motion') || id.includes('lottie-react')) {
              return 'vendor-ui';
            } else if (id.includes('zustand')) {
              return 'vendor-state';
            } else if (id.includes('axios')) {
              return 'vendor-http';
            } else {
              return 'vendor-common';
            }
          }
        }
      }
    },
    
    // Stage 5: Aggressive compression settings
    terserOptions: {
      compress: {
        drop_console: true, // Remove console outputs
        drop_debugger: true, // Remove debugger statements
        passes: 3, // Multiple compression passes for better results
        pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.debug'],
        pure_getters: true, // Assume getters are pure
        reduce_vars: true, // Reduce variables
        toplevel: true, // Enable when you're not using an IIFE
        unused: true, // Drop unused variables/functions
        unsafe: true, // Enable unsafe optimizations (for performance)
        unsafe_comps: true, // Optimize comparisons
        unsafe_methods: true, // Optimize method calls
      },
      mangle: {
        properties: false, // Don't mangle property names (could break things)
        toplevel: true, // Mangle top-level variable names
      },
      output: {
        comments: false, // Remove all comments
        beautify: false, // Don't beautify output
      }
    },
    
    // CSS minification (aggressive)
    cssMinify: true, // Use default CSS minification
    
    // No source maps needed in production
    sourcemap: false,
    
    // Chunk size warnings threshold
    chunkSizeWarningLimit: 600, // Increased slightly due to features
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Target modern browsers for smaller output
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
})