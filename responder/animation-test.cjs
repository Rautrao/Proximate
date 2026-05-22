/* Verify the responder pip animates along the route */
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

  sock.emit('sos:escalate', {
    tier: 2, radius: 1000,
    location: { lat: 12.9716, lng: 77.5946 },
    userId: reg.body.id,
  });
  await wait(2500);

  await page.getByRole('button', { name: /I'm responding/i }).click();
  // Wait for OSRM route to load
  await wait(3000);

  // Sample the responder pip position every 4s for 16s
  const getPipPosition = async () => {
    return await page.evaluate(() => {
      const marker = document.querySelector('.leaflet-marker-icon:has(.responder-pip)');
      if (!marker) {
        // Fallback: find marker whose inner html includes responder-pip class
        const all = document.querySelectorAll('.leaflet-marker-icon');
        for (const m of all) {
          if (m.innerHTML.includes('responder-pip')) {
            const r = m.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y) };
          }
        }
        return null;
      }
      const r = marker.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y) };
    });
  };

  const samples = [];
  for (let i = 0; i < 5; i++) {
    const pos = await getPipPosition();
    samples.push({ at: i * 4, ...pos });
    if (i === 0) await page.screenshot({ path: path.join(os.tmpdir(), `anim-${i}-start.png`) });
    if (i === 4) await page.screenshot({ path: path.join(os.tmpdir(), `anim-${i}-end.png`) });
    await wait(4000);
  }

  console.log('Pip positions over 16s:');
  samples.forEach((s) => console.log(`  t=${s.at}s: (${s.x}, ${s.y})`));

  // Check that the pip actually moved
  const dx = (samples[samples.length - 1].x ?? 0) - (samples[0].x ?? 0);
  const dy = (samples[samples.length - 1].y ?? 0) - (samples[0].y ?? 0);
  const totalMove = Math.sqrt(dx * dx + dy * dy);
  console.log(`\nTotal pip movement: ${Math.round(totalMove)} px`);
  console.log(totalMove > 20 ? '✓ pip animated along route' : '✗ pip did not move');

  sock.disconnect();
  await browser.close();
})();
