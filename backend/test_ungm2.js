const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Intercept the search network request to understand what gets sent/returned
  const searchResults = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('Notice/Search') || url.includes('Notice/GetNotice')) {
      console.log('\n>>> NETWORK RESPONSE from:', url);
      console.log('Status:', response.status());
      try {
        const body = await response.text();
        console.log('Body (first 1000):', body.slice(0, 1000));
        searchResults.push({ url, body });
      } catch(e) {}
    }
  });
  
  try {
    await page.goto('https://www.ungm.org/Public/Notice', { waitUntil: 'networkidle', timeout: 35000 });
    
    console.log('Page loaded. Waiting for AJAX...');
    await page.waitForTimeout(5000);
    
    // Try to find notice rows after AJAX
    const noticeRows = await page.$$('table tr, .tender-title, a[href*="/Public/Notice/"]');
    console.log('Notice rows after wait:', noticeRows.length);
    
    if (noticeRows.length > 0) {
      for (let i = 0; i < Math.min(3, noticeRows.length); i++) {
        const text = await noticeRows[i].innerText().catch(() => '');
        const href = await noticeRows[i].getAttribute('href').catch(() => '');
        console.log(`Row ${i}: href="${href}" text="${text.slice(0,100)}"`);
      }
    }
    
    // Get all links to notice detail pages
    const noticeLinks = await page.$$('a[href*="/Public/Notice/"]');
    console.log('\nNotice detail links found:', noticeLinks.length);
    for (let i = 0; i < Math.min(3, noticeLinks.length); i++) {
      const href = await noticeLinks[i].getAttribute('href');
      const text = await noticeLinks[i].innerText().catch(() => '');
      console.log(`  Link: ${href} | ${text.slice(0,60)}`);
    }
    
    // Check actual table structure
    const tables = await page.$$('table');
    console.log('\nTables on page:', tables.length);
    if (tables.length > 0) {
      const firstTableHtml = await tables[0].innerHTML();
      console.log('First table HTML (first 500):', firstTableHtml.slice(0, 500));
    }

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
