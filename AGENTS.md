# Accessibility Prism — Agent Handoff Documentation

**Version:** 3.0.1  
**Type:** Chrome Extension (detached popup window)  
**Stack:** TypeScript, Vite, axe-core, Playwright

---

## What This Is

A Chrome extension that runs accessibility audits in a **detached popup window** (completely isolated from the host page). Click the extension icon in the browser toolbar → a separate popup window opens. The UI has no interaction with the host page's DOM or CSS, eliminating layout conflicts and enabling testing at any viewport size.

Audits covered: axe-core violations, heading structure, landmarks, contrast, alt text, form labels, ARIA validation, keyboard analysis, focus management, touch targets, live regions, screen reader walkthrough, reading order, and an aggregated scorecard. Includes 10 custom "Prism" rules that extend axe-core.

---

## Architecture (v3.0 — Popup Window)

```
Browser toolbar icon click
        │
        ▼
public/background.js (service worker)
        │
        ├─ chrome.scripting.executeScript(content.js) → injects into active tab
        │
        └─ chrome.windows.create({ url: panel.html, type: 'popup' })
                │
                ▼
        public/panel.html → dist/panel.js (popup window)
                │
                ▼
         FloatingPanel (panel.ts) ◄──────────────────────────────────┐
                │                                                      │
         PanelCallbacks                                                │
          dispatch commands ──► chrome.runtime.connect (PORT_NAME)    │
                                        │                             │
                                        ▼                             │
                               dist/content.js (content script)       │
                               A11yContent class                       │
                                        │                             │
                          ┌────────────┴─────────────────┐            │
                          ▼                               ▼            │
                  core/*-analysis.ts              overlay.ts           │
                  (run audits)                    (draw highlights)    │
                          │                                            │
                   ResultMessage  ───────────────────────────────────►│
                   (serialized)    port.postMessage
```

### Two Execution Contexts

| Context | File | DOM access | Chrome APIs |
|---------|------|-----------|-------------|
| **Content script** | `src/content.ts` → `dist/content.js` | Yes (host page) | `chrome.runtime.onConnect` |
| **Popup window** | `src/panel-ui.ts` → `dist/panel.js` | Popup only | `chrome.runtime.connect` |
| **Service worker** | `public/background.js` | None | `chrome.action`, `chrome.scripting`, `chrome.windows` |

### Element Serialization Pattern

DOM `Element` references **cannot cross context boundaries**. The content script serializes every element reference before sending:

```typescript
// In src/utils/dom-utils.ts
type SerializedElement = { selector: string; snippet: string };

serializeElement(el: Element): SerializedElement  // content script → popup
serializeResult<T>(result: T): T                   // deep-clone, replacing Elements

// Both getCssSelector() and getSnippet() accept Element | SerializedElement
getCssSelector(el: Element | SerializedElement): string
getSnippet(el: Element | SerializedElement, max?: number): string
```

### Message Protocol

All cross-context communication goes through `src/messages.ts`:

```typescript
// Popup → Content Script (commands)
type CommandMessage =
  | { type: 'PANEL_READY' }
  | { type: 'RUN_AXE' }
  | { type: 'RUN_AUTO_KEYBOARD' }
  | { type: 'START_MANUAL' }
  | { type: 'STOP_MANUAL' }
  | { type: 'HIGHLIGHT'; auditType: AuditType; index: number }
  | { type: 'HIGHLIGHT_BY_SELECTOR'; selector: string; color?: string; label?: string }
  | { type: 'SET_SCOPE_SELECTOR'; selector: string }
  // ... more commands

// Content Script → Popup (results)
type ResultMessage =
  | { type: 'LOADING'; label: string }
  | { type: 'AXE_RESULTS'; violations: any; components: any; dedupedIssues: any; regions: any }
  | { type: 'KEYBOARD_RESULTS'; issues: any; flows: any }
  | { type: 'TRAIL_UPDATE'; trail: SerializedTrailEntry[] }
  | { type: 'TRAIL_COMPLETE'; trail: SerializedTrailEntry[] }
  | { type: 'SCOPE_SET'; label?: string }
  // ... more results

export const PORT_NAME = 'prism-panel';
```

### Rendering Cycle

