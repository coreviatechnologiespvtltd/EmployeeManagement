# Corevia EMS — Employee Management System

Internal employee management system for **Corevia Technologies**, built with Next.js
App Router, TypeScript and Tailwind CSS. It ships two role-based portals — an
**Employee Portal** for self-service and an **Admin Console** for HR operations —
behind a mock, backend-ready data layer.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Demo credentials](#demo-credentials)
- [Scripts](#scripts)
- [Routes](#routes)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Auth & authorization](#auth--authorization)
  - [Data layer](#data-layer)
  - [Server Actions](#server-actions)
  - [UI system](#ui-system)
- [Design system](#design-system)
- [Replacing the mock backend](#replacing-the-mock-backend)
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

### Admin console

- **Dashboard** — headcount, attendance rate, pending leaves, payroll totals,
  department distribution and recent activity.
- **Manage staff** — searchable, filterable staff table with edit, activate and
  deactivate actions.
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
| Data | In-memory mock store with seeded records |

No UI, chart or table kit is used — every component in the app is hand-built.

---

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
npm install
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

## Demo credentials

| Role | Username | Password | Lands on |
| --- | --- | --- | --- |
| Admin | `admin` | `Admin@123` | `/admin/dashboard` |
| Employee | `employee` | `Employee@123` | `/employee/dashboard` |

The login form accepts either the username or the registered email address. The
same demo values are shown on the sign-in screen.

Additional seeded staff accounts (password `Employee@123`) exist so admin
features such as task assignment and leave approval have realistic data to act
on; see `src/lib/db/seed/`.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |

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
│   ├── auth/             # Login form, demo credential hint
│   ├── charts/           # BarChart, LineChart, DonutChart
│   ├── employee/         # Employee cards, tables, forms
│   ├── forms/            # FormField, FormActions, SubmitButton
│   ├── layout/           # DashboardShell, sidebar, nav icons
│   └── ui/               # 20 reusable primitives
├── lib/
│   ├── api/              # Service layer (the backend boundary)
│   ├── auth/             # Session store, service, actions
│   ├── db/               # Mock store + seed data
│   ├── validations/      # Zod schemas
│   ├── constants.ts
│   ├── navigation.ts
│   ├── format.ts
│   ├── status.ts
│   └── chart-format.ts
├── types/                # Shared domain types
└── proxy.ts              # Coarse auth middleware
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

Sessions are held in an in-memory map keyed by a 256-bit random token, stored in
a `corevia_session` httpOnly cookie with an 8-hour TTL. The cookie is marked
`Secure` in production and `SameSite=Lax` always.

### Data layer

`src/lib/api/*` is the only place that touches data. Pages and components never
import the store directly — they call these async functions, which simulate
network latency so loading states are exercised realistically.

```
page.tsx  ──▶  lib/api/*.ts  ──▶  lib/db/store.ts  ──▶  seed data
```

Each API module is scoped to a domain (`employees`, `tasks`, `attendance`,
`salary`, `leaves`, `announcements`, `admin`, `dashboard`) and imports
`server-only`, which makes accidental client-side usage a build error.

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

## Replacing the mock backend

The mock layer is isolated so it can be replaced without touching the UI:

1. **Swap the store.** `src/lib/db/store.ts` is the only in-memory state. Point
   the accessors at a database client (Prisma, Drizzle, SQL) and keep the same
   function signatures.
2. **Keep the API layer.** `src/lib/api/*.ts` functions already have the shape of
   a service layer. Reimplement each body as a query and delete
   `simulateLatency()`.
3. **Replace the session store.** `src/lib/auth/session.ts` is four functions
   (`createSession`, `getSession`, `destroySession`,
   `destroyAllSessionsForUser`). Back them with a sessions table or an external
   identity provider.
4. **Remove the seed.** Delete `src/lib/db/seed/*` once real data exists.

Because pages only talk to `src/lib/api/*` and actions only talk to that layer
plus `requireActionRole`, no component needs to change.

---

## Verification status

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | Passes |
| Lint | `npm run lint` | 0 errors, 5 warnings |
| Build | `npm run build` | Passes, 21 routes |
| Runtime | `npm run start` + route walk | See below |

The 5 lint warnings are all `react-hooks/incompatible-library`, raised by React
Compiler when `react-hook-form`'s `watch()` is used. They are advisory — React
Compiler simply skips memoising those components. They can be removed by
switching `watch()` to `useWatch()` in:

- `src/components/admin/AssignTaskForm.tsx`
- `src/components/admin/AttendanceManagementTable.tsx`
- `src/components/admin/RegisterStaffForm.tsx`
- `src/components/admin/SalaryFormModal.tsx`
- `src/components/employee/LeaveRequestSection.tsx`

Runtime verification performed against `npm run start`:

- Unauthenticated requests to `/`, `/employee/*` and `/admin/*` redirect to
  `/login`.
- Login for both demo roles returns `303` and sets a valid session cookie.
- All 16 authenticated pages return `200` and render seeded data.
- Cross-role access redirects: employee → `/admin/*` and admin →
  `/employee/*` both bounce to the correct portal.
- `todo/[id]` and `notices/[id]` resolve for seeded records.
- The server log is free of runtime errors across the full route walk.

Server Action mutations were not exercised over raw HTTP (Next.js encrypts
action IDs, so they cannot be invoked without a browser); they are covered by
typecheck, lint and build.

---

## Notes and limitations

- **Data is in memory.** Mutations reset whenever the server restarts, and
  sessions are lost on restart. This is expected for the mock backend.
- **Single process.** The in-memory store is not safe across multiple server
  instances; use a real database for horizontal scaling.
- **No test suite** is included. The verification above is manual plus static
  checks.
- **Passwords** are compared against seeded plaintext credentials for
  demonstration only. Use a hashing library such as `bcrypt` or `argon2` in the
  real backend.
