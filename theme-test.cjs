/* Visual smoke test: every screen now in zinc-950 + amber */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `theme-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // 1. Welcome (entry point for unauthed)
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await wait(2500);
  await page.screenshot({ path: SHOT('01-welcome'), fullPage: true });

  // 2. Login
  await page.getByText(/already have an account/i).first().click();
  await wait(1500);
  await page.screenshot({ path: SHOT('02-login') });

  // 3. Register (via quiz — open with persisted pass via direct route trick)
  // Easier: register a user and let auth flow take us through
  await page.evaluate(() => {
    const s = window.localStorage;
    s.setItem(
      'proximate-onboarding',
      JSON.stringify({
        state: { language: 'en', quizPassed: true, lastFailedAt: null },
        version: 0,
      })
    );
  });
  await page.goto('http://localhost:8081/(auth)/register', { waitUntil: 'networkidle' });
  await wait(1500);
  await page.screenshot({ path: SHOT('03-register') });

  // Fill it and submit
  const phone = `+91${Date.now().toString().slice(-10)}`;
  const inputs = page.locator('input').filter({ visible: true });
  await inputs.nth(0).fill('Demo User');
  await inputs.nth(1).fill(phone);
  await inputs.nth(2).fill('test1234');
  await inputs.nth(3).fill('test1234');
  await page.getByText('Create account', { exact: true }).last().click();
  await wait(3500);

  // 4. Home
  await page.screenshot({ path: SHOT('04-home') });

  // 5. Contacts tab
  await page.getByText('CONTACTS', { exact: false }).first().click().catch(() => {});
  await wait(800);
  await page.screenshot({ path: SHOT('05-contacts') });

  // 6. Settings tab
  await page.getByText('SETTINGS', { exact: false }).first().click().catch(() => {});
  await wait(800);
  await page.screenshot({ path: SHOT('06-settings') });

  await browser.close();
  ['01-welcome', '02-login', '03-register', '04-home', '05-contacts', '06-settings']
    .forEach((n) => console.log('  📸', SHOT(n)));
})();
