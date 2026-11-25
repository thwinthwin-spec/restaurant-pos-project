# Table & Thyme — Restaurant POS

A production-style MERN point-of-sale for restaurants. It handles daily service, menu and staff administration, kitchen status, sales reports, receipts, and an audit trail. Prices and totals are recorded in **Myanmar Kyat (MMK)** and receipts can be printed from the browser — no receipt printer or payment gateway integration is required.

## At a glance — what is this project?

| | |
| --- | --- |
| **Project** | Table & Thyme — Restaurant POS |
| **Type** | Full-stack MERN web app — POS + kitchen board + reports for a restaurant |
| **What it does** | Searchable menu + cart, dine-in/takeaway/delivery, Cash/KPay payments, admin payment confirmation, kitchen status, printable receipts, reports + CSV, audit log |
| **Tech** | React + Vite · Node.js + Express + Mongoose + Zod · MongoDB · httpOnly JWT + CSRF |
| **Ports** | Website `5173` · API `5000` |
| **Admin account** | Create the first admin on first run (`npm run seed` only adds sample menu/orders) |
| **Status** | Seeded demo data. All prices in **MMK**. No real payment gateway. |

In short: A restaurant point-of-sale app. Cashiers build orders (Cash or KPay) and print MMK receipts; orders move through a kitchen board and an admin confirms payment before sales count in reports. Includes menu/staff administration, reports with CSV export and an activity log. Seeded demo data, no real payment gateway.

## Highlights

- **Point of sale** — dine-in / takeaway / delivery, table and customer labels, searchable menu, cart notes, discounts, tax, **Cash / KPay** payment, and cash change calculation.
- **Admin confirmation** — cashiers place orders as *pending*; only an administrator can confirm payment, which is the moment the total enters sales reports.
- **Kitchen flow** — move orders through received → preparing → ready → completed on the orders board.
- **Receipts** — on-screen thermal-style receipt with `Print receipt` support, showing pending or confirmed status.
- **Reports** — date-range revenue, separate **Cash / KPay** totals, pending total, payment mix, popular dishes, and CSV export.
- **Administration** — menu availability, staff roles, restaurant settings, and searchable activity log.
- **Security** — bcrypt password hashing, httpOnly JWT session cookies, double-submit CSRF protection, role checks, Zod validation, Helmet, CORS allowlist, and rate limiting.
- **Polish** — responsive desktop/tablet layout, light/dark theme, seeded demo data, loading/error/empty states, and toast feedback.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 18, React Router, TanStack Query, Recharts, lucide-react, Vite |
| Backend | Node.js, Express, Mongoose, Zod, JWT, bcryptjs |
| Database | MongoDB |
| Runtime scripts | npm, Docker Compose |

## Requirements

- Node.js **20+** and npm
- MongoDB 8+ (local service, Atlas, or the included Docker Compose service)

## Quick start (local development)

1. **Install dependencies** from the project root:

   ```bash
   npm run install:all
   ```

2. **Configure the API.** Copy `server/.env.example` to `server/.env`, then set at least:

   ```env
   JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
   MONGODB_URI=mongodb://127.0.0.1:27017/restaurant_pos
   ```

   Generate a strong secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. **Optional: load demo content.**

   ```bash
   npm run seed
   ```

   This adds 16 realistic Burmese menu items with images, default settings, and about 14 days of orders. It does **not** create an admin, so first-run setup still applies. Use `npm run seed:clear` to remove only the demo menu/orders/counters.

4. **Start both apps:**

   ```bash
   npm run dev
   ```

   Open <http://localhost:5173>. Create the first administrator and enter the tax rate when prompted, then sign in and start taking orders. The API runs at <http://localhost:5000/api>.

## Payment and confirmation workflow

1. Select **Cash** or **KPay** on the POS screen and place the order.
2. The receipt says **Awaiting admin confirmation**; the order appears on the Orders page / kitchen board with a **Confirm payment** button (admin only).
3. The administrator confirms the payment. From that moment the order is `paid` and its total is included in **Today's sales**, the **Cash / KPay** totals, and all reports.
4. Reports group a sale by its confirmation date, so confirming after midnight counts it on the new day.

Cashiers can create orders but cannot confirm them. Cancelling a pending or paid order removes it from sales totals.

## Production-style single-origin run

Build the client once and let Express serve both the API and the built app:

```bash
npm run install:all
npm run build
npm start
```

Open <http://localhost:5000>. For a separately hosted frontend, set `VITE_API_URL` to the API base URL (ending in `/api`) **before** running `npm run build`, and allow that frontend origin with `CLIENT_ORIGIN`.

