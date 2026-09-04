import * as crypto from 'crypto';
import { createDbClient } from './db-config';

const sampleTenders = [
  {
    title: 'Cloud Infrastructure Migration & Kubernetes Modernization',
    description: 'The Department of Public Services requires enterprise cloud migration services to migrate legacy on-premise infrastructure to AWS and Azure cloud environments with 24/7 DevOps support, zero-downtime database replication, and Kubernetes orchestration.',
    organization: 'Department of Public Services (Gov)',
    category: 'Technology',
    budget_range: '$250,000 - $500,000 CAD',
    location: 'Ottawa, ON',
    country: 'Canada',
    province_region: 'Ontario',
    tender_number: 'CAN-2026-IT-0089',
    procurement_type: 'RFP',
    source_name: 'CanadaBuys',
    source_url: 'https://buyandsell.gc.ca/procurement-data/tender-notice/101',
    deadline: new Date(Date.now() + 30 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'AI-Powered Clinical Document Processing & OCR Solution',
    description: 'Seeking qualified vendors to deliver an AI-based automated document processing, semantic search, and OCR ingestion pipeline for electronic healthcare records with HIPAA and PIPEDA compliance.',
    organization: 'Provincial Health Services Authority',
    category: 'Healthcare',
    budget_range: '$100,000 - $250,000 CAD',
    location: 'Vancouver, BC',
    country: 'Canada',
    province_region: 'British Columbia',
    tender_number: 'BC-HLTH-2026-042',
    procurement_type: 'RFP',
    source_name: 'MERX',
    source_url: 'https://www.merx.com/opportunities/health-ocr-2026',
    deadline: new Date(Date.now() + 20 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Cybersecurity Threat Detection & 24/7 SOC Operations',
    description: 'Provision of continuous 24/7 Security Operations Center (SOC) monitoring, SIEM integration, automated incident response, threat intelligence feeds, and regular zero-trust penetration testing.',
    organization: 'Federal Transport Authority',
    category: 'Cybersecurity',
    budget_range: '$500,000 - $1,200,000 CAD',
    location: 'Toronto, ON',
    country: 'Canada',
    province_region: 'Ontario',
    tender_number: 'FTA-SEC-2026-991',
    procurement_type: 'Tender',
    source_name: 'CanadaBuys',
    source_url: 'https://buyandsell.gc.ca/procurement-data/tender-notice/205',
    deadline: new Date(Date.now() + 45 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Smart IoT Metering & Renewable Energy Grid Telemetry',
    description: 'Implementation of smart IoT sensors, SCADA telemetry, automated billing analytics, and predictive load balancing for regional solar and wind energy grids.',
    organization: 'Clean Energy Development Bank',
    category: 'Energy',
    budget_range: '$1,000,000 - $3,500,000 USD',
    location: 'Worldwide / Manila',
    country: 'Worldwide',
    province_region: 'Global',
    tender_number: 'ADB-ENERGY-2026-114',
    procurement_type: 'International Competitive Bidding',
    source_name: 'ADB',
    source_url: 'https://www.adb.org/business-opportunities/energy-analytics',
    deadline: new Date(Date.now() + 60 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Mobile Application & Digital Identity Portal for Citizens',
    description: 'Design and build cross-platform mobile apps (iOS & Android) with multi-language support, digital identity verification, push notifications, and municipal utility payment integration.',
    organization: 'City Municipal Council',
    category: 'Technology',
    budget_range: '$75,000 - $150,000 CAD',
    location: 'Calgary, AB',
    country: 'Canada',
    province_region: 'Alberta',
    tender_number: 'YYC-MOB-2026-302',
    procurement_type: 'RFP',
    source_name: 'Biddingo',
    source_url: 'https://www.biddingo.com/opportunities/calgary-mobile-app',
    deadline: new Date(Date.now() + 15 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Enterprise ERP Financial Management & Supply Chain System',
    description: 'Comprehensive ERP modernization, accounting workflow automation, payroll integration, real-time inventory tracking, and regulatory audit compliance reporting for educational institutions.',
    organization: 'Regional University Board',
    category: 'Finance',
    budget_range: '$300,000 - $700,000 CAD',
    location: 'Montreal, QC',
    country: 'Canada',
    province_region: 'Quebec',
    tender_number: 'QC-ERP-2026-554',
    procurement_type: 'RFP',
    source_name: 'CanadaBuys',
    source_url: 'https://buyandsell.gc.ca/procurement-data/tender-notice/310',
    deadline: new Date(Date.now() + 25 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Highway Infrastructure & Bridge Structural Rehabilitation',
    description: 'Civil engineering, structural safety inspection, concrete resurfacing, seismic retrofitting, and smart sensor installation for national highway and overpass expansion project.',
    organization: 'Ministry of Transportation',
    category: 'Construction',
    budget_range: '$2,000,000 - $5,000,000 CAD',
    location: 'Edmonton, AB',
    country: 'Canada',
    province_region: 'Alberta',
    tender_number: 'AB-HWY-2026-882',
    procurement_type: 'Public Tender',
    source_name: 'MERX',
    source_url: 'https://www.merx.com/opportunities/highway-bridge-rehab',
    deadline: new Date(Date.now() + 50 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Global Humanitarian Logistics & Supply Chain Software',
    description: 'Provision of cloud-based humanitarian procurement tracking, cold-chain monitoring for vaccines, and emergency disaster relief coordination platform.',
    organization: 'United Nations Procurement Division',
    category: 'Logistics',
    budget_range: '$1,500,000 - $4,000,000 USD',
    location: 'Geneva / Global',
    country: 'Worldwide',
    province_region: 'Global',
    tender_number: 'UNGM-LOG-2026-773',
    procurement_type: 'Request for Proposal',
    source_name: 'UNGM',
    source_url: 'https://www.ungm.org/Public/Notice/773',
    deadline: new Date(Date.now() + 40 * 86400000),
    published_date: new Date(),
    status: 'open',
  },
  {
    title: 'Smart City Water Management & Acoustic Leak Detection System',
    description: 'Installation of IoT acoustic leak detectors, automated flow meters, and GIS pipeline mapping to reduce non-revenue water loss in municipal distribution networks.',
    organization: 'European Water & Infrastructure Agency',
    category: 'Utilities',
    budget_range: '€800,000 - €2,200,000 EUR',
    location: 'Brussels / EU',
    country: 'Worldwide',
    province_region: 'Europe',
    tender_number: 'TED-WAT-2026-641',
    procurement_type: 'Competitive Dialogue',
    source_name: 'TED',
    source_url: 'https://ted.europa.eu/TED/search/search.do?id=641',
    deadline: new Date(Date.now() + 35 * 86400000),
    published_date: new Date(),
    status: 'open',
  }
];

async function seed() {
  const client = createDbClient();

  try {
    await client.connect();
    console.log('✓ Successfully connected to PostgreSQL');

    // Query available scraping sources to map source_id if present
    const sourcesRes = await client.query('SELECT id, name FROM scraping_sources');
    const sourceMap = new Map<string, string>();
    for (const row of sourcesRes.rows) {
      sourceMap.set(row.name.toLowerCase(), row.id);
    }

    console.log(`Found ${sourceMap.size} scraping sources in database.`);
    console.log(`Seeding ${sampleTenders.length} sample tenders...`);

    for (const t of sampleTenders) {
      const textToHash = `${t.title}-${t.description}`;
      const hash = crypto.createHash('sha256').update(textToHash).digest('hex');
      const sourceId = sourceMap.get(t.source_name.toLowerCase()) || null;

      await client.query(
        `INSERT INTO tenders (
           title, description, organization, category, budget_range, 
           location, country, province_region, tender_number, procurement_type, 
           source_url, source_id, deadline, published_date, hash, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (hash) DO UPDATE SET 
           deadline = EXCLUDED.deadline,
           status = EXCLUDED.status,
           source_id = COALESCE(EXCLUDED.source_id, tenders.source_id),
           updated_at = CURRENT_TIMESTAMP`,
        [
          t.title,
          t.description,
          t.organization,
          t.category,
          t.budget_range,
          t.location,
          t.country,
          t.province_region,
          t.tender_number,
          t.procurement_type,
          t.source_url,
          sourceId,
          t.deadline,
          t.published_date,
          hash,
          t.status,
        ],
      );
    }

    const countRes = await client.query('SELECT count(*) FROM tenders');
    console.log(`\n🎉 Success: Sample tenders seeded! Total tenders in database: ${countRes.rows[0].count}`);

    const categoryBreakdown = await client.query(
      'SELECT category, count(*) FROM tenders GROUP BY category ORDER BY count DESC'
    );
    console.log('\n📊 Tenders by category:');
    for (const row of categoryBreakdown.rows) {
      console.log(`  - ${row.category || 'Uncategorized'}: ${row.count}`);
    }
  } catch (error: any) {
    console.error('❌ Error seeding tenders:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

seed().catch((err: any) => {
  console.error('Fatal error in seed script:', err?.message || err);
  process.exit(1);
});
