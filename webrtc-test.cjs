/* End-to-end WebRTC test: citizen triggers SOS with fake camera; dashboard
   acks and verifies the video element is receiving frames. */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `webrtc-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  // ── Citizen ──────────────────────────────────────────────────────────────
  const citizenCtx = await browser.newContext({
    viewport: { width: 420, height: 880 },
    permissions: ['camera', 'microphone', 'geolocation'],
  });
  const citizen = await citizenCtx.newPage();

  console.log('▸ Citizen → loading app');
  await citizen.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await wait(2000);

  console.log('▸ Citizen → registering');
  await citizen.getByText('Create account').first().click();
  await wait(1200);
  const inputs = citizen.locator('input').filter({ visible: true });
  const phone = `+91${Date.now().toString().slice(-10)}`;
  await inputs.nth(0).fill('Aanya R.');
  await inputs.nth(1).fill(phone);
  await inputs.nth(2).fill('test1234');
  await inputs.nth(3).fill('test1234');
  await citizen.getByText('Create account').last().click();
  await wait(3500);

  console.log('▸ Citizen → triggering SOS (long press)');
  const sos = citizen.getByLabel(/SOS emergency button/i);
  await sos.waitFor({ state: 'visible', timeout: 5000 });
  const box = await sos.boundingBox();
  await citizen.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await citizen.mouse.down();
  await wait(1800);
  await citizen.mouse.up();
  await wait(2500);
  await citizen.screenshot({ path: SHOT('01-citizen-sos-active') });

  // ── Dashboard ────────────────────────────────────────────────────────────
  const dashCtx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const dash = await dashCtx.newPage();
  console.log('▸ Dashboard → loading');
  await dash.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await wait(2000);

  // Debug: what does the dashboard see?
  await dash.screenshot({ path: SHOT('00-dashboard-pre-ack') });
  const dashState = await dash.evaluate(() => ({
    title: document.title,
    activeCount: document.body.innerText.match(/(\d+)\s+active/i)?.[1] ?? '?',
    selectedName: document.querySelector('h2')?.textContent,
    buttons: Array.from(document.querySelectorAll('button'))
      .map((b) => b.textContent?.trim())
      .filter((t) => t && t.length < 50)
      .slice(0, 10),
  }));
  console.log('Dashboard state:', JSON.stringify(dashState, null, 2));

  console.log('▸ Dashboard → clicking "I\'m responding"');
  await dash.getByRole('button', { name: /I'm responding/i }).click();

  console.log('▸ waiting for WebRTC negotiation (ICE can take ~3–6s)');
  await wait(7000);
  await dash.screenshot({ path: SHOT('02-dashboard-with-video') });

  // Inspect the video element
  const stats = await dash.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return { found: false };
    return {
      found: true,
      hasSrcObject: !!v.srcObject,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      readyState: v.readyState,
      paused: v.paused,
      currentTime: v.currentTime,
    };
  });
  console.log('Video element stats:', stats);

  if (stats.found && stats.videoWidth > 0 && stats.currentTime > 0) {
    console.log('\n✓ Live video stream verified on dashboard');
  } else {
    console.log('\n✗ Video not flowing yet');
  }

  await browser.close();
  console.log('Screenshots:');
  ['01-citizen-sos-active', '02-dashboard-with-video'].forEach((n) =>
    console.log('  📸', SHOT(n))
  );
})().catch((e) => { console.error(e); process.exit(1); });
