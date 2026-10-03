# Calories AI

Календарь питания с подсчётом калорий и КБЖУ по фото, тексту или голосу. Требования: [REQUIREMENTS.md](REQUIREMENTS.md).

```
app/     — мобильное приложение (Expo SDK 57, React Native, expo-router, SQLite)
server/  — прокси к Gemini (Node 24 + Hono), хранит API-ключ
```

## Сервер

```bash
cd server
cp .env.example .env   # GEMINI_API_KEY, APP_SECRET (любая длинная строка)
npm install
npm run dev            # http://localhost:8787, проверка: GET /health
```

Деплой — любой хостинг с Node 24 или Docker (`Dockerfile` в папке). Нужны переменные `GEMINI_API_KEY`, `APP_SECRET`, опционально `GEMINI_MODEL` (по умолчанию `gemini-3.8-flash`).

`POST /analyze` с заголовком `x-app-secret` и телом `{ image?: base64-jpeg, text?: string, lang: 'ru'|'en', hand?: {lengthCm, widthCm} }`.
Модель возвращает диапазоны веса и калорийности, сервер берёт середину.

## Приложение

```bash
cd app
cp .env.example .env   # EXPO_PUBLIC_PROXY_URL, EXPO_PUBLIC_APP_SECRET
npm install
```

Распознавание речи — нативный модуль, поэтому **Expo Go не подойдёт**, нужна сборка.

APK для Android (ставится по QR-коду из EAS):

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_PROXY_URL --value https://...
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_APP_SECRET --value ...
npx eas-cli@latest build -p android --profile preview
```

Пока сервер на http (локальная сеть) — в `app.json` включён `usesCleartextTraffic`; после деплоя на https его стоит убрать.
