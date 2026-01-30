# LTS Status Schema Update

## Overview

Updated the customer LTS status from a single text field to two separate fields:
- **Topology**: Environment type (dev, qa, stage, prod)
- **Dumbledore Stage**: Stage number (1-9)

## Schema Changes

### Before
```typescript
ltsStatus: varchar("lts_status", { length: 50 }).notNull().default("unknown")
```

### After
```typescript
topology: varchar({ length: 20 }).notNull().default("dev")
dumbledoreStage: integer("dumbledore_stage").notNull().default(1)
```

## Files Updated

### Core Schema
- ✅ `src/db/schema.ts` - Updated table definition
- ✅ `src/db/types.ts` - Auto-updates via type inference
- ✅ `src/db/migrate.ts` - Updated CREATE TABLE statement

### Validation & Actions
- ✅ `src/lib/validations/customers.ts` - Updated Zod schema
  - `topology`: enum ["dev", "qa", "stage", "prod"]
  - `dumbledoreStage`: number between 1-9
- ✅ `src/app/actions/customers.ts` - Updated server action

### UI Components
- ✅ `src/app/dashboard/page.tsx` - Updated query and display
  - Shows topology badge with color coding
  - Shows Dumbledore stage badge
- ✅ `src/components/add-customer-dialog.tsx` - Updated form inputs
  - Topology dropdown (dev/qa/stage/prod)
  - Dumbledore Stage dropdown (1-9)

### Testing & Documentation
- ✅ `src/db/test.ts` - Updated test data
- ✅ `src/db/seed.ts` - Updated seed data with varied examples
- ✅ `README.md` - Updated documentation
- ✅ `.cursor/rules/drizzle-database.mdc` - Updated examples

### Migration Files
- ✅ `drizzle/0001_update_lts_status_to_topology.sql` - Migration SQL

## UI Changes

### Dashboard Display
Customers now show:
- **Topology badge**: Color-coded by environment
  - Dev: Outline style
  - QA: Secondary style
  - Stage: Default style
  - Prod: Destructive (red) style
- **Stage badge**: "Stage X" (1-9)

### Add Customer Form
New form fields:
- **Topology dropdown**: Required, defaults to "dev"
- **Dumbledore Stage dropdown**: Required, defaults to "1"

## Sample Data

The seed script creates 4 customers with varied configurations:
1. TechStart Solutions - Prod, Stage 5
2. Global Enterprises Inc - Stage, Stage 3
3. DataFlow Systems - Prod, Stage 7
4. CloudNet Partners - QA, Stage 2

## Testing

All tests passing:
- ✅ Database CRUD operations
- ✅ Type safety maintained
- ✅ No linter errors

## Migration Status

✅ Database migration completed successfully
- Old `lts_status` column dropped
- New `topology` and `dumbledore_stage` columns created
- All data structures updated
