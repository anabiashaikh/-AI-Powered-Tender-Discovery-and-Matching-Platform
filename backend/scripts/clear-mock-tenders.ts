import { Client } from 'pg';

async function clearMockTenders() {
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

    console.log('\nClearing all tender data...');

    // Delete all tenders
    const result = await client.query('DELETE FROM tenders');
    console.log(`✓ Deleted ${result.rowCount} tenders`);

    // Reset scraping sources health stats
    await client.query(`
      UPDATE scraping_sources 
      SET total_scraped = 0, 
          total_failed = 0, 
          health_score = 100,
          last_scraped_at = NULL,
          last_success_at = NULL,
          last_error_at = NULL,
          last_error_message = NULL
    `);
    console.log('✓ Reset scraping sources health statistics');

    // Verify no tenders remain
    const countResult = await client.query('SELECT COUNT(*) as count FROM tenders');
    console.log(`\nCurrent tender count: ${countResult.rows[0].count}`);

    console.log('\n✓ All mock tender data cleared successfully');
  } catch (error) {
    console.error('Error clearing mock tenders:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDisconnected from PostgreSQL');
  }
}

clearMockTenders();
