import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function applySchema() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'tender_discovery',
  });

  try {
    await client.connect();
    console.log('Connected to tender_discovery database');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema...');
    await client.query(schema);
    console.log('Schema applied successfully');

    await client.end();
    console.log('Disconnected from PostgreSQL');
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
}

applySchema();