1. User clicks an audit button on `pre-screen` (in popup window)
2. `panel-ui.ts` sends a `CommandMessage` to content script via port
3. Content script runs `core/*-analysis.ts` and serializes results
4. Content script sends `ResultMessage` back via port
5. `panel-ui.ts` calls `panel.update*()` → `panel.ts` sets `currentView` + calls `render()`
6. `render()` calls the view's `render*()` → returns HTML string → set `container.innerHTML`
7. `panel.ts` calls the view's `attach*Listeners()` → wires event delegation

### Event Listener Pattern

All views using the shared `results-template.ts` go through `attachResultsPageListeners()` which uses an **AbortController** to auto-remove stale listeners from previous views. Views adding extra container-level listeners must use the returned `AbortSignal`:

```typescript
const signal = attachResultsPageListeners(container, actions, chipState);
container.addEventListener('click', handler, { signal });
```

---

## Directory Structure

```
src/
├── content.ts                       Content script entry — A11yContent class, runs in host page
├── panel-ui.ts                      Popup window entry — mounts FloatingPanel, message dispatch
├── messages.ts                      Typed CommandMessage / ResultMessage protocol
├── main.ts                          Standalone entry — used by index.html for Playwright tests (StandaloneA11yUI)
├── core/
│   ├── types.ts                     Shared TypeScript types
│   ├── axe-runner.ts                Runs axe-core + registers Prism rules
│   ├── heading-analysis.ts          Heading tree + issues
│   ├── landmark-analysis.ts         Landmark map + issues
│   ├── contrast-analysis.ts         Color contrast checks
│   ├── alt-text-analysis.ts         Image alt attribute audit
│   ├── form-labels-analysis.ts      Form control label coverage
│   ├── acc-name-analysis.ts         Accessible name computation
│   ├── aria-validation.ts           ARIA misuse detection
│   ├── keyboard-analysis.ts         Auto keyboard trap/reachability
│   ├── focus-management.ts          Dialog/modal focus patterns
│   ├── touch-target-analysis.ts     WCAG 2.5.8 target size
│   ├── live-region-monitor.ts       aria-live + role=alert
│   ├── component-detection.ts       Similar component clustering
│   ├── region-detection.ts          Page region boundaries
│   ├── deduplication.ts             Issue dedup across audits
│   ├── scorecard.ts                 Aggregated scoring engine
│   └── custom-rules/
│       ├── index.ts                 Registry: PRISM_RULE_IDS, registerPrismRules()
│       ├── text-spacing.ts          prism-text-spacing
│       ├── target-spacing.ts        prism-target-spacing
│       ├── focus-obscured.ts        prism-focus-obscured
│       ├── link-distinguishable.ts  prism-link-distinguishable
│       ├── scrollable-keyboard.ts   prism-scrollable-keyboard
│       ├── focus-indicator.ts       prism-focus-indicator
│       ├── presentational-children  prism-presentational-children
│       ├── text-clipping.ts         prism-text-clipping
│       ├── aria-role-nesting.ts     prism-aria-nesting
│       └── contrast-layered.ts      prism-contrast-layered
├── ui/
│   ├── panel.ts                     FloatingPanel class — state, routing, render cycle
│   ├── panel-styles.ts              Global CSS (injected as <style>)
│   ├── tokens.ts                    Design tokens: SEV, PRIO, IMPACT, colors
│   ├── icons.ts                     SVG icon constants
│   ├── overlay.ts                   Highlight overlay for elements
│   ├── activation-button.ts         Floating activation button
│   ├── element-picker.ts            Click-to-select element scope
│   └── views/
│       ├── results-template.ts      SHARED: renderResultsPage, renderIssueCard, attachResultsPageListeners
│       ├── pre-screen.ts            Home menu with all audit buttons
│       ├── axe-issue-list.ts        Axe results with filters/chips/grouping
│       ├── axe-issue-details.ts     Single violation + occurrences
│       ├── heading-results.ts       Heading tree + issue cards
│       ├── landmark-results.ts      Landmark map
│       ├── contrast-results.ts      Contrast ratio cards
│       ├── alt-text-results.ts      Image alt audit cards
│       ├── form-labels-results.ts   Form label coverage + issues
│       ├── acc-name-results.ts      Accessible name list (searchable)
│       ├── aria-validation-results  ARIA misuse cards
│       ├── keyboard-results.ts      Keyboard issue cards
│       ├── focus-mgmt-results.ts    Focus management cards
│       ├── touch-target-results.ts  Touch target cards
│       ├── live-region-results.ts   Live region cards
│       ├── sr-walkthrough.ts        Step-through SR announcements
│       ├── reading-order-results.ts Numbered reading order
│       ├── scorecard-results.ts     Grade ring + category breakdown
│       ├── manual-tracking.ts       Manual tab trail
│       ├── component-flow-list.ts   Component instance picker
│       └── component-flow-detail.ts Single component tab order
└── utils/
    ├── dom-utils.ts                 getCssSelector, getSnippet, serializeElement, serializeResult
    ├── escape.ts                    HTML escaping
    ├── wcag-map.ts                  Rule → WCAG criterion mapping
    ├── html-report.ts               Downloadable HTML report
    ├── scorecard-report.ts          Scorecard HTML export
    ├── issue-knowledge.ts           Centralized WCAG/fix/impact knowledge per issue type
    └── fix-suggestions.ts           Element-specific code fix generators

public/
├── background.js                    Service worker — launches popup window on icon click
├── panel.html                       Popup window HTML (inline base CSS, loads panel.js)
└── manifest.json                    Extension manifest v3
```

