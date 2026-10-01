# Corevia EMS — Employee Management System

Internal employee management system for **Corevia Technologies**, built with Next.js
App Router, TypeScript and Tailwind CSS. It ships two role-based portals — an
**Employee Portal** for self-service and an **Admin Console** for HR operations —
on top of a real **PostgreSQL** database accessed through **Drizzle ORM**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Database setup](#database-setup)
- [Demo credentials](#demo-credentials)
- [Scripts](#scripts)
- [Routes](#routes)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Auth & authorization](#auth--authorization)
  - [Data layer](#data-layer)
  - [Migrations](#migrations)
  - [Server Actions](#server-actions)
  - [UI system](#ui-system)
- [Design system](#design-system)
- [Database schema](#database-schema)
- [Verification status](#verification-status)
- [Notes and limitations](#notes-and-limitations)

---

## Features

### Employee portal

- **Dashboard** — attendance summary, task progress, upcoming holidays and
  recent announcements.
- **To-Do list** — assigned tasks with status/priority badges, due dates, and a
  detail page for full task information.
- **Attendance** — month navigation, present/late/absent/leave metrics and a
  6-month attendance trend chart.
- **Salary** — current payslip with earnings, deductions and net pay, plus
  payslip history.
- **Earnings** — year-over-year basic pay chart and a salary composition
  breakdown.
- **Leaves** — leave balance, history and a leave-request form with live day
  calculation.
- **Notices** — announcement feed with read/unread state and notice detail
  pages.
- **Change password** — self-service from the avatar menu, requiring the current
  password; other devices are signed out on success.

### Admin console

- **Dashboard** — headcount, attendance rate, pending leaves, payroll totals,
  department distribution and recent activity.
- **Manage staff** — searchable, filterable staff table with edit, activate,
  deactivate and password-reset actions.
- **Register staff** — validated registration form with live password
  requirements.
- **Announcements** — create, edit, publish/archive and delete announcements.
- **Staff to-do lists** — assign tasks to one or many staff, override statuses
  and delete tasks.
- **Leave applications** — review pending requests and approve or reject with a
  reason.
- **Salary management** — set salary components, add adjustments, mark payroll as
  paid, with month navigation.
- **Attendance management** — day-by-day attendance register with status filters
  and an attendance-correction modal.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| UI | React 19 |
| Language | TypeScript 5.7 (strict) |
| Styling | Tailwind CSS 4 |
| Icons | `lucide-react` |
| Forms | `react-hook-form` + Zod resolvers |
| Validation | Zod 4 |
| Charts | Hand-rolled SVG (no charting dependency) |
| Lint | ESLint 9 flat config (`eslint-config-next`) |
| Database | PostgreSQL 14+ (local instance or Supabase) |
| ORM | Drizzle ORM 0.45 with the `pg` driver |
| Passwords | `bcryptjs`, cost factor 12 |
| Migrations | Hand-authored SQL applied by a small runner |

No UI, chart or table kit is used — every component in the app is hand-built.

---

## Getting started

**Requirements:** Node.js 20+, npm, and a PostgreSQL database.

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL
npm run db:migrate       # create the schema
npm run db:seed          # load the demo dataset
npm run dev
```

Open <http://localhost:3000>. You will be redirected to `/login`.

To run the production build:

```bash
npm run build
npm run start
```

> The session cookie is issued with the `Secure` flag in production
> (`NODE_ENV=production`). Use `npm run dev` for plain-HTTP local browsing, or
> serve `npm run start` over HTTPS.

---

## Database setup

One variable is required, and it never leaves the server:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string, read server-side only |

`.env` is gitignored (`.env*` with `!.env.example`). `DATABASE_URL` is read by
exactly two places — `src/lib/db/client.ts` and the scripts in `scripts/`. No
page, component, server action or client bundle references it, so the
credentials are not shipped to the browser.

### Local PostgreSQL

```env
DATABASE_URL=postgres://postgres:your-password@localhost:5432/employee_Corevia
```

The database itself can be created with plain `psql`:

```sql
CREATE DATABASE employee_Corevia;
```

### Supabase

Supabase *is* PostgreSQL, so the same migrations run unchanged. Copy the
connection string from **Project Settings → Database**, and note two things:

- The password must be URL-encoded (`@` becomes `%40`).
- The `db.<ref>.supabase.co` host is IPv6-only in several regions. On an
  IPv4-only network use the **session pooler** instead, e.g.
  `postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require`

Switching between a local instance and Supabase is a one-line change to `.env` —
no code changes, because nothing outside the data layer knows where the database
lives.

---

## Demo credentials

`npm run db:seed` creates the accounts and **prints every username and password at
the end of the run**. The two to start with:

| Role | Username | Password | Lands on |
| --- | --- | --- | --- |
| Admin | `admin` | `Admin@123` | `/admin/dashboard` |
| Employee | `employee` | `Employee@123` | `/employee/dashboard` |

The login form accepts either the username or the registered email address.

These credentials are **not** compiled into the application. The seed script
hashes them with bcrypt before insert, and the sign-in page deliberately shows no
hint card, so the values exist only in your database and in this README.

Override them without editing the script:

```bash
SEED_ADMIN_PASSWORD=... SEED_EMPLOYEE_PASSWORD=... npm run db:seed
```

Every other active account (`bikash.thapa`, `nisha.gurung`, …) also has a
credential row and shares the employee password, so you can sign in as different
people to confirm each sees only their own attendance, payslips, tasks and leave.
One account is seeded `inactive` and has no credential row at all, which is how a
deactivated employee behaves.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply pending files from `supabase/migrations/` |
| `npm run db:seed` | Truncate and reload the demo dataset |
| `npm run db:studio` | Open Drizzle Studio to browse the data |
| `npm run db:check` | Validate migration consistency |

---

## Routes

### Public

| Route | Description |
| --- | --- |
| `/` | Role-aware root redirect |
| `/login` | Sign-in form (progressive enhancement: works without JS) |
| `/unauthorized` | Shown when a signed-in user lacks the required role |

### Employee portal — `role: employee`

| Route | Description |
| --- | --- |
| `/employee/dashboard` | Personal overview |
| `/employee/todo` | Assigned tasks |
| `/employee/todo/[id]` | Task detail |
| `/employee/attendance` | Attendance metrics and trend |
| `/employee/salary` | Payslip and history |
| `/employee/earnings` | Earnings analytics |
| `/employee/leaves` | Leave balance, history and requests |
| `/employee/notices` | Announcement feed |
| `/employee/notices/[id]` | Notice detail |

### Admin console — `role: admin`

| Route | Description |
| --- | --- |
| `/admin/dashboard` | Organisation overview |
| `/admin/staff` | Staff directory and status management |
| `/admin/staff/register` | Register a new staff member |
| `/admin/announcements` | Announcement CRUD |
| `/admin/tasks` | All staff tasks |
| `/admin/tasks/create` | Assign a task |
| `/admin/leaves` | Leave approvals |
| `/admin/salary` | Payroll management |
| `/admin/attendance` | Attendance register and corrections |

---

## Project structure

```
src/
├── app/
│   ├── admin/            # Admin console routes + server actions
│   ├── employee/         # Employee portal routes + server actions
│   ├── login/
│   ├── unauthorized/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── admin/            # Admin data tables, forms and modals
│   ├── auth/             # Login form
│   ├── charts/           # BarChart, LineChart, DonutChart
│   ├── employee/         # Employee cards, tables, forms
│   ├── forms/            # FormField, FormActions, SubmitButton
│   ├── layout/           # DashboardShell, sidebar, nav icons
│   └── ui/               # 20 reusable primitives
├── lib/
│   ├── api/              # Service layer (the backend boundary)
│   ├── auth/             # bcrypt hashing, DB session store, guards
│   ├── db/               # Drizzle schema, pool, shared selects, mappers
│   ├── validations/      # Zod schemas
│   ├── constants.ts
│   ├── navigation.ts
│   ├── format.ts
│   ├── status.ts
│   └── chart-format.ts
├── types/                # Shared domain types
└── proxy.ts              # Coarse auth middleware

supabase/migrations/     # Versioned SQL migrations
scripts/                 # migrate.mjs, seed.mjs
drizzle.config.ts        # drizzle-kit config (studio, check)
```

---

## Architecture

### Auth & authorization

Authentication is intentionally split into two layers:

1. **`src/proxy.ts` (middleware)** — a cheap, coarse check. It only verifies a
   session cookie is present before allowing a request into `/employee/*` or
   `/admin/*`, and redirects signed-out users to `/login`. It deliberately does
   *not* decode roles, so it never becomes the source of truth.

2. **`requireRole()` in server layouts** — the authoritative guard.
   `src/app/employee/layout.tsx` and `src/app/admin/layout.tsx` resolve the
   session on every request and `redirect()` if the role does not match, which
   also cross-redirects a user who reaches the wrong portal.

3. **`requireActionRole()` in Server Actions** — every mutating action
   re-checks the caller's role before touching the data layer, so authorisation
   holds even if an action is invoked directly.

Sessions live in the `sessions` table. A 256-bit random token is generated with
`node:crypto`, stored in a `corevia_session` httpOnly cookie with an 8-hour TTL,
and only its **SHA-256 digest** is written to the database — so a dump of the
`sessions` table cannot be replayed as a live login. The cookie is marked `Secure`
in production and `SameSite=Lax` always.

Authentication is answered entirely by PostgreSQL: the account is found by
username *or* email, case-insensitively; the password is checked with `bcrypt`
against `user_credentials.password_hash`; the role that gates every page and
action is read from `employees.role`; and the session is a row. There is no
hardcoded account and no plaintext comparison anywhere. Five consecutive failures
lock the account for 15 minutes, and every failure returns the same message so
the form cannot be used to probe which usernames exist. Deactivating an employee
destroys their live sessions immediately.

**Changing and resetting passwords.** Anyone signed in can change their own from
the avatar menu → *Change password*. The current password is required — holding a
stolen session cookie is not enough to take an account over — and wrong attempts
are counted against the same five-strike lockout budget as a failed sign-in, so
the form cannot be used to guess it for free. Reusing the old password is
rejected, because it would sign out every other device while changing nothing.

An administrator resets someone else's password from *Manage Staff* → row menu →
*Reset password*. There is no email delivery anywhere in this system, so the
admin chooses the value and passes it on out of band; that dialog is also the
recovery path for anyone locked out of their account.

Both paths reuse the same bcrypt cost and the same `strongPassword` rule
(`src/lib/validations/auth.ts`), which `registerStaffSchema` imports, so an
admin-issued password and a self-chosen one cannot drift apart. On success the
session that performed the change survives and every other session for that user
is destroyed — so a password handed over in chat cannot leave an old session
alive. An admin resetting their *own* password keeps their session too, instead
of being signed out by their own action. An admin reset also clears
`failed_attempts` and `locked_until`, because the point of it is usually to
unstick a locked account.

`resetPasswordByAdmin` writes with an upsert rather than an update: a staff
member who was registered without a credential row — the seeded inactive account
is exactly that case — can still be given a first password.

### Data layer

`src/lib/api/*` is the only place that talks to the database. Pages and components
never import Drizzle — they call these async functions, and every one of them
imports `server-only`, which makes accidental client-side usage a build error.

```
page.tsx  ──▶  lib/api/*.ts  ──▶  lib/db/client.ts  ──▶  PostgreSQL
                                  lib/db/selects.ts   (shared projections)
```

Each API module is scoped to a domain (`employees`, `tasks`, `attendance`,
`salary`, `leaves`, `announcements`, `admin`, `dashboard`, `settings`) and returns
plain domain types. Shared join shapes live once in `lib/db/selects.ts` and row
translation in `lib/db/mappers.ts`, so no query is written twice.

Conventions worth knowing before editing a query:

- **Filtering, searching, sorting and pagination happen in SQL**, not in the
  component. Search uses `ILIKE` with an escaped pattern; sorting maps a UI key
  to a column whitelist so it can never be interpolated from user input.
- **`numeric` arrives as a string** from `pg`; every money column goes through
  `toNumber()` in `lib/db/query-helpers.ts` before it reaches a component.
- **`date` returns `YYYY-MM-DD` and `timestamptz` an ISO string**, which is what
  the existing `formatDate` / `formatCurrency` helpers already expect.
- **Derived state is derived in SQL.** A task's effective status, for example, is
  computed with a `CASE` expression that promotes a non-completed, past-due task
  to `overdue`, so the column on disk stays clean and a cron job is unnecessary.
- **Writes are real transactions.** `createEmployee` inserts the row, rewrites the
  unique `employee_code` to the id the sequence handed out, and inserts the
  credential hash in one transaction, so a partial employee can never exist.

### Migrations

`supabase/migrations/*.sql` is the canonical DDL, applied in filename order by
`scripts/migrate.mjs`, which records what it has run in a `schema_migrations`
table. `drizzle.config.ts` points `drizzle-kit` at the same directory, so
`npm run db:studio` and `npm run db:check` work against the same files.

`src/lib/db/schema.ts` is the typed mirror of that DDL. After changing either,
keep them in step: the schema file is what gives queries their types, and the SQL
file is what actually runs.

### Server Actions

Mutations never use API routes. Forms call Server Actions declared in
`src/app/employee/actions.ts` and `src/app/admin/actions.ts`. Each action:

1. calls `requireActionRole(...)`,
2. validates its input with a Zod schema,
3. performs the mutation through the API layer,
4. calls `revalidatePath` / `revalidateTag` so the UI refreshes,
5. returns a typed `{ success, message, fieldErrors? }` result that the client
   turns into a toast.

The login form is a server-rendered `<form action={...}>`, so it works with
JavaScript disabled.

### UI system

- **20 primitives** in `src/components/ui` — `Button`, `Input`, `Select`,
  `Badge`, `Card`, `DataTable`, `Modal`, `Sheet`, `DropdownMenu`, `Tabs`,
  `Toast`, `Pagination`, `Skeleton`, `EmptyState`, and more.
- **Charts** are dependency-free SVG components that scale to their container
  and include an accessible `<table>` fallback for screen readers.
- Chart value formatting is declared as a serialisable key
  (`valueFormat="currency" | "number" | "days" | "hours"`) rather than a
  function, because Server Components cannot pass functions to Client
  Components. The same applies to sidebar nav icons, which are referenced by key
  and resolved inside the client shell.
- Every table scrolls horizontally on small screens; forms show inline field
  errors, server errors and a submit-pending state.

---

## Design system

Tokens are declared as CSS custom properties in `src/app/globals.css` and
mapped to Tailwind 4 theme values in `src/app/globals.css` via `@theme inline`.

- **Brand** — a soft blue ramp used for primary actions and active states.
- **Ink** — a neutral grey ramp for text and borders.
- **Surfaces** — white cards on a subtle tinted page background.
- **Radii/shadows** — `rounded-card` and `shadow-card` keep card styling
  consistent without repeating utility strings.

---

## Database schema

The canonical DDL is `supabase/migrations/0001_init.sql`. It creates 12 tables,
8 sequences, one `set_updated_at()` trigger function, and the constraints below.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `departments` | Departments, editable instead of hardcoded | `id` (`dept-N`), `name` **unique** |
| `company_settings` | Company policy as key/value JSON | `key` PK, `value jsonb`, `label` |
| `salary_component_templates` | Allowance/deduction presets for payroll | `id` (`sct-N`), `kind`, `amount`, unique `(kind, label)` |
| `employees` | Staff directory and the source of roles | `id` (`emp-N`), `employee_code`, `username`, `email`, `role`, `status`, `basic_salary` |
| `user_credentials` | One bcrypt hash per employee | `employee_id` PK/FK, `password_hash`, `password_updated_at`, `failed_attempts`, `locked_until` |
| `sessions` | Logged-in sessions, keyed by digest | `token_hash` PK, `employee_id`, `expires_at`, `last_seen_at` |
| `tasks` | Assigned to-dos | `id` (`tsk-N`), `assigned_to_id`, `assigned_by_id`, `priority`, `status`, `due_date` |
| `attendance_records` | Day register | `id` (`att-N`), `employee_id`, `work_date`, `status`, `working_hours`, unique `(employee_id, work_date)` |
| `salary_records` | Monthly payslips | `id` (`sal-N`), `employee_id`, `month`, components, `net_salary`, `payment_status`, unique `(employee_id, month)` |
| `leave_requests` | Applications and decisions | `id` (`lv-N`), `employee_id`, `leave_type`, `total_days`, `status`, `reviewed_by_id` |
| `announcements` | Notices | `id` (`ann-N`), `author_id`, `priority`, `status`, `published_at`, `expires_at` |
| `announcement_reads` | Per-employee read receipts | PK `(announcement_id, employee_id)` |

Plus `schema_migrations`, written by the migration runner.

### Relationships

```
departments ──1:N──▶ employees ──1:1──▶ user_credentials
                          │
                          ├──1:N──▶ sessions
                          ├──1:N──▶ tasks          (assigned_to_id, ON DELETE CASCADE)
                          ├──1:N──▶ attendance_records
                          ├──1:N──▶ salary_records
                          ├──1:N──▶ leave_requests
                          ├──1:N──▶ announcement_reads
                          ├──1:N──▶ announcements (author_id,     ON DELETE SET NULL)
                          └──1:N──▶ tasks          (assigned_by_id, ON DELETE SET NULL)

announcements ──1:N──▶ announcement_reads  (ON DELETE CASCADE)
```

Deleting an employee cascades to their sessions, tasks, attendance, payroll, leave
and read receipts, so no orphan rows survive. Deleting a department is
`RESTRICT` — a department with staff must be reassigned first.

### Constraint decisions worth knowing

- **Text primary keys from sequences.** `emp-1001`, `tsk-3001`, `lv-2001`,
  `ann-4001` keep the identifiers the UI already exposed, while the value comes
  from a per-table sequence so concurrent inserts cannot collide.
- **Case-insensitive uniqueness** on `username` and `email` is expressed as
  `CREATE UNIQUE INDEX ... (lower(col))`, because a `UNIQUE (lower(col))`
  *constraint* is not valid syntax. Sign-in uses `lower(...)` too, so the rule
  and the lookup agree.
- **`UNIQUE (employee_id, work_date)`** makes an attendance correction an
  `ON CONFLICT DO UPDATE` instead of a duplicate insert, and
  **`UNIQUE (employee_id, month)`** does the same for payroll — one code path for
  both "create" and "correct".
- **`CHECK` constraints mirror the Zod enums**, so the domain rules hold even for
  a write that bypasses the service layer.
- **`overdue` is derived, not stored.** The column accepts it (the existing
  controls offer it), but reads compute the effective status in SQL.
- **`user_credentials` is a separate table**, so no ordinary employee query can
  accidentally select a password hash.
- **`updated_at` is maintained by a trigger**, not by the application, so it is
  correct for any writer.

---

## Verification status

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | Passes |
| Lint | `npm run lint` | 0 errors, 5 warnings |
| Build | `npm run build` | Passes, 21 routes, all `ƒ (Dynamic)` |
| Migrations | `npm run db:migrate` | Applies cleanly on an empty database |
| Seed | `npm run db:seed` | 8 departments, 11 employees, 18 tasks, 810 attendance, 120 salary, 8 leaves, 7 announcements |
| Credentials in the client bundle | grep over `.next/static` | None |

The 5 lint warnings are all `react-hooks/incompatible-library`, raised by React
Compiler when `react-hook-form`'s `watch()` is used. They are advisory — React
Compiler simply skips memoising those components. They can be removed by
switching `watch()` to `useWatch()` in:

- `src/components/admin/AssignTaskForm.tsx`
- `src/components/admin/AttendanceManagementTable.tsx`
- `src/components/admin/RegisterStaffForm.tsx`
- `src/components/admin/SalaryFormModal.tsx`
- `src/components/employee/LeaveRequestSection.tsx`

Runtime verification was performed over HTTP against a live database:

- Unauthenticated requests to `/`, `/employee/*` and `/admin/*` redirect to
  `/login`.
- Signing in through the real login form verifies the bcrypt hash, inserts a
  session row and sets the cookie; both demo roles reach their portal.
- All 19 authenticated pages return `200` and render rows read from PostgreSQL.
- Cross-role access is refused: an employee reaching `/admin/*` and an admin
  reaching `/employee/*` both land on `/unauthorized`.
- 55 assertions against the service layer passed, covering employee create /
  update / status / delete (including the `pending-<uuid>` → `EMP-N` code
  rewrite), task create / edit / status with derived `overdue`, payroll upsert
  (one row per month, net recalculated), attendance correction (upsert, hours
  recomputed), leave submit / decide, announcement create / publish / draft
  visibility / delete, read receipts, cascade behaviour, the last-active-admin
  and self-delete guards, and employee-scoped access rules.
- The database is the only source of state, so data and sessions survive a
  server restart.

---

## Notes and limitations

- **Client-side filtering is still in place in seven components.** Search, sort
  and pagination for the staff, task, attendance, leave, salary and announcement
  tables are already implemented as SQL filters in the service layer, but the
  tables additionally filter the rows they were handed in the browser. Pushing
  the remaining filtering through the query string is the natural next step; it
  was left alone here to keep the UI untouched.
- **No automated test suite** is included. The verification above is a scripted
  HTTP walk plus static checks; `npm run db:seed` is idempotent and safe to
  re-run.
- **The seed is destructive.** `db:seed` truncates the domain tables and reloads
  the demo dataset. Point `DATABASE_URL` at a scratch database.
- **Single database, no caching layer.** Every page is dynamic and reads live
  data; there is no Redis or tag-based cache, so query volume scales with
  traffic.
