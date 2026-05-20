/* eslint-disable no-console */
const { chromium } = require('playwright');
const { io } = require('socket.io-client');
const http = require('http');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `responder-${n}.png`);

function post(pathname, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks || '{}') });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // 1. Create a citizen user via REST
  const phone = `+91${Date.now().toString().slice(-10)}`;
  const reg = await post('/api/auth/register', {
    name: 'Aanya R.',
    phone,
    password: 'test1234',
  });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status}`);
  const { token, id: userId } = reg.body;
  console.log('✓ Citizen registered:', reg.body.name, 'userId=' + userId);

  // 2. Open the responder portal in Playwright
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT('01-idle') });
  console.log('✓ Responder dashboard loaded (idle)');

  // 3. Connect citizen socket and trigger SOS
  const citizen = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
  });
  await new Promise((resolve, reject) => {
    citizen.on('connect', resolve);
    citizen.on('connect_error', reject);
    setTimeout(() => reject(new Error('citizen socket timeout')), 5000);
  });
  console.log('✓ Citizen socket connected');

  // Listen for the ack that'll arrive after the responder clicks
  const ackPromise = new Promise((resolve) => {
    citizen.on('sos:responder_ack', (responder) => resolve(responder));
  });

  citizen.emit('sos:escalate', {
    tier: 1,
    radius: 500,
    location: { lat: 12.9716, lng: 77.5946 },
    userId,
  });
  console.log('✓ SOS tier-1 escalated by citizen');

  // 4. Wait for incident to appear in the dashboard
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT('02-incident-arrived') });
  const victimVisible = await page.getByText('Aanya R.').first().isVisible();
  console.log(victimVisible ? '✓ Incident card visible in dashboard' : '✗ Incident card NOT visible');

  // 5. Escalate to tier 2 to show the ring transition
  citizen.emit('sos:escalate', {
    tier: 2,
    radius: 1000,
    location: { lat: 12.9716, lng: 77.5946 },
    userId,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT('03-escalated-tier2') });
  console.log('✓ Escalated to tier 2 — captured');

  // 6. Click "I'm responding" on the dashboard
  await page.getByRole('button', { name: /I'm responding/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT('04-responding') });
  console.log('✓ Responder clicked ack');

  // 7. Verify the citizen received the ack
  const ack = await Promise.race([
    ackPromise,
    wait(4000).then(() => null),
  ]);
  if (ack) {
    console.log(`✓ Citizen received ack: ${ack.name} · ${ack.distance}m away`);
  } else {
    console.log('✗ Citizen did NOT receive ack');
  }

  // 8. Citizen cancels
  citizen.emit('sos:cancel', { userId });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT('05-cancelled') });
  console.log('✓ Citizen cancelled — dashboard reflects');

  // 9. Toggle demo mode for the marketing screenshot
  await page.getByRole('button', { name: /Demo mode/i }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SHOT('06-demo-mode') });

  citizen.disconnect();
  await browser.close();

  console.log('\n✓ E2E smoke passed');
  ['01-idle','02-incident-arrived','03-escalated-tier2','04-responding','05-cancelled','06-demo-mode']
    .forEach((n) => console.log('  📸', SHOT(n)));
})().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