---

## Key Types

```typescript
type ViewName =
  | 'pre-screen' | 'axe-issue-list' | 'axe-issue-details'
  | 'keyboard-issues' | 'manual-tracking'
  | 'component-flow-list' | 'component-flow-detail'
  | 'heading-results' | 'landmark-results' | 'contrast-results'
  | 'focus-mgmt-results' | 'live-region-results' | 'touch-target-results'
  | 'alt-text-results' | 'acc-name-results' | 'aria-validation-results'
  | 'form-labels-results' | 'sr-walkthrough' | 'reading-order' | 'scorecard';

type AxeResultType = 'violation' | 'needs-review' | 'best-practice' | 'experimental';
```

---

## Design System

All colors are in `src/ui/tokens.ts`. Key palettes:

| Token | Purpose | Example |
|-------|---------|---------|
| `SEV` | Severity (error/warning/info/pass) | `SEV.error.badge → '#DC2626'` |
| `PRIO` | Priority (P1-P4) | `PRIO[1].label → 'P1 Critical'` |
| `IMPACT` | Axe impact (critical/serious/moderate/minor) | `IMPACT.critical.bg` |
| `HEADER_BG` | Panel header | `'#2563EB'` |

Shared UI components live in `results-template.ts`:
- `renderResultsPage()` — page layout with stats strip, severity chips, search, group tabs
- `renderIssueCard()` — expandable card with badge, title, description, code blocks, highlight button
- `renderSeverityBadge()` — colored severity label
- `attachResultsPageListeners()` — event delegation for all interactive elements (uses AbortController)

**All views now use the shared template (Phase 2 complete).** Views that needed custom interactions
(component-flow prev/next, sr-walkthrough nav) use `toolbarHtml` + `onToolbarAction` callbacks.

**Phase 3 improvements:**
- `component-flow-detail.ts` — merged separate "Tab Flow" and "Issues" sections into a single unified list. Each tab stop card now shows matching issues inline via `renderInlineIssue()` in `extraBodyHtml`, eliminating redundancy.
- `keyboard-results.ts` — replaced flat `sectionWrap` divs with collapsible accordion groups (`renderSectionAccordion`) for all three group modes (By Type, By Region, By Component). Accordion toggle uses delegated click listener with `AbortSignal` for cleanup.
- `live-region-results.ts` — redesigned with breakdown bar (assertive/polite/empty/healthy counts), severity filter chips, issues grouped by type in collapsible accordions (`lr-acc-header`/`lr-acc-body`), healthy regions collapsed by default. Uses `LrViewData` wrapper with `severityFilter` state managed in `panel.ts`.
- `acc-name-results.ts` — entries grouped by status (Error/Warning/Pass) in collapsible section accordions (`an-acc-header`/`an-acc-body`). "Pass" chip defaults to OFF so users focus on issues first. Section borders color-coded by severity.
- `axe-issue-list.ts` — fixed filter bug where result type, search, and WCAG filters were ignored in "By Region" and "By Component" group modes. Added `filterRegionViolations()` and extended `getSortedFilteredComponentGroups()` to apply all active filters.

