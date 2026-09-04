import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

async function seedAdminUser() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'tender_discovery',
  });

  const adminEmail = 'admin@tenderdiscovery.com';
  const adminPassword = 'Admin123!';

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET password = $1, role = 'admin', is_active = true, email_verified = true WHERE email = $2`,
        [hashedPassword, adminEmail],
      );
      console.log(`Updated admin user: ${adminEmail}`);
    } else {
      await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4, 'admin', true, true)`,
        [adminEmail, hashedPassword, 'Admin', 'User'],
      );
      console.log(`Created admin user: ${adminEmail}`);
    }

    console.log(`Password: ${adminPassword}`);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedAdminUser();
