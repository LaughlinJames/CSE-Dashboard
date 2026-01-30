# CSE Dashboard

A Next.js dashboard application for Customer Success Engineering, built with modern web technologies.

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Clerk** - Authentication
- **Drizzle ORM** - Database ORM
- **Neon** - Serverless Postgres
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Poppins](https://fonts.google.com/specimen/Poppins) from Google Fonts.

## Database Setup (Drizzle ORM + Neon)

This project uses Drizzle ORM with Neon Postgres for database management.

### Environment Variables

Copy `.env.example` to `.env` and fill in your database credentials:

```bash
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

### Database Commands

```bash
# Push schema changes to database (without migrations)
npm run db:push

# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open Drizzle Studio (GUI for your database)
npm run db:studio
```

### Database Schema

The application uses two main tables:

#### Customers Table

Tracks customer information and patch status:

- `id` - Auto-incrementing primary key
- `name` - Customer name (varchar 255)
- `last_patch_date` - Date of last patch applied (date, nullable)
- `topology` - Customer topology environment (varchar 20: dev, qa, stage, prod, default: "dev")
- `dumbledore_stage` - Dumbledore stage number (integer 1-9, default: 1)
- `created_at` - Record creation timestamp
- `updated_at` - Record last updated timestamp
- `user_id` - Clerk user ID (for multi-tenancy)

#### Customer Notes Table

Timestamped notes for each customer:

- `id` - Auto-incrementing primary key
- `customer_id` - Foreign key to customers table (cascade delete)
- `note` - Note content (text)
- `created_at` - Note creation timestamp
- `user_id` - Clerk user ID of note author

Schema files are located in `src/db/schema.ts`. After making changes to your schema:

1. Run `npm run db:push` for quick development iterations
2. Or run `npm run db:generate` followed by `npm run db:migrate` for production-ready migrations

### Using the Database

Import the database client and schema in your code:

```typescript
import { db } from '@/db';
import { customersTable, customerNotesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Get all customers for a user
const customers = await db
  .select()
  .from(customersTable)
  .where(eq(customersTable.userId, userId));

// Get notes for a specific customer
const notes = await db
  .select()
  .from(customerNotesTable)
  .where(eq(customerNotesTable.customerId, customerId));

// Insert a new customer
await db.insert(customersTable).values({
  name: 'Acme Corp',
  lastPatchDate: new Date('2024-01-15'),
  topology: 'prod',
  dumbledoreStage: 5,
  userId: 'user_123',
});

// Add a note to a customer
await db.insert(customerNotesTable).values({
  customerId: 1,
  note: 'Initial setup completed',
  userId: 'user_123',
});
```

### Running Tests

Test the database connection and CRUD operations:

```bash
npm run db:test
```

### Seeding the Database

To populate your database with sample customer data:

1. Start the dev server and sign in: `npm run dev`
2. Visit `/get-user-id` to get your Clerk User ID
3. Run the seed script with your User ID:

```bash
npm run db:seed YOUR_USER_ID_HERE
```

This will create 4 sample customers with notes that you can view in the `/dashboard`.

For detailed seeding instructions, see [SEEDING_GUIDE.md](./SEEDING_GUIDE.md).

## Features

### Dashboard

View all your customers at `/dashboard` with:
- Customer cards showing name, topology, Dumbledore stage, and patch dates
- Latest note for each customer
- Color-coded topology badges (Dev, QA, Stage, Prod)
- Stage indicators (1-9)
- Responsive grid layout

### User Authentication

Powered by Clerk, providing:
- Sign up / Sign in
- User profile management
- Multi-tenant data isolation (users only see their own data)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