**Issue Knowledge System (Phase 3):**
- `utils/issue-knowledge.ts` centralizes WCAG criterion, user impact statements, fix suggestions, and "learn more" links for all non-axe audit issue types.
- Knowledge bases: `KB_KNOWLEDGE` (keyboard), `FORM_LABEL_KNOWLEDGE` (form labels), `ARIA_KNOWLEDGE` (ARIA validation), `CONTRAST_KNOWLEDGE` (color contrast).
- `renderKnowledgeBlock(k)` generates a consistent HTML block shown in expanded issue cards across all views.
- Integrated in: `keyboard-results.ts`, `form-labels-results.ts`, `aria-validation-results.ts`, `contrast-results.ts`.

---

## How To: Common Tasks

### Add a New View

1. Create `src/ui/views/my-view-results.ts` with `renderMyView()` and `attachMyViewListeners()`
2. Add `'my-view-results'` to the `ViewName` union in `panel.ts`
3. Add state properties to `FloatingPanel` class
4. Add `case 'my-view-results':` in both `renderCurrentView()` and `attachListeners()`
5. Add a button in `pre-screen.ts` with `id="btn-my-view"`
6. Add the click handler in `attachPreScreenListeners()`

### Add a New Custom Rule

1. Create `src/core/custom-rules/my-rule.ts` exporting `myRule` (RuleObject) and `myCheck` (Check)
2. Import in `src/core/custom-rules/index.ts`
3. Add rule ID to `PRISM_RULE_IDS` set
4. Add to the `axe.configure({ rules: [...], checks: [...] })` call in `registerPrismRules()`

### Update the Design System

- Colors/tokens → `src/ui/tokens.ts`
- CSS classes → `src/ui/panel-styles.ts`
- Shared card/page layout → `src/ui/views/results-template.ts`
- Per-view customization → the individual view file

---

## Build & Test

```bash
npm run build          # tsc + build:content + build:panel → dist/content.js + dist/panel.js
npm run build:content  # Build content script only
npm run build:panel    # Build popup UI only
npm run dev:watch      # Watch mode — rebuilds both on save
npm test               # Playwright: 144 tests, 12 spec files
npm run test:headed    # Playwright with visible browser
npm run test:ui        # Playwright interactive UI
npm run test:report    # Open HTML test report
```

### Loading the Extension

1. `npm run build`
2. Open `chrome://extensions` → Enable Developer mode → Load unpacked → select the `dist/` folder (contains `manifest.json` after build, copied there from `public/`)
3. Click the Prism icon in the browser toolbar → popup window opens

### Local Testing (Standalone / Playwright fixture mode)

1. `npm run build` (or `npm run dev:watch`)
2. Open `index.html` via a local server (the test server at port 9333 works)
3. `index.html` sets `window.__A11Y_STANDALONE__ = true` and loads `dist/panel.js`
4. `panel.js` detects standalone mode → creates `StandaloneA11yUI` → renders activation button
5. Click the floating activation button → panel opens as an injected overlay (no chrome.runtime)

---

## Test Suite

**Framework:** `@playwright/test` with custom fixtures  
**Config:** `playwright.config.js` (auto-starts server on port 9333)

### Structure

```
test/
├── fixtures/
│   ├── server.js       Static server (auto-builds if dist/ missing, no-cache headers)
│   └── panel.js        panelPage fixture, SEL constants, helpers
└── specs/
    ├── panel-lifecycle.spec.js    Activate, collapse/expand, footer, buttons
    ├── axe-scan.spec.js           Full scan, chips, filters, details, back nav, search
    ├── axe-group-filters.spec.js  Group mode switching (By Rule/Region/Component) + filter combos
    ├── card-expand.spec.js        Per-view + multi-view regression (AbortController fix)
    ├── structure-audits.spec.js   Headings, landmarks, reading order
    ├── visual-audits.spec.js      Contrast, alt text, touch targets + knowledge blocks
    ├── form-aria-audits.spec.js   Form labels, ARIA validation, acc names + knowledge blocks
    ├── keyboard-audits.spec.js    Auto keyboard, focus management + knowledge blocks
    ├── advanced-features.spec.js  SR walkthrough, live regions, scorecard
    ├── scroll-navigation.spec.js  Scroll restore, back nav, severity chips, rapid nav
    ├── component-flow.spec.js     Component flow list/detail, navigation, instance counts
    └── remaining-coverage.spec.js Keyboard group tabs, chip toggles, highlight buttons
```

### Source → Spec Mapping

