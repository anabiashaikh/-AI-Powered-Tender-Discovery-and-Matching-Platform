import { Client } from 'pg';

async function applySchemaUpdates() {
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

    // Add new columns to tenders table
    console.log('Adding new columns to tenders table...');
    
    const tenderUpdates = [
      'ALTER TABLE tenders ADD COLUMN IF NOT EXISTS country VARCHAR(100)',
      'ALTER TABLE tenders ADD COLUMN IF NOT EXISTS province_region VARCHAR(100)',
      'ALTER TABLE tenders ADD COLUMN IF NOT EXISTS tender_number VARCHAR(255)',
      'ALTER TABLE tenders ADD COLUMN IF NOT EXISTS procurement_type VARCHAR(100)',
      'ALTER TABLE tenders ADD COLUMN IF NOT EXISTS published_date TIMESTAMP',
    ];

    for (const sql of tenderUpdates) {
      try {
        await client.query(sql);
        console.log(`✓ Applied: ${sql}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`- Skipped (already exists): ${sql}`);
        } else {
          console.error(`✗ Failed: ${sql} - ${error.message}`);
        }
      }
    }

    // Add new columns to scraping_sources table
    console.log('\nAdding new columns to scraping_sources table...');
    
    const sourceUpdates = [
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS region VARCHAR(50) CHECK (region IN (\'canada\', \'worldwide\'))',
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMP',
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP',
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS last_error_message TEXT',
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS total_scraped INTEGER DEFAULT 0',
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0',
      'ALTER TABLE scraping_sources ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100)',
    ];

    for (const sql of sourceUpdates) {
      try {
        await client.query(sql);
        console.log(`✓ Applied: ${sql}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`- Skipped (already exists): ${sql}`);
        } else {
          console.error(`✗ Failed: ${sql} - ${error.message}`);
        }
      }
    }

    // Add new indexes
    console.log('\nAdding new indexes...');
    
    const indexUpdates = [
      'CREATE INDEX IF NOT EXISTS idx_tenders_country ON tenders(country)',
      'CREATE INDEX IF NOT EXISTS idx_tenders_published_date ON tenders(published_date)',
      'CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status)',
    ];

    for (const sql of indexUpdates) {
      try {
        await client.query(sql);
        console.log(`✓ Applied: ${sql}`);
      } catch (error) {
        console.error(`✗ Failed: ${sql} - ${error.message}`);
      }
    }

    console.log('\n✓ Schema updates completed successfully');
  } catch (error) {
    console.error('Error applying schema updates:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Disconnected from PostgreSQL');
  }
}

applySchemaUpdates();
