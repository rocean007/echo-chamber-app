import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric): void {
  const endpoint = import.meta.env.VITE_PERF_ENDPOINT as string | undefined
  const payload = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
  })
  if (endpoint) {
    if (navigator.sendBeacon(endpoint, payload)) return
    fetch(endpoint, { method: 'POST', body: payload, keepalive: true }).catch(() => {})
    return
  }
  if (import.meta.env.DEV) {
    console.debug(`[perf] ${metric.name}`, Math.round(metric.value * 100) / 100, metric.rating)
  }
}

export function initWebVitals(): void {
  onLCP(sendToAnalytics)
  onINP(sendToAnalytics)
  onCLS(sendToAnalytics)
}
