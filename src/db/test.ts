import { config } from "dotenv";

// Load environment variables FIRST before any other imports
config();

import { db } from "./index";
import { customersTable, customerNotesTable } from "./schema";
import { eq } from "drizzle-orm";

async function testCRUD() {
  console.log("🚀 Starting Database CRUD Tests for Customers & Notes...\n");

  try {
    // Test userId (replace with actual Clerk userId in production)
    const testUserId = "test_user_123";

    // CREATE - Insert a new customer
    console.log("📝 CREATE Customer Test:");
    const newCustomers = await db
      .insert(customersTable)
      .values({
        name: "Acme Corporation",
        lastPatchDate: new Date("2024-01-15"),
        topology: "prod",
        dumbledoreStage: 5,
        userId: testUserId,
      })
      .returning();
    
    const newCustomer = newCustomers[0];
    console.log("✅ Created customer:", newCustomer);
    console.log("");

    // CREATE - Add notes to the customer
    console.log("📝 CREATE Customer Notes Test:");
    const note1 = await db
      .insert(customerNotesTable)
      .values({
        customerId: newCustomer.id,
        note: "Initial setup completed. Customer is on LTS version 2.4.",
        userId: testUserId,
      })
      .returning();
    
    const note2 = await db
      .insert(customerNotesTable)
      .values({
        customerId: newCustomer.id,
        note: "Discussed upgrade path during quarterly review.",
        userId: testUserId,
      })
      .returning();
    
    console.log("✅ Created notes:", [note1[0], note2[0]]);
    console.log("");

    // READ - Get all customers for this user
    console.log("📖 READ Test (All Customers):");
    const allCustomers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.userId, testUserId));
    console.log(`✅ Found ${allCustomers.length} customer(s):`, allCustomers);
    console.log("");

    // READ - Get specific customer with their notes
    console.log("🔍 READ Test (Customer with Notes):");
    const customerWithNotes = await db
      .select()
      .from(customerNotesTable)
      .where(eq(customerNotesTable.customerId, newCustomer.id));
    console.log(`✅ Found ${customerWithNotes.length} note(s) for customer:`, customerWithNotes);
    console.log("");

    // UPDATE - Update customer's patch date and topology
    console.log("✏️ UPDATE Test:");
    const updatedCustomers = await db
      .update(customersTable)
      .set({ 
        lastPatchDate: new Date("2024-02-01"),
        topology: "stage",
        dumbledoreStage: 6,
        updatedAt: new Date(),
      })
      .where(eq(customersTable.id, newCustomer.id))
      .returning();
    console.log("✅ Updated customer:", updatedCustomers[0]);
    console.log("");

    // DELETE - Remove the test customer (cascade will delete notes)
    console.log("🗑️ DELETE Test:");
    const deletedCustomers = await db
      .delete(customersTable)
      .where(eq(customersTable.id, newCustomer.id))
      .returning();
    console.log("✅ Deleted customer:", deletedCustomers[0]);
    console.log("");

    // VERIFY DELETE
    console.log("🔍 VERIFY DELETE:");
    const remainingCustomers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.userId, testUserId));
    console.log(`✅ Remaining customers: ${remainingCustomers.length}`);
    
    const remainingNotes = await db
      .select()
      .from(customerNotesTable);
    console.log(`✅ Remaining notes (should be 0 due to cascade): ${remainingNotes.length}`);
    console.log("");

    console.log("✨ All CRUD tests completed successfully!");
  } catch (error) {
    console.error("❌ Error during CRUD tests:", error);
    process.exit(1);
  }
}

// Run the tests
testCRUD()
  .then(() => {
    console.log("\n✅ Test script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:", error);
    process.exit(1);
  });
