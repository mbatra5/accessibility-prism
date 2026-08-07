import { test, expect, SEL, navigateToView } from '../fixtures/panel.js';

test.describe('Visual Regression Snapshots', () => {
  /**
   * These tests capture baseline screenshots of key UI states.
   * Run with --update-snapshots to set initial baselines.
   *
   * Rules:
   *  - Never auto-update baselines — review diffs manually.
   *  - Count-driven changes (e.g. new violation detected) are ok after explanation.
   *  - Layout / styling changes require explicit user review before update.
   */

  // ── Pre-screen (home menu) ──────────────────────────────────────────────
  test('pre-screen main menu snapshot', async ({ panelPage }) => {
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('pre-screen.png', {
      mask: [panelPage.locator(`${SEL.panel} #panel-footer-version`)]
    });
  });

  // ── Axe results ─────────────────────────────────────────────────────────
  test('axe results list snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('axe-results.png');
  });

  // ── Scorecard ───────────────────────────────────────────────────────────
  // Scorecard button temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
  test.skip('scorecard visualization snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnScorecard, { timeout: 30_000 });
    await panelPage.waitForSelector(`${SEL.panel} .cat-card`, { timeout: 15_000 });
    await panelPage.waitForTimeout(1500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('scorecard.png', { maxDiffPixelRatio: 0.01 });
  });

  // ── Heading structure ───────────────────────────────────────────────────
  test('heading structure tree snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnHeadings);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('headings-tree.png');
  });

  // ── Landmarks ───────────────────────────────────────────────────────────
  test('landmarks snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLandmarks);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('landmarks.png');
  });

  // ── Contrast ────────────────────────────────────────────────────────────
  // Contrast button temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
  test.skip('contrast results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('contrast-results.png');
  });

  // ── Alt text ────────────────────────────────────────────────────────────
  test('alt text results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('alt-text-results.png');
  });

  // ── Form labels ─────────────────────────────────────────────────────────
  test('form labels results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnFormLabels);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('form-labels-results.png');
  });

  // ── Accessible names ───────────────────────────────────────────────────
  test('accessible names results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAccNames);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('acc-names-results.png');
  });

  // ── ARIA validation ─────────────────────────────────────────────────────
  test('aria validation results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAriaValidation);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('aria-validation-results.png');
  });

  // ── Keyboard analysis ──────────────────────────────────────────────────
  test('keyboard analysis results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAutoKey);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('keyboard-results.png');
  });

  // ── Focus management ───────────────────────────────────────────────────
  test('focus management results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnFocusMgmt);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('focus-mgmt-results.png');
  });

  // ── Touch targets ──────────────────────────────────────────────────────
  // Touch Target button temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
  test.skip('touch targets results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnTouch);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('touch-targets-results.png');
  });

  // ── Live regions ───────────────────────────────────────────────────────
  test('live regions results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLiveRegions);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('live-regions-results.png');
  });

  // ── SR walkthrough ─────────────────────────────────────────────────────
  test('sr walkthrough snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('sr-walkthrough.png');
  });

  // ── Reading order ──────────────────────────────────────────────────────
  test('reading order results snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnReadingOrder);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('reading-order-results.png');
  });

  // ── Component flow (list view) ─────────────────────────────────────────
  test('component flow list snapshot', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnComponentFlow);
    await panelPage.waitForTimeout(500);
    const panel = panelPage.locator(SEL.panel);
    await expect(panel).toHaveScreenshot('component-flow-list.png');
  });
});
