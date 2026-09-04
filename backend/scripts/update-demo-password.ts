import * as bcrypt from 'bcrypt';
import { createDbClient } from './db-config';

async function updateDemoPassword() {
  const client = createDbClient();

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    const demoEmail = 'demo@example.com';
    const newPassword = 'Demo1234@';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await client.query(
      `UPDATE users 
       SET password = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 
       RETURNING email`,
      [hashedPassword, demoEmail]
    );

    if (result.rows.length > 0) {
      console.log(`✓ Password updated for user: ${result.rows[0].email}`);
    } else {
      console.log(`ℹ User ${demoEmail} not found. Creating demo user...`);
      await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
         VALUES ($1, $2, 'Demo', 'User', 'company_user', true, true)`,
        [demoEmail, hashedPassword]
      );
      console.log(`✓ Created demo user: ${demoEmail}`);
    }

    console.log(`   Email:    ${demoEmail}`);
    console.log(`   Password: ${newPassword}\n`);
  } catch (error: any) {
    console.error('❌ Error updating demo password:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
    console.log('Disconnected from PostgreSQL');
  }
}

updateDemoPassword();
