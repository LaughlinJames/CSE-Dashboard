import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { customersTable, customerNotesTable, customerAuditLogTable, todosTable, todoAuditLogTable } from '../src/db/schema';
import * as fs from 'fs';

config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

async function exportData() {
  try {
    console.log('Exporting data from Neon...');

    // Export all tables
    const customers = await db.select().from(customersTable);
    const customerNotes = await db.select().from(customerNotesTable);
    const customerAuditLog = await db.select().from(customerAuditLogTable);
    const todos = await db.select().from(todosTable);
    const todoAuditLog = await db.select().from(todoAuditLogTable);

    const data = {
      customers,
      customerNotes,
      customerAuditLog,
      todos,
      todoAuditLog,
    };

    // Write to file
    fs.writeFileSync(
      './data-export.json',
      JSON.stringify(data, null, 2)
    );

    console.log('Data exported successfully!');
    console.log(`- Customers: ${customers.length}`);
    console.log(`- Customer Notes: ${customerNotes.length}`);
    console.log(`- Customer Audit Log: ${customerAuditLog.length}`);
    console.log(`- Todos: ${todos.length}`);
    console.log(`- Todo Audit Log: ${todoAuditLog.length}`);
  } catch (error) {
    console.error('Error exporting data:', error);
    process.exit(1);
  }
}

exportData();
