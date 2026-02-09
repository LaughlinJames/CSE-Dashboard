# ⚠️ Action Required: Restart Development Server & Clear Browser Cache

## Issues After Migration

After migrating from Neon to local PostgreSQL, you may encounter two issues:

1. **Database query errors**: Next.js dev server has old Neon connection cached
2. **"Todo not found" errors**: Browser has old todo IDs cached

## Solution
You need to **restart your development server AND clear browser cache**.

### Steps to Fix:

1. **Stop the current dev server**:
   - If running in a terminal, press `Ctrl+C`
   - Or manually kill the process:
     ```bash
     pkill -f "next dev"
     ```

2. **Clear Next.js cache** (optional but recommended):
   ```bash
   rm -rf .next
   ```

3. **Start the dev server fresh**:
   ```bash
   npm run dev
   ```

## Verification

After restarting, the application should connect to your local PostgreSQL database successfully.

You can verify by:
1. Opening the app at `http://localhost:3000` (or 3001)
2. Navigating to the dashboard
3. The query should now work without errors

## What Happened

- The old dev server had cached the Neon database connection
- Even though we updated the `.env` file and `src/db/index.ts`, the running process was still using the old connection
- Node.js/Next.js needs to be restarted to load the new environment variables and code

## Quick Test

To verify the database is working before starting the app:
```bash
npx tsx --env-file=.env scripts/test-connection.ts
```

This should show:
```
✓ Database connection successful!
✓ Sample customer: Solstice
✓ Local PostgreSQL is working correctly!
```

## Step 2: Clear Browser Cache

After restarting the server, you MUST clear your browser cache:

### Quick Method: Hard Refresh
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

### Complete Method: Clear All Site Data
1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **"Clear site data"**
4. Refresh the page

### Why Clear Cache?

During migration, PostgreSQL assigned new IDs to all records:
- Todos now have IDs 1-20 (not the old Neon IDs)
- Customers have new IDs 1-6
- Your browser cached the old IDs

When you try to delete a todo, the browser sends an old ID that doesn't exist in the local database, causing the "todo not found" error.

For detailed cache clearing instructions, see `CACHE_CLEAR_REQUIRED.md`.
