# Database Schema Changes - Summary

## Changes Made

### 1. Removed Users Table
- ❌ Deleted `usersTable` from schema
- ❌ Removed `/src/app/api/users/route.ts` (API route for users)

### 2. Added Customers Table
- ✅ Created `customersTable` with the following fields:
  - `id` - Primary key (auto-increment)
  - `name` - Customer name
  - `last_patch_date` - Track last patch date (nullable)
  - `lts_status` - LTS support status (default: "unknown")
  - `created_at` - Record creation timestamp
  - `updated_at` - Record update timestamp
  - `user_id` - Clerk user ID for multi-tenancy

### 3. Added Customer Notes Table
- ✅ Created `customerNotesTable` with the following fields:
  - `id` - Primary key (auto-increment)
  - `customer_id` - Foreign key to customers (CASCADE DELETE)
  - `note` - Note content (text)
  - `created_at` - Note creation timestamp
  - `user_id` - Clerk user ID who created the note

### 4. Updated Files

#### Schema Files
- ✅ `src/db/schema.ts` - New schema with customers and notes tables
- ✅ `src/db/types.ts` - Updated type definitions
- ✅ `src/db/index.ts` - Added dotenv loading for better environment handling

#### Test Files
- ✅ `src/db/test.ts` - Updated tests for customers and notes
- ✅ `src/db/migrate.ts` - Created migration script to drop old tables and create new ones

#### Documentation
- ✅ `README.md` - Updated database documentation
- ✅ `DATABASE_SETUP.md` - Updated setup documentation
- ✅ `.cursor/rules/drizzle-database.mdc` - Updated rule examples

### 5. Database Migration
- ✅ Ran migration to drop old `users` table
- ✅ Created new `customers` and `customer_notes` tables
- ✅ All tests passing successfully

## Key Features

### Multi-Tenancy
All tables include `user_id` field to support Clerk authentication and ensure users can only access their own data.

### Cascade Deletion
When a customer is deleted, all associated notes are automatically deleted via CASCADE constraint.

### Timestamps
- Customers table tracks both `created_at` and `updated_at`
- Notes table tracks `created_at` for chronological viewing

## Usage Examples

### Create a Customer
```typescript
import { db } from '@/db';
import { customersTable } from '@/db/schema';

const customer = await db.insert(customersTable).values({
  name: 'Acme Corp',
  lastPatchDate: new Date('2024-01-15'),
  ltsStatus: 'active',
  userId: userId, // from Clerk auth
}).returning();
```

### Add a Note
```typescript
import { db } from '@/db';
import { customerNotesTable } from '@/db/schema';

const note = await db.insert(customerNotesTable).values({
  customerId: customerId,
  note: 'Initial setup completed',
  userId: userId, // from Clerk auth
}).returning();
```

### View Notes for a Customer
```typescript
import { db } from '@/db';
import { customerNotesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

const notes = await db
  .select()
  .from(customerNotesTable)
  .where(eq(customerNotesTable.customerId, customerId))
  .orderBy(customerNotesTable.createdAt); // chronological order
```

### Update Customer Status
```typescript
import { db } from '@/db';
import { customersTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

await db
  .update(customersTable)
  .set({
    lastPatchDate: new Date(),
    ltsStatus: 'active',
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(customersTable.id, customerId),
      eq(customersTable.userId, userId) // security check
    )
  );
```

## Testing

Run the test suite to verify everything works:

```bash
npm run db:test
```

All CRUD operations are tested including cascade deletion.
