# CSE Whiteboard

A Next.js app for **Customer Success Engineering**: customer and note tracking, to-dos, checklists, personal “what I learned” notes, optional **AMSTOOL** integration for AMS topologies, and **AI-assisted weekly reports**. The UI brands the product as **CSE Whiteboard** (see `src/app/layout.tsx`).

## Tech Stack

- **Next.js 16** (App Router) — `src/app/`
- **React 19** & **TypeScript**
- **Clerk** — authentication and per-user data isolation
- **Drizzle ORM** + **Neon** (Postgres)
- **Zod** — validation for server actions
- **shadcn/ui**, **Tailwind CSS**
- **OpenAI** — executive summaries in weekly reports
- **TipTap** — rich text for learned notes
- **@dnd-kit** — drag-and-drop (e.g. checklists)
- **Sonner** — toasts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signed-in users are sent to `/dashboard`. The landing page is `src/app/page.tsx`.

## App Routes (signed-in)

| Route | Purpose |
|--------|---------|
| `/dashboard` | Customers: cards, notes, archive, links (MSC, runbook, ServiceNow), topology stub, optional live patch level via AMSTOOL |
| `/todos` | To-dos with priority, due dates, optional link to a customer; filter by customer |
| `/checklists` | Named checklists with reorderable items and check-off state |
| `/what-i-learned` | Personal learned notes (title, category, rich content) |
| `/amstool` | Per-customer topology stub → filtered `amstool list` and instance listing (requires local `amstool` CLI) |
| `/system` | Export your data as JSON |
| `/get-user-id` | Shows your Clerk user ID (useful for seeding) |

Navigation for authenticated users is in the header (`src/app/layout.tsx`).

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
# Clerk — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Neon
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Weekly report executive summaries
OPENAI_API_KEY=sk-xxxxx

# Optional: local AMSTOOL CLI (dashboard invokes it on the server host)
# AMSTOOL_PATH=/usr/local/bin/amstool
# AMSTOOL_TABLE_ROW_LIMIT=75
# Set to 0 to disable all AMSTOOL calls (dashboard patch level + /amstool page)
# AMSTOOL_INTEGRATION=0
```

## Database (Drizzle + Neon)

Schema lives in `src/db/schema.ts`. Typical commands:

```bash
npm run db:push      # push schema (dev)
npm run db:generate  # generate migrations
npm run db:migrate   # apply migrations
npm run db:studio    # Drizzle Studio (127.0.0.1:4983)
npm run db:test      # connection / CRUD smoke test
npm run db:seed      # seed sample data (pass Clerk user id)
npm run db:verify    # verify data script
npm run db:connection
npm run db:clear-notes
npm run db:audit-logs
```

### Tables (overview)

- **`customers`** — name; patch date & version; **temperament**; topology; Dumbledore stage (1–9); patch frequency; workload; cloud manager; products; **MSC / runbook / SNOW URLs**; **topology stub** (for AMSTOOL); **archived**; timestamps; `user_id`
- **`customer_notes`** — note text per customer; timestamps; `user_id`
- **`customer_audit_log`** / **`customer_note_audit_log`** — field-level history for customers and notes
- **`todos`** — title, description, completed, priority, due date, optional `customer_id` / `note_id`; timestamps; `user_id`
- **`todo_audit_log`** — todo change history
- **`learned_notes`** — title, rich **content**, **category**; timestamps; `user_id`
- **`checklists`** / **`checklist_items`** — user-owned lists with ordered, completable lines

All user-owned rows are scoped by Clerk `user_id` in queries and server actions.

### Seeding

1. Run `npm run dev`, sign in, open `/get-user-id`, copy your Clerk user ID.  
2. Run `npm run db:seed YOUR_USER_ID`.  
3. Open `/dashboard` to see sample customers.

Details: [SEEDING_GUIDE.md](./SEEDING_GUIDE.md).

### Using the database in code

```typescript
import { db } from "@/db";
import { customersTable, customerNotesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const customers = await db
  .select()
  .from(customersTable)
  .where(eq(customersTable.userId, userId));
```

Mutations use **server actions** under `src/app/actions/` with Zod-validated inputs (not raw `FormData` types on the server).

## Features

### Dashboard

- Active vs **archived** customer sections  
- Rich customer fields (temperament, patch cadence, workload, cloud manager, products, quick links)  
- Timestamped **notes** per customer (with audit logging)  
- **Weekly report** — pick a week-ending date; ASCII-style report plus **OpenAI** executive summary when `OPENAI_API_KEY` is set  
- Optional **AMSTOOL**: with a **topology stub** on the customer and `amstool` on the server, resolved patch level can load on cards (see AMSTOOL env vars)

### To-do list (`/todos`)

- Priorities, due dates, completion, optional customer link  
- Filter by customer; deep-link support via query params  

### Checklists (`/checklists`)

- Multiple lists; add/edit/reorder items; check off progress  

### What I learned (`/what-i-learned`)

- Categorized notes with **TipTap** rich content  

### AMSTOOL (`/amstool`)

- Uses each customer’s **topology stub** to filter `amstool list` output and show instances per topology  
- Requires a working **Adobe Managed Services `amstool` CLI** on the machine running the Next.js server (or set `AMSTOOL_PATH`)

### System (`/system`)

- **Export** downloads JSON containing your customers, customer notes, todos, learned notes, and related audit log rows (export does not yet include checklists)

### Authentication

- Clerk sign-in / sign-up; **UserButton** in header; data isolated per Clerk user  

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)  
- [Clerk + Next.js](https://clerk.com/docs/quickstarts/nextjs)  
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)  

## Deploy

Deploy like any Next.js app (e.g. [Vercel](https://vercel.com)). Set the same environment variables in the host. **AMSTOOL** only works if the deployment environment can run the `amstool` binary and reach AMS networks as your local setup would.
