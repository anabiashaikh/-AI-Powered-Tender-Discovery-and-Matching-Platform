const { chromium } = require('playwright');

const sites = [
  { name: 'UNGM', url: 'https://www.ungm.org/Public/Notice', waitFor: '#noticeMain', timeout: 20000 },
  { name: 'MERX', url: 'https://www.merx.com/english/OpportunityList.aspx', waitFor: 'table,tbody,tr,td', timeout: 20000 },
  { name: 'ADB', url: 'https://www.adb.org/projects/tenders/all', waitFor: '.views-row,.view-content,table', timeout: 25000 },
  { name: 'AfDB', url: 'https://projectsportal.afdb.org/dataportal/VProject/show?lang=en', waitFor: 'table,tr,tbody', timeout: 25000 },
  { name: 'IDB', url: 'https://www.iadb.org/en/projects-operations/procurement', waitFor: 'table,ul,div', timeout: 25000 },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  for (const site of sites) {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
      console.log(`\n=== ${site.name} ===`);
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: site.timeout });
      await page.waitForTimeout(5000);
      
      // Get the actual page title and URL (after redirects)
      console.log('Title:', await page.title());
      console.log('URL:', page.url());
      
      // Get all top-level divs with IDs and classes
      const elements = await page.evaluate(() => {
        const result = [];
        const interesting = document.querySelectorAll('[id], [class]');
        interesting.forEach(el => {
          if (el.id || (el.className && typeof el.className === 'string')) {
            const text = el.innerText?.slice(0, 100).trim().replace(/\n/g, ' ') || '';
            if (text && el.children.length > 0) {
              result.push({ tag: el.tagName, id: el.id, class: el.className?.toString().slice(0, 60), text: text.slice(0, 80) });
            }
          }
        });
        return result.slice(0, 30);
      });
      
      console.log('Elements:');
      elements.forEach(e => console.log(`  <${e.tag.toLowerCase()} id="${e.id}" class="${e.class}"> ${e.text}`));
      
    } catch (err) {
      console.log(`Error: ${err.message.slice(0, 100)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
