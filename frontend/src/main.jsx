import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AddressProvider } from './context/AddressContext'
import { startLogStream } from './utils/logStream'

// Safety check for root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ CRITICAL ERROR: Root element not found in DOM!')
  console.error('Expected: <div id="root"></div> in index.html')
  console.error('HTML content:', document.documentElement.innerHTML.substring(0, 500))
  // Create root div as fallback
  const fallbackRoot = document.createElement('div')
  fallbackRoot.id = 'root'
  document.body.appendChild(fallbackRoot)
  console.warn('⚠️ Created fallback root element in body')
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
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
  )
  console.log('✅ App mounted successfully')
} catch (error) {
  console.error('❌ Failed to render app:', error)
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: Arial;">
    <h1>Error Loading App</h1>
    <p>${error.message}</p>
    <p style="color: gray; font-size: 12px;">Check browser console for details</p>
  </div>`
}

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
