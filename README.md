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

Schema files are located in `src/db/schema.ts`. After making changes to your schema:

1. Run `npm run db:push` for quick development iterations
2. Or run `npm run db:generate` followed by `npm run db:migrate` for production-ready migrations

### Using the Database

Import the database client and schema in your code:

```typescript
import { db } from '@/db';
import { usersTable } from '@/db/schema';

// Query example
const users = await db.select().from(usersTable);

// Insert example
await db.insert(usersTable).values({ name: 'John', age: 30, email: 'john@example.com' });
```

### Example API Route

Check `src/app/api/users/route.ts` for a complete example of CRUD operations.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
