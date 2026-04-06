import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AddressProvider } from './context/AddressContext'
import { startLogStream } from './utils/logStream'

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
