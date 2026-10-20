# Multi-Vendor Marketplace

A MERN-based marketplace backend for customers, vendors, and administrators. The current codebase contains an Express REST API with MongoDB persistence, Redis support, authentication, catalog and vendor operations, cart and checkout quote handling, inventory management, and customer/vendor order endpoints.

> **Project status:** Backend development is in progress. The `client` directory is currently only a placeholder; a complete frontend is not yet included. Automated backend tests are not configured yet.

## Contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Run the API](#run-the-api)
- [API overview](#api-overview)
- [Formatting](#formatting)
- [Project layout](#project-layout)
- [Development notes](#development-notes)

## Requirements

- Node.js compatible with the dependencies in `server/package.json`
- npm
- Docker Desktop or Docker Engine with Docker Compose

MongoDB is configured as a replica set because the backend uses transactional inventory and order workflows. Redis is used for backend services and inventory hold processing.

## Getting started

1. Clone the repository and open its root directory:

   ```bash
   git clone <REPOSITORY_URL>
   cd <REPOSITORY_DIRECTORY>
   ```

   Replace `<REPOSITORY_URL>` and `<REPOSITORY_DIRECTORY>` with the values for your checkout.

2. Install server dependencies from the repository root:

   ```bash
   npm install --workspace server
   ```

3. Create the local server environment file:

   ```bash
   cp server/.env.example server/.env
   ```

4. Replace the placeholder JWT secrets in `server/.env` with two different random values. For example, run this command twice and use one output for each secret:

   ```bash
   openssl rand -base64 48
   ```

5. Start MongoDB and Redis:

   ```bash
   docker compose up -d
   ```

6. Start the API using one of the commands in [Run the API](#run-the-api).

## Environment configuration

The API reads configuration from `server/.env`. Copy the example file and replace the secret placeholders before starting the server.

```dotenv
PORT=5000
NODE_ENV=development
INVENTORY_HOLD_POLL_INTERVAL_MS=60000
INVENTORY_HOLD_BATCH_SIZE=100
MONGODB_URI=mongodb://localhost:27017/marketplace?replicaSet=rs0
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=<REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS>
JWT_REFRESH_SECRET=<REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET_AT_LEAST_32_CHARACTERS>
```

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be different and at least 32 characters long. Keep `server/.env` private; it is ignored by Git. Do not commit real credentials or production secrets.

## Run the API

From the repository root, start the API in development mode with Node's watch mode:

```bash
npm run dev --workspace server
```

For a regular server process:

```bash
npm start --workspace server
```

The API listens on port `5000` by default. Set `PORT` in `server/.env` to use a different port.

Check API and dependency health:

```bash
curl http://localhost:5000/api/v1/health
```

The response reports API status, uptime, timestamp, and MongoDB/Redis connection states. A healthy response has HTTP status `200` and `"status": "ok"`.

To stop the local database services:

```bash
docker compose down
```

To remove the persisted local MongoDB and Redis data as well, use this command (it deletes the Compose volumes):

```bash
docker compose down --volumes
```

## API overview

All application endpoints use the `/api/v1` prefix and JSON request/response bodies.

| Area | Base path | Current capabilities |
|---|---|---|
| Health | `/api/v1/health` | API and dependency health |
| Authentication | `/api/v1/auth` | Registration, login, refresh, logout, current user |
| Vendors | `/api/v1/vendors` | Create/list own vendors, submit for review, manage vendor shipping rate |
| Administration | `/api/v1/admin` | Review pending vendors and products |
| Storefront catalog | `/api/v1/products` | Browse products and retrieve product details |
| Cart | `/api/v1/cart` | View cart and manage cart items |
| Checkout | `/api/v1/checkout` | Create a checkout quote |
| Customer addresses | `/api/v1/me/addresses` | Create, view, update, and delete saved addresses |
| Customer orders | `/api/v1/me/orders` | View order history and order details |
| Vendor orders | `/api/v1/vendors/:vendorId/orders` | View vendor orders and create shipment records |

For endpoint request shapes and responses, inspect the route schemas in `server/src/modules/` or use the project's API collection if one is available in your checkout.

## Formatting

Format server JavaScript files with Prettier:

```bash
npm run format --workspace server
```

Check formatting without changing files:

```bash
npm run format:check --workspace server
```

## Project layout

```text
client/                  Frontend placeholder and environment example
docs/                    Architecture and development incident notes
server/
  scripts/               Server administration scripts
  src/
    config/              Environment and logging configuration
    db/                  MongoDB and Redis connections
    jobs/                Background workers
    models/              Mongoose models
    modules/             API routes, schemas, and services by domain
  .env.example           Server environment template
docker-compose.yml       Local MongoDB replica set and Redis services
package.json             Root npm workspace configuration
```

## Development notes

- Start local dependencies with Docker Compose before relying on database-backed API features.
- The API health endpoint reports `degraded` when MongoDB or Redis is disconnected.
- The inventory hold worker can be run separately when needed:

  ```bash
  npm run worker:inventory-holds --workspace server
  ```

- Promote an existing user to an administrator with the server script:

  ```bash
  npm run admin:promote --workspace server -- <USER_EMAIL>
  ```

- The server's `test` script is currently a placeholder. Add automated tests as backend features mature.
- See [`docs/marketplace-architecture.md`](docs/marketplace-architecture.md) for the data model, workflows, API design, and phased delivery plan.
