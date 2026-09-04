import { Client } from 'pg';

interface ScrapingSource {
  name: string;
  url: string;
  region: 'canada' | 'worldwide';
  scraping_frequency: string;
  is_active: boolean;
}

const sources: ScrapingSource[] = [
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

    console.log('\nSeeding scraping sources...');
    
    for (const source of sources) {
      try {
        // Check if source already exists
        const checkResult = await client.query(
          'SELECT id FROM scraping_sources WHERE name = $1',
          [source.name]
        );

        if (checkResult.rows.length > 0) {
          console.log(`- Source "${source.name}" already exists, skipping`);
          
          // Update if needed
          await client.query(
            `UPDATE scraping_sources 
             SET url = $1, region = $2, scraping_frequency = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
             WHERE name = $5`,
            [source.url, source.region, source.scraping_frequency, source.is_active, source.name]
          );
          console.log(`  ✓ Updated "${source.name}"`);
          continue;
        }

        // Insert new source
        await client.query(
          `INSERT INTO scraping_sources (name, url, region, scraping_frequency, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [source.name, source.url, source.region, source.scraping_frequency, source.is_active]
        );
        console.log(`✓ Added "${source.name}"`);
      } catch (error) {
        console.error(`✗ Failed to add "${source.name}": ${error.message}`);
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

    console.log('\n✓ Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding scraping sources:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDisconnected from PostgreSQL');
  }
}

seedScrapingSources();
