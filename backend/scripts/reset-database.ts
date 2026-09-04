import { createDbClient, loadEnv } from './db-config';

async function resetDatabase() {
  loadEnv();
  const targetDb = process.env.DATABASE_NAME || process.env.DB_DATABASE || 'tender_discovery';

  // Connect to default 'postgres' database to perform DROP and CREATE
  const client = createDbClient('postgres');

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL maintenance database');

    // Terminate existing connections to target database if any
    console.log(`Terminating existing connections to ${targetDb}...`);
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [targetDb]).catch(() => {});

    // Drop existing database
    console.log(`Dropping existing database "${targetDb}"...`);
    await client.query(`DROP DATABASE IF EXISTS ${targetDb}`);
    console.log(`✓ Database "${targetDb}" dropped`);

    // Create new database
    console.log(`Creating fresh database "${targetDb}"...`);
    await client.query(`CREATE DATABASE ${targetDb}`);
    console.log(`✓ Database "${targetDb}" created successfully`);
  } catch (error: any) {
    console.error('❌ Error resetting database:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
    console.log('Disconnected from PostgreSQL');
  }
}

resetDatabase();
