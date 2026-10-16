import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Express, Request, Response } from 'express'
import express from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../../../client/dist')

function spaFallback(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(404).end()
    return
  }
  if (path.extname(req.path)) {
    res.status(404).end()
    return
  }
  res.sendFile(path.join(clientDist, 'index.html'))
}

/** Serve the Vite build from this process. Origin paths stay at `/`; the Worker adds the public prefix. */
export function serveClient(app: Express) {
  if (!fs.existsSync(path.join(clientDist, 'index.html'))) {
    console.error(`Client build missing at ${clientDist}. Run npm run build in client/.`)
    process.exit(1)
  }

  app.use(express.static(clientDist, { index: false }))
  app.use(spaFallback)
}
