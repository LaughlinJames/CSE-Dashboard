import { config } from 'dotenv';
import { db } from '../src/db';
import { todosTable } from '../src/db/schema';
import { eq } from 'drizzle-orm';

config();

async function checkTodos() {
  try {
    console.log('Checking todos in database...\n');
    
    const userId = 'user_39AKY3GwS433muQRjzZSdlxzGEF';
    
    // Get all todos for the user
    const todos = await db
      .select()
      .from(todosTable)
      .where(eq(todosTable.userId, userId));
    
    console.log(`✓ Found ${todos.length} todos for user:\n`);
    
    todos.forEach(todo => {
      console.log(`ID: ${todo.id}`);
      console.log(`  Title: ${todo.title}`);
      console.log(`  Completed: ${todo.completed}`);
      console.log(`  Priority: ${todo.priority}`);
      console.log(`  Customer ID: ${todo.customerId || 'none'}`);
      console.log(`  User ID: ${todo.userId}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('✗ Error checking todos:', error);
  } finally {
    process.exit(0);
  }
}

checkTodos();
