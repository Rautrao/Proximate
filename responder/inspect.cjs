/* Open dashboard, trigger a demo incident, capture console messages and screenshot */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      errors.push(`${m.type().toUpperCase()}: ${m.text()}`);
    }
  });

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Demo mode/i }).click();
  await page.waitForTimeout(4000); // let a demo incident fire + map render

  // Inspect what's actually in the DOM
  const stats = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`;
    };
    const map = document.querySelector('.leaflet-container');
    const tilePane = document.querySelector('.leaflet-tile-pane');
    const mapPane = document.querySelector('.leaflet-map-pane');
    const overlayPane = document.querySelector('.leaflet-overlay-pane');
    const overlaySvg = document.querySelector('.leaflet-overlay-pane svg');
    const tiles = Array.from(document.querySelectorAll('.leaflet-tile-loaded'));
    const tileRects = tiles.slice(0, 5).map((t) => r(t));
    const paths = document.querySelectorAll('.leaflet-overlay-pane svg path');
    const xform = (el) => (el ? getComputedStyle(el).transform : null);
    return {
      mapRect: r(map),
      tilePaneRect: r(tilePane),
      mapPaneRect: r(mapPane),
      overlayPaneRect: r(overlayPane),
      overlaySvgRect: r(overlaySvg),
      tilesLoaded: tiles.length,
      firstFiveTiles: tileRects,
      pathsInOverlay: paths.length,
      mapPaneTransform: xform(mapPane),
      tilePaneTransform: xform(tilePane),
      overlayPaneTransform: xform(overlayPane),
      victimDots: document.querySelectorAll('.victim-marker').length,
      markers: document.querySelectorAll('.leaflet-marker-icon').length,
      markerRects: Array.from(document.querySelectorAll('.leaflet-marker-icon')).map((m) => r(m)),
    };
  });
  console.log('DOM stats:', JSON.stringify(stats, null, 2));

  await page.screenshot({ path: path.join(os.tmpdir(), 'inspect-dash.png') });

  if (errors.length) {
    console.log('\n--- Errors/Warnings ---');
    errors.slice(0, 15).forEach((e) => console.log(e));
  } else {
    console.log('\n(no errors or warnings)');
  }

  await browser.close();
})();
