import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Load environment variables FIRST
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sqlClient });

async function migrate() {
  console.log("🚀 Adding todos table...\n");

  try {
    // Create todos table
    console.log("📝 Creating todos table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "todos" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "title" text NOT NULL,
        "description" text,
        "completed" boolean DEFAULT false NOT NULL,
        "priority" varchar(20) DEFAULT 'medium' NOT NULL,
        "due_date" date,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "user_id" text NOT NULL
      )
    `);
    console.log("✅ Todos table created\n");

    console.log("✨ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrate()
  .then(() => {
    console.log("\n✅ Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration script failed:", error);
    process.exit(1);
  });
