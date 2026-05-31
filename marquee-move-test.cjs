/* Confirm the marquee actually animates by measuring its translateX at
   two points in time and reporting the delta. */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `marquee-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await wait(2500);

  // Scroll to expose the marquee (just below the hero)
  await page.evaluate(() => {
    const candidates = document.querySelectorAll('div');
    let target = null;
    for (const c of candidates) {
      const cs = getComputedStyle(c);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) {
        target = c;
        break;
      }
    }
    if (target) target.scrollTop = 750;
  });
  await wait(400);
  await page.screenshot({ path: SHOT('01-t0') });
  const tx0 = await getMarqueeTranslate(page);
  console.log('t=0s   translateX:', tx0);

  await wait(3000);
  await page.screenshot({ path: SHOT('02-t3') });
  const tx3 = await getMarqueeTranslate(page);
  console.log('t=3s   translateX:', tx3);

  await wait(3000);
  await page.screenshot({ path: SHOT('03-t6') });
  const tx6 = await getMarqueeTranslate(page);
  console.log('t=6s   translateX:', tx6);

  const moved = tx3 !== tx0 && tx6 !== tx3;
  console.log(moved ? '\n✓ marquee is animating' : '\n✗ marquee is NOT moving');

  await browser.close();
})();

async function getMarqueeTranslate(page) {
  return await page.evaluate(() => {
    // Find any element with translateX in its transform
    const all = document.querySelectorAll('div');
    for (const el of all) {
      const t = (el.style.transform || '').toString();
      const m = t.match(/translateX\(([-\d.]+)px\)/);
      if (m) {
        const v = parseFloat(m[1]);
        // Only the marquee track will have a large translate value
        if (v < -5 || v > 5 || (v === 0 && el.children.length > 4)) return v;
      }
    }
    return null;
  });
}
