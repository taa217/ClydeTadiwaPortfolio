import { sql } from 'drizzle-orm';
import { projects, posts, admins, subscribers } from '../schema';
import bcrypt from 'bcryptjs';

export async function up(db: any) {
  // Drop existing tables first
  await db.execute(sql`
    DROP TABLE IF EXISTS projects CASCADE;
    DROP TABLE IF EXISTS posts CASCADE;
    DROP TABLE IF EXISTS admins CASCADE;
    DROP TABLE IF EXISTS subscribers CASCADE;
  `);

  // Create tables
  await db.schema
    .createTable(projects)
    .execute();

  await db.schema
    .createTable(posts)
    .execute();

  await db.schema
    .createTable(admins)
    .execute();

  await db.schema
    .createTable(subscribers)
    .execute();

  // Insert default admin
  const hashedPassword = await bcrypt.hash('admin', 10);
  await db.insert(admins).values({
    username: 'admin',
    passwordHash: hashedPassword,
  }).execute();
}

export async function down(db: any) {
  await db.schema
    .dropTable(projects)
    .execute();

  await db.schema
    .dropTable(posts)
    .execute();

  await db.schema
    .dropTable(admins)
    .execute();

  await db.schema
    .dropTable(subscribers)
    .execute();
}