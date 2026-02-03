# Customer Audit Log

The audit log feature automatically tracks all changes made to customer records, enabling you to view the complete history of modifications over time.

## Overview

Every time a customer is created, updated, or archived/unarchived, an entry is automatically written to the `customer_audit_log` table. This provides a complete audit trail for compliance, debugging, and historical analysis.

## What Gets Logged

### Actions Tracked

1. **Create** - When a new customer is created
2. **Update** - When any field in a customer record is modified
3. **Archive** - When a customer is archived
4. **Unarchive** - When a customer is unarchived

### Fields Tracked

The following customer fields are tracked for changes:
- `name` - Customer name
- `lastPatchDate` - Last patch date
- `lastPatchVersion` - Last patch version applied
- `temperament` - Customer satisfaction level (happy, satisfied, neutral, concerned, frustrated)
- `topology` - Environment (dev, qa, stage, prod)
- `dumbledoreStage` - Dumbledore stage (1-9)
- `patchFrequency` - Patch frequency (monthly or quarterly)
- `mscUrl` - MSC URL
- `runbookUrl` - Runbook URL
- `snowUrl` - SNOW URL

## Database Schema

The `customer_audit_log` table has the following structure:

```typescript
{
  id: number;                    // Unique audit log entry ID
  customerId: number;            // Reference to customer
  action: string;                // Action type: create, update, archive, unarchive
  fieldName: string | null;      // Field that changed (null for create/archive)
  oldValue: string | null;       // Previous value (stringified)
  newValue: string | null;       // New value (stringified)
  createdAt: Date;               // When the change was made
  userId: string;                // Clerk user ID who made the change
}
```

### Indexes

The table has indexes on:
- `customer_id` - Fast lookup of all changes for a customer
- `created_at` - Fast time-based queries
- `user_id` - Fast lookup of changes by user

## Usage Examples

### Retrieve Full Audit History

```typescript
import { getCustomerAuditHistory } from '@/app/actions/customers';

// Get all audit entries for a customer
const auditHistory = await getCustomerAuditHistory({
  customerId: 123
});

// Returns array of audit entries, sorted by most recent first
```

### Retrieve Audit History for Date Range

```typescript
import { getCustomerAuditHistory } from '@/app/actions/customers';

// Get audit entries for a specific date range
const auditHistory = await getCustomerAuditHistory({
  customerId: 123,
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Example Audit Entry Format

```typescript
// Example of a field update
{
  id: 456,
  action: "update",
  fieldName: "topology",
  oldValue: "qa",
  newValue: "prod",
  createdAt: new Date("2024-01-15T10:30:00Z"),
  userId: "user_abc123"
}

// Example of a customer creation
{
  id: 457,
  action: "create",
  fieldName: null,
  oldValue: null,
  newValue: "{\"name\":\"Acme Corp\",\"topology\":\"dev\",...}",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  userId: "user_abc123"
}

// Example of an archive action
{
  id: 458,
  action: "archive",
  fieldName: "archived",
  oldValue: "false",
  newValue: "true",
  createdAt: new Date("2024-01-15T11:00:00Z"),
  userId: "user_abc123"
}
```

## Automatic Logging

All audit logging happens automatically in the server actions. You don't need to manually call any audit functions when using the standard customer actions:

- `createCustomer()` - Automatically logs customer creation
- `updateCustomer()` - Automatically logs all field changes
- `toggleArchiveCustomer()` - Automatically logs archive/unarchive actions

## Implementation Details

### Audit Helper Functions

The audit logging functionality is implemented in `src/db/audit.ts`:

- `logCustomerCreate()` - Logs customer creation
- `logCustomerUpdate()` - Logs field-level changes during update
- `logCustomerArchive()` - Logs archive/unarchive actions

### Transaction Safety

Audit logs are written immediately after the database operation completes. If the database operation fails, no audit log is created.

### Field-Level Tracking

When a customer is updated, only the fields that actually changed are logged. This keeps the audit log concise and makes it easy to see exactly what changed.

For example, if only the `topology` field changes from "qa" to "prod", only one audit entry is created for that specific field change.

## Reporting Use Cases

### Change History Report

View all changes to a customer over time:

```typescript
const history = await getCustomerAuditHistory({ customerId: 123 });

// Display chronologically
history.reverse().forEach(entry => {
  if (entry.action === 'update') {
    console.log(`${entry.createdAt}: ${entry.fieldName} changed from ${entry.oldValue} to ${entry.newValue}`);
  }
});
```

### Field-Specific History

Track changes to a specific field over time:

```typescript
const history = await getCustomerAuditHistory({ customerId: 123 });

// Filter for topology changes
const topologyChanges = history.filter(entry => 
  entry.fieldName === 'topology'
);

// Show progression: dev → qa → stage → prod
topologyChanges.reverse().forEach(entry => {
  console.log(`${entry.createdAt}: ${entry.oldValue} → ${entry.newValue}`);
});
```

### Compliance Audit

Generate a compliance report showing who made changes and when:

```typescript
const history = await getCustomerAuditHistory({
  customerId: 123,
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

history.forEach(entry => {
  console.log(`${entry.createdAt}: User ${entry.userId} performed ${entry.action}`);
});
```

## Data Retention

Audit log entries are retained indefinitely by default. They are automatically deleted when a customer is deleted (via CASCADE constraint).

If you need to implement a retention policy, you can create a cleanup script:

```typescript
// Example: Delete audit logs older than 2 years
import { db } from '@/db';
import { customerAuditLogTable } from '@/db/schema';
import { lte } from 'drizzle-orm';

const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

await db
  .delete(customerAuditLogTable)
  .where(lte(customerAuditLogTable.createdAt, twoYearsAgo));
```

## Security

- All audit queries are protected by Clerk authentication
- Users can only view audit logs for customers they own (via `userId` check)
- Audit logs cannot be modified or deleted through the standard API
- Each audit entry records which user made the change for accountability

## Migration

The audit log table was created with migration `0006_add_customer_audit_log.sql`.

To apply the migration:

```bash
npx tsx src/db/apply-audit-migration.ts
```

The migration creates the table with appropriate indexes for optimal query performance.
