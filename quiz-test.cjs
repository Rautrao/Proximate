/* Walk through the quiz gate end-to-end:
   landing on /quiz → pick language → answer 5 questions → land on /register */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const SHOT = (n) => path.join(os.tmpdir(), `quiz-${n}.png`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Fresh context so we have no persisted quiz-pass state
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await wait(2000);
  await page.screenshot({ path: SHOT('01-login') });

  // Click "Create account" — should land on the quiz, NOT the register form
  await page.getByText('Create account').first().click();
  await wait(1500);
  await page.screenshot({ path: SHOT('02-language-picker') });

  // Check that language options are visible
  const langText = await page.locator('body').innerText();
  const sawNative = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'বাংলা'].filter((s) =>
    langText.includes(s)
  );
  console.log('Languages visible:', sawNative);

  // Pick English
  await page.getByText('English').first().click();
  await wait(1000);
  await page.screenshot({ path: SHOT('03-question-1') });

  // Correct option text per question (from constants/quiz.ts, English)
  const correctOptions = [
    'Alerting nearby people during a personal safety emergency',
    'When I genuinely feel unsafe or am in danger',
    'Nearby Proximate users, my emergency contacts, and the nearest police station',
    'Assess the situation safely',
    'To prevent the platform being misused by potential attackers',
  ];

  for (let q = 0; q < 5; q++) {
    // Click the correct option by its (partial) text
    await page.getByText(correctOptions[q], { exact: false }).first().click();
    await wait(400);
    const btnName = q === 4 ? 'Submit' : 'Next';
    await page.getByText(btnName, { exact: true }).first().click();
    await wait(900);
  }

  await page.screenshot({ path: SHOT('04-result') });

  // Check result text
  const resultText = await page.locator('body').innerText();
  console.log('Result page text:', resultText.slice(0, 200).replace(/\n/g, ' | '));

  if (resultText.includes('You passed') || resultText.includes('correct')) {
    console.log('✓ Quiz passed flow reached the result screen');
  }

  await browser.close();
  ['01-login', '02-language-picker', '03-question-1', '04-result'].forEach((n) =>
    console.log('  📸', SHOT(n))
  );
})().catch((e) => { console.error(e); process.exit(1); });
