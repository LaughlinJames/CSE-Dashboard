import { config } from 'dotenv';
import { db } from '../src/db';
import { customersTable } from '../src/db/schema';

config();

async function testConnection() {
  try {
    console.log('Testing database connection...\n');
    
    // Try to fetch some data
    const customers = await db.select().from(customersTable).limit(1);
    
    if (customers.length > 0) {
      console.log('✓ Database connection successful!');
      console.log(`✓ Sample customer: ${customers[0].name}`);
      console.log('\n✓ Local PostgreSQL is working correctly!');
    } else {
      console.log('✓ Database connection successful but no data found.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
