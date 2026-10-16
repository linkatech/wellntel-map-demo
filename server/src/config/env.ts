import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 4301,
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4300',
  appPublicUrl: (process.env.APP_PUBLIC_URL ?? `http://localhost:${process.env.PORT || 4301}`).replace(
    /\/$/,
    '',
  ),
}
