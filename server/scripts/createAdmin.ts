import { db } from '../db';
import { admins } from '../db/schema';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

async function createAdminUser() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  
  if (!password) {
    console.error('ADMIN_PASSWORD environment variable not set.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  
  try {
    if (!username) {
      console.error('ADMIN_USERNAME environment variable not set.');
      process.exit(1);
    }
    const [admin] = await db.insert(admins).values({
      username,
      passwordHash
    }).returning();
    
    console.log('Admin user created successfully:', {
      id: admin.id,
      username: admin.username,
      createdAt: admin.createdAt
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit();
  }
}

createAdminUser(); 
createAdminUser(); 