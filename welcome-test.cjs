/* Verify the new in-app landing page + restyled auth */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `welcome-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Fresh incognito-like context with no persisted auth/quiz state
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await wait(2500);
  await page.screenshot({ path: SHOT('01-welcome-top'), fullPage: false });
  await page.screenshot({ path: SHOT('02-welcome-full'), fullPage: true });

  const text = await page.locator('body').innerText();
  const sawHero = text.includes('Safety.') && text.includes('Redefined.');
  const sawCTA = text.includes('Get started');
  const sawSignIn = text.includes('already have an account') || text.includes('Sign in');
  console.log({ sawHero, sawCTA, sawSignIn });

  // Click "I already have an account" → should show restyled login
  if (sawSignIn) {
    await page.getByText(/already have an account/i).first().click();
    await wait(1500);
    await page.screenshot({ path: SHOT('03-login-restyled') });
  }

  await browser.close();
  ['01-welcome-top', '02-welcome-full', '03-login-restyled'].forEach((n) =>
    console.log('  📸', SHOT(n))
  );
})();
