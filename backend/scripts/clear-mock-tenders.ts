import { createDbClient } from './db-config';

async function clearMockTenders() {
  const client = createDbClient();

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    console.log('\nClearing all tender and matching data...');

    // Delete all tender matches & notifications first if they reference tenders
    await client.query('DELETE FROM notifications WHERE tender_id IS NOT NULL').catch(() => {});
    await client.query('DELETE FROM tender_matches').catch(() => {});

    // Delete all tenders
    const result = await client.query('DELETE FROM tenders');
    console.log(`✓ Deleted ${result.rowCount ?? 0} tenders`);

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
    console.log(`\nCurrent tender count in database: ${countResult.rows[0].count}`);

    console.log('\n✓ All mock tender data cleared successfully');
  } catch (error: any) {
    console.error('❌ Error clearing mock tenders:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
    console.log('\nDisconnected from PostgreSQL');
  }
}

clearMockTenders();
