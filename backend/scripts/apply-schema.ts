import * as fs from 'fs';
import * as path from 'path';
import { createDbClient } from './db-config';

async function applySchema() {
  const client = createDbClient();

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL database');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await client.query(schema);
    console.log('✓ Schema applied successfully');

    const tablesRes = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log(`✓ Total tables (${tablesRes.rows.length}):`, tablesRes.rows.map((r: any) => r.tablename).join(', '));
  } catch (error: any) {
    console.error('❌ Error applying schema:', error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
    console.log('Disconnected from PostgreSQL');
  }
}

applySchema();
