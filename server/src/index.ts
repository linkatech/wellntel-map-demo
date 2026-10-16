import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { sensors } from './data/sensors.js'
import { meshStations } from './lib/meshStations.js'
import { serveClient } from './lib/serveClient.js'
import { startServer } from './lib/startServer.js'

const POINT_KINDS = new Set(['wellintel', 'other'])

const app = express()

app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'map-demo-back',
    appPublicUrl: env.appPublicUrl,
    clientOrigin: env.clientOrigin,
  })
})

app.get('/api/sensors', (_req, res) => {
  res.json({
    sensors: [...sensors.filter((sensor) => POINT_KINDS.has(sensor.kind)), ...meshStations],
  })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

if (env.nodeEnv === 'production') {
  serveClient(app)
}

startServer(
  app,
  env.port,
  () => {
    console.log(`API listening on ${env.appPublicUrl}`)
  },
  { dev: env.nodeEnv !== 'production' },
)
