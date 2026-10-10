# Calories AI

Календарь питания с подсчётом калорий и КБЖУ по фото, тексту или голосу. Требования: [REQUIREMENTS.md](REQUIREMENTS.md).

Монорепа на npm workspaces:

```
apps/mobile/       — мобильное приложение (Expo SDK 57, expo-router, SQLite)
apps/server/       — прокси к Gemini (Node 24 + Hono), хранит API-ключ
packages/shared/   — общий контракт API (типы запроса/ответа /analyze)
```

```bash
npm install          # из корня, ставит зависимости всех пакетов
npm run typecheck    # проверка типов во всех пакетах
npm run server       # сервер в режиме разработки
npm run mobile       # Metro для приложения
```

## Сервер

```bash
cp apps/server/.env.example apps/server/.env   # GEMINI_API_KEY, APP_SECRET
npm run server                                 # http://localhost:8787, GET /health
```

Docker (контекст сборки — корень репозитория, т.к. нужен `packages/shared`):

```bash
cd apps/server
docker compose up -d --build                    # http://IP:8787
docker compose --profile https up -d --build    # + Caddy с HTTPS, нужен DOMAIN в .env
```

`POST /analyze`, заголовок `x-app-secret`, тело и ответ описаны в `packages/shared/src/index.ts`.
Модель возвращает диапазоны веса и калорийности, сервер берёт середину.

## Приложение

```bash
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_PROXY_URL, EXPO_PUBLIC_APP_SECRET
```

Распознавание речи — нативный модуль, поэтому **Expo Go не подойдёт**, нужна сборка.

APK для Android (ставится по QR-коду из EAS), команды из `apps/mobile`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_PROXY_URL --value https://...
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_APP_SECRET --value ...
npx eas-cli@latest build -p android --profile preview
```

Пока сервер на http — в `app.json` включён `usesCleartextTraffic`; после перехода на https его стоит убрать.
