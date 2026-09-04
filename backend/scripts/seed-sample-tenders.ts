import { Client } from 'pg';
import * as crypto from 'crypto';

const sampleTenders = [
  {
    title: 'Cloud Infrastructure Migration and Modernization',
    description: 'The Department of Public Services requires enterprise cloud migration services to migrate legacy on-premise infrastructure to AWS and Azure cloud environments with 24/7 DevOps support and Kubernetes orchestration.',
    organization: 'Department of Public Services (Gov)',
    category: 'Technology',
    budget_range: '$250,000 - $500,000 CAD',
    location: 'Ottawa, ON',
    country: 'Canada',
    source_url: 'https://buyandsell.gc.ca/procurement-data/tender-notice/101',
    deadline: new Date(Date.now() + 30 * 86400000),
    published_date: new Date(),
  },
  {
    title: 'AI-Powered Document Management & OCR Solution',
    description: 'Seeking qualified vendors to deliver an AI-based automated document processing, semantic search, and OCR ingestion pipeline for healthcare records compliance.',
    organization: 'Provincial Health Services Authority',
    category: 'Healthcare',
    budget_range: '$100,000 - $250,000 CAD',
    location: 'Vancouver, BC',
    country: 'Canada',
    source_url: 'https://www.merx.com/opportunities/health-ocr-2026',
    deadline: new Date(Date.now() + 20 * 86400000),
    published_date: new Date(),
  },
  {
    title: 'Cybersecurity Threat Detection & SOC Operations',
    description: 'Provision of continuous 24/7 Security Operations Center (SOC) monitoring, SIEM integration, incident response, and zero-trust vulnerability assessments.',
    organization: 'Federal Transport Authority',
    category: 'Technology',
    budget_range: '$500,000 - $1,200,000 CAD',
    location: 'Toronto, ON',
    country: 'Canada',
    source_url: 'https://buyandsell.gc.ca/procurement-data/tender-notice/205',
    deadline: new Date(Date.now() + 45 * 86400000),
    published_date: new Date(),
  },
  {
    title: 'Smart Metering & Renewable Energy Grid Analytics',
    description: 'Implementation of smart IoT sensors, SCADA telemetry, and automated billing analytics for regional solar and wind energy grids.',
    organization: 'Clean Energy Development Bank',
    category: 'Energy',
    budget_range: '$1,000,000 - $3,500,000 USD',
    location: 'Worldwide / Manila',
    country: 'Worldwide',
    source_url: 'https://www.adb.org/business-opportunities/energy-analytics',
    deadline: new Date(Date.now() + 60 * 86400000),
    published_date: new Date(),
  },
  {
    title: 'Mobile Application Development for Citizen Services',
    description: 'Design and build cross-platform mobile apps (iOS & Android) with multi-language support, digital identity verification, and push notifications.',
    organization: 'City Municipal Council',
    category: 'Technology',
    budget_range: '$75,000 - $150,000 CAD',
    location: 'Calgary, AB',
    country: 'Canada',
    source_url: 'https://www.biddingo.com/opportunities/calgary-mobile-app',
    deadline: new Date(Date.now() + 15 * 86400000),
    published_date: new Date(),
  },
  {
    title: 'ERP Financial Management System Implementation',
    description: 'Comprehensive ERP modernization, accounting workflow automation, payroll integration, and supply chain reporting for educational institutions.',
    organization: 'Regional University Board',
    category: 'Finance',
    budget_range: '$300,000 - $700,000 CAD',
    location: 'Montreal, QC',
    country: 'Canada',
    source_url: 'https://buyandsell.gc.ca/procurement-data/tender-notice/310',
    deadline: new Date(Date.now() + 25 * 86400000),
    published_date: new Date(),
  },
  {
    title: 'Highway Infrastructure & Bridge Structural Rehabilitation',
    description: 'Civil engineering, structural inspection, concrete resurfacing, and safety barriers installation for national highway expansion project.',
    organization: 'Ministry of Transportation',
    category: 'Construction',
    budget_range: '$2,000,000 - $5,000,000 CAD',
    location: 'Edmonton, AB',
    country: 'Canada',
    source_url: 'https://www.merx.com/opportunities/highway-bridge-rehab',
    deadline: new Date(Date.now() + 50 * 86400000),
    published_date: new Date(),
  },
];

async function seed() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/tender_discovery',
  });
  await client.connect();

  for (const t of sampleTenders) {
    const textToHash = `${t.title}-${t.description}`;
    const hash = crypto.createHash('sha256').update(textToHash).digest('hex');
    await client.query(
      `INSERT INTO tenders (id, title, description, organization, category, budget_range, location, country, source_url, deadline, published_date, hash, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (hash) DO UPDATE SET deadline = EXCLUDED.deadline`,
      [
        t.title,
        t.description,
        t.organization,
        t.category,
        t.budget_range,
        t.location,
        t.country,
        t.source_url,
        t.deadline,
        t.published_date,
        hash,
        'open',
      ],
    );
  }

  const res = await client.query('SELECT count(*) FROM tenders');
  console.log(`✓ Sample tenders seeded! Total tenders in database: ${res.rows[0].count}`);
  await client.end();
}

seed().catch(console.error);
