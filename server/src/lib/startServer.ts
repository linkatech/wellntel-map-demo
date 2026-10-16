import type { Application } from 'express'
import { createServer, type Server } from 'http'

interface StartServerOptions {
  dev?: boolean
}

export function startServer(
  app: Application,
  port: number,
  onListening: (server: Server) => void,
  options: StartServerOptions = {},
) {
  const isDev = options.dev ?? process.env.NODE_ENV !== 'production'
  let server: Server | null = null
  let shuttingDown = false

  function bind(attempt = 0) {
    if (shuttingDown) return

    server = createServer(app)

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && isDev && !shuttingDown && attempt < 8) {
        server?.close()
        server = null
        setTimeout(() => bind(attempt + 1), 250)
        return
      }

      console.error(err)
      process.exit(1)
    })

    const ready = () => {
      if (server) onListening(server)
    }

    if (isDev) {
      server.listen(port, '127.0.0.1', ready)
      return
    }

    server.listen(port, ready)
  }

  function shutdown() {
    if (shuttingDown) return
    shuttingDown = true

    if (!server) {
      process.exit(0)
      return
    }

    server.closeAllConnections()
    server.close(() => {
      process.exit(0)
    })

    setTimeout(() => process.exit(0), 2000).unref()
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR2'] as const) {
    process.on(signal, shutdown)
  }

  bind()
}
