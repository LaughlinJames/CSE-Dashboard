import { config } from "dotenv";
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { todoAuditLogTable } from './schema';
import { desc, eq } from 'drizzle-orm';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sqlClient });

/**
 * Query all todo audit logs, most recent first
 */
export async function getAllTodoAuditLogs(limit = 50) {
  return await db
    .select()
    .from(todoAuditLogTable)
    .orderBy(desc(todoAuditLogTable.createdAt))
    .limit(limit);
}

/**
 * Query audit logs for a specific todo
 */
export async function getTodoAuditLogs(todoId: number) {
  return await db
    .select()
    .from(todoAuditLogTable)
    .where(eq(todoAuditLogTable.todoId, todoId))
    .orderBy(desc(todoAuditLogTable.createdAt));
}

/**
 * Query audit logs for a specific user
 */
export async function getUserTodoAuditLogs(userId: string, limit = 50) {
  return await db
    .select()
    .from(todoAuditLogTable)
    .where(eq(todoAuditLogTable.userId, userId))
    .orderBy(desc(todoAuditLogTable.createdAt))
    .limit(limit);
}

/**
 * Query audit logs by action type
 */
export async function getTodoAuditLogsByAction(action: string, limit = 50) {
  return await db
    .select()
    .from(todoAuditLogTable)
    .where(eq(todoAuditLogTable.action, action))
    .orderBy(desc(todoAuditLogTable.createdAt))
    .limit(limit);
}

// If run directly, show recent audit logs
if (require.main === module) {
  (async () => {
    console.log("📊 Querying recent todo audit logs...\n");
    
    try {
      const logs = await getAllTodoAuditLogs(20);
      
      if (logs.length === 0) {
        console.log("No audit logs found.");
      } else {
        console.log(`Found ${logs.length} audit log entries:\n`);
        
        logs.forEach((log, index) => {
          console.log(`${index + 1}. [${log.action.toUpperCase()}] Todo #${log.todoId}`);
          console.log(`   Field: ${log.fieldName || 'N/A'}`);
          console.log(`   Old Value: ${log.oldValue || 'N/A'}`);
          console.log(`   New Value: ${log.newValue || 'N/A'}`);
          console.log(`   User: ${log.userId}`);
          console.log(`   Time: ${log.createdAt}`);
          console.log('');
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.error("❌ Error querying audit logs:", error);
      process.exit(1);
    }
  })();
}
