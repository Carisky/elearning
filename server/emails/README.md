# Mail engine

Шаблоны: `server/emails/templates/*.html`

Переменные окружения:

- `MAIL_TRANSPORT`: `smtp` | `console` | `noop` (по умолчанию `console`)
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS` (для SMTP)
- `MAIL_FROM`, `MAIL_FROM_NAME`

Также поддерживается совместимость с переменными `SMTP_*` (если у тебя уже так заведено):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM`:
  - можно передать как `"Name <email@domain>"`, или как `email@domain`
  - если передан только name (например `"Akademia TSL"`), email берётся из `SMTP_USER`
- `APP_URL` (используется для генерации ссылок, по умолчанию `http://localhost:3000`)
- `APP_NAME` (по умолчанию `E-Learning`)

Инвайты:

- `INVITE_EXPIRES_HOURS` (по умолчанию `168` = 7 дней)
