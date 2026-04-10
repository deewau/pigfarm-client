# Pigfarm — Telegram Mini App

Монорепозиторий с клиентской (React + Vite) и серверной (Express) частями.

## Структура

```
pigfarm/
├── client/          # React фронтенд (Vite + TypeScript)
├── server/          # Express бэкенд (TypeScript)
├── package.json     # Корневые скрипты
└── .env             # Переменные окружения
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm run install:all
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

Обязательные поля:
- `TELEGRAM_BOT_TOKEN` — токен от @BotFather
- `TELEGRAM_BOT_USERNAME` — имя бота (без @)

### 3. Запуск в режиме разработки

```bash
npm run dev
```

Это запустит:
- **Сервер** на `http://localhost:3000`
- **Клиент** на `http://localhost:5173` (с прокси на сервер)

Все API-запросы (`/api/*`) автоматически проксируются на сервер, поэтому CORS-проблем не возникает.

### 4. Сборка для продакшена

```bash
npm run build
```

Соберёт и клиент (`client/dist/`), и сервер (`server/dist/`).

## Доступные скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск клиента и сервера одновременно |
| `npm run client` | Только клиент (dev) |
| `npm run server` | Только сервер (dev) |
| `npm run build` | Сборка клиента и сервера |
| `npm run install:all` | Установка всех зависимостей |

## Деплой

### Бэкенд (Render)

Конфигурация уже в `render.yaml`. Убедитесь, что настроены:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `CLIENT_URL` — URL вашего фронтенда

### Фронтенд (Vercel/Netlify)

При сборке укажите `VITE_API_URL`:
```
VITE_API_URL=https://your-backend.onrender.com
```
