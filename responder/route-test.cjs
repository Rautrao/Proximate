/* Trigger SOS + ack and screenshot the map showing the OSRM road route */
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
  const reg = await post('/api/auth/register', {
    name: 'Aanya R.', phone: `+91${Date.now().toString().slice(-10)}`, password: 't',
  });
  const sock = io('http://localhost:3000', { auth: { token: reg.body.token }, transports: ['websocket'] });
  await new Promise((r, j) => { sock.on('connect', r); sock.on('connect_error', j); });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await wait(800);

  // Fire SOS at central Bangalore — somewhere with dense road network
  sock.emit('sos:escalate', {
    tier: 2, radius: 1000,
    location: { lat: 12.9716, lng: 77.5946 },
    userId: reg.body.id,
  });
  await wait(2500);

  // Ack — Officer Mehta becomes a responder
  await page.getByRole('button', { name: /I'm responding/i }).click();
  // Give OSRM time to respond + draw
  await wait(3500);

  await page.screenshot({ path: path.join(os.tmpdir(), 'route-full.png') });

  // Cropped map view
  const mapBox = await page.locator('.leaflet-container').boundingBox();
  if (mapBox) {
    await page.screenshot({
      path: path.join(os.tmpdir(), 'route-map.png'),
      clip: {
        x: Math.max(0, mapBox.x - 16),
        y: Math.max(0, mapBox.y - 32),
        width: mapBox.width + 32,
        height: mapBox.height + 64,
      },
    });
  }

  // Count polylines on the map
  const stats = await page.evaluate(() => ({
    polylinePaths: document.querySelectorAll('.leaflet-overlay-pane svg path').length,
    markers: document.querySelectorAll('.leaflet-marker-icon').length,
  }));
  console.log('DOM stats:', stats);

  sock.disconnect();
  await browser.close();
  console.log('saved:');
  ['route-full', 'route-map'].forEach((n) =>
    console.log('  📸', path.join(os.tmpdir(), `${n}.png`))
  );
})();
