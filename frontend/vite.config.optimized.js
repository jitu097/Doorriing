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
    // Enable minification
    minify: 'terser',
    
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manually define chunks for better splitting
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lottie-react'],
          'vendor-state': ['zustand'],
          'vendor-http': ['axios'],
          
          // Feature chunks
          'chunk-auth': [
            './src/pages/auth/Login.jsx',
            './src/pages/auth/Signup.jsx',
            './src/pages/auth/DeleteAccount.jsx'
          ],
          
          'chunk-shopping': [
            './src/pages/Grocery/Grocery.jsx',
            './src/pages/Restaurant/Restaurant.jsx',
            './src/pages/shop/ShopsList.jsx',
            './src/pages/shop/ShopDetails.jsx'
          ],
          
          'chunk-cart-checkout': [
            './src/pages/cart/Checkout.jsx',
            './src/pages/cart/CheckoutPayment.jsx',
            './src/pages/cart/OrderSuccess.jsx'
          ],
          
          'chunk-orders': [
            './src/pages/orders/OrderConfirmation.jsx',
            './src/pages/orders/OrdersList.jsx',
            './src/pages/orders/OrderDetails.jsx',
            './src/pages/orders/TrackOrder.jsx'
          ],
          
          'chunk-profile': [
            './src/pages/profile/Profile.jsx',
            './src/pages/Address/Address.jsx'
          ],
          
          'chunk-legal': [
            './src/pages/legal/About.jsx',
            './src/pages/legal/Contact.jsx',
            './src/pages/legal/PrivacyPolicy.jsx',
            './src/pages/legal/TermsConditions.jsx',
            './src/pages/legal/RefundPolicy.jsx',
            './src/pages/legal/DeleteAccountInfo.jsx'
          ]
        },
        
        // Name format for chunks
        chunkFileNames: 'chunk-[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
    
    // Compression settings
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      output: {
        comments: false,
      }
    },
    
    // CSS minification
    cssMinify: true,
    
    // Source maps for production debugging
    sourcemap: false,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    
    // Report compressed size
    reportCompressedSize: true,
  },

  // Optimization config
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
      'firebase',
      'framer-motion',
      'lottie-react'
    ]
  }
})