| Source File(s) | Spec File |
|----------------|-----------|
| `panel.ts`, `pre-screen.ts` | `panel-lifecycle.spec.js` |
| `axe-runner.ts`, `axe-issue-list.ts`, `axe-issue-details.ts` | `axe-scan.spec.js` |
| `axe-issue-list.ts` (group modes, filter combos) | `axe-group-filters.spec.js` |
| `results-template.ts` (AbortController) | `card-expand.spec.js` |
| `heading-results.ts`, `landmark-results.ts`, `reading-order-results.ts` | `structure-audits.spec.js` |
| `contrast-results.ts`, `alt-text-results.ts`, `touch-target-results.ts` | `visual-audits.spec.js` |
| `form-labels-results.ts`, `aria-validation-results.ts`, `acc-name-results.ts` | `form-aria-audits.spec.js` |
| `keyboard-results.ts`, `focus-mgmt-results.ts` | `keyboard-audits.spec.js` |
| `sr-walkthrough.ts`, `live-region-results.ts`, `scorecard-results.ts` | `advanced-features.spec.js` |
| `panel.ts` (scroll/nav), `results-template.ts` (chips) | `scroll-navigation.spec.js` |
| `component-flow-list.ts`, `component-flow-detail.ts` | `component-flow.spec.js` |
| Keyboard group tabs, chip toggles across views, highlight btns | `remaining-coverage.spec.js` |

### Test Fixtures API

Import from `test/fixtures/panel.js`:

| Export | Purpose |
|--------|---------|
| `test` | Playwright test with `panelPage` fixture (page + panel open) |
| `expect` | Playwright expect |
| `SEL` | All stable selectors (30+ keys) |
| `navigateToView(page, btnSelector)` | Click audit button, wait for results |
| `goBack(page)` | Click back, wait for pre-screen |
| `expandFirstCard(page)` | Click header, return before/after display |
| `collapseFirstCard(page)` | Click header again, return display |
| `getDisplay(page, selector)` | Get computed display value |
| `countInPanel(page, selector)` | Count elements in panel |

### Writing a New Test

```javascript
import { test, expect, SEL, navigateToView, goBack, expandFirstCard } from '../fixtures/panel.js';

test.describe('My Audit', () => {
  test('detects issues', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnMyAudit);
    const cards = panelPage.locator(SEL.issueCard);
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('cards expand', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnMyAudit);
    const { after } = await expandFirstCard(panelPage);
    expect(after).toBe('block');
  });

  test('back returns to pre-screen', async ({ panelPage }) => {
    await navigateToView(panelPage, SEL.btnMyAudit);
    await goBack(panelPage);
    await expect(panelPage.locator(SEL.btnMyAudit)).toBeVisible();
  });
});
```

---

## Known Patterns & Gotchas

