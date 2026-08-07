import { test, expect, SEL } from '../fixtures/panel.js';

test.describe('Panel Lifecycle', () => {
  test('activation button appears on page load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SEL.activate)).toBeVisible();
  });

  test('clicking activation opens the panel', async ({ page }) => {
    await page.goto('/');
    await page.click(SEL.activate);
    await expect(page.locator(SEL.panel)).toBeVisible();
  });

  test('panel shows pre-screen with all audit buttons', async ({ panelPage }) => {
    const buttons = [
      SEL.btnAxe, SEL.btnHeadings, SEL.btnLandmarks,
      SEL.btnAltText, SEL.btnFormLabels,
      SEL.btnAccNames, SEL.btnAriaValidation,
      SEL.btnAutoKey, SEL.btnFocusMgmt, SEL.btnLiveRegions,
      SEL.btnReadingOrder, SEL.btnSrWalkthrough,
      // SEL.btnContrast, SEL.btnTouch, // Visual section temporarily hidden from pre-screen UI (see pre-screen.ts)
      // SEL.btnScorecard, // Scorecard button temporarily hidden from pre-screen UI (see pre-screen.ts)
    ];
    for (const btn of buttons) {
      await expect(panelPage.locator(btn)).toBeAttached();
    }
  });

  test('panel header collapse/expand works', async ({ panelPage }) => {
    // Pre-screen has no #scroll-area; look for the content area below the header
    const panelEl = panelPage.locator(SEL.panel);
    const header = panelPage.locator(`${SEL.panel} #panel-header`);
    await expect(header).toBeVisible();

    // Get initial height of panel content (the children after #panel-header)
    const heightBefore = await panelPage.evaluate((sel) => {
      const panel = document.querySelector(sel);
      return panel ? panel.getBoundingClientRect().height : 0;
    }, SEL.panel);

    // Click header to collapse
    await header.click();
    await panelPage.waitForTimeout(300);
    const heightAfter = await panelPage.evaluate((sel) => {
      const panel = document.querySelector(sel);
      return panel ? panel.getBoundingClientRect().height : 0;
    }, SEL.panel);
    expect(heightAfter).toBeLessThan(heightBefore);

    // Click again to expand
    await header.click();
    await panelPage.waitForTimeout(300);
    const heightRestored = await panelPage.evaluate((sel) => {
      const panel = document.querySelector(sel);
      return panel ? panel.getBoundingClientRect().height : 0;
    }, SEL.panel);
    expect(heightRestored).toBeGreaterThan(heightAfter);
  });

  test('footer displays version and attribution', async ({ panelPage }) => {
    const footer = await panelPage.textContent(SEL.panel);
    expect(footer).toContain('v3.0.1');
    expect(footer).toContain('Alisha');
  });
});
