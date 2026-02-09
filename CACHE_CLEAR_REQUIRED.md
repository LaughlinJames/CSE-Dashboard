# ⚠️ Clear Browser Cache After Migration

## Issue: "Todo not found or unauthorized"

This error occurs because your browser has cached the **old todo IDs from Neon**, but the local database has **new IDs** after migration.

### What Happened During Migration

During the data import, PostgreSQL auto-generated new IDs:
- **Old Neon IDs**: Could have been any numbers (gaps, higher numbers, etc.)
- **New Local IDs**: Sequentially numbered 1-20

Your browser still has the old IDs cached, so when you try to delete a todo, it sends an old ID that doesn't exist in the local database.

## 🔧 Solution: Clear Cache and Restart

### Step 1: Restart Development Server

1. Stop your dev server (`Ctrl+C`)
2. Clear Next.js cache and restart:
   ```bash
   npm run dev:clean
   ```
   
   Or manually:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Step 2: Hard Refresh Your Browser

Choose the method for your browser:

**Chrome / Edge (Mac)**: `Cmd + Shift + R`
**Chrome / Edge (Windows/Linux)**: `Ctrl + Shift + R`

**Firefox (Mac)**: `Cmd + Shift + R`
**Firefox (Windows/Linux)**: `Ctrl + Shift + R`

**Safari**: 
1. Enable Develop menu: Safari > Preferences > Advanced > "Show Develop menu"
2. Press `Option + Cmd + E` (Empty Caches)
3. Then `Cmd + R` (Reload)

### Step 3: Alternative - Clear Application Data

If hard refresh doesn't work:

1. Open DevTools (`F12` or `Right-click > Inspect`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **"Clear site data"** or **"Clear all data"**
4. Refresh the page

### Step 4: Verify

After clearing cache:
1. Open the todos page
2. Open DevTools Console (`F12`)
3. Check the Network tab to see the todos being fetched with new IDs
4. Try deleting a todo again

## 🔍 Verification: Check Current Todo IDs

To see what IDs are actually in your database:
```bash
npm run db:verify
```

Or specifically check todos:
```bash
npx tsx --env-file=.env scripts/check-todos.ts
```

This shows:
- ✓ 20 todos with IDs 1-20
- Each todo's title, completion status, and customer

## 🎯 Why This Happened

1. **Neon Database**: Had todos with certain IDs (auto-generated over time)
2. **Export**: We exported the data with those IDs
3. **Import**: PostgreSQL's `GENERATED ALWAYS AS IDENTITY` columns can't accept pre-set IDs
4. **Result**: PostgreSQL assigned new sequential IDs (1, 2, 3, ...)
5. **Browser**: Still has old IDs cached in memory/localStorage/IndexedDB

## ✅ Prevention

After any database migration that remaps IDs:
1. Always restart the dev server
2. Always clear browser cache
3. Consider adding a version number to your app's localStorage to auto-clear on migration

## 🆘 Still Not Working?

If the issue persists after clearing cache:

1. **Check browser console for errors**:
   - Open DevTools (`F12`)
   - Look for any red errors
   
2. **Verify dev server is using local DB**:
   ```bash
   npm run db:connection
   ```
   Should show: `✓ Local PostgreSQL is working correctly!`

3. **Check if todos are being fetched**:
   - Open Network tab in DevTools
   - Reload the todos page
   - Look for the API call that fetches todos
   - Verify it's returning todos with IDs 1-20

4. **Try incognito/private mode**:
   - This ensures no cache is being used
   - If it works here, it confirms cache is the issue
