/* Verify ETA + distance text is present in the responder roster */
const { chromium } = require('playwright');
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

  sock.emit('sos:escalate', {
    tier: 2, radius: 1000,
    location: { lat: 12.9716, lng: 77.5946 },
    userId: reg.body.id,
  });
  await wait(2500);
  await page.getByRole('button', { name: /I'm responding/i }).click();
  await wait(4500); // give OSRM time

  // Find the responder roster text
  const rosterText = await page.locator('text=Responders en route').locator('xpath=..').innerText();
  console.log('--- Responder roster text ---');
  console.log(rosterText);

  // Save zoomed screenshot of roster
  const path = require('path');
  const os = require('os');
  const roster = await page.locator('text=Responders en route').locator('xpath=..').boundingBox();
  if (roster) {
    await page.screenshot({
      path: path.join(os.tmpdir(), 'eta-roster.png'),
      clip: { x: roster.x - 8, y: roster.y - 8, width: roster.width + 16, height: roster.height + 16 },
    });
    console.log('Saved:', path.join(os.tmpdir(), 'eta-roster.png'));
  }

  sock.disconnect();
  await browser.close();
})();
