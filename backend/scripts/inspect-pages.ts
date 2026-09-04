import { chromium } from 'playwright';

const urls = {
  UNGM: 'https://www.ungm.org/Public/Notice',
  ADB: 'https://www.adb.org/projects/tenders',
  AfDB: 'https://www.afdb.org/en/projects-and-operations/procurement/specific-procurement-notices',
  IDB: 'https://www.iadb.org/en/about-us/procurement',
  MERX: 'https://www.merx.com/english/OpportunityList.aspx',
  Biddingo: 'https://www.biddingo.com/opportunities',
};

async function inspectPages() {
  console.log('Launching Playwright browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const [name, url] of Object.entries(urls)) {
    console.log(`\n========================================`);
    console.log(`Inspecting page: ${name} (${url})`);
    console.log(`========================================`);

    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000); // Wait for potential JS execution

      // Let's inspect what elements are present
      const title = await page.title();
      console.log(`Page title: ${title}`);

      // Count table, divs, trs, lists
      const tableCount = await page.locator('table').count();
      const divCount = await page.locator('div').count();
      console.log(`Found ${tableCount} tables and ${divCount} divs`);

      // Let's dump the text of the first table if it exists
      if (tableCount > 0) {
        console.log('\n--- Table Elements info: ---');
        const tables = await page.locator('table').all();
        for (let i = 0; i < Math.min(tables.length, 3); i++) {
          const id = await tables[i].getAttribute('id');
          const className = await tables[i].getAttribute('class');
          const rows = await tables[i].locator('tr').count();
          console.log(`Table ${i}: ID="${id}", Class="${className}", Rows=${rows}`);
          
          if (rows > 0) {
            const firstRowText = await tables[i].locator('tr').first().textContent();
            console.log(`First row text snippet: ${firstRowText?.trim().substring(0, 150)}`);
          }
        }
      }

      // Check if there are tables inside common containers
      // Let's find links containing 'Notice' or 'Opportunity' or 'tender'
      const links = await page.locator('a[href]').all();
      console.log(`Total links: ${links.length}`);
      
      const sampleLinks: string[] = [];
      for (const link of links) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        if (href && (href.toLowerCase().includes('notice') || href.toLowerCase().includes('opportunity') || href.toLowerCase().includes('tender') || href.toLowerCase().includes('procurement'))) {
          sampleLinks.push(`${text?.trim()} (${href})`);
        }
        if (sampleLinks.length >= 10) break;
      }
      console.log('\nTender-related links on page:', sampleLinks);

      // Print some class names of elements that look like lists or rows
      const rows = await page.locator('.views-row, .notice-row, .tender-row, .opportunity-row, .search-result, .list-item, tr').all();
      console.log(`Common row selectors matched: ${rows.length}`);

    } catch (error) {
      console.error(`Failed to inspect ${name}:`, error.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Inspection complete.');
}

inspectPages().catch(console.error);
