# WooCommerce Telegram Price Bot

Real-time WooCommerce price tracking with Telegram notifications. A central
backend polls WooCommerce, caches state in Redis and PostgreSQL, detects
price changes, and updates existing Telegram messages in place
(`editMessageText`) — Telegram never queries WooCommerce directly, and no
user ever triggers a WooCommerce request on the hot path.

## Architecture

```
                     ┌──────────────────┐
                     │   WooCommerce    │
                     │ Product / Price  │
                     └────────┬─────────┘
                              │ HTTPS / REST API
                              ▼
                    ┌──────────────────┐
                    │ WooCommerce      │
                    │ Service          │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ Price Service /  │
                    │ Product Service  │
                    └───────┬──────────┘
             ┌──────────────┴──────────────┐
             ▼                             ▼
      ┌──────────────┐              ┌──────────────┐
      │    Redis     │              │  PostgreSQL  │
      │ Cache / Lock │              │Source of Truth│
      └──────┬───────┘              └──────────────┘
             ▼
      ┌─────────────────┐
      │ Telegram Worker │  (editMessageText, never sendMessage on update)
      └────────┬────────┘
               ▼
          Telegram API
```

Every 60 seconds (`PRICE_SYNC_INTERVAL_MS`) the scheduler triggers the price
worker, which:

1. Acquires a Redis distributed lock (`SET price-sync:lock NX EX 55`) so only
   one worker instance runs a cycle at a time.
2. Loads only the **distinct set of products that have at least one active
   subscription** — untracked products are never polled.
3. Fetches those products from WooCommerce in as few requests as possible
   (`include` filter, paginated by `WOOCOMMERCE_PAGE_SIZE`) — one request per
   product regardless of how many users track it.
4. Compares old vs. new price/stock. If nothing changed: no DB write, no
   history row, no Telegram call.
5. If the price changed: updates PostgreSQL, inserts a `price_history` row,
   refreshes the Redis cache, and edits every Telegram message showing that
   product via `editMessageText`.

## Project structure

```
src/
├── app.js                # Express app wiring (middleware, routes)
├── server.js             # Process entrypoint: connects deps, starts bot/scheduler, graceful shutdown
├── config/                # env, database, redis
├── api/
│   ├── routes/            # health, products, stats
│   └── controllers/
├── services/               # woocommerce, price/product, subscription, telegram, cache, lock
├── repositories/           # all SQL lives here
├── workers/                # price.worker (sync cycle), telegram.worker (fan-out notify)
├── scheduler/               # interval trigger for the price worker
├── bot/                     # Telegraf bot, commands, callback handlers, keyboards
├── middleware/               # auth, rate-limit, error-handler
├── utils/                    # logger, price formatting/validation, retry
└── constants/
migrations/                    # plain numbered SQL files, applied by scripts/migrate.js
tests/
├── unit/
└── integration/
```

Telegram handlers never touch the database or WooCommerce directly — they
call into `services/*`, which own all business logic and persistence.

## Tech stack

Node.js 22+, ES Modules, Express, Telegraf, PostgreSQL, Redis 7, Docker,
Docker Compose, Nginx, PM2, Pino, Zod, native `fetch`. No queue is required
for the current scale (single worker, Redis lock is enough), but the
worker/service separation means BullMQ can be dropped in later by having the
scheduler enqueue jobs instead of calling `runPriceSyncCycle()` directly —
nothing else needs to change.

## Getting started (local, Docker)

```bash
git clone <your-fork-url>
cd woocommerce-telegram-price-bot
cp .env.example .env
# Edit .env: set WOOCOMMERCE_URL / WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET / TELEGRAM_BOT_TOKEN
# Inside docker-compose, point DATABASE_URL/REDIS_URL at the service names:
#   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/woocommerce_price_bot
#   REDIS_URL=redis://redis:6379

docker compose up -d --build
docker compose exec app npm run migrate
docker compose logs -f app
```

`GET http://localhost:3000/api/health` should report `"status": "ok"`.

## Running without Docker (PM2)

