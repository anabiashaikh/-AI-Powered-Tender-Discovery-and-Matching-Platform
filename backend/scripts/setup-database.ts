import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  const admin = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: 'postgres',
  });

  const dbName = process.env.DATABASE_NAME || 'tender_discovery';

  try {
    await admin.connect();
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rows.length === 0) {
      await admin.query(`CREATE DATABASE ${dbName}`);
      console.log(`Created database: ${dbName}`);
    } else {
      console.log(`Database already exists: ${dbName}`);
    }
  } finally {
    await admin.end();
  }

  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: dbName,
  });

  try {
    await client.connect();
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('Schema applied successfully');

    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    console.log(`Tables (${tables.rows.length}):`, tables.rows.map((r) => r.tablename).join(', '));
  } catch (error) {
    console.error('Schema setup error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
