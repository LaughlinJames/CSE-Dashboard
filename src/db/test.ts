import 'dotenv/config';
import { db } from './index';
import { usersTable } from './schema';
import { eq } from 'drizzle-orm';

async function testDatabase() {
  try {
    console.log('🔄 Testing database connection...\n');

    // Test 1: Create a user
    console.log('1️⃣ Creating a test user...');
    const testUser = {
      name: 'Test User',
      age: 25,
      email: `test-${Date.now()}@example.com`,
    };

    const [newUser] = await db.insert(usersTable).values(testUser).returning();
    console.log('✅ User created:', newUser);

    // Test 2: Read all users
    console.log('\n2️⃣ Fetching all users...');
    const allUsers = await db.select().from(usersTable);
    console.log(`✅ Found ${allUsers.length} user(s):`, allUsers);

    // Test 3: Update the user
    console.log('\n3️⃣ Updating user age...');
    const [updatedUser] = await db
      .update(usersTable)
      .set({ age: 26 })
      .where(eq(usersTable.email, testUser.email))
      .returning();
    console.log('✅ User updated:', updatedUser);

    // Test 4: Delete the user
    console.log('\n4️⃣ Deleting test user...');
    await db.delete(usersTable).where(eq(usersTable.email, testUser.email));
    console.log('✅ User deleted successfully');

    console.log('\n✨ All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
