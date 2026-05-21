/* Take a tightly-cropped screenshot of just the tactical map */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const { io } = require('socket.io-client');
const http = require('http');

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

(async () => {
  // Register a victim
  const phone = `+91${Date.now().toString().slice(-10)}`;
  const reg = await post('/api/auth/register', { name: 'Aanya R.', phone, password: 'test1234' });
  const { token, id: userId } = reg.body;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Trigger SOS over a direct socket
  const citizen = io('http://localhost:3000', { auth: { token }, transports: ['websocket'] });
  await new Promise((r, j) => { citizen.on('connect', r); citizen.on('connect_error', j); });
  citizen.emit('sos:escalate', { tier: 2, radius: 1000, location: { lat: 12.9716, lng: 77.5946 }, userId });
  await page.waitForTimeout(2500);

  // Ack to get the responder pip
  await page.getByRole('button', { name: /I'm responding/i }).click();
  await page.waitForTimeout(1800);

  // Full screenshot at higher res
  await page.screenshot({ path: path.join(os.tmpdir(), 'zoom-full.png') });

  // And a clip of just the tactical map area
  const mapBox = await page.locator('.leaflet-container').boundingBox();
  if (mapBox) {
    await page.screenshot({
      path: path.join(os.tmpdir(), 'zoom-map.png'),
      clip: {
        x: mapBox.x - 16,
        y: mapBox.y - 32,
        width: mapBox.width + 32,
        height: mapBox.height + 64,
      },
    });
  }

  citizen.disconnect();
  await browser.close();
  console.log('Saved:');
  console.log('  📸', path.join(os.tmpdir(), 'zoom-full.png'));
  console.log('  📸', path.join(os.tmpdir(), 'zoom-map.png'));
})();
