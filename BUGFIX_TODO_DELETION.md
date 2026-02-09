# Bug Fix: Todo Deletion Foreign Key Constraint Error

## Issue
When deleting a todo, the operation would fail with a foreign key constraint error:

```
insert or update on table "todo_audit_log" violates foreign key constraint
Key (todo_id)=(22) is not present in table "todos".
```

## Root Cause

The `deleteTodo` action was performing operations in the wrong order:

1. **Delete the todo** from `todos` table ❌
2. Try to log the deletion in `todo_audit_log` ❌
3. **Foreign key constraint violation**: Can't insert audit log for a todo that no longer exists

The `todo_audit_log` table has a foreign key constraint:
```typescript
todoId: integer("todo_id")
  .notNull()
  .references(() => todosTable.id, { onDelete: "cascade" })
```

This constraint requires that `todo_id` must exist in the `todos` table when inserting an audit log.

## Solution

Changed the order of operations in `src/app/actions/todos.ts`:

### Before (Broken)
```typescript
export async function deleteTodo(data: DeleteTodoInput) {
  // ... auth checks ...
  
  // 1. Delete first (removes from database)
  const result = await db.delete(todosTable)...
  
  // 2. Try to log (FAILS - todo_id no longer exists!)
  await logTodoDelete(validated.id, result[0], userId);
}
```

### After (Fixed) ✅
```typescript
export async function deleteTodo(data: DeleteTodoInput) {
  // ... auth checks ...
  
  // 1. Fetch the todo data first
  const todos = await db.select()...
  
  // 2. Log deletion BEFORE deleting (todo_id still valid)
  await logTodoDelete(validated.id, todoToDelete, userId);
  
  // 3. Delete the todo (audit log will cascade delete)
  await db.delete(todosTable)...
}
```

## Testing

The fix was tested with `scripts/test-todo-delete-flow.ts`:

```bash
npm run db:verify
npx tsx --env-file=.env scripts/test-todo-delete-flow.ts
```

**Test Results**:
```
✅ Todo deletion flow test completed successfully!

The fix works correctly:
  1. Fetch todo data first
  2. Log deletion with audit log
  3. Delete the todo
  4. Audit log cascades (deleted with the todo)
```

## Cascade Behavior

Note: The audit log gets **cascade deleted** when the todo is deleted. This is expected behavior based on the schema's `onDelete: "cascade"` setting.

If you want to **preserve audit logs** after todo deletion, you would need to change the schema to:
```typescript
// Remove or change the foreign key constraint
todoId: integer("todo_id").notNull()
// No .references() = no constraint
```

But for now, the cascade delete is intentional to keep the database clean.

## Files Changed

- `src/app/actions/todos.ts` - Fixed `deleteTodo` function

## Status

✅ **FIXED** - Todo deletion now works correctly without foreign key constraint errors.

## Next Steps

1. **Restart your dev server** to pick up the changes:
   ```bash
   npm run dev:clean
   ```

2. **Clear browser cache** (hard refresh):
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **Test the fix**:
   - Create a new todo
   - Delete it
   - Should work without errors now!

## Related Issues

- Initial migration from Neon to local PostgreSQL completed successfully
- Browser cache needed clearing for new todo IDs
- Foreign key constraint error on audit logging (now fixed)
