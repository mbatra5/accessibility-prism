import { test, expect, SEL, navigateToView } from '../fixtures/panel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const axePath = path.resolve(__dirname, '../../node_modules/axe-core/axe.min.js');

const DISABLED_RULES = {
  'color-contrast': { enabled: false },
  'avoid-inline-spacing': { enabled: false },
};

test.describe('Accessibility Prism — A11y-ception', () => {
  test.beforeEach(async ({ page }) => {
    await page.addScriptTag({ path: axePath });
    page.on('console', msg => {
       if (msg.type() === 'log') console.log(`BROWSER LOG: ${msg.text()}`);
    });
  });

  test('panel pre-screen container is accessible', async ({ panelPage }) => {
    const violations = await panelPage.evaluate(async ({ panelSel, rules }) => {
      const results = await window.axe.run(document.querySelector(panelSel), { rules });
      return results.violations;
    }, { panelSel: SEL.panel, rules: DISABLED_RULES });

    if (violations.length > 0) {
      console.log('A11y-ception Pre-screen Violations:', JSON.stringify(violations, null, 2));
    }
    expect(violations.length).toBe(0);
  });

  test('axe result list view is accessible', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnAxe);
    
    const violations = await panelPage.evaluate(async ({ panelSel, rules }) => {
      const results = await window.axe.run(document.querySelector(panelSel), { rules });
      return results.violations;
    }, { panelSel: SEL.panel, rules: DISABLED_RULES });

    if (violations.length > 0) {
      console.log('A11y-ception Axe List Violations:', JSON.stringify(violations, null, 2));
    }
    expect(violations.length).toBe(0);
  });

  // Scorecard button temporarily hidden from pre-screen UI (see src/ui/views/pre-screen.ts).
  test.skip('scorecard view is accessible', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnScorecard, { timeout: 30_000 });
    
    await panelPage.waitForSelector(`${SEL.panel} #scroll-area`, { timeout: 15_000 });
    await panelPage.waitForTimeout(2000);
    
    const violations = await panelPage.evaluate(async ({ panelSel, rules }) => {
      const results = await window.axe.run(document.querySelector(panelSel), { rules });
      return results.violations;
    }, { panelSel: SEL.panel, rules: DISABLED_RULES });

    if (violations.length > 0) {
      console.log('A11y-ception Scorecard Violations:', JSON.stringify(violations, null, 2));
    }
    expect(violations.length).toBe(0);
  });
});
