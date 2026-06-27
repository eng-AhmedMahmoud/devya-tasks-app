# Devya Tasks App

Internal Eisenhower-matrix task management for the Devya team.

- **Portless hostname:** `tasks.localhost`
- **Backend:** NestJS (`devya-solutions/backend`) — `TasksModule`, `MailModule`, `SchedulerModule`
- **Auth:** Shared `devya_session` JWT cookie set by the backend
- **Roles:** `ADMIN` (Moaz), `SUPER_ADMIN` (Muhammed). Super Admin gates: delete tasks, rate quality, oversight emails.

## Run locally

```bash
# 1. Backend (Postgres + NestJS via docker-compose)
cd backend && pnpm install && pnpm prisma:migrate && pnpm seed && pnpm dev

# 2. Tasks app
cd ../tasks-app && pnpm install && cp .env.example .env && pnpm dev
# → https://tasks.localhost
```

`pnpm dev` runs `portless tasks next dev` (single hostname, no port collisions).
Backend stays at `https://api.localhost` via the global Portless proxy.

## Features

- 2×2 Eisenhower matrix (Do / Schedule / Delegate / Eliminate) with verbatim
  spec descriptions, automatic urgency (48h from creation), and overdue tasks
  pinned to the top.
- Task creation with Normal / Meeting branch. Meeting tasks **also** create a
  booking record via the existing `BookingsModule`.
- Completion requires a proof image (Cloudflare Images via `UploadsModule`)
  and an optional note. Both surface everywhere the task is shown.
- Manual delay + automatic delay (overdue tasks roll to the next day every
  15 minutes, status flipped to `DELAYED`, badge + timestamp + original day
  shown).
- Daily templates: maintain a recurring list, click "Insert daily tasks" to
  clone every active template into today.
- Daily history page: tasks attributed by creation day; delayed tasks appear
  on both their original day and their new day.
- Monthly assessment per employee — accomplishing / on-time / quality ratios
  using the total tasks assigned that month as the denominator. Quality rated
  only by Super Admin (Low/High controls hidden for Admin).
- Full audit timeline (TaskEvent table) per task; supervisor (Super Admin)
  gets an immediate Gmail notification on every task event.
- Cron jobs (Africa/Cairo): urgent reminders every 12h from creation while
  open, daily digest 09:00 to owners and Super Admin oversight digest, delayed
  reminders 09:00 while still delayed.

## Environment

See `.env.example`. The same `SESSION_COOKIE_NAME` as backend and admin-app
(`devya_session`). `API_PROXY_TARGET` is used by server-side fetches to the
backend (default `https://api.localhost` in dev).

## Backend deltas to deploy

- Run `prisma migrate dev --name add_tasks` after pulling.
- Add Gmail SMTP app password to backend env (`MAIL_USER`, `MAIL_PASS`,
  `MAIL_ENABLED=true`).
- Run `pnpm seed` to upsert Muhammed (Super Admin) and Moaz (Admin).
- Add `https://tasks.devya-solutions.com` (and `https://tasks.localhost` for
  dev) to `CORS_ORIGINS`.

## Decisions locked in

| Item | Value |
|------|-------|
| Urgency window | 48h from creation |
| Auto-delay cadence | every 15 min scan, roll to next day |
| Deadline granularity | date-only if > 2 days away, date + time if ≤ 2 days |
| Urgent reminders | every 12h (4 total) per task |
| Daily digest | 09:00 Africa/Cairo |
| Delayed reminders | 09:00 Africa/Cairo, daily while delayed |
| Supervisor event email | immediate, on every TaskEvent |
| Completion proof | image required, note optional |
| Quality rating | Super Admin only |
| Task delete | Super Admin only |
