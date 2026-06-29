const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const BASE = 'http://localhost:3000';
  const PID = 'josoroma-mqn4h6m8';
  const RESULT_ID = 'result-1782700000004-demo4';
  const SHOTS = 'docs/screenshots';

  async function shot(name, url) {
    if (url) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: false });
    console.log(`  ${name}: captured`);
  }

  try {
    // ─── 1. Dashboard — top (patients table) ───
    await shot('dashboard.png', `${BASE}/`);

    // ─── 2. Dashboard — scrolled to assessments ───
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await shot('dashboard-assessments.png');
    await page.evaluate(() => window.scrollTo(0, 0));

    // ─── 3. Patient Profile — top (header + Care Plan) ───
    await shot('patient-profile.png', `${BASE}/patients/${PID}`);

    // ─── 4. Patient Profile — scrolled (Clinical Summary + Background + Consent) ───
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(500);
    await shot('patient-profile-clinical.png');
    await page.evaluate(() => window.scrollTo(0, 0));

    // ─── 5. Assessments page (invite lifecycle) ───
    await shot('assessments.png', `${BASE}/patients/${PID}/assessments`);

    // ─── 6. Assessment Form — top (patient-facing, shows questions/radio buttons) ───
    await shot('assessment-form.png', `${BASE}/a/demo-pending-form-token-abcdef12`);

    // ─── 6b. Assessment Form — scrolled to show more questions ───
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await shot('assessment-form-scrolled.png');
    await page.evaluate(() => window.scrollTo(0, 0));

    // ─── 7. Results list ───
    await shot('results.png', `${BASE}/patients/${PID}/results`);

    // ─── 8. Result Detail — view mode: chart + scores at top ───
    await shot('result-dep-followup.png', `${BASE}/patients/${PID}/results/${RESULT_ID}`);

    // ─── 8b. Result Detail — scrolled to show answers section ───
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await shot('result-dep-followup-scrolled.png');
    await page.evaluate(() => window.scrollTo(0, 0));

    // ─── 9. Result Detail — edit mode (radio buttons for each item) ───
    const editButtons = await page.locator('button:has-text("Edit")').all();
    console.log(`  Found ${editButtons.length} Edit buttons`);
    if (editButtons.length >= 2) {
      await editButtons[editButtons.length - 1].click();
      await page.waitForTimeout(1500);
    }
    await shot('result-dep-edit.png');

    // ─── 9b. Result Detail — edit mode scrolled to show radio buttons ───
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await shot('result-dep-edit-scrolled.png');
    await page.evaluate(() => window.scrollTo(0, 0));

    // ─── 10. Sessions list ───
    await shot('sessions.png', `${BASE}/patients/${PID}/sessions`);

    // ─── 11. Session Edit — MDX editor with rich formatting toolbar ───
    const editLink = page.locator('a:has-text("Edit")').first();
    if (await editLink.count() > 0) {
      await editLink.click();
      await page.waitForTimeout(1500);
    }
    await shot('session-edit.png');

    // 12. Agent Chat
    await shot('agent-chat-patient.png', `${BASE}/agent?sessions&patientId=${PID}`);

    // ─── 13. Assessment Editor — Fields tab (field definitions) ───
    await shot('editor.png', `${BASE}/editor/level1-adult`);

    // ─── 13b. Assessment Editor — click Fields tab ───
    const fieldsTab = page.locator('button[role="tab"]:has-text("Fields")').first();
    if (await fieldsTab.count() > 0) {
      await fieldsTab.click();
      await page.waitForTimeout(1000);
    }
    await shot('editor-fields.png');

    // ─── 13c. Assessment Editor — click Scoring tab ───
    const scoringTab = page.locator('button[role="tab"]:has-text("Scoring")').first();
    if (await scoringTab.count() > 0) {
      await scoringTab.click();
      await page.waitForTimeout(1000);
    }
    await shot('editor-scoring.png');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n✓ All screenshots captured');
})();