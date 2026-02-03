# Todo Audit Log Implementation

## Summary

This document describes the implementation of audit logging for all to-do operations in the CSE Dashboard application.

## What Was Implemented

### 1. Database Schema Changes

**New Table: `todo_audit_log`**

Located in: `src/db/schema.ts`

```sql
CREATE TABLE todo_audit_log (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  user_id TEXT NOT NULL
)
```

**Indexes Created:**
- `todo_audit_log_todo_id_idx` - For fast lookups by todo
- `todo_audit_log_created_at_idx` - For time-based queries
- `todo_audit_log_user_id_idx` - For user-specific queries

**Migration File:** `drizzle/0009_add_todo_audit_log.sql`

### 2. TypeScript Types

Located in: `src/db/types.ts`

Added types for the new audit table:
- `InsertTodoAuditLog`
- `SelectTodoAuditLog`

### 3. Audit Logging Functions

Located in: `src/db/audit.ts`

#### New Functions:

**`logTodoCreate(todoId, todoData, userId)`**
- Logs when a new to-do is created
- Stores the entire todo object as JSON in `newValue`
- Action: `"create"`

**`logTodoUpdate(todoId, oldTodo, newTodo, userId)`**
- Logs individual field changes when a to-do is updated
- Creates separate audit entries for each field that changed
- Tracks: title, description, priority, dueDate, customerId, completed
- Action: `"update"`

**`logTodoDelete(todoId, todoData, userId)`**
- Logs when a to-do is deleted
- Stores the entire todo object as JSON in `oldValue`
- Action: `"delete"`

**`logTodoComplete(todoId, userId)`**
- Logs when a to-do is marked as complete
- Specific action for completing (separate from generic update)
- Action: `"complete"`

**`logTodoUncomplete(todoId, userId)`**
- Logs when a to-do is marked as incomplete
- Specific action for uncompleting (separate from generic update)
- Action: `"uncomplete"`

### 4. Updated Server Actions

Located in: `src/app/actions/todos.ts`

All to-do server actions now include audit logging:

#### `createTodo(data)`
- Creates the to-do
- Logs the creation with all initial values

#### `updateTodo(data)`
- Fetches the old to-do data first
- Updates the to-do
- Logs each field that changed

#### `deleteTodo(data)`
- Deletes the to-do (with `.returning()` to capture data)
- Logs the deletion with the final state

#### `toggleTodoComplete(todoId)`
- Toggles the completed status
- Logs either `complete` or `uncomplete` action based on the new state

## Audit Actions

The following actions are tracked in the audit log:

1. **`create`** - New to-do created
2. **`update`** - To-do field(s) updated
3. **`complete`** - To-do marked as complete
4. **`uncomplete`** - To-do marked as incomplete
5. **`delete`** - To-do deleted

## Querying Audit Logs

To query audit logs for a specific to-do:

```typescript
import { db } from "@/db";
import { todoAuditLogTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const auditLogs = await db
  .select()
  .from(todoAuditLogTable)
  .where(eq(todoAuditLogTable.todoId, todoId))
  .orderBy(desc(todoAuditLogTable.createdAt));
```

To query audit logs for a specific user:

```typescript
const userAuditLogs = await db
  .select()
  .from(todoAuditLogTable)
  .where(eq(todoAuditLogTable.userId, userId))
  .orderBy(desc(todoAuditLogTable.createdAt));
```

## Data Structure

### Create Action
```json
{
  "todoId": 123,
  "action": "create",
  "fieldName": null,
  "oldValue": null,
  "newValue": "{\"id\":123,\"title\":\"New Task\",\"completed\":false,...}",
  "userId": "user_abc123",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Update Action
```json
{
  "todoId": 123,
  "action": "update",
  "fieldName": "title",
  "oldValue": "Old Title",
  "newValue": "New Title",
  "userId": "user_abc123",
  "createdAt": "2024-01-15T10:35:00Z"
}
```

### Complete Action
```json
{
  "todoId": 123,
  "action": "complete",
  "fieldName": "completed",
  "oldValue": "false",
  "newValue": "true",
  "userId": "user_abc123",
  "createdAt": "2024-01-15T10:40:00Z"
}
```

### Delete Action
```json
{
  "todoId": 123,
  "action": "delete",
  "fieldName": null,
  "oldValue": "{\"id\":123,\"title\":\"Task\",\"completed\":true,...}",
  "newValue": null,
  "userId": "user_abc123",
  "createdAt": "2024-01-15T10:45:00Z"
}
```

## Benefits

1. **Complete Audit Trail** - Every change to to-dos is tracked
2. **User Attribution** - Know who made each change
3. **Field-Level Tracking** - See exactly what changed in updates
4. **Time-Stamped** - All changes have timestamps
5. **Separate Actions** - Complete/uncomplete are tracked separately from generic updates
6. **Cascade Delete** - Audit logs are automatically deleted when parent to-do is deleted

## Testing

To test the audit logging:

1. Create a new to-do → Check for "create" action
2. Update a to-do field → Check for "update" action
3. Mark a to-do complete → Check for "complete" action
4. Mark a to-do incomplete → Check for "uncomplete" action
5. Delete a to-do → Check for "delete" action

## Important Implementation Details

### Date Field Comparison

The audit logging system includes special handling for date fields to ensure accurate change detection:

**Challenge**: The `dueDate` field is stored as a PostgreSQL `date` type. When fetched from the database via Drizzle, it may be returned as a Date object or ISO string. However, when updating from the UI, the value is received as a string (e.g., "2024-01-15"). Direct comparison of these different types would fail to detect actual changes.

**Solution**: The `logTodoUpdate` function normalizes date values before comparison:
```typescript
// Convert Date objects to ISO date string (YYYY-MM-DD)
normalizedOldValue = oldValue instanceof Date 
  ? oldValue.toISOString().split('T')[0] 
  : String(oldValue);
```

This ensures:
- Date objects are converted to "YYYY-MM-DD" format
- String dates are preserved as-is
- Null/undefined values are handled correctly
- Comparisons work regardless of the date format

### All Todo Operation Entry Points

The following components/actions create or modify todos and ALL include audit logging:

1. **AddTodoDialog** (`src/components/add-todo-dialog.tsx`)
   - Action: `createTodo()`
   - Logs: "create" action

2. **AddTodoFromNoteDialog** (`src/components/add-todo-from-note-dialog.tsx`)
   - Action: `createTodo()`
   - Logs: "create" action

3. **TodoItem - Edit** (`src/components/todo-item.tsx`)
   - Action: `updateTodo()`
   - Logs: "update" action (separate entry for each changed field)

4. **TodoItem - Checkbox** (`src/components/todo-item.tsx`)
   - Action: `toggleTodoComplete()`
   - Logs: "complete" or "uncomplete" action

5. **TodoItem - Delete** (`src/components/todo-item.tsx`)
   - Action: `deleteTodo()`
   - Logs: "delete" action

## Future Enhancements

Potential improvements:
- UI component to display audit history for a to-do
- Filtering audit logs by action type
- Audit log retention policies
- Export audit logs to CSV/JSON
- Real-time audit notifications
- Weekly/monthly audit reports
