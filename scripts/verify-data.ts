import { config } from 'dotenv';
import { db } from '../src/db';
import { customersTable, customerNotesTable, customerAuditLogTable, todosTable, todoAuditLogTable } from '../src/db/schema';
import { sql } from 'drizzle-orm';

config();

async function verifyData() {
  try {
    console.log('Verifying data in local PostgreSQL...\n');

    // Count records in each table
    const [customersCount] = await db.select({ count: sql<number>`count(*)` }).from(customersTable);
    const [notesCount] = await db.select({ count: sql<number>`count(*)` }).from(customerNotesTable);
    const [auditCount] = await db.select({ count: sql<number>`count(*)` }).from(customerAuditLogTable);
    const [todosCount] = await db.select({ count: sql<number>`count(*)` }).from(todosTable);
    const [todoAuditCount] = await db.select({ count: sql<number>`count(*)` }).from(todoAuditLogTable);

    console.log('✓ Data verification:');
    console.log(`  - Customers: ${customersCount.count}`);
    console.log(`  - Customer Notes: ${notesCount.count}`);
    console.log(`  - Customer Audit Log: ${auditCount.count}`);
    console.log(`  - Todos: ${todosCount.count}`);
    console.log(`  - Todo Audit Log: ${todoAuditCount.count}`);

    // Sample some data
    const sampleCustomers = await db.select().from(customersTable).limit(3);
    console.log('\n✓ Sample customers:');
    sampleCustomers.forEach(c => {
      console.log(`  - ${c.name} (${c.topology})`);
    });

    console.log('\n✓ Local PostgreSQL database is working correctly!');
  } catch (error) {
    console.error('Error verifying data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyData();
