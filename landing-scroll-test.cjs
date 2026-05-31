const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `landing-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await wait(2500);

  await page.screenshot({ path: SHOT('01-top') });

  // Find the RN Web ScrollView and scroll it programmatically
  const scrolls = [600, 1300, 2000, 2800, 3500, 4300, 5000];
  for (let i = 0; i < scrolls.length; i++) {
    await page.evaluate((y) => {
      const sv = document.querySelector('[class*="r-overflow"]') ||
                 document.querySelector('div[style*="overflow"]') ||
                 document.scrollingElement;
      // Find the scrollable element by checking which one is the RN ScrollView
      const candidates = document.querySelectorAll('div');
      let target = null;
      for (const c of candidates) {
        const cs = getComputedStyle(c);
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
          if (c.scrollHeight > c.clientHeight) {
            target = c;
            break;
          }
        }
      }
      if (target) target.scrollTop = y;
      else window.scrollTo(0, y);
    }, scrolls[i]);
    await wait(700);
    await page.screenshot({ path: SHOT(`0${i + 2}-scroll-${scrolls[i]}`) });
  }

  await browser.close();
  console.log('Done');
})();
