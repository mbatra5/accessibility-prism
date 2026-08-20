import { test, expect, SEL, navigateToView, goBack } from '../fixtures/panel.js';

test.describe('Axe Full Page Scan', () => {
  test('produces rule cards with violations', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    const cards = panelPage.locator(SEL.ruleCard);
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('displays result type filter chips', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    const chips = panelPage.locator(SEL.resultTypeChip);
    expect(await chips.count()).toBeGreaterThanOrEqual(1);
  });

  test('displays impact severity filter chips', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    const impactChips = panelPage.locator(`${SEL.panel} .impact-filter-chip`);
    expect(await impactChips.count()).toBeGreaterThanOrEqual(1);
  });

  test('clicking a rule card navigates to issue details', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    await panelPage.click(SEL.ruleCard);
    await expect(panelPage.locator(SEL.backBtn)).toBeVisible();
    // Rule cards should not be present in detail view
    await expect(panelPage.locator(SEL.ruleCard)).toHaveCount(0);
  });

  test('issue details show occurrences with expandable bodies', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    await panelPage.click(SEL.ruleCard);
    await panelPage.waitForSelector(`${SEL.panel} .occ-header`, { timeout: 5000 });

    const occHeader = panelPage.locator(`${SEL.panel} .occ-header`).first();
    const occBody = panelPage.locator(`${SEL.panel} .occ-body`).first();

    // Body starts hidden
    await expect(occBody).toHaveCSS('display', 'none');

    // Click to expand
    await occHeader.click();
    await panelPage.waitForTimeout(200);
    await expect(occBody).not.toHaveCSS('display', 'none');
  });

  test('back button returns to rule card list', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    await panelPage.click(SEL.ruleCard);
    await panelPage.waitForSelector(SEL.backBtn, { timeout: 5000 });
    await panelPage.click(SEL.backBtn);
    await expect(panelPage.locator(SEL.ruleCard).first()).toBeVisible();
  });

  test('double back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    await panelPage.click(SEL.ruleCard);
    await panelPage.waitForSelector(SEL.backBtn, { timeout: 5000 });
    await panelPage.click(SEL.backBtn);
    await panelPage.waitForSelector(SEL.ruleCard, { timeout: 5000 });
    await panelPage.click(SEL.backBtn);
    await expect(panelPage.locator(SEL.btnAxe)).toBeVisible();
  });

  test('search filter narrows visible rule cards', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    const before = await panelPage.locator(SEL.ruleCard).count();
    const searchInput = panelPage.locator(`${SEL.panel} #filter-search`);
    await searchInput.fill('color');
    await panelPage.waitForTimeout(400);
    const after = await panelPage.locator(SEL.ruleCard).count();
    expect(after).toBeLessThanOrEqual(before);
  });

  test.describe('Partial Scoped Scan', () => {
    test('hides panel, selects element, and runs scan', async ({ panelPage }) => {
      // Don't use navigateToView because panel hides immediately
      await panelPage.click(SEL.btnPartialScan);
      
      // Panel should be hidden during picking
      await expect(panelPage.locator(SEL.panel)).not.toBeVisible();
      
      // Use a specific card known to have violations (contrast, etc.)
      const targetCard = panelPage.locator('.card').first();
      await targetCard.hover();
      await targetCard.click();
      
      // Panel should re-appear after selection (initial show)
      await expect(panelPage.locator(SEL.panel)).toBeVisible({ timeout: 15000 });
      
      // The "Scoped" banner only appears once the scan completes and 
      // the view switches from pre-screen to axe-issue-list
      const banner = panelPage.locator(`${SEL.panel} #btn-clear-scope`);
      await expect(banner).toBeVisible({ timeout: 25000 });
      
      // "Needs Review" is no longer active by default (see panel.ts activeResultTypes) —
      // re-enable it here since the scoped element's only findings may be needs-review.
      const reviewChip = panelPage.locator(`${SEL.panel} .result-type-chip[data-type="needs-review"]`);
      if (await reviewChip.count()) await reviewChip.click();

      // Should show results (rule cards in default "By Rule" mode, or issue cards)
      const ruleCards = panelPage.locator(SEL.ruleCard);
      const issueCards = panelPage.locator(SEL.issueCard);
      await panelPage.waitForFunction(
        (sel) => {
          const p = document.querySelector(sel);
          return p && (p.querySelector('.rule-card') || p.querySelector('.a11y-issue-card'));
        },
        SEL.panel,
        { timeout: 15000 }
      );
      
      // Clear scope removes the banner but stays on results
      await panelPage.click('#btn-clear-scope');
      await expect(panelPage.locator('#btn-clear-scope')).not.toBeVisible();
      // Scope input should now be visible (unscoped state on result view)
      await expect(panelPage.locator('#scope-selector-input')).toBeVisible();
    });
  });
});
