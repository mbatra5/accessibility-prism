import { test, expect, SEL, navigateToView, goBack } from '../fixtures/panel.js';

test.describe('Screen Reader Walkthrough', () => {
  test('renders walkthrough items', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    const items = panelPage.locator(`${SEL.panel} .wt-item`);
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('has prev/next navigation buttons', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await expect(panelPage.locator(`${SEL.panel} [data-toolbar-action="wt-next"]`)).toBeAttached();
  });

  test('next button changes the active item highlight', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    const nextBtn = panelPage.locator(`${SEL.panel} [data-toolbar-action="wt-next"]`);
    await expect(nextBtn).toBeVisible();

    // Get the current announcement text shown in the header area
    const announceBefore = await panelPage.evaluate((sel) => {
      const scrollArea = document.querySelector(`${sel} #scroll-area`);
      return scrollArea?.innerHTML || '';
    }, SEL.panel);

    await nextBtn.click();
    await panelPage.waitForTimeout(300);

    const announceAfter = await panelPage.evaluate((sel) => {
      const scrollArea = document.querySelector(`${sel} #scroll-area`);
      return scrollArea?.innerHTML || '';
    }, SEL.panel);

    expect(announceAfter).not.toBe(announceBefore);
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnSrWalkthrough)).toBeVisible();
  });

  /**
   * Helper: reads ALL walkthrough announcements set on the window by startWalkthrough().
   * The nearby-items panel only renders a 7-element window around the current position,
   * so querying .wt-item elements misses entries deeper in the list.
   * We use a stable string key (__a11y_sr_announcements) that survives Vite minification.
   */
  async function getAllWalkthroughAnnouncements(page) {
    return page.evaluate(() => window['__a11y_sr_announcements'] ?? []);
  }

  test('paragraph text is included in the walkthrough list', async ({ panelPage }) => {
    // The fixture page has <p>Description of product A</p> etc.
    // These must appear after the v2.1 DOM fix (analyzeForSrWalkthrough includes <p> tags).
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    // Wait for startWalkthrough to fire — the window key is set synchronously during the click
    // handler, so we poll until the key is populated (avoids race between event dispatch and evaluate).
    await panelPage.waitForFunction(() =>
      Array.isArray(window['__a11y_sr_announcements']) && window['__a11y_sr_announcements'].length > 0,
      { timeout: 5000 }
    );
    const announcements = await getAllWalkthroughAnnouncements(panelPage);
    expect(announcements.length).toBeGreaterThan(0);
    const hasParagraph = announcements.some(a => /description of product/i.test(a));
    expect(hasParagraph).toBe(true);
  });

  test('paragraph announcement contains only text with no spurious role suffix', async ({ panelPage }) => {
    // <p> has no meaningful ARIA role — the announcement must not append
    // "paragraph", "generic", or a similar role label.
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await panelPage.waitForFunction(() =>
      Array.isArray(window['__a11y_sr_announcements']) && window['__a11y_sr_announcements'].length > 0,
      { timeout: 5000 }
    );
    const announcements = await getAllWalkthroughAnnouncements(panelPage);
    const paragraphAnnouncements = announcements.filter(a => /description of product/i.test(a));
    expect(paragraphAnnouncements.length).toBeGreaterThan(0);
    for (const text of paragraphAnnouncements) {
      expect(text).not.toMatch(/\b(paragraph|generic|staticText)\b/i);
    }
  });

  test('aria-hidden subtrees are pruned from the walkthrough', async ({ panelPage }) => {
    // Real screen readers (JAWS, NVDA, VoiceOver, ChromeVox) skip aria-hidden subtrees
    // because the browser excludes them from the accessibility tree. The walkthrough
    // must do the same. The fixture page contains:
    //   <button aria-hidden="true">Hidden focusable</button>
    //   <div aria-hidden="true"><button>SR walkthrough should skip me...</button></div>
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await panelPage.waitForFunction(() =>
      Array.isArray(window['__a11y_sr_announcements']) && window['__a11y_sr_announcements'].length > 0,
      { timeout: 5000 }
    );
    const announcements = await getAllWalkthroughAnnouncements(panelPage);
    const ariaHiddenLeaks = announcements.filter(a =>
      /hidden focusable/i.test(a) ||
      /skip me \(inside aria-hidden ancestor\)/i.test(a) ||
      /skip this paragraph too/i.test(a)
    );
    expect(ariaHiddenLeaks).toEqual([]);
  });

  test('CSS-hidden subtrees are pruned from the walkthrough', async ({ panelPage }) => {
    // display:none ancestors must be pruned (matches accessibility tree behaviour).
    // The fixture page contains:
    //   <div style="display: none;"><button>SR walkthrough should skip me (inside display:none ancestor)</button></div>
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await panelPage.waitForFunction(() =>
      Array.isArray(window['__a11y_sr_announcements']) && window['__a11y_sr_announcements'].length > 0,
      { timeout: 5000 }
    );
    const announcements = await getAllWalkthroughAnnouncements(panelPage);
    const displayNoneLeaks = announcements.filter(a => /skip me \(inside display:none ancestor\)/i.test(a));
    expect(displayNoneLeaks).toEqual([]);
  });

  test('paragraph immediately follows its parent heading in walkthrough order', async ({ panelPage }) => {
    // The fixture page has <h4>Product A</h4><p>Description of product A</p> in sequence.
    // The walkthrough must preserve DOM order so assistive technology consumers
    // see content in the same order as sighted users.
    await navigateToView(panelPage, SEL.btnSrWalkthrough);
    await panelPage.waitForFunction(() =>
      Array.isArray(window['__a11y_sr_announcements']) && window['__a11y_sr_announcements'].length > 0,
      { timeout: 5000 }
    );
    const announcements = await getAllWalkthroughAnnouncements(panelPage);
    const headingIdx = announcements.findIndex(a => /product a/i.test(a) && /heading/i.test(a));
    const paragraphIdx = announcements.findIndex(a => /description of product a/i.test(a));
    expect(headingIdx).toBeGreaterThanOrEqual(0);
    expect(paragraphIdx).toBeGreaterThan(headingIdx);
    // Allow at most one intermediate item (e.g. a nested button) between heading and paragraph.
    expect(paragraphIdx - headingIdx).toBeLessThanOrEqual(2);
  });
});

