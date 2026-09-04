import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

async function updateDemoPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'tender_discovery',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const newPassword = 'Demo1234@';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
      [hashedPassword, 'demo@example.com']
    );

    if (result.rows.length > 0) {
      console.log(`Password updated for user: ${result.rows[0].email}`);
    } else {
      console.log('User not found');
    }

    await client.end();
    console.log('Disconnected from PostgreSQL');
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
}

updateDemoPassword();
