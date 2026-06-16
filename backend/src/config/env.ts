import fs from 'fs'
import path from 'path'

// Лёгкий парсер .env без внешних зависимостей.
function loadDotEnv() {
  const file = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}
loadDotEnv()

// Минимальная загрузка .env без зависимостей: читаем process.env с дефолтами.
function read(name: string, fallback: string): string {
  const v = process.env[name]
  return v && v.length > 0 ? v : fallback
}

function readList(name: string, fallback: string): string[] {
  const values = read(name, fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return Array.from(new Set([...values, 'http://localhost:5173']))
}

export const ENV = {
  PORT: Number(read('PORT', '4000')),
  CORS_ORIGIN: read('CORS_ORIGIN', 'http://localhost:5173'),
  CORS_ORIGINS: readList('CORS_ORIGIN', 'http://localhost:5173'),
  JWT_SECRET: read('JWT_SECRET', 'ibs-dashboard-dev-secret-change-me'),
  JWT_EXPIRES_IN: read('JWT_EXPIRES_IN', '12h'),
  DB_FILE: path.resolve(process.cwd(), read('DB_FILE', './data/store.json')),
}
