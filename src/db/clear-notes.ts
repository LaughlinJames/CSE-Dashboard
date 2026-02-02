import { config } from 'dotenv';
import { db } from './index';
import { customerNotesTable } from './schema';

// Load environment variables
config();

async function clearNotes() {
  try {
    console.log('🗑️  Clearing all notes from customer_notes table...');
    
    // Delete all notes
    const result = await db.delete(customerNotesTable);
    
    console.log('✅ Successfully cleared all notes from the database');
    console.log('ℹ️  All customer data remains intact');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing notes:', error);
    process.exit(1);
  }
}

clearNotes();
