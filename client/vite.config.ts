import dns from 'node:dns'
import { createLogger, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { PUBLIC_BASE_PATH } from '../shared/index.ts'

dns.setDefaultResultOrder('ipv4first')

const DEV_PORT = 4300

const logger = createLogger()
const logError = logger.error.bind(logger)
logger.error = (msg, options) => {
  const text = String(msg)
  const err = options?.error
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  if (text.includes('http proxy error') && (code === 'ECONNREFUSED' || text.includes('ECONNREFUSED'))) {
    return
  }
  logError(msg, options)
}

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === 'build' ? `${PUBLIC_BASE_PATH}/` : '/'),
  customLogger: logger,
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['leaflet', 'leaflet-draw', 'plotly.js-dist-min', 'react-plotly.js'],
  },
  server: {
    host: '127.0.0.1',
    port: DEV_PORT,
    strictPort: true,
    hmr: { host: '127.0.0.1' },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4301',
        ws: true,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'API server is not running' }))
            }
          })
        },
      },
    },
  },
}))
