# 🐷 Pigfarm Backend

Backend для Telegram Mini App "Pigfarm" с поддержкой Telegram Stars для пополнения баланса.

## 📦 Технологии

- **Node.js + Express** — сервер
- **TypeScript** — типизация
- **SQLite (better-sqlite3)** — база данных
- **Telegram Bot API** — авторизация и платежи

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните данные:

```bash
cp .env.example .env
```

**Обязательные поля:**
- `TELEGRAM_BOT_TOKEN` — токен от @BotFather
- `TELEGRAM_BOT_USERNAME` — username бота (без @)

### 3. Запуск сервера

**Режим разработки (auto-reload):**
```bash
npm run dev
```

**Продакшен:**
```bash
npm run build
npm start
```

## 📁 Структура проекта

```
server/
├── src/
│   ├── controllers/     # Обработчики запросов
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── deposit.controller.ts
│   │   └── webhook.controller.ts
│   ├── routes/          # Роуты API
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── deposit.routes.ts
│   │   └── webhook.routes.ts
│   ├── services/        # Бизнес-логика
│   │   └── telegram.ts  # Telegram Stars API
│   ├── middleware/       # Middleware
│   │   ├── auth.ts      # Авторизация через Telegram
│   │   └── errorHandler.ts
│   ├── db/              # База данных
│   │   ├── connection.ts
│   │   ├── repository.ts   # Репозитории
│   │   └── migrate.ts
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты
│   │   └── telegram.ts  # Валидация initData
│   └── index.ts         # Точка входа
├── package.json
├── tsconfig.json
└── .env
```

## 🔌 API Endpoints

### Авторизация
```
POST /api/auth
Body: { initData: string }
Response: { success: true, data: { user: {...} } }
```

### Пользователь
```
GET /api/user/profile         — Получить профиль (требует auth)
GET /api/user/balance         — Получить баланс (требует auth)
GET /api/user/transactions    — История транзакций (требует auth)
GET /api/user/:id             — Получить профиль по ID
```

### Пополнение
```
POST /api/deposit
Headers: X-Telegram-Init-Data
Body: { amount: number, description?: string }
Response: { success: true, data: { invoiceUrl, transaction } }
```

### Webhook
```
POST /api/webhook
Body: Telegram Update
Response: { ok: true }
```

## 💳 Как работают платежи

1. Клиент отправляет запрос на `/api/deposit` с суммой
2. Сервер создаёт invoice через Telegram Bot API (`createInvoiceLink`)
3. Клиент открывает invoice через `tg.openInvoice()`
4. Пользователь оплачивает в Telegram
5. Telegram отправляет webhook на `/api/webhook`
6. Сервер обновляет баланс пользователя

## 🔐 Авторизация

Авторизация происходит через валидацию `initData` от Telegram WebApp:
- Клиент передаёт `initData` в заголовке `X-Telegram-Init-Data`
- Сервер проверяет HMAC подпись с использованием токена бота
- Если пользователь новый — автоматически создаётся аккаунт

## 🗄️ База данных

Используется SQLite для простоты. Таблицы:
- `users` — пользователи с баланом
- `transactions` — история операций

Миграции: `npm run db:migrate`

## ⚙️ Переменные окружения

| Переменная | Описание | Обязательна |
|---|---|---|
| `PORT` | Порт сервера (по умолчанию 3000) | Нет |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather | Да |
| `TELEGRAM_BOT_USERNAME` | Username бота | Да |
| `CLIENT_URL` | URL клиента для CORS | Нет |
| `NODE_ENV` | Режим (development/production) | Нет |
