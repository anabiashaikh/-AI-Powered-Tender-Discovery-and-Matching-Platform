import * as fs from 'fs';
import * as path from 'path';
import { createDbClient, loadEnv } from './db-config';

async function setupDatabase() {
  loadEnv();
  const dbName = process.env.DATABASE_NAME || process.env.DB_DATABASE || 'tender_discovery';

  // 1. Check or create the database using the maintenance connection
  const adminClient = createDbClient('postgres');
  try {
    await adminClient.connect();
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Created database: ${dbName}`);
    } else {
      console.log(`✓ Database already exists: ${dbName}`);
    }
  } catch (err: any) {
    console.warn(`Note when checking database existence: ${err?.message || err}`);
  } finally {
    await adminClient.end().catch(() => {});
  }

  // 2. Connect to the target database and apply schema
  const client = createDbClient();
  try {
    await client.connect();
    console.log(`✓ Connected to ${dbName}`);

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('✓ Schema applied successfully');

    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    console.log(`✓ Total Tables (${tables.rows.length}):`, tables.rows.map((r: any) => r.tablename).join(', '));
  } catch (error: any) {
    console.error('❌ Schema setup error:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

setupDatabase();
