import { eq } from 'drizzle-orm';
import { db, pool } from './db.js';
import { demoUsers } from './schema.js';

async function main() {
  try {
    console.log('Performing CRUD operations with Drizzle and pg...');

    // CREATE
    const [newUser] = await db
      .insert(demoUsers)
      .values({ name: 'Admin User', email: 'admin@example.com' })
      .returning();

    if (!newUser) throw new Error('Failed to create user');
    console.log('✅ CREATE:', newUser);

    // READ
    const found = await db.select().from(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log('✅ READ:', found[0]);

    // UPDATE
    const [updated] = await db
      .update(demoUsers)
      .set({ name: 'Super Admin' })
      .where(eq(demoUsers.id, newUser.id))
      .returning();

    if (!updated) throw new Error('Failed to update user');
    console.log('✅ UPDATE:', updated);

    // DELETE
    await db.delete(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log('✅ DELETE: user removed');

    console.log('\nCRUD operations completed successfully.');
  } catch (err) {
    console.error('Error during CRUD demo:', err);
    process.exitCode = 1;
  } finally {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log('Database pool closed.');
    }
  }
}

main();
