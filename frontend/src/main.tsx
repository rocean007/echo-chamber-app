import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './store/gameStore'
import { connectGameSocket } from './services/gameSocket'

connectGameSocket()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

function schedulePerf(): void {
  const run = () => {
    import('./perf/webVitals')
      .then(m => m.initWebVitals())
      .catch(() => {})
  }
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 4000 })
  } else {
    setTimeout(run, 0)
  }
}
schedulePerf()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
