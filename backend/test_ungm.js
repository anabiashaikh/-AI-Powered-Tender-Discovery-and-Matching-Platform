const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  try {
    console.log('Navigating to UNGM...');
    await page.goto('https://www.ungm.org/Public/Notice', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('Title:', await page.title());
    console.log('URL:', page.url());
    
    // Wait for the search results to load
    await page.waitForTimeout(8000);
    
    // Check what's in the main content area
    const mainContent = await page.$('#noticeMain');
    if (mainContent) {
      const html = await mainContent.innerHTML();
      console.log('\n#noticeMain content (first 2000 chars):');
      console.log(html.slice(0, 2000));
    } else {
      console.log('No #noticeMain found');
    }
    
    // Try to find any notice elements
    const rows = await page.$$('tr, .notice-row, [class*="notice"]');
    console.log('\nTotal matching rows found:', rows.length);
    
    if (rows.length > 0) {
      const text = await rows[0].innerText();
      console.log('First row text:', text.slice(0, 200));
    }
    
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
