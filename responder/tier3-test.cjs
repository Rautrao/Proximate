/* Trigger an SOS and escalate it all the way to tier 3, screenshot each stage */
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
const shot = (page, n) => page.screenshot({ path: path.join(os.tmpdir(), `tier3-${n}.png`) });

(async () => {
  const reg = await post('/api/auth/register', {
    name: 'Aanya R.', phone: `+91${Date.now().toString().slice(-10)}`, password: 't',
  });
  const sock = io('http://localhost:3000', { auth: { token: reg.body.token }, transports: ['websocket'] });
  await new Promise((r, j) => { sock.on('connect', r); sock.on('connect_error', j); });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await wait(1000);

  // Tier 1
  sock.emit('sos:escalate', { tier: 1, radius: 500, location: { lat: 12.9716, lng: 77.5946 }, userId: reg.body.id });
  await wait(2500);
  await shot(page, '01-tier1');

  // Tier 2
  sock.emit('sos:escalate', { tier: 2, radius: 1000, location: { lat: 12.9716, lng: 77.5946 }, userId: reg.body.id });
  await wait(2000);
  await shot(page, '02-tier2');

  // Tier 3 — POLICE PRIORITY
  sock.emit('sos:escalate', { tier: 3, radius: 2000, location: { lat: 12.9716, lng: 77.5946 }, userId: reg.body.id });
  await wait(2500);
  await shot(page, '03-tier3-police');

  // Responder acks (Officer Mehta)
  await page.getByRole('button', { name: /I'm responding/i }).click();
  await wait(1500);
  await shot(page, '04-tier3-acked');

  sock.disconnect();
  await browser.close();
  console.log('saved');
  ['01-tier1','02-tier2','03-tier3-police','04-tier3-acked'].forEach((n) =>
    console.log('  📸', path.join(os.tmpdir(), `tier3-${n}.png`))
  );
})();
