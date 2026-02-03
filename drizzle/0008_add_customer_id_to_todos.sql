ALTER TABLE "todos" ADD COLUMN "customer_id" integer REFERENCES "customers"("id") ON DELETE set null;
