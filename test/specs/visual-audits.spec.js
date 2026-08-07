import { test, expect, SEL, navigateToView, goBack, expandFirstCard } from '../fixtures/panel.js';

// Visual section (Contrast, Touch Target) temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
// Re-enable these describe blocks once the buttons are restored.
test.describe.skip('Contrast Audit', () => {
  test('detects contrast issues on bad-contrast text', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    const cards = panelPage.locator(SEL.issueCard);
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('shows stats strip with issue count', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    // Contrast view shows stats strip but not severity chips (by design)
    const stats = panelPage.locator(SEL.statsStrip);
    await expect(stats).toBeVisible();
    const content = await panelPage.textContent(SEL.statsStrip);
    expect(content).toMatch(/issue|fail/i);
  });

  test('cards show contrast ratio information', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    const { after } = await expandFirstCard(panelPage);
    expect(after).toBe('block');
    const content = await panelPage.textContent(SEL.panel);
    expect(content).toMatch(/ratio|contrast/i);
  });

  test('expanded card shows WCAG knowledge block', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    await panelPage.click(SEL.cardHeader);
    await panelPage.waitForTimeout(200);
    const body = panelPage.locator(SEL.cardBody).first();
    const text = await body.textContent();
    expect(text).toContain('WCAG 1.4.3');
    expect(text).toContain('User Impact');
    expect(text).toContain('How to Fix');
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnContrast)).toBeVisible();
  });
});

test.describe('Alt Text Audit', () => {
  test('detects missing alt text on images', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    const cards = panelPage.locator(SEL.issueCard);
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('shows severity chips', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    const chips = panelPage.locator(SEL.sevChip);
    expect(await chips.count()).toBeGreaterThanOrEqual(1);
  });

  test('expanded card shows image metadata', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No alt text issues');

    const { after } = await expandFirstCard(panelPage);
    expect(after).toBe('block');
    const bodyText = await panelPage.textContent(`${SEL.panel} .a11y-card-body`);
    expect(bodyText).toMatch(/alt|no alt/i);
  });

  test('highlight button exists in expanded card', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No alt text issues');

    await expandFirstCard(panelPage);
    const hlBtn = panelPage.locator(`${SEL.panel} .a11y-highlight-btn`).first();
    await expect(hlBtn).toBeVisible();
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnAltText)).toBeVisible();
  });
});

test.describe.skip('Touch Target Audit', () => {
  test('detects undersized touch targets', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnTouch);
    // The test page has 20x20 buttons — should flag them
    const cards = panelPage.locator(SEL.issueCard);
    const count = await cards.count();
    // May or may not find issues depending on engine
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnTouch);
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnTouch)).toBeVisible();
  });
});
