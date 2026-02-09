# Local PostgreSQL Database Setup

This application now uses a **local PostgreSQL database** instead of Neon cloud database.

## Database Information
- **Database Name**: `cse_dashboard`
- **Connection**: Local PostgreSQL on localhost (default port 5432)
- **Connection String**: `postgresql://localhost/cse_dashboard`

## Prerequisites
- PostgreSQL installed and running locally (via Postgres.app or similar)
- Database `cse_dashboard` created

## Environment Configuration

The `.env` file contains:
```
DATABASE_URL=postgresql://localhost/cse_dashboard
```

## Database Schema

The application uses Drizzle ORM with the following tables:
- `customers` - Customer information
- `customer_notes` - Notes for each customer
- `customer_audit_log` - Audit trail for customer changes
- `todos` - User to-do items
- `todo_audit_log` - Audit trail for todo changes

## Available Scripts

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Test database connection
npx tsx --env-file=.env scripts/test-connection.ts

# Verify data
npx tsx --env-file=.env scripts/verify-data.ts
```

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Migration from Neon

The application was successfully migrated from Neon to local PostgreSQL on February 9, 2026.

All data was exported from Neon and imported to the local database:
- 6 Customers
- 37 Customer Notes
- 6 Customer Audit Log entries
- 20 Todos
- 52 Todo Audit Log entries

For detailed migration notes, see `MIGRATION_NOTES.md`.

## Backup Files

The following files are preserved from the migration:
- `data-export.json` - Complete data export from Neon
- `.env.neon.backup` - Original Neon connection string (if needed)
- `scripts/export-neon-data.ts` - Script used to export from Neon
- `scripts/import-data.ts` - Script used to import to local database

## Database Backup

To backup your local database:
```bash
pg_dump cse_dashboard > backup.sql
```

To restore from backup:
```bash
psql cse_dashboard < backup.sql
```

## Troubleshooting

### Cannot connect to database
- Ensure PostgreSQL is running
- Check that the database `cse_dashboard` exists
- Verify the connection string in `.env`

### Schema issues
Run the push command to sync schema:
```bash
npm run db:push
```

### Check database contents
Use Drizzle Studio for a visual interface:
```bash
npm run db:studio
```

## Technical Details

### Database Connection
- **Driver**: `postgres` (postgres-js)
- **ORM**: Drizzle ORM
- **Connection file**: `src/db/index.ts`
- **Schema file**: `src/db/schema.ts`

### Removed Dependencies
- `@neondatabase/serverless` (no longer needed)

### Current Dependencies
- `postgres` - PostgreSQL client
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` - Schema management tools
