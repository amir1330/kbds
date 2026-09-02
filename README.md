# kbds.split

Production-ready e-commerce storefront for custom hand-wired split ergonomic mechanical keyboards.

## Stack

| Layer | Tech |
|---|---|
| Frontend | SvelteKit + Tailwind CSS (JetBrains Mono) |
| Backend | FastAPI + SQLModel |
| Database | PostgreSQL |
| Cache | Redis (shopping cart sessions) |
| Infra | Docker Compose + Traefik (Let's Encrypt) |
| CI/CD | GitHub Actions → GHCR → SSH deploy |

## Quick start (local)

```bash
./dev.sh
```

Runs **without Docker** — SQLite database, in-memory cart, vite hot reload.

- Layout editor: http://127.0.0.1:5173/request
- Admin: http://127.0.0.1:5173/admin (default `admin` / `admin`)
- API: http://127.0.0.1:8001/api/health

Stop: `./dev.sh stop`

### Docker (production / optional)

Docker files remain for VPS deploy. Local dev does not use them.

```bash
docker compose -f docker-compose.prod.yml up -d   # production only
```

## Design

Dark-mode-first, zero border-radius, 1px structural borders, JetBrains Mono globally — inspired by [ergosplits.ru](https://ergosplits.ru).

## Features

- Product grid + spec-heavy detail pages with `.uf2` firmware downloads
- Redis-backed reactive cart (slide-out drawer)
- Interactive keymap editor with MIT-licensed KLE JSON parser
- Telegram notifications on orders and contact submissions
- JWT-protected admin CRUD + firmware/PDF uploads

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables: `DOMAIN`, `SECRET_KEY`, `ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Production deploy

Follows the hardened VPS SSH pattern (no webhooks):

1. Bootstrap deploy user on VPS: `USER_NAME=kbds ./deploy/bootstrap-vps.sh`
2. Copy `docker-compose.prod.yml` + `.env` to `/home/kbds/kbds/`
3. Set GitHub secrets: `HOST`, `USERNAME`, `SSH_KEY`
4. Push to `main` — CI builds GHCR images and SSH-deploys

Traefik routes:
- `https://${DOMAIN}` → frontend
- `https://${DOMAIN}/api` → FastAPI backend

## Project structure

```
frontend/     SvelteKit storefront + keymap editor
backend/      FastAPI API, cart, auth, uploads
deploy/       VPS bootstrap + remote deploy scripts
.github/      CI/CD workflow + pinned known_hosts
```

## License

[GNU Affero General Public License v3.0](LICENSE) — Copyright (C) 2026 [amir1330](https://github.com/amir1330).
See `LICENSE` for full text. Source: <https://github.com/amir1330/kbds>
