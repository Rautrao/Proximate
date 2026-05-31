/* Walk the DOM and find every element that has a visible vertical edge
   (right or left border) in the suspect region. */
const { chromium } = require('playwright');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await wait(2500);

  // Scroll to the interface section
  await page.evaluate(() => {
    const cs = document.querySelectorAll('div');
    for (const c of cs) {
      const s = getComputedStyle(c);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && c.scrollHeight > c.clientHeight) {
        c.scrollTop = 2400;
        break;
      }
    }
  });
  await wait(800);

  // Find all elements with a non-transparent right or left border
  const suspects = await page.evaluate(() => {
    const out = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 5 && r.height > 100) {
        out.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
          bg: s.backgroundColor,
          border: `${s.borderLeftWidth}|${s.borderRightWidth}`,
        });
      }
      // Also find elements with a right border
      if (parseFloat(s.borderRightWidth) > 0 && s.borderRightStyle !== 'none' && r.height > 100) {
        out.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
          borderR: s.borderRightWidth + ' ' + s.borderRightColor,
        });
      }
      if (parseFloat(s.borderLeftWidth) > 0 && s.borderLeftStyle !== 'none' && r.height > 100) {
        out.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
          borderL: s.borderLeftWidth + ' ' + s.borderLeftColor,
        });
      }
    }
    return out;
  });

  console.log('Suspect elements:');
  suspects.forEach((s) => console.log(JSON.stringify(s)));

  await browser.close();
})();
