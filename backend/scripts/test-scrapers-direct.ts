import { chromium } from 'playwright';
import { CanadaBuysScraper } from '../src/scraping/scrapers/canada-buys.scraper';
import { TedScraper } from '../src/scraping/scrapers/ted.scraper';
import { UngmScraper } from '../src/scraping/scrapers/ungm.scraper';
import { WorldBankScraper } from '../src/scraping/scrapers/world-bank.scraper';
import { AdBankScraper } from '../src/scraping/scrapers/adb.scraper';
import { AfdbScraper } from '../src/scraping/scrapers/afdb.scraper';
import { IdbScraper } from '../src/scraping/scrapers/idb.scraper';
import { MerxScraper } from '../src/scraping/scrapers/merx.scraper';
import { BiddingoScraper } from '../src/scraping/scrapers/biddingo.scraper';

async function testScrapers() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const scrapers = [
    { name: 'CanadaBuys', scraper: new CanadaBuysScraper() },
    { name: 'TED', scraper: new TedScraper() },
    { name: 'UNGM', scraper: new UngmScraper() },
    { name: 'WorldBank', scraper: new WorldBankScraper() },
    { name: 'ADB', scraper: new AdBankScraper() },
    { name: 'AfDB', scraper: new AfdbScraper() },
    { name: 'IDB', scraper: new IdbScraper() },
    { name: 'MERX', scraper: new MerxScraper() },
    { name: 'Biddingo', scraper: new BiddingoScraper() },
  ];

  for (const item of scrapers) {
    console.log(`\n========================================`);
    console.log(`Testing scraper: ${item.name}`);
    console.log(`========================================`);

    const page = await browser.newPage();
    try {
      const startTime = Date.now();
      const result = await item.scraper.scrape(page);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${duration}s`);
      console.log(`Total Scanned: ${result.metadata.totalScanned}`);
      console.log(`Tenders Fetched: ${result.tenders.length}`);
      console.log(`Errors count: ${result.errors.length}`);
      if (result.errors.length > 0) {
        console.log(`Errors:`, result.errors.slice(0, 5));
      }

      if (result.tenders.length > 0) {
        console.log(`Sample tender:`, JSON.stringify(result.tenders[0], null, 2));
      }
    } catch (error) {
      console.error(`Scraper ${item.name} crashed with error:`, error);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\nTesting completed.');
}

testScrapers().catch(console.error);
