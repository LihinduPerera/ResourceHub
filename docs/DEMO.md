# Demo script (3–5 minutes)

A suggested walkthrough for the screen-recorded demo. Record at 1280×720 or
larger, keep the browser zoom around 100%, and use the seeded accounts below.

## 0. Setup (off-camera)

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3000
```

| Role   | Email                   | Password       |
| ------ | ----------------------- | -------------- |
| Admin  | `admin@resourcehub.dev` | `Admin@12345`  |
| Member | `kasun@resourcehub.dev` | `Member@12345` |

Have two browser profiles ready (or use one normal + one incognito window) so
you can switch between the **admin** and **member** views without signing out
mid-take.

---

## 1. Intro & sign-in (0:00 – 0:30)

- Show the sign-in page. Mention the stack: **Next.js App Router + TypeScript +
  PostgreSQL + Prisma**, email/password auth with server sessions.
- Sign in as **Kasun (Member)**.
- Point out the dashboard greeting and the sidebar (no **Users** item for a
  member).

## 2. Browse resources as a member (0:30 – 1:00)

- Open **Resources**. Show the type icons, the search box, the type filter and
  pagination.
- Show that only **active** resources are listed.
- Open a resource to show its details (location, capacity, description).

## 3. Create a reservation with live availability (1:00 – 2:00)

- Go to **Reservations → New reservation**.
- Pick a resource, enter a title, choose a start/end time.
- While typing, point out the **live availability** indicator and the
  **suggested alternative slots**.
- Try a slot that overlaps an existing reservation → the form warns you and
  offers alternatives.
- Submit a valid slot → the reservation is created with status **PENDING**.
- Show it in **Reservations** (status badge, filters by status).

## 4. Admin approval workflow (2:00 – 3:00)

- Switch to the **admin** window. Open **Reservations** — show **all** users'
  reservations (members only see their own).
- Approve Kasun's pending request → status becomes **CONFIRMED**.
- Reject another pending request, adding a **rejection reason** → status
  **REJECTED** and the reason is shown.
- Show that a member cannot approve (optional): back in the member window, the
  decision controls are absent; the API returns `403`.

## 5. Resource management (3:00 – 3:30)

- As admin, open **Resources → New resource**. Create one (e.g. a workspace).
- Edit it, then **deactivate** it.
- Point out it disappears from the member's list but the reservation history is
  preserved.

## 6. Users & roles (3:30 – 4:00)

- Open **Users** (admin-only). Show the role selector.
- Promote a member to **ADMIN**, then demote back.
- Demonstrate the safeguard: attempting to demote the **last** administrator is
  blocked (`LAST_ADMIN`).

## 7. Overlap protection (4:00 – 4:30)

- Try to create a second reservation that overlaps the confirmed one.
- The UI blocks it and the API responds `409 OVERLAP` with conflicting times and
  suggestions.
- Mention the three layers: live check → service check → **PostgreSQL `EXCLUDE`
  constraint** (the database itself prevents overlaps even under a race).

## 8. Wrap-up (4:30 – 5:00)

- Open **Profile** (own details).
- Mention: unit tests (`npm run test`, 36 passing), type-checking, linting, and
  the ER diagram in the README.
- Optionally open `/api/health` to show DB connectivity.

---

## Talking points (backup)

- **Booking rules**: 15 min – 8 h duration, up to 365 days ahead, half-open
  intervals `[start, end)` so back-to-back bookings don't conflict.
- **Soft deletes**: resources are deactivated, never hard-deleted, so history
  survives.
- **Timezone**: stored in UTC (`timestamptz`), displayed in `Asia/Colombo`.
- **Security**: every route handler calls `requireUser` / `requireAdmin`; roles
  are read-only at sign-up.
