# ResourceHub — Resource Reservation Management System

A full-stack web application for booking and approving shared organisational
resources — meeting rooms, equipment, vehicles, and more. Members request slots;
administrators approve or reject them. The system is built so that **two active
reservations can never overlap on the same resource**, enforced at the database
level.

Built for the PrimeWave Lab internship assessment with **Next.js (App Router)**,
**TypeScript**, **PostgreSQL**, and **Prisma**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment variables](#environment-variables)
  - [Database setup](#database-setup)
  - [Seeded accounts](#seeded-accounts)
- [Running the app](#running-the-app)
- [Scripts](#scripts)
- [User roles & permissions](#user-roles--permissions)
- [Reservation lifecycle](#reservation-lifecycle)
- [Booking rules](#booking-rules)
- [Conflict prevention](#conflict-prevention)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Database schema (ER diagram)](#database-schema-er-diagram)
- [Testing](#testing)
- [Documentation](#documentation)
- [Design decisions & assumptions](#design-decisions--assumptions)

---

## Features

- **Email/password authentication** with server-side sessions (Better Auth).
- **Role-based access control** — `ADMIN` and `MEMBER`.
- **Resource catalogue** — create, edit, deactivate/reactivate resources across
  seven resource types (meeting rooms, conference rooms, training rooms,
  workspaces, equipment, vehicles, other).
- **Reservation requests** with a live availability check and suggested
  alternative slots when a conflict is detected.
- **Approval workflow** — administrators confirm or reject pending requests with
  an optional rejection reason.
- **Members manage their own bookings**; administrators see and manage everyone's.
- **User administration** — promote/demote roles, with a safeguard against
  removing the last administrator.
- **Search, filtering and pagination** on every list view.
- **Dashboard & profile** summarising activity.
- **Timezone-aware display** — all timestamps are shown in `Asia/Colombo`.
- **Database-enforced integrity** — overlap exclusion constraint and
  `endTime > startTime` check.

---

## Tech stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16 (App Router, Cache Components, Turbopack)         |
| Language   | TypeScript (strict)                                          |
| UI         | Tailwind CSS v4 + shadcn/ui (Radix primitives), Lucide icons |
| Forms      | React Hook Form + Zod                                        |
| Auth       | Better Auth (email/password, Prisma adapter)                 |
| Database   | PostgreSQL 18                                                |
| ORM        | Prisma 7 (`prisma-client` generator, driver adapter)         |
| Testing    | Vitest                                                       |
| Formatting | Prettier (`prettier-plugin-tailwindcss`) + ESLint            |

---

## Getting started

### Prerequisites

- **Node.js 20+** (developed on Node 24)
- **PostgreSQL 14+** running locally (developed on PostgreSQL 18)
- `npm`

### Installation

```bash
git clone <your-repository-url>
cd resourcehub
npm install
```

> The Prisma client is generated into `src/generated/prisma` and is **not**
> committed. Regenerate it any time with `npm run db:generate`.

### Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable             | Description                                  | Example                                                                   |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                 | `postgresql://postgres:postgres@localhost:5432/resourcehub?schema=public` |
| `BETTER_AUTH_SECRET` | Secret used to sign sessions (min. 32 chars) | output of `openssl rand -base64 32`                                       |
| `BETTER_AUTH_URL`    | Public base URL of the app                   | `http://localhost:3000`                                                   |

### Database setup

Create the database, apply migrations and seed demo data:

```bash
# 1. Create the database (once)
createdb resourcehub
# or: psql -U postgres -c "CREATE DATABASE resourcehub;"

# 2. Apply migrations (creates tables, enums, indexes and constraints)
npm run db:migrate      # development — creates/updates the schema
#   npm run db:deploy   # production — applies committed migrations only

# 3. Seed demo users, resources and reservations
npm run db:seed
```

The migration enables the `btree_gist` extension and adds:

- a `CHECK (endTime > startTime)` constraint, and
- an `EXCLUDE` constraint preventing overlapping **active** reservations
  (`PENDING` or `CONFIRMED`) on the same resource.

### Seeded accounts

The seed script creates the following accounts. **They are for demo purposes
only.**

| Role   | Email                    | Password       |
| ------ | ------------------------ | -------------- |
| Admin  | `admin@resourcehub.dev`  | `Admin@12345`  |
| Member | `kasun@resourcehub.dev`  | `Member@12345` |
| Member | `dilani@resourcehub.dev` | `Member@12345` |
| Member | `ruwan@resourcehub.dev`  | `Member@12345` |

It also seeds nine resources (including one inactive resource) and ten
reservations covering every status.

---

## Running the app

```bash
npm run dev      # development server → http://localhost:3000
```

```bash
npm run build    # production build
npm run start    # run the production build
```

Sign in at `/sign-in` with one of the seeded accounts. Self-registration is open
at `/sign-up`; new accounts are created as `MEMBER` and can be promoted by an
administrator from the **Users** page.

---

## Scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the development server                 |
| `npm run build`        | Create a production build                    |
| `npm run start`        | Serve the production build                   |
| `npm run lint`         | Run ESLint                                   |
| `npm run typecheck`    | Run the TypeScript compiler (`tsc --noEmit`) |
| `npm run test`         | Run the Vitest unit tests once               |
| `npm run test:watch`   | Run Vitest in watch mode                     |
| `npm run format`       | Format the codebase with Prettier            |
| `npm run format:check` | Check formatting without writing             |
| `npm run db:generate`  | Generate the Prisma client                   |
| `npm run db:migrate`   | Create/apply a development migration         |
| `npm run db:deploy`    | Apply committed migrations (production)      |
| `npm run db:seed`      | Seed the database                            |
| `npm run db:studio`    | Open Prisma Studio                           |

---

## User roles & permissions

| Capability                           | Member | Admin |
| ------------------------------------ | :----: | :---: |
| Browse active resources              |   ✅   |  ✅   |
| Create reservation requests          |   ✅   |  ✅   |
| View **own** reservations            |   ✅   |  ✅   |
| View **all** reservations            |   —    |  ✅   |
| Edit / cancel own reservations       |   ✅   |  ✅   |
| Approve or reject requests           |   —    |  ✅   |
| Create / edit / deactivate resources |   —    |  ✅   |
| Change user roles                    |   —    |  ✅   |
| See inactive resources               |   —    |  ✅   |

Guards are enforced both in the UI (items hidden) and on the server
(`requireUser` / `requireAdmin` in every route handler).

---

## Reservation lifecycle

```
            create
              │
              ▼
          ┌────────┐   admin confirms   ┌───────────┐
          │ PENDING│ ─────────────────► │ CONFIRMED │
          └────┬───┘                    └─────┬─────┘
               │ admin rejects                │ owner/admin cancels
               ▼                              ▼
          ┌──────────┐                  ┌───────────┐
          │ REJECTED │                  │ CANCELLED │
          └──────────┘                  └───────────┘
```

- `PENDING` and `CONFIRMED` **hold the slot** and count towards the overlap
  constraint.
- `REJECTED` and `CANCELLED` **free the slot**; those reservations can no longer
  be edited.
- Editing the schedule of a `CONFIRMED` reservation resets it to `PENDING` so it
  must be re-approved.

---

## Booking rules

Defined once in `src/lib/constants.ts` and enforced server-side in
`src/lib/domain/booking.ts`:

| Rule                    | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Minimum duration        | 15 minutes                                           |
| Maximum duration        | 8 hours                                              |
| Maximum time in advance | 365 days                                             |
| Start time              | Must be (near) future — a 60-second grace is allowed |
| End time                | Must be after the start time                         |

---

## Conflict prevention

Overlaps are prevented in **three layers**:

1. **Live availability check** — the booking form calls
   `GET /api/resources/:id/availability?from=&to=` as you type and shows
   conflicts plus suggested alternative start times.
2. **Service-level check** — `assertNoOverlap` runs before every create/update
   and returns a `409 OVERLAP` error with suggestions.
3. **Database exclusion constraint** — the final guarantee. Even under a race,
   PostgreSQL rejects overlapping active bookings:

   ```sql
   EXCLUDE USING gist (
     "resourceId" WITH =,
     tsrange("startTime", "endTime", '[)') WITH &&
   ) WHERE (status IN ('PENDING', 'CONFIRMED'))
   ```

   A violation is mapped to a friendly `409 OVERLAP` response.

Intervals are treated as **half-open** (`[start, end)`), so a booking ending at
10:00 and another starting at 10:00 do **not** conflict.

---

## API reference

All responses use a consistent envelope: `{ "data": ..., "meta"?: ... }` on
success, and `{ "error": { "code", "message", "details"? } }` on failure.

### Auth

Better Auth handles the session endpoints under `/api/auth/*` (sign-in, sign-up,
sign-out, session). See `src/app/api/auth/[...all]/route.ts`.

### Resources

| Method   | Endpoint                          | Access | Description                                                              |
| -------- | --------------------------------- | ------ | ------------------------------------------------------------------------ |
| `GET`    | `/api/resources`                  | Auth   | List resources (`page`, `pageSize`, `search`, `type`, `includeInactive`) |
| `POST`   | `/api/resources`                  | Admin  | Create a resource                                                        |
| `GET`    | `/api/resources/:id`              | Auth   | Fetch a single resource                                                  |
| `PATCH`  | `/api/resources/:id`              | Admin  | Update a resource (incl. `isActive`)                                     |
| `DELETE` | `/api/resources/:id`              | Admin  | Deactivate a resource (soft delete)                                      |
| `GET`    | `/api/resources/:id/availability` | Auth   | Check availability for `from`/`to`                                       |

### Reservations

| Method   | Endpoint                         | Access      | Description                                                                  |
| -------- | -------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `GET`    | `/api/reservations`              | Auth        | List (members see own; `mine`, `status`, `resourceId`, `search`, pagination) |
| `POST`   | `/api/reservations`              | Auth        | Create a request                                                             |
| `GET`    | `/api/reservations/:id`          | Owner/Admin | Fetch a reservation                                                          |
| `PATCH`  | `/api/reservations/:id`          | Owner/Admin | Update a reservation                                                         |
| `DELETE` | `/api/reservations/:id`          | Owner/Admin | Cancel a reservation                                                         |
| `POST`   | `/api/reservations/:id/decision` | Admin       | `{ action: "CONFIRM" \| "REJECT", rejectionReason? }`                        |

### Users

| Method  | Endpoint         | Access | Description        |
| ------- | ---------------- | ------ | ------------------ |
| `GET`   | `/api/users`     | Admin  | List users         |
| `PATCH` | `/api/users/:id` | Admin  | Change a user role |

### Health

| Method | Endpoint      | Access | Description                 |
| ------ | ------------- | ------ | --------------------------- |
| `GET`  | `/api/health` | Public | Database connectivity probe |

---

## Project structure

```
docs/
  er-diagram.dbml             # shareable ER diagram (DBML)
  DEMO.md                     # demo recording script
prisma/
  schema.prisma               # models, enums, relations
  migrations/                 # SQL migrations (incl. btree_gist + EXCLUDE)
  seed.ts                     # idempotent demo data
src/
  app/
    (auth)/                   # sign-in / sign-up (no app shell)
    (app)/                    # authenticated pages under the app shell
      page.tsx                # dashboard
      resources/              # resource catalogue
      reservations/           # list, new, [id]
      users/                  # admin user management
      profile/                # current user profile
    api/                      # route handlers (REST)
    layout.tsx, globals.css
  components/
    ui/                       # shadcn/ui primitives
    layout/                   # AppShell, sidebar, top bar
    resources/ reservations/ users/ shared/ auth/
  lib/
    api/                      # route wrapper, response envelope, client, errors
    services/                 # resource / reservation / user business logic
    domain/booking.ts         # pure booking rules (unit-tested)
    validations/              # Zod schemas (shared server + client)
    auth.ts, auth-client.ts, prisma.ts, constants.ts, types.ts
    utils/                    # date, id, cn helpers
  proxy.ts                    # auth route guard (middleware)
```

---

## Database schema (ER diagram)

```mermaid
erDiagram
    User ||--o{ Session : "has"
    User ||--o{ Account : "has"
    User ||--o{ Reservation : "requests"
    User ||--o{ Reservation : "decides"
    Resource ||--o{ Reservation : "is booked in"

    User {
        string id PK
        string name
        string email UK
        boolean emailVerified
        string image
        UserRole role
        datetime createdAt
        datetime updatedAt
    }

    Session {
        string id PK
        datetime expiresAt
        string token UK
        string ipAddress
        string userAgent
        string userId FK
    }

    Account {
        string id PK
        string accountId
        string providerId
        string userId FK
        string password
    }

    Verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
    }

    Resource {
        string id PK
        string name
        ResourceType type
        string location
        int capacity
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Reservation {
        string id PK
        string userId FK
        string resourceId FK
        string title
        string notes
        datetime startTime
        datetime endTime
        ReservationStatus status
        string rejectionReason
        datetime decidedAt
        string decidedById FK
        datetime cancelledAt
    }
```

**Enums**

- `UserRole`: `ADMIN`, `MEMBER`
- `ResourceType`: `MEETING_ROOM`, `CONFERENCE_ROOM`, `TRAINING_ROOM`,
  `WORKSPACE`, `EQUIPMENT`, `VEHICLE`, `OTHER`
- `ReservationStatus`: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`

> **Shareable ER diagram:** `docs/er-diagram.dbml` contains this schema in DBML
> format. Paste it into <https://dbdiagram.io/d> and use its **Share** button to
> generate a public link for the submission. The Mermaid diagram above renders
> directly on GitHub.

---

## Testing

Unit tests use **Vitest** and focus on the pure, critical logic:

```bash
npm run test
```

Covered:

- `src/lib/domain/booking.test.ts` — overlap detection, half-open interval
  semantics, booking-window validation (duration, past/future bounds), and
  alternative-slot suggestions.
- `src/lib/validations/index.test.ts` — resource, reservation, decision, list
  and auth Zod schemas.

---

## Documentation

| Document               | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `docs/er-diagram.dbml` | DBML for a shareable ER diagram (dbdiagram.io)             |
| `docs/DEMO.md`         | Timed 3–5 minute demo walkthrough for the screen recording |

---

## Design decisions & assumptions

- **Cache Components** are enabled. Pages fetch data directly with Prisma inside
  `<Suspense>` boundaries; anything reading request state is streamed at request
  time.
- **Server pages + client interactivity**: list/detail pages are Server
  Components; filters, dialogs and actions are Client Components using a small
  typed `fetch` wrapper (`src/lib/api/client.ts`).
- **Soft deletes for resources**: deleting a resource deactivates it so
  reservation history is preserved (`isActive = false`).
- **Opaque string IDs** are used everywhere (cuid for domain rows, Better Auth
  IDs for users) and validated against a safe character set before hitting the DB.
- **All timestamps are stored in UTC** (`timestamptz`) and displayed in
  `Asia/Colombo`.
- **Open self-registration**: anyone can sign up and receives the `MEMBER` role.
- The **`role` field is read-only** at sign-up — only an administrator can change
  it.
