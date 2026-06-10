# IBS Dashboard — Backend

Node.js + TypeScript + Express. Авторизация (JWT в httpOnly cookie), роли, синтетические
данные за 2020–2026 (классы 1–11), Excel-отчёты (`exceljs`), настройки и уведомления.

## Запуск

```bash
npm install
npm run seed     # инициализация хранилища: демо-пользователи (bcrypt), настройки, уведомления, отчёты
npm run dev      # http://localhost:4000/api  (tsx watch)
# или
npm run build && npm start
```

Конфигурация — `.env` (см. `.env.example`): `PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DB_FILE`.

## Хранилище

Для прототипа — JSON-файл `data/store.json` (см. `src/db/store.ts`): изменяемое состояние
(пользователи, настройки, уведомления, история отчётов). Крупные синтетические данные
генерируются детерминированно в `src/data/generate.ts`. Схема легко переносится на SQLite/Prisma.

## API

Все маршруты под `/api`. Приватные требуют cookie-сессию (после `POST /auth/login`).

| Метод | Путь | Доступ |
|------|------|--------|
| POST | `/auth/login` | публичный |
| POST | `/auth/logout` | публичный |
| GET | `/auth/me` | авторизованные |
| GET | `/users`, `/users/:id` | ADMIN |
| POST | `/users` | ADMIN |
| PATCH | `/users/:id` | ADMIN |
| DELETE | `/users/:id` | ADMIN |
| GET | `/dashboard/summary` | авторизованные |
| GET | `/dashboard/class-rating` | авторизованные |
| GET | `/dashboard/final-rating` | авторизованные |
| GET | `/dashboard/olympiad-rating` | авторизованные |
| GET | `/classes`, `/classes/:id` | авторизованные |
| GET | `/students`, `/students/:id` | авторизованные |
| GET | `/exams/comparison`, `/exams/by-class` | авторизованные |
| GET | `/olympiads/comparison`, `/olympiads/rating`, `/olympiads/by-class` | авторизованные |
| GET | `/risks`, `/risks/:studentId` | управленческие роли + ANALYST + TEACHER |
| GET | `/settings` | авторизованные |
| PATCH | `/settings` | ADMIN, DIRECTOR |
| GET | `/notifications` | авторизованные |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | авторизованные |
| GET | `/reports/history` | авторизованные |
| POST | `/reports/export` | авторизованные (отдаёт `.xlsx`) |
| GET | `/reports/:id/download` | авторизованные (отдаёт `.xlsx`) |
| GET | `/meta`, `/health` | публичные |

Общие query-параметры данных: `year` (2020–2026), `grade` (1–11 или `all`), `classId`.

## Демо-доступы

См. корневой `README.md`. Пароли в БД — только bcrypt-хэши. Это демо-учётки для локального
прототипа; в продакшене их необходимо удалить/заменить и задать свой `JWT_SECRET`.
