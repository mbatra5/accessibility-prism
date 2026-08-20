import type { HeadingNode, HeadingIssue, HeadingAnalysisResult } from './types';
import { computeAccessibleName as w3cName } from 'dom-accessibility-api';

function isVisible(el: Element): boolean {
  const cs = window.getComputedStyle(el);
  // Only exclude elements completely removed from rendering.
  // Screen-reader-only headings (clip, clip-path, 0-size) are still semantically
  // important and must appear in the heading outline.
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  return true;
}

function isExtension(el: Element): boolean {
  return !!el.closest('#a11y-analyzer-panel') || !!el.closest('#a11y-analyzer-overlay');
}

/** Computes the real accessible name per the W3C accname spec — accounts for
 * aria-label, aria-labelledby, and img[alt] content, not just visible text. */
function computeAccessibleName(el: Element): string {
  try {
    return w3cName(el).trim();
  } catch {
    return (el.textContent || '').trim();
  }
}

export function analyzeHeadings(root?: Element | Document): HeadingAnalysisResult {
  const allHeadings = Array.from((root ?? document).querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(el => !isExtension(el) && isVisible(el));

  const headings: HeadingNode[] = allHeadings.map(el => ({
    element: el,
    level: parseInt(el.tagName[1], 10),
    text: el.textContent?.trim() || '',
    accessibleName: computeAccessibleName(el),
  }));

  const issues: HeadingIssue[] = [];

  const h1s = headings.filter(h => h.level === 1);
  if (h1s.length === 0) {
    issues.push({
      type: 'missing-h1',
      severity: 'error',
      description: 'Page does not have a level 1 heading (h1). Every page should have exactly one h1 that describes its main content.',
      element: null,
    });
  } else if (h1s.length > 1) {
    h1s.slice(1).forEach(h => {
      issues.push({
        type: 'multiple-h1',
        severity: 'warning',
        description: `Multiple h1 headings found. "${h.text.substring(0, 50)}" is an additional h1. Most pages should have only one.`,
        element: h.element,
      });
    });
  }

  headings.forEach(h => {
    if (!h.accessibleName) {
      issues.push({
        type: 'empty-heading',
        severity: 'warning',
        description: `Empty ${h.element.tagName.toLowerCase()} heading found. Headings should contain descriptive text for screen readers.`,
        element: h.element,
      });
    }
  });

  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    if (curr > prev + 1) {
      issues.push({
        type: 'skipped-level',
        severity: 'warning',
        description: `Heading level skips from h${prev} to h${curr}. "${headings[i].text.substring(0, 50) || '(empty)'}". Heading levels should only increase by one.`,
        element: headings[i].element,
      });
    }
  }

  return { headings, issues };
}