test.describe('Live Regions', () => {
  test('renders live region results with breakdown bar', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLiveRegions);
    const content = await panelPage.textContent(SEL.panel);
    expect(content).toMatch(/region/i);
    expect(content).toMatch(/assertive|polite|empty|healthy/i);
  });

  test('groups issues into collapsible accordions', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLiveRegions);
    const accHeaders = panelPage.locator(`${SEL.panel} .lr-acc-header`);
    const count = await accHeaders.count();
    expect(count).toBeGreaterThan(0);
  });

  test('accordion expand/collapse works', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLiveRegions);
    const accHeaders = panelPage.locator(`${SEL.panel} .lr-acc-header`);
    const count = await accHeaders.count();
    test.skip(count === 0, 'No live region sections');

    // Find a collapsed accordion
    const bodies = panelPage.locator(`${SEL.panel} .lr-acc-body`);
    let collapsedIdx = -1;
    for (let i = 0; i < count; i++) {
      const display = await bodies.nth(i).evaluate(el => el.style.display);
      if (display === 'none') { collapsedIdx = i; break; }
    }
    test.skip(collapsedIdx === -1, 'No collapsed accordions to test');

    await accHeaders.nth(collapsedIdx).click();
    await panelPage.waitForTimeout(200);
    const afterDisplay = await bodies.nth(collapsedIdx).evaluate(el => el.style.display);
    expect(afterDisplay).toBe('block');
  });

  test('severity filter chips are present', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLiveRegions);
    // Chips rendered by renderResultsPage — use button[data-sev] as reliable selector
    const chips = panelPage.locator(`${SEL.panel} button[data-sev]`);
    expect(await chips.count()).toBeGreaterThanOrEqual(1);
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLiveRegions);
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnLiveRegions)).toBeVisible();
  });
});

test.describe.skip('Scorecard', () => {
  // Scorecard button is temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
  // Underlying scorecard code/view is untouched — re-enable these tests once the button is restored.
  test('renders scorecard with category cards', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnScorecard, { timeout: 30_000 });
    const catCards = panelPage.locator(`${SEL.panel} .cat-card`);
    await expect(catCards.first()).toBeVisible({ timeout: 25_000 });
    expect(await catCards.count()).toBeGreaterThan(0);
  });

  test('shows category breakdown with SVG grade rings', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnScorecard, { timeout: 30_000 });
    await panelPage.waitForSelector(`${SEL.panel} .cat-card`, { timeout: 25_000 });
    const svgs = panelPage.locator(`${SEL.panel} .cat-card svg`);
    expect(await svgs.count()).toBeGreaterThan(0);
    const content = await panelPage.textContent(SEL.panel);
    expect(content).toMatch(/heading|contrast|image|keyboard|form|landmark/i);
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnScorecard, { timeout: 30_000 });
    await panelPage.waitForSelector(`${SEL.panel} .cat-card`, { timeout: 25_000 });
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnScorecard)).toBeVisible();
  });
});
