/* Reproduce the user's exact scenario: demo mode + multiple real incidents */
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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await wait(800);

  // 1. Enable demo mode — generates synthetic Bangalore incidents
  await page.getByRole('button', { name: /Demo mode/i }).click();
  await wait(8000); // let a couple demo incidents accumulate

  // 2. Fire a real SOS at Chennai/IIITDM coords
  const reg = await post('/api/auth/register', {
    name: 'Nithillakrishi',
    phone: `+91${Date.now().toString().slice(-10)}`,
    password: 't',
  });
  const sock = io('http://localhost:3000', { auth: { token: reg.body.token }, transports: ['websocket'] });
  await new Promise((r, j) => { sock.on('connect', r); sock.on('connect_error', j); });
  sock.emit('sos:escalate', {
    tier: 1, radius: 500,
    location: { lat: 12.7745, lng: 80.0145 },
    userId: reg.body.id,
  });
  await wait(2500);

  // 3. Click the Nithillakrishi incident
  await page.locator('aside button', { hasText: 'Nithillakrishi' }).first().click();
  await wait(2500);

  // 4. Capture state
  const mapBox = await page.locator('.leaflet-container').boundingBox();
  console.log('Map box:', mapBox);

  await page.screenshot({ path: path.join(os.tmpdir(), 'repro-full.png') });
  if (mapBox) {
    await page.screenshot({
      path: path.join(os.tmpdir(), 'repro-map.png'),
      clip: {
        x: Math.max(0, mapBox.x - 16),
        y: Math.max(0, mapBox.y - 32),
        width: mapBox.width + 32,
        height: mapBox.height + 64,
      },
    });
  }

  sock.disconnect();
  await browser.close();
  console.log('Saved screenshots');
})();
