import { createDbClient } from './db-config';

interface ScrapingSourceItem {
  name: string;
  url: string;
  region: 'canada' | 'worldwide';
  scraping_frequency: string;
  is_active: boolean;
}

const sources: ScrapingSourceItem[] = [
  // Canada Sources
  {
    name: 'CanadaBuys',
    url: 'https://buyandsell.gc.ca/procurement-data/search',
    region: 'canada',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'MERX',
    url: 'https://www.merx.com/english/OpportunityList.aspx',
    region: 'canada',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'Biddingo',
    url: 'https://www.biddingo.com/opportunities',
    region: 'canada',
    scraping_frequency: 'daily',
    is_active: true,
  },
  // Worldwide Sources
  {
    name: 'TED',
    url: 'https://ted.europa.eu/TED/search/search.do',
    region: 'worldwide',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'UNGM',
    url: 'https://www.ungm.org/Public/Notice',
    region: 'worldwide',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'WorldBank',
    url: 'https://projects.worldbank.org/en/projects-operations/procurement',
    region: 'worldwide',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'ADB',
    url: 'https://www.adb.org/business-opportunities/main',
    region: 'worldwide',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'AfDB',
    url: 'https://www.afdb.org/en/projects-operations/procurement',
    region: 'worldwide',
    scraping_frequency: 'daily',
    is_active: true,
  },
  {
    name: 'IDB',
    url: 'https://www.iadb.org/en/projects-operations/procurement',
    region: 'worldwide',
    scraping_frequency: 'daily',
    is_active: true,
  },
];

async function seedScrapingSources() {
  const client = createDbClient();

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    console.log('\nSeeding scraping sources...');
    
    for (const source of sources) {
      try {
        const checkResult = await client.query(
          'SELECT id FROM scraping_sources WHERE name = $1',
          [source.name]
        );

        if (checkResult.rows.length > 0) {
          await client.query(
            `UPDATE scraping_sources 
             SET url = $1, region = $2, scraping_frequency = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
             WHERE name = $5`,
            [source.url, source.region, source.scraping_frequency, source.is_active, source.name]
          );
          console.log(`  ✓ Updated "${source.name}"`);
        } else {
          await client.query(
            `INSERT INTO scraping_sources (name, url, region, scraping_frequency, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [source.name, source.url, source.region, source.scraping_frequency, source.is_active]
          );
          console.log(`✓ Added "${source.name}"`);
        }
      } catch (error: any) {
        console.error(`✗ Failed to add/update "${source.name}": ${error?.message || error}`);
      }
    }

    // Display summary
    const result = await client.query('SELECT * FROM scraping_sources ORDER BY region, name');
    console.log('\n' + '='.repeat(80));
    console.log('Current Scraping Sources:');
    console.log('='.repeat(80));
    
    const canadaSources = result.rows.filter((r: any) => r.region === 'canada');
    const worldwideSources = result.rows.filter((r: any) => r.region === 'worldwide');

    console.log('\n🇨🇦 Canada Sources:');
    for (const source of canadaSources) {
      console.log(`  - ${source.name} (${source.is_active ? 'Active' : 'Inactive'}) - ${source.url}`);
    }

    console.log('\n🌍 Worldwide Sources:');
    for (const source of worldwideSources) {
      console.log(`  - ${source.name} (${source.is_active ? 'Active' : 'Inactive'}) - ${source.url}`);
    }

    console.log('\n✓ Seeding scraping sources completed successfully');
  } catch (error: any) {
    console.error('❌ Error seeding scraping sources:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
    console.log('\nDisconnected from PostgreSQL');
  }
}

seedScrapingSources();
