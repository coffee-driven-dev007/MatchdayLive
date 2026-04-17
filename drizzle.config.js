import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  // We don't throw here to allow local dev before the user sets DATABASE_URL.
  console.warn('Warning: DATABASE_URL is not set. Set it in .env before running migrations.');
}

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