```bash
npm install
cp .env.example .env   # DATABASE_URL/REDIS_URL pointing at your local Postgres/Redis
npm run migrate
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs woocommerce-telegram-price-bot
```

`SIGTERM`/`SIGINT` (including `pm2 stop`) trigger a graceful shutdown: the
scheduler stops, the bot stops polling, the HTTP server stops accepting new
connections, then Redis/PostgreSQL connections are closed.

## API

All responses follow `{ "success": true, "data": ... }` or
`{ "success": false, "error": { "code", "message" } }`.

| Method | Path                         | Description                          |
|--------|------------------------------|---------------------------------------|
| GET    | `/api/health`                | Aggregated health of DB/Redis/WooCommerce/Telegram/worker |
| GET    | `/api/products`              | Paginated list of tracked products     |
| GET    | `/api/products/:id`          | Single product                         |
| GET    | `/api/products/:id/price`    | Current price + stock + last sync time |
| GET    | `/api/products/:id/history`  | Price change history                   |
| GET    | `/api/stats`                 | Aggregate counters + worker status     |

Set `API_KEY` in `.env` to require the `x-api-key` header on
`/api/products*` and `/api/stats*`; `/api/health` is always open for
load-balancer/monitoring probes.

## Telegram bot commands

- `/start`, `/help`
- `/search <term>` — searches WooCommerce directly (one request per search,
  not part of the polling loop) and shows inline buttons to track a result
- `/track <woocommerce_id>` — track a product by its WooCommerce ID directly
- `/untrack` — lists your tracked products with a button to stop tracking
- `/products` — lists everything you currently track

## Currency formatting

`PRICE_CURRENCY` / `PRICE_CURRENCY_LABEL` are the only place currency is
configured; all formatting goes through `src/utils/price.js`
(`formatPrice`), so there is no hard-coded تومان/ریال conversion scattered
across files.

## Failure handling

- WooCommerce timeouts/5xx are retried with exponential backoff
  (`WOOCOMMERCE_RETRIES`, default 3); `401`/`403` are **never** retried.
- If WooCommerce is unreachable after retries, the sync cycle logs
  `price_sync_failed` and leaves the last known price untouched — nothing is
  deleted or zeroed out.
- Redis/Telegram failures are logged and degrade gracefully (cache miss falls
  back to DB; a failed `editMessageText` is logged per-message and does not
  abort the rest of the fan-out).

## Production deployment (Ubuntu VPS)

```bash
# 1. Server preparation
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# 2. Docker installation
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# log out/in for the group change to apply

# 3. Clone the repository
git clone <your-fork-url> /opt/woocommerce-telegram-price-bot
cd /opt/woocommerce-telegram-price-bot

# 4. Environment setup
cp .env.example .env
nano .env   # fill in WOOCOMMERCE_*, TELEGRAM_BOT_TOKEN, POSTGRES_*, a strong API_KEY
#   DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
#   REDIS_URL=redis://redis:6379

# 5. Start the stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 6. Run database migrations
docker compose exec app npm run migrate

# 7. Nginx + SSL
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp nginx/api.example.com.conf /etc/nginx/sites-available/api.example.com.conf
# edit the file: replace api.example.com with your real domain
sudo ln -s /etc/nginx/sites-available/api.example.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com

# 8. Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 9. Verify
curl -s https://api.example.com/api/health | jq

# 10. Restart / redeploy
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec app npm run migrate
```

### Logging

Container logs are structured JSON (Pino) and capped via the
`docker-compose.prod.yml` `json-file` logging driver (10MB × 5 files per
service). Ship them off-box with your platform's log agent if you need
longer retention or centralized search.

### Backup

`scripts/backup.sh` runs `pg_dump` inside the `postgres` container, gzips the
output, and prunes anything older than `RETENTION_DAYS` (default 14).

```bash
crontab -e
# Daily at 03:00
0 3 * * * POSTGRES_CONTAINER_NAME=woocommerce-telegram-price-bot-postgres-1 \
  /opt/woocommerce-telegram-price-bot/scripts/backup.sh >> /var/log/wc-bot-backup.log 2>&1
```

Restore with:

