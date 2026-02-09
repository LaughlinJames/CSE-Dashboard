import { config } from 'dotenv';
import { db } from '../src/db';
import { todoAuditLogTable } from '../src/db/schema';

config();

async function testAuditInsert() {
  try {
    console.log('Testing audit log insert...\n');
    
    const testData = {
      todoId: 22,
      action: "delete",
      fieldName: null,
      oldValue: JSON.stringify({
        id: 22,
        title: "Test To do",
        description: "<p>test</p>",
        completed: false,
        priority: "medium",
        dueDate: "2026-02-06",
        customerId: null,
        noteId: null,
        createdAt: "2026-02-09T08:58:12.973Z",
        updatedAt: "2026-02-09T08:58:12.973Z",
        userId: "user_39AKY3GwS433muQRjzZSdlxzGEF"
      }),
      newValue: null,
      userId: "user_39AKY3GwS433muQRjzZSdlxzGEF"
    };
    
    console.log('Attempting to insert:', testData);
    
    const result = await db.insert(todoAuditLogTable).values(testData).returning();
    
    console.log('\n✓ Audit log insert successful!');
    console.log('Inserted record:', result[0]);
    
  } catch (error) {
    console.error('✗ Audit log insert failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  } finally {
    process.exit(0);
  }
}

testAuditInsert();
