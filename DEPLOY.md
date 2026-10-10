# Деплой и установка

План:
1. **Сервер** — один раз руками: клонируем репо на сервер, кладём `.env`, запускаем Docker.
2. **Автодеплой** — дальше каждый пуш в `main`, где менялся сервер, сам обновляет его через GitHub Actions.
3. **Приложение** — собираем APK в облаке Expo (EAS), жена ставит его по QR-коду.

Без домена и HTTPS: приложение ходит на `http://IP_СЕРВЕРА:8787`. Для Android это уже разрешено в сборке.

---

## 1. Сервер (один раз)

Все команды — на сервере (`ssh ваш-сервер`).

### 1.1 Проверить Docker и порт
```bash
docker -v && docker compose version
ss -tlnp | grep 8787        # пусто = порт свободен
```
Если порт занят — возьмите другой (например 8790) и укажите его в `HOST_PORT` на шаге 1.4 и в адресе на шаге 3.

### 1.2 Дать серверу доступ к приватному репо (deploy key, только чтение)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/calories_deploy -N ""
cat ~/.ssh/calories_deploy.pub
```
GitHub → репозиторий `calories-ai` → **Settings → Deploy keys → Add deploy key**: вставить выведенный ключ, галочку «Allow write access» **не** ставить.

Затем на сервере:
```bash
cat >> ~/.ssh/config <<'EOF'
Host github-calories
  HostName github.com
  User git
  IdentityFile ~/.ssh/calories_deploy
  IdentitiesOnly yes
EOF
```

### 1.3 Склонировать
```bash
git clone github-calories:vanyajet/calories-ai.git ~/calories-ai
cd ~/calories-ai/apps/server
```

### 1.4 Создать `.env`
```bash
cp .env.example .env
openssl rand -hex 32          # это будет APP_SECRET, сохраните его — понадобится на шаге 3
nano .env
```
Заполнить: `GEMINI_API_KEY`, `APP_SECRET`, при необходимости `HOST_PORT`.

### 1.5 Запустить
```bash
docker compose up -d --build api
curl http://localhost:8787/health      # {"ok":true,...}
```
Откройте порт в фаерволе сервера/панели хостинга (TCP 8787) и проверьте с телефона в браузере: `http://IP_СЕРВЕРА:8787/health`.

Логи: `docker compose logs -f api`.

---

## 2. Автодеплой через GitHub Actions

Файл уже в репо: `.github/workflows/deploy-server.yml`. При пуше в `main` (если менялись `apps/server`, `packages/shared`) он проверяет типы, заходит на сервер по SSH, делает `git pull` и перезапускает контейнер.

### 2.1 Ключ для GitHub Actions → сервер
На **Mac**:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/calories_actions -N ""
ssh-copy-id -i ~/.ssh/calories_actions.pub ваш-сервер
cat ~/.ssh/calories_actions          # приватный ключ — только в секрет GitHub, никуда больше
```

### 2.2 Секреты репозитория
GitHub → репозиторий → **Settings → Secrets and variables → Actions → New repository secret**:

| Имя | Значение |
|---|---|
| `SERVER_HOST` | IP сервера |
| `SERVER_USER` | пользователь SSH на сервере |
| `SERVER_SSH_KEY` | содержимое `~/.ssh/calories_actions` (целиком, с BEGIN/END) |
| `SERVER_PATH` | `~/calories-ai` (или полный путь, куда клонировали) |
| `SERVER_PORT` | порт SSH, только если не 22 |

Проверка: GitHub → **Actions → Deploy server → Run workflow**. Зелёная галочка = всё работает.

---

## 3. Приложение на Android (APK)

Нужен бесплатный аккаунт на https://expo.dev. Команды — на Mac, из папки приложения:
```bash
cd /Users/ivanus/Documents/Development/vj/calories-ai/apps/mobile
```

### 3.1 Привязать проект к Expo (один раз)
```bash
npx eas-cli@latest login
npx eas-cli@latest init
```
`init` допишет `projectId` в `app.json` — закоммитьте это изменение.

### 3.2 Адрес сервера и секрет (один раз)
```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_PROXY_URL --value http://IP_СЕРВЕРА:8787 --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_APP_SECRET --value ВАШ_APP_SECRET --visibility sensitive
```

### 3.3 Собрать APK
```bash
npx eas-cli@latest build -p android --profile preview
```
Сборка идёт в облаке Expo, на бесплатном тарифе обычно 10–30 минут (бывает очередь). В конце в терминале появится **QR-код и ссылка**.

### 3.4 Установить на Samsung
1. Отсканировать QR камерой телефона (или открыть ссылку) → скачать APK.
2. Открыть файл. Samsung спросит разрешение «Установка неизвестных приложений» для браузера/«Мои файлы» → разрешить → Установить.
3. Если Play Защита предупредит — «Всё равно установить».

При первом запуске приложение попросит заполнить профиль. Камера и микрофон запрашиваются при первом использовании.

### Обновления приложения
Изменили код → снова шаг 3.3 → установить новый APK поверх старого (данные сохраняются, т.к. подпись та же).
