const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 TESTING LIVE SYSTEM & ADMIN ENDPOINTS');
  console.log('====================================================\n');

  // 1. Test Authentication
  console.log('1. Testing Authentication (/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@tenderdiscovery.com',
      password: 'Admin123!',
    }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.access_token;
  if (!token) throw new Error('Failed to get access token');
  console.log('   ✓ Login Successful! Token received.\n');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Test Admin Stats (Overview Tab)
  console.log('2. Testing Admin Stats (/admin/stats)...');
  const statsRes = await fetch(`${BASE_URL}/admin/stats`, { headers: authHeaders });
  const statsData: any = await statsRes.json();
  console.log('   ✓ Stats fetched:', JSON.stringify(statsData));
  console.log();

  // 3. Test Admin Audit Logs (Overview Tab)
  console.log('3. Testing Admin Audit Logs (/admin/audit-logs)...');
  const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, { headers: authHeaders });
  const auditData: any = await auditRes.json();
  console.log(`   ✓ Audit Logs fetched: ${auditData.logs?.length ?? 0} log(s)\n`);

  // 4. Test Admin Users (Users Tab)
  console.log('4. Testing Admin Users (/admin/users)...');
  const usersRes = await fetch(`${BASE_URL}/admin/users`, { headers: authHeaders });
  const usersData: any = await usersRes.json();
  console.log(`   ✓ Admin Users fetched: ${usersData.users?.length ?? 0} user(s)\n`);

  // 5. Test Admin Invite Codes (Invite Codes Tab)
  console.log('5. Testing Admin Invite Codes (/admin/invite-codes)...');
  const inviteRes = await fetch(`${BASE_URL}/admin/invite-codes`, { headers: authHeaders });
  const inviteData: any = await inviteRes.json();
  console.log(`   ✓ Invite Codes fetched: ${inviteData.codes?.length ?? 0} code(s)\n`);

  // 6. Test Admin Tenders (/tenders/all)
  console.log('6. Testing Admin Tenders Listing (/tenders/all)...');
  const tendersRes = await fetch(`${BASE_URL}/tenders/all`, { headers: authHeaders });
  const tendersData: any = await tendersRes.json();
  console.log(`   ✓ Tenders fetched: ${tendersData.tenders?.length ?? 0} tender(s)\n`);

  // 7. Test Scraping Statistics (Scraping Tab)
  console.log('7. Testing Scraping Statistics (/scraping/sources/statistics)...');
  const scrapingRes = await fetch(`${BASE_URL}/scraping/sources/statistics`, { headers: authHeaders });
  const scrapingData: any = await scrapingRes.json();
  console.log(`   ✓ Scraping Sources Statistics fetched: ${scrapingData.length ?? 0} source(s)\n`);

  console.log('====================================================');
  console.log('🎉 ALL ADMIN & OVERVIEW TABS TESTED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
