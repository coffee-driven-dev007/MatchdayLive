import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not defined in .env. Set it before connecting to the database.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
