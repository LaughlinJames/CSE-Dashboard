# Testing Todo Audit Logging

## Issue Fixed

The audit logging was not working properly for due date updates because:

1. **Type Mismatch**: The `dueDate` field in the database is stored as a `date` type, which Drizzle returns as a Date object (or ISO string). When comparing with the incoming string value from the form (e.g., "2024-01-15"), the comparison would fail even if the dates were actually different.

2. **Solution**: Updated `logTodoUpdate` function to normalize date values before comparison:
   - Converts Date objects to ISO date strings (YYYY-MM-DD format)
   - Handles null/undefined values properly
   - Ensures string comparisons work correctly

## Testing Instructions

To verify all todo operations are logging correctly:

### 1. Create a Todo (from dialog)
- Go to /todos page
- Click "Add To-Do" button
- Fill in title, description, priority, and due date
- Click "Create To-Do"
- **Expected**: One audit entry with action "create"

### 2. Create a Todo (from customer note)
- Go to /dashboard page
- Click on a customer card to open details
- Add a note
- Click the list icon on the note to create a todo from it
- Fill in title, priority, and due date
- Click "Create To-Do"
- **Expected**: One audit entry with action "create"

### 3. Update a Todo - Change Due Date
- Go to /todos page
- Click the edit icon on any todo
- Change the due date to a different date
- Click "Save Changes"
- **Expected**: One audit entry with action "update" and fieldName "dueDate"

### 4. Update a Todo - Change Multiple Fields
- Edit a todo
- Change title, description, priority, and due date
- Click "Save Changes"
- **Expected**: Four audit entries with action "update", one for each changed field

### 5. Complete a Todo
- Go to /todos page
- Check the checkbox on an incomplete todo
- **Expected**: One audit entry with action "complete"

### 6. Uncomplete a Todo
- Uncheck the checkbox on a completed todo
- **Expected**: One audit entry with action "uncomplete"

### 7. Delete a Todo
- Click the trash icon on any todo
- Confirm deletion
- **Expected**: One audit entry with action "delete" (stored before deletion)

## Verify Audit Logs

To check the audit logs in the database:

```sql
-- Get all todo audit logs
SELECT * FROM todo_audit_log ORDER BY created_at DESC;

-- Get audit logs for a specific todo
SELECT * FROM todo_audit_log WHERE todo_id = 123 ORDER BY created_at;

-- Get audit logs for a specific user
SELECT * FROM todo_audit_log WHERE user_id = 'user_abc123' ORDER BY created_at DESC;

-- Get only date change logs
SELECT * FROM todo_audit_log WHERE field_name = 'dueDate' ORDER BY created_at DESC;
```

## All Todo Operations Covered

✅ **Create** - via AddTodoDialog component
✅ **Create** - via AddTodoFromNoteDialog component
✅ **Update** - via TodoItem edit dialog (tracks individual field changes)
✅ **Complete** - via TodoItem checkbox
✅ **Uncomplete** - via TodoItem checkbox
✅ **Delete** - via TodoItem delete button

## Date Comparison Fix

The key fix in `src/db/audit.ts`:

```typescript
// Special handling for dates
if (field === "dueDate") {
  normalizedOldValue = oldValue === null || oldValue === undefined 
    ? null 
    : oldValue instanceof Date 
      ? oldValue.toISOString().split('T')[0]  // Convert Date to "YYYY-MM-DD"
      : String(oldValue);
  
  normalizedNewValue = newValue === null || newValue === undefined 
    ? null 
    : newValue instanceof Date 
      ? newValue.toISOString().split('T')[0]  // Convert Date to "YYYY-MM-DD"
      : String(newValue);
}
```

This ensures that:
- Date objects are converted to ISO date strings (YYYY-MM-DD)
- String dates are kept as-is
- Null/undefined values are handled properly
- Comparisons work correctly regardless of the date format