1. **Popup window mode vs standalone mode** — `panel-ui.ts` checks `window.__A11Y_STANDALONE__`. In standalone mode (test fixture / `index.html`) it creates `StandaloneA11yUI` which runs analysis directly in the same page. In popup mode (extension) it creates `PopupWindowUI` which communicates with the content script via `chrome.runtime.connect`.
2. **All inline styles use `!important`** in standalone mode — the panel is injected into arbitrary pages, so styles must override host page CSS. In popup mode (`panel.html`), `!important` is not needed since the popup has its own isolated DOM.
3. **AbortController for listeners** — `attachResultsPageListeners` returns an `AbortSignal`. Any extra container-level `addEventListener` must pass `{ signal }` to prevent accumulation across view navigations.
4. **Custom rules are experimental** — Prism rules are classified as `resultType: 'experimental'` (not violations). They appear under a separate chip in the axe results list.
5. **Scroll position restore** uses double `requestAnimationFrame` in `panel.ts` to wait for DOM layout before setting `scrollTop`.
6. **`index.html` is a deliberate "bad a11y" fixture page** — it has missing alt text, bad contrast, unlabeled forms, ARIA misuse, small touch targets, etc. for comprehensive test coverage.
7. **All views unified (Phase 2)** — every view now uses `renderResultsPage` + `renderIssueCard` + `attachResultsPageListeners`. Views with custom navigation (component-flow prev/next, sr-walkthrough) use `toolbarHtml` + `onToolbarAction`. No more hand-built HTML or per-element listeners in any view file.
8. **Only `axe-issue-list.ts` and `axe-issue-details.ts` remain specialized** — they have unique rule-card grouping and occurrence-level detail that doesn't fit the generic template.
9. **Keyboard results use collapsible accordions (Phase 3)** — sections in all three group modes (By Type, By Region, By Component) are wrapped in `.kb-acc-header` / `.kb-acc-body` accordion elements. The expand/collapse listener uses the `AbortSignal` from `attachResultsPageListeners`.
10. **Component flow detail merges steps + issues (Phase 3)** — no separate "Issues" section. Each tab stop card shows its matching issues inline via `extraBodyHtml` using `renderInlineIssue()`.
11. **Live Regions view redesign** — issues grouped by type in collapsible accordions (`lr-acc-header`/`lr-acc-body`), severity filter chips, breakdown bar (assertive/polite/empty/healthy counts), healthy regions in collapsed accordion. Uses `LrViewData` wrapper with `severityFilter` state managed in `panel.ts`.
12. **Accessible Names view redesign** — entries grouped by status (Error/Warning/Pass) in collapsible section accordions (`an-acc-header`/`an-acc-body`). "Pass" chip defaults to OFF. Section borders color-coded by severity.
13. **Issue Knowledge blocks** — `utils/issue-knowledge.ts` provides centralized WCAG criterion mapping, plain-English user impact statements, fix suggestions, and "learn more" URLs for non-axe audits (Keyboard, Form Labels, ARIA, Contrast). Rendered via `renderKnowledgeBlock()` in expanded card `extraBodyHtml`.
14. **Axe group mode filters** — "By Region" and "By Component" tabs now correctly apply result type chips, search query, and WCAG severity filters. Previously these tabs showed all unfiltered results.
15. **`getElementContext` serialization guard** — `utils/wcag-map.ts` `getElementContext(el)` checks `instanceof Element` before calling `el.tagName.toLowerCase()`. If `el` is a serialized `{selector, snippet}` object (as happens in popup mode), it returns `el.snippet || el.selector || 'Element'` instead. Without this guard, every keyboard results render crashed with `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`, which prevented the view from ever loading and made the cancel button appear broken.
16. **Keyboard results grouping serialization guards** — `keyboard-results.ts` "By Region" grouping checks `!(firstEl instanceof Element)` and falls back to "By Type" grouping when elements are serialized objects. "By Component" grouping adds `instanceof Element` guard before calling `root.contains(issue.element)`.
17. **Scope-to-selector deferred re-run** — `onScopeSelector` in `panel-ui.ts` returns `false` (suppressing immediate re-run) and calls `panel.prepareScopePickRerun()` to set a pending view. The re-run fires only when `SCOPE_SET` arrives from the content script. If the selector fails to match, `SCOPE_SET_FROM_SELECTOR_FAILED` fires and `panel.cancelPendingRerun()` clears the pending state.
18. **`onClearScope` callback** — `PanelCallbacks` includes `onClearScope: () => void`. `panel.clearScope()` calls this callback. In popup mode (`panel-ui.ts`) it sends `CLEAR_SCOPE` to the content script. In standalone/test mode (`main.ts`) it is a no-op. This ensures `A11yContent.scopeElement` is cleared in the content script whenever the user navigates back to the home screen, preventing stale scope from affecting subsequent keyboard or other audits.
19. **Scope banner in popup mode** — `renderScopeBanner()` checks `this.scopeElement || this.scopeLabel`. `this.scopeElement` is always `null` in popup mode (no live DOM access); `this.scopeLabel` carries the selector string. Previously the banner never appeared in popup mode.
20. **Playwright tests do not cover popup serialization** — The test suite runs against `index.html` in standalone mode, where all analysis and rendering happen in the same JS context with live DOM elements. Bugs arising from cross-context serialization (e.g. serialized elements passed to `tagName.toLowerCase()`) are invisible to the test suite. To catch these in future, a popup simulation mode that stubs `chrome.runtime` and passes serialized element fixtures would be needed.
21. **`main.ts` is the standalone test entry point** — Despite the directory tree comment saying "Legacy entry (kept for reference)", `main.ts` is actively loaded by `index.html` for all Playwright tests via the standalone mode (`window.__A11Y_STANDALONE__ = true`). It creates `StandaloneA11yUI` with no-op callbacks for popup-specific functions (`onClearScope`, `onBeginManualRecording`, `onHighlightBySelector`).