```bash
gunzip -c /var/backups/woocommerce-telegram-price-bot/<file>.sql.gz | \
  docker exec -i woocommerce-telegram-price-bot-postgres-1 psql -U postgres -d woocommerce_price_bot
```

### Monitoring

`GET /api/health` is the single source of truth and reports:

- `database`, `redis`, `woocommerce`, `telegram` — each `ok`/`fail`
- `worker.status` — `idle` / `running` / `failed`
- `worker.last_run`, `worker.last_success`, `worker.stale` — `stale` becomes
  `true` once `last_success` is older than `WORKER_STALE_THRESHOLD_MS`
  (default 3 minutes), which is the signal an external monitor (cron +
  curl, Uptime Kuma, Prometheus blackbox exporter, etc.) should alert on.

Minimal external check (add to cron or your monitoring tool of choice):

```bash
curl -sf https://api.example.com/api/health | jq -e '.status == "ok"'
```

## Testing

```bash
npm test          # unit + integration (uses Node's built-in test runner, no extra deps)
npm run test:unit
```

Covered scenarios: price parsing/validation edge cases (`null`, empty
string, negative, non-numeric, `0`), price-equality/comparison logic,
distributed lock acquire/release semantics, retry policy (including the
"never retry 401/403" rule), WooCommerce response normalization, Telegram
message formatting, and the HTTP API's success/error envelope shape.
Concurrent-worker safety is covered by asserting that a second
`acquirePriceSyncLock` call fails while the first token is still held, and
that `releasePriceSyncLock` is a no-op for a token it doesn't own (so a slow
worker can never release a lock a newer worker already acquired).

## Security

Helmet, CORS (configurable origin), per-IP rate limiting, Zod-validated
environment configuration, optional `x-api-key` auth on the internal API,
centralized error handling (no stack traces leaked to clients), and
graceful shutdown on `SIGTERM`/`SIGINT`. `.env` is git-ignored; only
`.env.example` (no real secrets) is committed.

## Architecture Review

**Why this shape fits the use case.** The read path (Telegram users) and the
write path (WooCommerce polling) are fully decoupled: users interact with
PostgreSQL/Redis-backed data through the bot and API, never triggering a
WooCommerce call on their own request (except the one-time, user-initiated
`/search`, which is intentionally a direct, bounded call — not part of the
recurring poll). The recurring poll only ever touches the subscribed subset
of the catalog, so cost scales with **tracked products**, not catalog size
or user count — 1,000 users tracking the same product still costs one
WooCommerce request per cycle. PostgreSQL is the single source of truth
(survives Redis flushes/restarts); Redis is purely an accelerator and a
coordination primitive (cache + lock), so losing Redis degrades performance,
not correctness. The distributed lock plus the in-process `cycleInFlight`
guard make horizontal scaling of the app tier safe by default — you can run
multiple containers behind Nginx for the HTTP API without risking duplicate
sync cycles, as long as only one of them also runs the bot's long-polling
`bot.launch()` (Telegram rejects concurrent `getUpdates` pollers for the same
token) — moving to a webhook removes even that constraint. `editMessageText`
plus the "only write on real change" rule keeps Telegram API usage nearly
flat between price movements.

**Where it will bottleneck first.** The price worker fetches subscribed
products from WooCommerce serially, page by page — for a store with tens of
thousands of *tracked* products (not catalog size, which doesn't matter
here) inside a single 60-second window, this is the first wall, and the fix
is exactly what the architecture already anticipates: swap the scheduler's
direct `runPriceSyncCycle()` call for a BullMQ job producer, and let a pool
of workers consume WooCommerce fetch + Telegram fan-out jobs in parallel
without touching `services/` or `repositories/` at all. The second-order
bottleneck is Telegram's own rate limits (roughly 30 messages/second
globally, 1/second per chat) once a single price change fans out to a very
large number of subscribers — `telegram.worker.js` is the place to add
per-chat throttling/queueing when that becomes real. Neither is a concern at
the scale this design targets (hundreds of tracked products, moderate
subscriber counts per product), and both have a clear, already-isolated
extension point.