## Hosting / public deployment

Two ready-to-use options:

- [DEPLOY.md](DEPLOY.md) — Render + MongoDB Atlas. One Web Service, simplest setup.
- [DEPLOY-AWS.md](DEPLOY-AWS.md) — AWS ECS Express Mode + ECR + SSM Parameter Store + MongoDB Atlas. GitHub Actions deploys the existing `Dockerfile` on every push to `main`.

The Express server serves both `/api` and the built React app, so either option needs only **one running service**. Real secrets stay in the hosting provider / AWS SSM and are never committed.

## Docker Compose

1. Create a root `.env` file with a strong secret:

   ```env
   JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
   ```

2. Start MongoDB and the app:

   ```bash
   docker compose up -d --build
   ```

3. Open <http://localhost:5000>, complete first-run setup, and optionally seed demo data with:

   ```bash
   docker compose exec app node server/src/scripts/seed.js
   ```

The Compose file uses MongoDB without authentication for local convenience. For a public deployment, enable MongoDB authentication / Atlas credentials and put the app behind HTTPS.

## Environment variables

Server (`server/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` enables stricter cookies, CSP, and proxy handling. |
| `PORT` | `5000` | API / production web port. |
| `MONGODB_URI` | local MongoDB | Database connection string. |
| `JWT_SECRET` | random in dev, required in prod | Session signing secret. |
| `JWT_EXPIRES_IN` | `12h` | Session lifetime. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed frontend origins. |
| `COOKIE_SAMESITE` | `lax` (`none` in prod) | Session/CSRF cookie SameSite policy. |
| `COOKIE_SECURE` | `false` (`true` in prod) | Require HTTPS for cookies. |
| `COOKIE_DOMAIN` | unset | Optional shared parent domain. |
| `TRUST_PROXY` | `true` in prod | Trust the first reverse proxy for secure cookies. |
| `API_RATE_LIMIT` | `600` | Requests per minute per IP. |
| `LOGIN_RATE_LIMIT` | `10` | Login attempts per 15 minutes per IP. |

Client (`client/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API base URL used at build time. |

## Main API routes

All routes are prefixed with `/api`.

| Area | Endpoints |
| --- | --- |
| Health / setup | `GET /health`, `GET /setup/status`, `POST /setup/admin` |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Menu | `GET /menu`, `POST /menu`, `PATCH /menu/:id`, `DELETE /menu/:id` |
| Orders | `GET /orders`, `POST /orders`, `GET /orders/:id`, `PATCH /orders/:id/confirm` (admin only), `PATCH /orders/:id/fulfillment`, `PATCH /orders/:id/cancel` |
| Reports | `GET /reports?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Admin | `GET/PUT /settings`, `GET/POST/PATCH /staff`, `GET /audit` |

State-changing requests use a double-submit CSRF token: the server sets `pos_csrf`, and the client echoes it in the `x-csrf-token` header.

## Project structure

```text
client/
  src/
    components/     Layout, UI primitives, receipt
    context/        Auth and toast providers
    lib/            API client and formatting helpers
    pages/          Overview, POS, Orders, Reports, Menu, Staff, Settings, Audit
    styles/         Light/dark design system and print styles
server/
  src/
    config/         Environment and paths
    controllers/    Request business logic
    middleware/     Auth, roles, CSRF, validation, errors
    models/         Mongoose schemas and settings/counters
    routes.js       Central route map
    scripts/seed.js Demo data loader
```

## Backups and operations

- Back up MongoDB with `mongodump`/Atlas backups on a schedule. Store backups away from the app server.
- Test restores into a separate database before relying on them.
- Keep `server/.env`, database dumps, and `node_modules` out of source control and downloadable archives.
- For public HTTPS deployments set `COOKIE_SECURE=true`, use a strong `JWT_SECRET`, restrict `CLIENT_ORIGIN`, enable database authentication, and terminate TLS at a reverse proxy.

## Notes

- Payment methods are limited to **Cash** and **KPay**. KPay is recorded manually; it does not contact a payment gateway — verify the transfer before confirming.
- A placed order is `pending` and **does not affect sales**. Only `PATCH /orders/:id/confirm` by an administrator marks it `paid`. Reports use the confirmation timestamp, so a next-day confirmation counts on that day.
- Tax is stored as a percentage (enter `5` for 5%). Past orders retain their calculated totals even if the rate changes later.
- The first administrator completes setup in the browser; `npm run seed` deliberately does not create users.
- `npm run seed:clear` removes demo orders (marked `isDemo`), menu items, counters, and demo audit entries. It does not delete real users or real orders.
