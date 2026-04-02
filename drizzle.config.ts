import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not load .env; Next.js app code does via src/db/index.ts
config({ path: '.env' });
config({ path: '.env.local', override: true });

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
