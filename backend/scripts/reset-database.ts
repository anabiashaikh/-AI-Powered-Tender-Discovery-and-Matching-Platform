import { DataSource } from 'typeorm';
import { Client } from 'pg';

async function resetDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Drop existing database
    console.log('Dropping existing database...');
    await client.query('DROP DATABASE IF EXISTS tender_discovery');
    console.log('Database dropped');

    // Create new database
    console.log('Creating new database...');
    await client.query('CREATE DATABASE tender_discovery');
    console.log('Database created');

    await client.end();
    console.log('Disconnected from PostgreSQL');
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
}

resetDatabase();
