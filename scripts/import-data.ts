import { config } from 'dotenv';
import { db } from '../src/db';
import { customersTable, customerNotesTable, customerAuditLogTable, todosTable, todoAuditLogTable } from '../src/db/schema';
import * as fs from 'fs';

config();

// Helper function to convert date strings back to Date objects
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr);
}

async function importData() {
  try {
    console.log('Importing data to local PostgreSQL...');

    // Read exported data
    const dataFile = fs.readFileSync('./data-export.json', 'utf-8');
    const data = JSON.parse(dataFile);

    // Maps to store old ID to new ID mappings
    const customerIdMap = new Map<number, number>();
    const noteIdMap = new Map<number, number>();
    const todoIdMap = new Map<number, number>();

    // Import in correct order (respecting foreign key constraints)
    
    // 1. Import customers first (without IDs)
    if (data.customers.length > 0) {
      console.log(`Importing ${data.customers.length} customers...`);
      for (const c of data.customers) {
        const oldId = c.id;
        const { id, ...customerData } = c;
        const [newCustomer] = await db.insert(customersTable).values({
          ...customerData,
          lastPatchDate: customerData.lastPatchDate || null,
          createdAt: parseDate(customerData.createdAt),
          updatedAt: parseDate(customerData.updatedAt),
        }).returning();
        customerIdMap.set(oldId, newCustomer.id);
      }
    }

    // 2. Import customer notes (depends on customers)
    if (data.customerNotes.length > 0) {
      console.log(`Importing ${data.customerNotes.length} customer notes...`);
      for (const n of data.customerNotes) {
        const oldId = n.id;
        const { id, customerId, ...noteData } = n;
        const newCustomerId = customerIdMap.get(customerId);
        if (!newCustomerId) {
          console.warn(`Skipping note ${oldId}: customer ${customerId} not found`);
          continue;
        }
        const [newNote] = await db.insert(customerNotesTable).values({
          ...noteData,
          customerId: newCustomerId,
          createdAt: parseDate(noteData.createdAt),
        }).returning();
        noteIdMap.set(oldId, newNote.id);
      }
    }

    // 3. Import customer audit log (depends on customers)
    if (data.customerAuditLog.length > 0) {
      console.log(`Importing ${data.customerAuditLog.length} customer audit log entries...`);
      for (const a of data.customerAuditLog) {
        const { id, customerId, ...auditData } = a;
        const newCustomerId = customerIdMap.get(customerId);
        if (!newCustomerId) {
          console.warn(`Skipping audit log ${id}: customer ${customerId} not found`);
          continue;
        }
        await db.insert(customerAuditLogTable).values({
          ...auditData,
          customerId: newCustomerId,
          createdAt: parseDate(auditData.createdAt),
        });
      }
    }

    // 4. Import todos (depends on customers and customer notes)
    if (data.todos.length > 0) {
      console.log(`Importing ${data.todos.length} todos...`);
      for (const t of data.todos) {
        const oldId = t.id;
        const { id, customerId, noteId, ...todoData } = t;
        const newCustomerId = customerId ? customerIdMap.get(customerId) : null;
        const newNoteId = noteId ? noteIdMap.get(noteId) : null;
        
        const [newTodo] = await db.insert(todosTable).values({
          ...todoData,
          customerId: newCustomerId || null,
          noteId: newNoteId || null,
          dueDate: todoData.dueDate || null,
          createdAt: parseDate(todoData.createdAt),
          updatedAt: parseDate(todoData.updatedAt),
        }).returning();
        todoIdMap.set(oldId, newTodo.id);
      }
    }

    // 5. Import todo audit log (depends on todos)
    if (data.todoAuditLog.length > 0) {
      console.log(`Importing ${data.todoAuditLog.length} todo audit log entries...`);
      for (const a of data.todoAuditLog) {
        const { id, todoId, ...auditData } = a;
        const newTodoId = todoIdMap.get(todoId);
        if (!newTodoId) {
          console.warn(`Skipping todo audit log ${id}: todo ${todoId} not found`);
          continue;
        }
        await db.insert(todoAuditLogTable).values({
          ...auditData,
          todoId: newTodoId,
          createdAt: parseDate(auditData.createdAt),
        });
      }
    }

    console.log('\n✓ Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

importData();
