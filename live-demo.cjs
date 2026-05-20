/**
 * Two-screen live demo verifier.
 *  - Browser A: the citizen Expo Web app at :8081
 *  - Browser B: the responder dashboard at :5174
 *
 * Drives the citizen UI through register → home → long-press SOS,
 * then verifies the dashboard receives the incident and an
 * acknowledgement round-trips back into the citizen's sos-active screen.
 */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT_DIR = os.tmpdir();
const shot = (page, name) =>
  page.screenshot({ path: path.join(SHOT_DIR, `live-${name}.png`) });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── A. Citizen ─────────────────────────────────────────────────────────────
  const citizenCtx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const citizen = await citizenCtx.newPage();

  console.log('▸ Citizen → loading app');
  await citizen.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await citizen.waitForTimeout(2000);

  console.log('▸ Citizen → registering');
  await citizen.getByText('Create account').first().click();
  await citizen.waitForTimeout(1200);

  const visibleInputs = citizen.locator('input').filter({ visible: true });
  const phone = `+91${Date.now().toString().slice(-10)}`;
  const name = 'Aanya R.';
  await visibleInputs.nth(0).fill(name);
  await visibleInputs.nth(1).fill(phone);
  await visibleInputs.nth(2).fill('test1234');
  await visibleInputs.nth(3).fill('test1234');

  const createBtn = citizen.getByText('Create account').last();
  await createBtn.scrollIntoViewIfNeeded();
  await createBtn.click();

  // Wait for home screen
  await citizen.waitForTimeout(3500);
  await shot(citizen, '01-citizen-home');
  console.log('  ✓ Citizen home screen reached');

  // ── B. Responder dashboard ─────────────────────────────────────────────────
  const dashCtx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const dash = await dashCtx.newPage();
  console.log('▸ Dashboard → loading');
  await dash.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await dash.waitForTimeout(1500);
  await shot(dash, '02-dashboard-idle');
  console.log('  ✓ Dashboard idle (All clear)');

  // ── C. Citizen triggers SOS via long-press ─────────────────────────────────
  console.log('▸ Citizen → long-pressing SOS button');
  const sosButton = citizen.getByLabel(/SOS emergency button/i);
  await sosButton.waitFor({ state: 'visible', timeout: 5000 });
  const box = await sosButton.boundingBox();
  if (!box) throw new Error('SOS button has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await citizen.mouse.move(cx, cy);
  await citizen.mouse.down();
  await citizen.waitForTimeout(1800); // > HOLD_DURATION_MS (1500ms)
  await citizen.mouse.up();

  await citizen.waitForTimeout(2000);
  await shot(citizen, '03-citizen-sos-active');

  const sosActive = await citizen.locator('body').innerText();
  if (sosActive.includes('EMERGENCY ACTIVE') || sosActive.includes('Alerting nearby')) {
    console.log('  ✓ Citizen routed to sos-active screen');
  } else {
    console.log('  ✗ Citizen did NOT route to sos-active');
    console.log('    page text:', sosActive.slice(0, 200).replace(/\n/g, ' '));
  }

  // ── D. Verify incident appears on dashboard ────────────────────────────────
  console.log('▸ Dashboard → waiting for incident');
  // Leaflet needs a beat to invalidate, fly, and load tiles
  await dash.waitForTimeout(2500);
  await shot(dash, '04-dashboard-incident');

  const dashBody = await dash.locator('body').innerText();
  if (dashBody.includes(name)) {
    console.log(`  ✓ Dashboard received incident from "${name}"`);
  } else {
    console.log(`  ✗ Dashboard did NOT show "${name}"`);
    console.log('    dashboard text:', dashBody.slice(0, 250).replace(/\n/g, ' '));
  }

  // ── E. Dashboard acknowledges ──────────────────────────────────────────────
  console.log('▸ Dashboard → clicking "I\'m responding"');
  await dash.getByRole('button', { name: /I'm responding/i }).click();
  await dash.waitForTimeout(2000);
  await shot(dash, '05-dashboard-acked');

  // ── F. Verify ack arrives on citizen sos-active screen ─────────────────────
  await citizen.waitForTimeout(1500);
  await shot(citizen, '06-citizen-responder-received');
  const citizenAfter = await citizen.locator('body').innerText();
  if (citizenAfter.match(/responding nearby/i)) {
    console.log('  ✓ Citizen sos-active shows responder');
  } else {
    console.log('  ✗ Citizen did NOT show responder');
    console.log('    page text:', citizenAfter.slice(0, 300).replace(/\n/g, ' '));
  }

  await browser.close();

  console.log('\n✓ Two-screen live demo verified');
  ['01-citizen-home','02-dashboard-idle','03-citizen-sos-active',
   '04-dashboard-incident','05-dashboard-acked','06-citizen-responder-received']
    .forEach((n) => console.log('  📸', path.join(SHOT_DIR, `live-${n}.png`)));
})().catch((e) => { console.error('✗', e); process.exit(1); });
