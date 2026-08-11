# Elearning

## Первый запуск

Нужны Node.js, npm и Docker Compose. Создайте локальный файл окружения:

```bash
cp .env.example .env
```

Обязательно замените `JWT_SECRET` в `.env` на длинную случайную строку. Затем установите зависимости:

```bash
npm ci
```

## Разработка

Одна команда поднимает PostgreSQL, применяет миграции и запускает Nuxt:

```bash
npm run full
```

Сайт будет доступен по адресу `http://localhost:3000`. Prisma Studio запускается отдельно:

```bash
npm run prisma:studio
```

`npm run docker:up` запускает только базу данных и потому сам по себе сайт не открывает.

## Production-сервер

После `npm ci` выполните:

```bash
npm run server:deploy
```

Команда поднимает БД, генерирует Prisma Client, применяет миграции, собирает Nuxt и перезапускает сайт. По умолчанию Node слушает только `127.0.0.1:3344`; внешний доступ обычно настраивается через Apache или другой reverse proxy.

Последующие команды:

```bash
npm run server:status
npm run server:restart
npm run server:stop
tail -f .output/server.log
```

PostgreSQL опубликован как `127.0.0.1:5431:5432`, поэтому порт `5431` недоступен с внешних сетевых интерфейсов. `DATABASE_URL` приложения при этом использует `127.0.0.1:5431`.
