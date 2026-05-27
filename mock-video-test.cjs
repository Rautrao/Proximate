/* Verify the mock video fallback: launch Chromium WITHOUT fake camera flags
   so getUserMedia fails, then confirm the dashboard still receives a live
   stream (sourced from the canvas mock instead of a real camera). */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const SHOT = (n) => path.join(os.tmpdir(), `mock-vid-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // No --use-fake-device-for-media-stream — getUserMedia will fail in headless.
  const browser = await chromium.launch({ headless: true });

  // Citizen — deny camera permission deliberately to force the fallback path.
  const citizenCtx = await browser.newContext({
    viewport: { width: 420, height: 880 },
    permissions: [], // explicitly no camera
  });
  const citizen = await citizenCtx.newPage();
  await citizen.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await wait(2000);

  await citizen.getByText('Create account').first().click();
  await wait(1200);
  const inputs = citizen.locator('input').filter({ visible: true });
  await inputs.nth(0).fill('Aanya R.');
  await inputs.nth(1).fill(`+91${Date.now().toString().slice(-10)}`);
  await inputs.nth(2).fill('test1234');
  await inputs.nth(3).fill('test1234');
  await citizen.getByText('Create account').last().click();
  await wait(3500);

  const sos = citizen.getByLabel(/SOS emergency button/i);
  await sos.waitFor({ state: 'visible', timeout: 5000 });
  const box = await sos.boundingBox();
  await citizen.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await citizen.mouse.down();
  await wait(1800);
  await citizen.mouse.up();
  await wait(3000);
  await citizen.screenshot({ path: SHOT('01-citizen-sos-with-simulated-pill') });

  // Dashboard
  const dashCtx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const dash = await dashCtx.newPage();
  await dash.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await wait(2000);
  await dash.getByRole('button', { name: /I'm responding/i }).click();
  console.log('▸ ack sent — waiting for ICE + video frames');
  await wait(7000);
  await dash.screenshot({ path: SHOT('02-dashboard-with-mock-video') });

  const videoStats = await dash.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return { found: false };
    return {
      found: true,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      currentTime: v.currentTime,
      readyState: v.readyState,
      paused: v.paused,
    };
  });
  console.log('Dashboard video:', videoStats);

  const citizenStatus = await citizen.evaluate(() => {
    return Array.from(document.querySelectorAll('div'))
      .map((d) => d.innerText)
      .find((t) => t && t.includes('Simulated feed'));
  });
  console.log('Citizen pill:', citizenStatus);

  if (videoStats.found && videoStats.currentTime > 0 && videoStats.videoWidth > 0) {
    console.log('\n✓ Mock video flowed end-to-end — dashboard is rendering the canvas stream');
  } else {
    console.log('\n✗ Mock video did NOT reach dashboard');
  }

  await browser.close();
  ['01-citizen-sos-with-simulated-pill', '02-dashboard-with-mock-video']
    .forEach((n) => console.log('  📸', SHOT(n)));
})().catch((e) => { console.error(e); process.exit(1); });
