const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.ungm.org/Public/Notice', { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForSelector('.notice-table', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Extract actual notice data
    const notices = await page.evaluate(() => {
      const rows = document.querySelectorAll('.tableRow.dataRow.notice-table');
      return Array.from(rows).slice(0, 5).map(row => {
        // Get notice ID
        const noticeId = row.getAttribute('data-noticeid');
        
        // Get title
        const titleEl = row.querySelector('.title, .notice-title, h4, [class*="title"]');
        const title = titleEl?.innerText?.trim() || '';
        
        // Get all text content in key cells
        const cells = row.querySelectorAll('[role="cell"]');
        const cellTexts = Array.from(cells).map(c => ({
          class: c.className,
          text: c.innerText?.trim().replace(/\n+/g,' ').slice(0,100)
        }));
        
        // Get links
        const link = row.querySelector('a[href*="/Public/Notice/"]');
        
        return { noticeId, title, link: link?.href, cellTexts: cellTexts.slice(0, 8) };
      });
    });
    
    console.log('Notice data:');
    notices.forEach((n, i) => {
      console.log(`\nNotice ${i}: ID=${n.noticeId} Title="${n.title}" Link="${n.link}"`);
      n.cellTexts.forEach(c => {
        if (c.text) console.log(`  [${c.class.slice(0,40)}]: ${c.text.slice(0,80)}`);
      });
    });
    
    // Get one complete row HTML to understand full structure
    const firstRowHtml = await page.$eval('.tableRow.dataRow.notice-table', el => el.innerHTML);
    console.log('\nFirst row HTML (first 3000):');
    console.log(firstRowHtml.slice(0, 3000));
    
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
