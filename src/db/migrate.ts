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
  console.log("🚀 Starting database migration...\n");

  try {
    // Drop the old tables if they exist
    console.log("🗑️  Dropping old tables...");
    await db.execute(sql`DROP TABLE IF EXISTS customer_notes CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS customers CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    console.log("✅ Old tables dropped\n");

    // Create customers table
    console.log("📝 Creating customers table...");
    await db.execute(sql`
      CREATE TABLE customers (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name varchar(255) NOT NULL,
        last_patch_date date,
        topology varchar(20) DEFAULT 'dev' NOT NULL,
        dumbledore_stage integer DEFAULT 1 NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        user_id text NOT NULL
      )
    `);
    console.log("✅ Customers table created\n");

    // Create customer_notes table
    console.log("📝 Creating customer_notes table...");
    await db.execute(sql`
      CREATE TABLE customer_notes (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        customer_id integer NOT NULL,
        note text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        user_id text NOT NULL,
        CONSTRAINT customer_notes_customer_id_customers_id_fk 
          FOREIGN KEY (customer_id) 
          REFERENCES customers(id) 
          ON DELETE CASCADE
      )
    `);
    console.log("✅ Customer_notes table created\n");

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
