import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { I18nProvider } from './services/i18n'

// Add error logging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

console.log('Starting PassGen app...')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)

console.log('React app rendered')
