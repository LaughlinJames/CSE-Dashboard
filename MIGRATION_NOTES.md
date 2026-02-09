# Database Migration: Neon to Local PostgreSQL

## Migration Date
February 9, 2026

## Summary
Successfully migrated the CSE Dashboard application from Neon (cloud PostgreSQL) to a local PostgreSQL database.

## Changes Made

### 1. Database Connection
- **Updated**: `src/db/index.ts`
  - Changed from `drizzle-orm/neon-http` to `drizzle-orm/postgres-js`
  - Changed from `@neondatabase/serverless` to `postgres` package
  - Connection now uses local PostgreSQL

### 2. Environment Configuration
- **Updated**: `.env`
  - Old: `DATABASE_URL=postgresql://neondb_owner:npg_...@ep-square-morning-ahcvhm02-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
  - New: `DATABASE_URL=postgresql://localhost/cse_dashboard`

### 3. Data Migration
- **Exported** all data from Neon database
- **Created** local PostgreSQL database: `cse_dashboard`
- **Imported** all data with ID remapping to handle auto-generated identity columns

### 4. Dependencies
- **Removed**: `@neondatabase/serverless`
- **Using**: `postgres` (already installed)

## Data Migrated
- ✓ 6 Customers
- ✓ 37 Customer Notes
- ✓ 6 Customer Audit Log entries
- ✓ 20 Todos
- ✓ 52 Todo Audit Log entries

## Migration Scripts
Created scripts in `scripts/` directory:
- `export-neon-data.ts` - Exports data from Neon
- `import-data.ts` - Imports data to local PostgreSQL with ID mapping
- `verify-data.ts` - Verifies data integrity after migration

## Backup
The original Neon configuration is preserved in:
- `.env.neon.backup` (if you need to reference the old connection string)
- `data-export.json` (exported data from Neon)

## Local PostgreSQL Requirements
- PostgreSQL installed (via Postgres.app)
- Database created: `cse_dashboard`
- PostgreSQL running on default port (5432)

## Testing
Run verification script to ensure everything is working:
```bash
npm run db:test
```

Or verify data manually:
```bash
npx tsx --env-file=.env scripts/verify-data.ts
```

## Issues Fixed Post-Migration

### 1. Database Connection Errors
- **Cause**: Dev server cached old Neon connection
- **Fix**: Restart dev server with `npm run dev:clean`
- **Status**: ✅ Fixed

### 2. Todo Not Found Errors
- **Cause**: Browser cached old todo IDs from Neon
- **Fix**: Clear browser cache (hard refresh)
- **Status**: ✅ Fixed

### 3. Todo Deletion Foreign Key Error
- **Cause**: Audit logging happened after deletion (foreign key constraint violation)
- **Fix**: Changed order to log before deleting in `src/app/actions/todos.ts`
- **Status**: ✅ Fixed (see `BUGFIX_TODO_DELETION.md`)

## Next Steps
1. ✅ Restart dev server: `npm run dev:clean`
2. ✅ Clear browser cache (hard refresh)
3. Test all CRUD operations
4. Consider setting up regular backups for local database
