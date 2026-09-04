import * as bcrypt from 'bcrypt';
import { createDbClient, loadEnv } from './db-config';

async function seedAdminUser() {
  loadEnv();
  const client = createDbClient();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tenderdiscovery.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users 
         SET password = $1, role = 'admin', is_active = true, email_verified = true, updated_at = CURRENT_TIMESTAMP 
         WHERE email = $2`,
        [hashedPassword, adminEmail],
      );
      console.log(`✓ Updated admin user: ${adminEmail}`);
    } else {
      await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4, 'admin', true, true)`,
        [adminEmail, hashedPassword, adminFirstName, adminLastName],
      );
      console.log(`✓ Created admin user: ${adminEmail}`);
    }

    console.log(`🔑 Admin Credentials:`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);
  } catch (error: any) {
    console.error('❌ Error seeding admin user:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

seedAdminUser();
