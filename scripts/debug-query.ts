import { config } from 'dotenv';
import { db } from '../src/db';
import { customersTable } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

config();

async function debugQuery() {
  try {
    console.log('Testing the failing query...\n');
    
    const userId = 'user_39AKY3GwS433muQRjzZSdlxzGEF';
    const archived = false;
    
    console.log('Query parameters:');
    console.log(`  userId: ${userId}`);
    console.log(`  archived: ${archived}\n`);
    
    // Try the exact query that's failing
    const customers = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.userId, userId),
          eq(customersTable.archived, archived)
        )
      )
      .orderBy(customersTable.name);
    
    console.log('✓ Query successful!');
    console.log(`✓ Found ${customers.length} customers:`);
    customers.forEach(c => {
      console.log(`  - ${c.name} (id: ${c.id})`);
    });
    
  } catch (error) {
    console.error('✗ Query failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    process.exit(0);
  }
}

debugQuery();
