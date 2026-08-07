import { test, expect, SEL, navigateToView, goBack, expandFirstCard, collapseFirstCard, getDisplay } from '../fixtures/panel.js';

/**
 * Regression tests for card expand/collapse.
 * The critical bug: stale event listeners from previous views caused
 * double-toggle, so cards appeared stuck. Fixed via AbortController cleanup.
 */
test.describe('Card Expand / Collapse', () => {

  test('alt text cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAltText);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No alt text issues on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');

    const collapsed = await collapseFirstCard(panelPage);
    expect(collapsed).toBe('none');
  });

  test('form labels cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnFormLabels);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No form label issues on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');
  });

  // Contrast section temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
  test.skip('contrast cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnContrast);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No contrast issues on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');
  });

  test('ARIA validation cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAriaValidation);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No ARIA issues on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');
  });

  test('accessible names cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAccNames);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No acc name issues on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');
  });

  test('landmark cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnLandmarks);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No landmarks on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');

    const collapsed = await collapseFirstCard(panelPage);
    expect(collapsed).toBe('none');
  });

  test('reading order cards expand and collapse', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnReadingOrder);
    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No reading order items on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');

    const collapsed = await collapseFirstCard(panelPage);
    expect(collapsed).toBe('none');
  });

  test('[regression] expand works after navigating through multiple views', async ({ panelPage }) => {
    // Visit alt-text, expand + collapse a card, go back
    await navigateToView(panelPage, SEL.btnAltText);
    const altCount = await panelPage.locator(SEL.issueCard).count();
    if (altCount > 0) {
      await expandFirstCard(panelPage);
      await collapseFirstCard(panelPage);
    }
    await goBack(panelPage);

    // Now visit form labels — the stale alt-text listener must NOT interfere
    await navigateToView(panelPage, SEL.btnFormLabels);
    const formCount = await panelPage.locator(SEL.issueCard).count();
    test.skip(formCount === 0, 'No form label issues on test page');

    const { before, after } = await expandFirstCard(panelPage);
    expect(before).toBe('none');
    expect(after).toBe('block');
  });

  test('[regression] expand works after visiting three views in sequence', async ({ panelPage }) => {
    // Landmarks → back → Alt text → back → Form labels
    await navigateToView(panelPage, SEL.btnLandmarks);
    await goBack(panelPage);
    await navigateToView(panelPage, SEL.btnAltText);
    await goBack(panelPage);
    await navigateToView(panelPage, SEL.btnFormLabels);

    const count = await panelPage.locator(SEL.issueCard).count();
    test.skip(count === 0, 'No form label issues');

    const { after } = await expandFirstCard(panelPage);
    expect(after).toBe('block');
  });
});
