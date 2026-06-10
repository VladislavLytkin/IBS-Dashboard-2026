import { createApp } from './app'
import { ENV } from './config/env'
import { isInitialized } from './db/store'

const app = createApp()

app.listen(ENV.PORT, () => {
  console.log(`IBS backend запущен: http://localhost:${ENV.PORT}/api`)
  if (!isInitialized()) {
    console.warn('⚠ Хранилище не инициализировано. Выполните: npm run seed')
  }
})
