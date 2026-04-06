import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AddressProvider } from './context/AddressContext'
import { startLogStream } from './utils/logStream'

// Global error tracking
window.onerror = function (message, source, lineno, colno, error) {
  console.error('🔥 GLOBAL ERROR:', {
    message,
    source,
    lineno,
    colno,
    error: error?.stack || error,
  });
};

window.onunhandledrejection = function (event) {
  console.error('🔥 UNHANDLED PROMISE REJECTION:', {
    reason: event.reason?.stack || event.reason,
  });
};

console.log('✅ App initialization started');

// Render with error boundary
try {
  const root = document.getElementById('root');
  console.log('✅ Root element found:', root);

  if (!root) {
    throw new Error('Root element not found in DOM');
  }

  console.log('✅ Creating React root');
  const reactRoot = ReactDOM.createRoot(root);

  console.log('✅ Rendering App component');
  reactRoot.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AddressProvider>
              <App />
            </AddressProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );

  console.log('✅ React render triggered successfully');
} catch (err) {
  console.error('🔥 RENDER CRASH:', {
    message: err?.message,
    stack: err?.stack,
    type: err?.constructor?.name,
  });
  document.getElementById('root').innerHTML = `<div style="color: red; padding: 20px;"><h3>App crashed during render:</h3><pre>${err?.message}</pre></div>`;
}

console.log('App mounted')

startLogStream()

if ('serviceWorker' in navigator) {
  const swEnabled = import.meta.env.PROD && import.meta.env.VITE_SW_DISABLED !== 'true'
  if (swEnabled) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('SW registered', reg))
        .catch(err => console.log('SW failed', err))
    })
  } else {
    // Prevent dev-time caching/HMR issues from a previously registered SW.
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister())
    })
  }
}
