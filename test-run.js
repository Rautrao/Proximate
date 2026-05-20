const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT_DIR = os.tmpdir();
const shot = (page, name) =>
  page.screenshot({ path: path.join(SHOT_DIR, `proximate-${name}.png`) });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  // ── 1. Login screen ────────────────────────────────────────────────────────
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot(page, '01-login');
  console.log('✓ Login screen loaded');

  // ── 2. Navigate to register ────────────────────────────────────────────────
  await page.getByText('Create account').click();
  await page.waitForTimeout(1500);
  await shot(page, '02-register');
  console.log('✓ Register screen loaded');

  // ── 3. Fill registration form (visible inputs only) ────────────────────────
  const visibleInputs = page.locator('input').filter({ visible: true });
  const count = await visibleInputs.count();
  console.log(`  Found ${count} visible inputs`);

  const phone = `+91${Date.now().toString().slice(-10)}`;
  await visibleInputs.nth(0).fill('Nithillakrishi PY');
  await visibleInputs.nth(1).fill(phone);
  await visibleInputs.nth(2).fill('test1234');
  await visibleInputs.nth(3).fill('test1234');
  await shot(page, '03-filled');
  console.log('✓ Form filled');

  // ── 4. Submit registration ─────────────────────────────────────────────────
  // Pressable renders without a standard button role in RN Web —
  // use the last matching text node (link says "Create account" too).
  const createBtn = page.getByText('Create account').last();
  await createBtn.scrollIntoViewIfNeeded();
  await createBtn.click();
  await page.waitForTimeout(3000);
  await shot(page, '04-after-register');
  console.log('✓ Registration submitted');

  // ── 5. Should now be on home screen ───────────────────────────────────────
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const onHome = bodyText.includes('SOS') || bodyText.includes('Protected') || bodyText.includes('You are protected');
  console.log(onHome ? '✓ Home screen reached' : '✗ Home screen not reached');
  console.log('  Page text:', bodyText.slice(0, 120).replace(/\n/g, ' '));
  await shot(page, '05-home');

  // ── 6. Check SOS button exists ─────────────────────────────────────────────
  const sosBtn = page.getByText('SOS');
  if (await sosBtn.count() > 0) {
    console.log('✓ SOS button visible');
    await shot(page, '06-sos-visible');
  }

  await browser.close();

  ['01-login','02-register','03-filled','04-after-register','05-home','06-sos-visible'].forEach(n =>
    console.log(`  📸 ${path.join(SHOT_DIR, `proximate-${n}.png`)}`)
  );
})();
