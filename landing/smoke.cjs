const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (name) => path.join(os.tmpdir(), `landing-${name}.png`);

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Desktop
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT('01-desktop-hero'), fullPage: false });
  await page.screenshot({ path: SHOT('02-desktop-full'), fullPage: true });

  const heroText = await page.locator('h1').first().innerText();
  console.log('Hero:', heroText.replace(/\n/g, ' / '));

  // Scroll to features
  await page.locator('#features').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT('03-features') });

  // Scroll to app preview
  await page.locator('#how').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT('04-app-preview') });

  // Click the trigger button inside the mock phone
  await page.getByRole('button', { name: 'Trigger alert' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT('05-alert-active') });

  // Scroll to waitlist
  await page.locator('#waitlist').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT('06-waitlist') });

  // Mobile viewport — scroll through each section so IntersectionObserver fires
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: SHOT('07-mobile-hero') });

  await mobile.locator('#features').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: SHOT('08-mobile-features') });

  await mobile.locator('#how').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: SHOT('09-mobile-app-preview') });

  await mobile.locator('#waitlist').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: SHOT('10-mobile-waitlist') });

  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.waitForTimeout(400);
  await mobile.getByLabel('Open menu').click();
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: SHOT('11-mobile-menu') });

  await browser.close();

  console.log('✓ Smoke passed');
  ['01-desktop-hero','02-desktop-full','03-features','04-app-preview','05-alert-active','06-waitlist',
   '07-mobile-hero','08-mobile-features','09-mobile-app-preview','10-mobile-waitlist','11-mobile-menu']
    .forEach((n) => console.log('  📸', SHOT(n)));
})().catch((e) => { console.error(e); process.exit(1); });
