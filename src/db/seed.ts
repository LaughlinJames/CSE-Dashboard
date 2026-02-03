import { config } from "dotenv";

// Load environment variables FIRST before any other imports
config();

import { db } from "./index";
import { customersTable, customerNotesTable } from "./schema";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  console.log("🌱 Starting Database Seeding...\n");

  try {
    // Get userId from command line argument or use default
    const testUserId = process.argv[2] || "test_user_123";
    
    if (!process.argv[2]) {
      console.log("⚠️  No userId provided. Usage: npm run seed <your-clerk-user-id>");
      console.log("⚠️  Using default test userId. Data will not be visible in dashboard.\n");
    } else {
      console.log(`✅ Using userId: ${testUserId}\n`);
    }

    // Customer 1
    console.log("📝 Creating Customer 1: TechStart Solutions");
    const [customer1] = await db
      .insert(customersTable)
      .values({
        name: "TechStart Solutions",
        lastPatchDate: "2024-01-15",
        topology: "prod",
        dumbledoreStage: 5,
        patchFrequency: "monthly",
        userId: testUserId,
      })
      .returning();
    
    console.log("✅ Created customer:", customer1);

    // Notes for Customer 1
    console.log("📝 Adding notes for TechStart Solutions...");
    await db
      .insert(customerNotesTable)
      .values([
        {
          customerId: customer1.id,
          note: "Initial setup completed. Customer is on LTS version 2.4. All systems operational.",
          userId: testUserId,
        },
        {
          customerId: customer1.id,
          note: "Quarterly review conducted. Discussed upgrade path to version 3.0. Customer satisfied with current performance.",
          userId: testUserId,
        },
        {
          customerId: customer1.id,
          note: "Security patch applied successfully. No downtime reported. Customer confirmed all services running smoothly.",
          userId: testUserId,
        },
      ])
      .returning();
    
    console.log("✅ Added 3 notes for TechStart Solutions\n");

    // Customer 2
    console.log("📝 Creating Customer 2: Global Enterprises Inc");
    const [customer2] = await db
      .insert(customersTable)
      .values({
        name: "Global Enterprises Inc",
        lastPatchDate: "2024-01-20",
        topology: "stage",
        dumbledoreStage: 3,
        patchFrequency: "quarterly",
        userId: testUserId,
      })
      .returning();
    
    console.log("✅ Created customer:", customer2);

    // Notes for Customer 2
    console.log("📝 Adding notes for Global Enterprises Inc...");
    await db
      .insert(customerNotesTable)
      .values([
        {
          customerId: customer2.id,
          note: "LTS support expired last month. Sent renewal notice to procurement team.",
          userId: testUserId,
        },
        {
          customerId: customer2.id,
          note: "Follow-up call scheduled for next week. Customer expressed interest in extended support package.",
          userId: testUserId,
        },
      ])
      .returning();
    
    console.log("✅ Added 2 notes for Global Enterprises Inc\n");

    // Customer 3
    console.log("📝 Creating Customer 3: DataFlow Systems");
    const [customer3] = await db
      .insert(customersTable)
      .values({
        name: "DataFlow Systems",
        lastPatchDate: "2024-01-10",
        topology: "prod",
        dumbledoreStage: 7,
        patchFrequency: "monthly",
        userId: testUserId,
      })
      .returning();
    
    console.log("✅ Created customer:", customer3);

    // Notes for Customer 3
    console.log("📝 Adding notes for DataFlow Systems...");
    await db
      .insert(customerNotesTable)
      .values([
        {
          customerId: customer3.id,
          note: "Migrated to new infrastructure. Performance improved by 40%.",
          userId: testUserId,
        },
        {
          customerId: customer3.id,
          note: "Customer reported minor UI bug. Patch scheduled for next week.",
          userId: testUserId,
        },
        {
          customerId: customer3.id,
          note: "Bug fix deployed and verified. Customer confirmed issue resolved.",
          userId: testUserId,
        },
      ])
      .returning();
    
    console.log("✅ Added 3 notes for DataFlow Systems\n");

    // Customer 4
    console.log("📝 Creating Customer 4: CloudNet Partners");
    const [customer4] = await db
      .insert(customersTable)
      .values({
        name: "CloudNet Partners",
        lastPatchDate: "2024-01-25",
        topology: "qa",
        dumbledoreStage: 2,
        patchFrequency: "quarterly",
        userId: testUserId,
      })
      .returning();
    
    console.log("✅ Created customer:", customer4);

    // Notes for Customer 4
    console.log("📝 Adding notes for CloudNet Partners...");
    await db
      .insert(customerNotesTable)
      .values([
        {
          customerId: customer4.id,
          note: "New customer onboarding in progress. Awaiting LTS decision from procurement.",
          userId: testUserId,
        },
      ])
      .returning();
    
    console.log("✅ Added 1 note for CloudNet Partners\n");

    // Verify the data
    console.log("🔍 Verifying seeded data...");
    const allCustomers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.userId, testUserId));
    
    console.log(`✅ Total customers in database: ${allCustomers.length}`);
    
    for (const customer of allCustomers) {
      const notes = await db
        .select()
        .from(customerNotesTable)
        .where(eq(customerNotesTable.customerId, customer.id));
      
      console.log(`   - ${customer.name}: ${notes.length} notes`);
    }

    console.log("\n✨ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
    process.exit(1);
  }
}

// Run the seed script
seedDatabase()
  .then(() => {
    console.log("\n✅ Seed script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed script failed:", error);
    process.exit(1);
  });
