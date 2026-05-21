/* Reproduce the bug: select between incidents at different locations
   and verify the map pin/ring update correctly. */
const { chromium } = require('playwright');
const { io } = require('socket.io-client');
const http = require('http');
const path = require('path');
const os = require('os');

function post(p, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: 'localhost', port: 3000, path: p, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(chunks || '{}') }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Create two citizens at very different locations
  const ts = Date.now();
  const reg1 = await post('/api/auth/register', { name: 'Bangalore Aanya', phone: `+91${(ts).toString().slice(-10)}`, password: 't' });
  const reg2 = await post('/api/auth/register', { name: 'Chennai Nithilla', phone: `+91${(ts+1).toString().slice(-10)}`, password: 't' });

  const bangalore = io('http://localhost:3000', { auth: { token: reg1.body.token }, transports: ['websocket'] });
  const chennai = io('http://localhost:3000', { auth: { token: reg2.body.token }, transports: ['websocket'] });
  await Promise.all([
    new Promise((r,j) => { bangalore.on('connect', r); bangalore.on('connect_error', j); }),
    new Promise((r,j) => { chennai.on('connect', r); chennai.on('connect_error', j); }),
  ]);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await wait(1000);

  // Fire incident 1: Bangalore
  bangalore.emit('sos:escalate', {
    tier: 1, radius: 500,
    location: { lat: 12.9716, lng: 77.5946 },
    userId: reg1.body.id,
  });
  await wait(2500);
  await page.screenshot({ path: path.join(os.tmpdir(), 'multi-01-bangalore.png') });

  // Fire incident 2: Chennai/IIITDM area
  chennai.emit('sos:escalate', {
    tier: 1, radius: 500,
    location: { lat: 12.7745, lng: 80.0145 },
    userId: reg2.body.id,
  });
  await wait(2500);
  // Map should still show Bangalore (first selected)
  await page.screenshot({ path: path.join(os.tmpdir(), 'multi-02-after-second-fires.png') });

  // Click the Bangalore incident card in the left rail
  await page.locator('aside button', { hasText: 'Bangalore Aanya' }).first().click();
  await wait(2500);
  await page.screenshot({ path: path.join(os.tmpdir(), 'multi-03-clicked-bangalore.png') });

  // Click back to Chennai
  await page.locator('aside button', { hasText: 'Chennai Nithilla' }).first().click();
  await wait(2500);
  await page.screenshot({ path: path.join(os.tmpdir(), 'multi-04-clicked-back-to-chennai.png') });

  // Click Bangalore again
  await page.locator('aside button', { hasText: 'Bangalore Aanya' }).first().click();
  await wait(2500);
  await page.screenshot({ path: path.join(os.tmpdir(), 'multi-05-clicked-bangalore-again.png') });

  // Dump DOM stats for chennai-selected state
  const stats = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`;
    };
    return {
      mapCenter: (() => {
        const map = document.querySelector('.leaflet-container');
        return map ? r(map) : null;
      })(),
      markers: Array.from(document.querySelectorAll('.leaflet-marker-icon')).map(r),
      paths: document.querySelectorAll('.leaflet-overlay-pane svg path').length,
      tilesLoaded: document.querySelectorAll('.leaflet-tile-loaded').length,
    };
  });
  console.log('After clicking Chennai:', JSON.stringify(stats, null, 2));

  bangalore.disconnect();
  chennai.disconnect();
  await browser.close();

  console.log('\nScreens:');
  ['multi-01-bangalore', 'multi-02-after-second-fires',
   'multi-03-clicked-bangalore', 'multi-04-clicked-back-to-chennai',
   'multi-05-clicked-bangalore-again']
    .forEach((n) => console.log('  📸', path.join(os.tmpdir(), `${n}.png`)));
})();
