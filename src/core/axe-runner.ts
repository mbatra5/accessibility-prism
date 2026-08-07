import axe from 'axe-core';
import type { AxeViolation, AxeCheckResult, AxeResultType } from './types';
import { isPrismRule } from './custom-rules/index';
// NOTE: registerPrismRules import removed while Prism custom rules are temporarily disabled (see runAxe below).
// Restore `import { registerPrismRules, isPrismRule } from './custom-rules/index';` when re-enabling.

function mapChecks(checks: any[]): AxeCheckResult[] {
  if (!checks || !Array.isArray(checks)) return [];
  return checks.map((c: any) => ({
    id: c.id || '',
    message: c.message || '',
    impact: c.impact || '',
    data: c.data || null,
  }));
}

function isInsideExtension(el: Element | null): boolean {
  if (!el) return false;
  return !!el.closest('#a11y-analyzer-panel') || !!el.closest('#a11y-analyzer-overlay');
}

// NOTE: `best-practice` is just an axe-core categorization tag, not a severity downgrade.
// axe-core / axe DevTools report these as normal violations/needs-review — Prism used to
// segregate them into a separate 'best-practice' resultType bucket and (temporarily) stopped
// running them entirely. Both behaviors were inaccurate vs. axe-core's actual semantics, so
// isBestPractice()/mapResult() no longer reclassify these — they're treated exactly like any
// other axe-core rule to match axe DevTools accuracy.
function mapResultNodes(violation: any): AxeViolation['nodes'] {
  return violation.nodes
    .map((node: any) => {
      let element: Element | null = null;
      try {
        if (node.target && node.target.length > 0) {
          const selector = node.target[node.target.length - 1];
          element = document.querySelector(selector);
        }
      } catch (_e) {
        /* axe selectors can be complex */
      }

      if (isInsideExtension(element)) return null;

      return {
        target: node.target || [],
        html: node.html || '',
        element,
        failureSummary: node.failureSummary || '',
        any: mapChecks(node.any),
        all: mapChecks(node.all),
        none: mapChecks(node.none),
      };
    })
    .filter(Boolean);
}

function mapResult(item: any, resultType: AxeResultType): AxeViolation | null {
  const nodes = mapResultNodes(item);
  if (nodes.length === 0) return null;

  return {
    id: item.id,
    impact: item.impact,
    tags: item.tags || [],
    help: item.help,
    helpUrl: item.helpUrl || '',
    description: item.description,
    nodes,
    resultType,
  };
}

export async function runAxe(root?: Element): Promise<AxeViolation[]> {
  try {
    // TEMPORARILY DISABLED — Prism custom rules (registerPrismRules) produce the "experimental"
    // result-type bucket, which was flagged as inaccurate. Uncomment to re-enable.
    // registerPrismRules();

    const context: any = root
      ? { include: [root], exclude: ['#a11y-analyzer-panel', '#a11y-analyzer-overlay'] }
      : { exclude: ['#a11y-analyzer-panel', '#a11y-analyzer-overlay', '#a11y-panel-reset'] };

    const results = await axe.run(context, {
      resultTypes: ['violations', 'incomplete'],
      // No `runOnly` filter — this intentionally matches plain axe-core / axe DevTools behavior:
      // axe runs its own default-enabled rule set (wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice,
      // axe's own 'experimental' rules) and respects the ~8 rules axe-core disables by default
      // (target-size, color-contrast-enhanced, duplicate-id, duplicate-id-active,
      // aria-roledescription, audio-caption, identical-links-same-purpose, meta-refresh-no-exceptions).
      // Previously, an explicit tag-based runOnly (including wcag2aaa/wcag22aa) force-re-enabled
      // several of those intentionally-disabled rules — producing more noise than a standard axe
      // scan and confusing results. Dropping runOnly restores 1:1 parity with a plain axe.run().
      //
      // 'prism-custom' rules are still excluded — registerPrismRules() above remains commented out,
      // so Prism's own custom rules never register with axe-core regardless of this config.
    });

    const out: AxeViolation[] = [];

    for (const v of results.violations) {
      const mapped = mapResult(v, 'violation');
      if (mapped) {
        if (isPrismRule(mapped.id)) mapped.resultType = 'experimental';
        out.push(mapped);
      }
    }

    for (const inc of (results.incomplete || [])) {
      const mapped = mapResult(inc, 'needs-review');
      if (mapped) {
        if (isPrismRule(mapped.id)) mapped.resultType = 'experimental';
        out.push(mapped);
      }
    }

    return out;
  } catch (err) {
    console.error('axe-core error:', err);
    return [];
  }
}
