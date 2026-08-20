# Accessibility Prism

**Current version: v3.0.1** | [Changelog](#changelog)

A comprehensive, all-in-one accessibility testing Chrome extension that goes far beyond automated scanning. Accessibility Prism combines axe-core engine analysis with manual testing tools, visual overlays, and plain-English fix guidance — giving developers, QA engineers, and accessibility specialists everything they need in a single panel.

## The Problem

Web accessibility testing is fragmented. Teams juggle multiple tools — automated scanners that catch only 30-40% of issues, separate keyboard testers, manual screen reader checks, ARIA validators — each with different UIs, different output formats, and no unified view. Issues fall through the cracks, and non-technical stakeholders struggle to understand raw audit data.

**Accessibility Prism solves this** by consolidating 15 accessibility audits into one extension with plain-English findings anyone can understand.

## Features

### Automated Scanning
- **Full Page Scan** — axe-core analysis across violations, needs-review, and best-practice findings
- **Partial Page Scan** — pick any element to scope the scan to just that section
- **Component Scoping** — every audit result view has a scope bar at the top: type a CSS selector or use the element picker to re-run any analysis against a specific component or section instead of the full page. Clear scope to return to full-page results
- Multi-select result-type filters (Violation / Needs Review / Best Practice), impact filters, WCAG level filter, and text search across all results
- Group results by Rule, Page Region, or UI Component

### Structure & Semantics
- **Heading Structure** — hierarchy analysis with skip-level detection and visual H1–H6 markers drawn on the page
- **Landmark Overview** — ARIA landmark mapping with dashed-border overlays and role labels
- **Alt Text Audit** — flags missing, suspicious ("image of…"), or excessively long alternative text

### Keyboard & Focus
- **Keyboard Analysis** — detects tab order issues, focus traps, and inaccessible interactives; results grouped by type, region, or component with collapsible accordions and WCAG knowledge blocks
- **Manual Keyboard Test** — record your own tab trail with numbered overlay arrows drawn on the page
- **Component Keyboard Flow** — inspect tab flow within individual UI components; shows tab stops and any inline issues per stop
- **Focus Management** — validates dialog/modal focus trapping and return-focus behavior

### Screen Reader Simulation
- **Accessible Name Inspector** — computed name, role, and state for every significant element; grouped by status (Error / Warning / Pass)
- **ARIA Validation** — broken references, invalid roles, forbidden patterns, missing required props; per-issue WCAG fix guidance
- **Form Labels Audit** — unlabeled controls, placeholder-only inputs, missing fieldset legends; per-issue WCAG fix guidance
- **Announcement Walk-Through** — step through elements hearing what a screen reader would announce. Uses the W3C Accessible Name and Description Computation spec (via `dom-accessibility-api`) — the same algorithm browsers use to derive their accessibility tree from the DOM. Includes prose elements (`<p>`, `<li>`), `aria-describedby` descriptions, and accurate computed names/roles/states
- **Reading Order** — numbered DOM-order markers drawn directly on the page

### Monitoring
- **Live Region Monitor** — detects `aria-live` regions and `role="alert"` elements with severity breakdown, assertive/polite classification, and collapsible grouped issues

### WCAG Knowledge Blocks
Every expanded issue card across Keyboard, Form Labels, and ARIA Validation views shows an inline knowledge block with:
- The specific WCAG success criterion and level
- A plain-English statement of the user impact
- A concrete fix suggestion
- A "Learn more" link to the authoritative spec

### Visual Overlays
Every analysis draws contextual markers directly on the page — heading badges, landmark borders, tab order numbers with connecting arrows, reading order markers, and issue highlights with instant scroll-to-element navigation.

### Reports & Export
- Standalone HTML accessibility reports (full page scan)
- Designed for sharing with non-technical stakeholders

### UX Details
- **Loading spinner** — displayed for audits that take time (axe full scan, keyboard analysis) so the panel never appears frozen
- **Scroll restore** — navigating back to a results list restores the previous scroll position
- Parallel test execution with retry for flaky network conditions

## Installation

Install **Accessibility Prism** from the Chrome Web Store and click **Add to Chrome**.

## Usage

1. Click the **Accessibility Prism** icon in the browser toolbar — a detached popup window opens
2. Select any analysis — Full Page Scan, Heading Structure, SR Walk-Through, etc.
3. Results appear in the popup panel; visual overlays are drawn directly on the page behind it
4. Click any issue card to expand it: see the HTML snippet, CSS selector, WCAG criterion, fix guidance, and a Highlight button
5. Use the **Scope** bar at the top of any result view to narrow analysis to a CSS selector or a picked element; click **Clear** to return to full-page results
6. Export HTML reports from the panel header download button

## Architecture

The extension uses two separate execution contexts connected by a typed message protocol:

```
Browser icon click
      │
      ▼
background.js (service worker)
      ├─ chrome.scripting.executeScript → dist/content.js (runs in host page)
      └─ chrome.windows.create → public/panel.html → dist/panel.js (detached popup)
                                          │
                                chrome.tabs.connect(tabId)
                                          │
                              ◄──── ResultMessages (serialized) ────
                              ────► CommandMessages ────────────────►
```

```
src/
├── content.ts         # Runs in the host page — analysis engines, overlay, message handler
├── panel-ui.ts        # Popup window entry — mounts FloatingPanel, sends commands, receives results
├── messages.ts        # Typed CommandMessage / ResultMessage protocol + SerializedElement
├── main.ts            # Standalone entry — used by index.html for Playwright tests
├── core/              # Analysis engines (same code called by content.ts and main.ts)
│   ├── axe-runner.ts, keyboard-analysis.ts, focus-management.ts, ...
│   ├── scorecard.ts
│   └── custom-rules/  # 10 custom Prism rules extending axe-core
├── ui/
│   ├── panel.ts       # FloatingPanel — state, routing, render cycle (shared between modes)
│   ├── views/         # One renderer per view + shared results-template.ts
│   ├── tokens.ts, panel-styles.ts, icons.ts, overlay.ts
└── utils/
    ├── dom-utils.ts   # getCssSelector, getSnippet, serializeElement, serializeResult
    ├── issue-knowledge.ts, fix-suggestions.ts, wcag-map.ts, ...
public/
├── background.js, panel.html, manifest.json
```

### Key Design Decisions

- **Detached popup window** — The panel runs in a completely separate browser window, eliminating host-page CSS conflicts and enabling testing at any viewport size, including responsive/mobile simulation
- **Element serialization boundary** — DOM `Element` references cannot cross contexts. Every element is serialized to `{selector, snippet}` before sending via the Chrome port. `getCssSelector()`, `getSnippet()`, and `getElementContext()` all accept `Element | SerializedElement` so rendering code works in both contexts
- **Scope cleared on navigation** — An `onClearScope` callback sends `CLEAR_SCOPE` to the content script whenever the user navigates back to the home screen, preventing scope bleed-over between different audit types
- **Zero remote code** — Everything is bundled locally (axe-core included), fully Chrome Web Store compliant
- **W3C AccName spec for SR simulation** — The Announcement Walk-Through uses `dom-accessibility-api` (same algorithm as browsers) for accurate accessible name/role/state computation
- **Centralised WCAG knowledge** — `utils/issue-knowledge.ts` is the single source of truth for all per-issue-type WCAG criteria, user impact statements, fix suggestions, and learn-more links

## Tech Stack

- **TypeScript** + **Vite** for fast builds (two separate bundles: `content.js` + `panel.js`)
- **axe-core** for automated WCAG testing
- **dom-accessibility-api** for W3C AccName spec-compliant accessible name and description computation (powers the SR Walk-Through)
- **Chrome Extension Manifest V3**
- **Playwright** for automated UI testing (144 tests across 12 spec files)
- No UI frameworks — vanilla TypeScript for minimal bundle size (~870 KB including axe-core)

## Permissions

- `activeTab` — Access the current tab when the user activates the extension
- `scripting` — Inject the analyzer content script on demand
- `tabs` — Read the active tab ID to connect the popup window to the correct content script
- `windows` — Create and focus the detached popup window; return focus after interactive flows

No data collection. All analysis runs locally in the browser tab. No external requests.

## Changelog

### Unreleased
- **Chrome-only publication prep** — Removed all Microsoft Edge references from the README and article; the extension ships to the Chrome Web Store only. Replaced the "Load from Source (Developer)" / Developer-mode / Load-unpacked instructions in both docs with a single Chrome Web Store install line.
- **Removed disabled features from user-facing docs** — README Features and Usage no longer advertise the Accessibility Scorecard, Color Contrast, Touch Target Size, the Experimental result type, or the 10 custom Prism rules, all of which are currently disabled in `pre-screen.ts`/`axe-runner.ts`. The docs now list exactly the 15 audits the UI actually exposes. Architecture and Changelog sections are unchanged (source files still exist; changelog is a historical record).
- **Fixed store listing text** — `public/manifest.json` description advertised "10 custom rules" while they are disabled. Now reads "All-in-one accessibility testing: axe scanning, keyboard & ARIA analysis, screen reader simulation, and visual overlays." (120 chars, within the 132 limit).
- **Article trimmed to features, not tutorials** — Dropped the "Execution" section (two of three bullets duplicated Key Features and Usage) and the "Understanding Result Types" section (explained axe-core's own tagging taxonomy rather than the extension; belongs in the UI as a tooltip/legend, not a published article). Also dropped the basic "How It Works" audit table; its one useful line ("every audit is a one-click button… no CLI to run") moved into Key Features. Converted the remaining result-types table to prose, leaving the article table-free. Removed the "WCAG Knowledge Blocks" section, which exposed internal implementation detail (`utils/issue-knowledge.ts`, axe field names) inappropriate for a published article — what the blocks show is already covered in plain terms under Usage.
- **Restored `best-practice` result-type distinction in Axe Scan** — Re-added `isBestPractice()` reclassification in `mapResult()` (`src/core/axe-runner.ts`) and the "Best Practice" filter chip in `axe-issue-list.ts`, both of which were removed in v3.0.1 while chasing 1:1 axe DevTools parity (see `0e96f8e` / `8b6ab5c`). Rationale: axe-core's `best-practice` tag means a rule has no WCAG success-criterion mapping — i.e. good practice, not a conformance requirement — and users were confused seeing rules like `empty-heading` rendered identically to real WCAG violations ("✕ Violation") with no way to tell them apart. The `runOnly` cleanup from `0e96f8e` (dropping the custom tag filter to match axe-core's true default rule set) is unaffected and stays as-is. `prism-custom` rules remain disabled (`registerPrismRules()` still commented out).

### v3.0.1
- **Fixed false-positive risk in empty-heading detection** — `src/core/heading-analysis.ts` previously flagged headings as "empty" using only raw `textContent`, missing headings that have a real accessible name via `aria-label`/`aria-labelledby` or an `<img alt="...">` child. Now uses proper W3C accessible-name computation (`dom-accessibility-api`, already a dependency) via a new `accessibleName` field on `HeadingNode`. The display `text` field (used in the heading tree view) is unchanged — only the emptiness *check* was fixed. Added two fixtures to `index.html` (a truly empty heading, and an `aria-label`-only heading) plus two new tests in `structure-audits.spec.js` confirming the fix. Regenerated 5 visual snapshots affected by the new fixture headings (heading tree, axe results, accessible names, SR walkthrough, reading order).
- **"Needs Review" no longer preselected by default in Axe Scan results** — `activeResultTypes` default in `src/ui/panel.ts` changed from `['violation', 'needs-review', 'best-practice']` to `['violation', 'best-practice']`. The "Needs Review" filter chip is still fully available and togglable, just not active on first load — reduces noise from axe-core's "incomplete" results by default. Updated `axe-scan.spec.js`'s partial scoped scan test to explicitly re-enable the chip, since the scoped test fixture's findings were needs-review-only. Regenerated the `axe-results` visual snapshot.
- **Axe Scan now matches plain axe-core / axe DevTools exactly** — `runAxe()` in `src/core/axe-runner.ts` no longer passes a custom `runOnly` tag filter. Previously, an explicit tag list (including `wcag2aaa`/`wcag22aa`) inadvertently force-re-enabled several rules axe-core intentionally disables by default (`target-size`, `color-contrast-enhanced`, `duplicate-id`, `duplicate-id-active`, `aria-roledescription`, `audio-caption`, `identical-links-same-purpose`, `meta-refresh-no-exceptions`) — per axe-core's documented behavior, tag-based `runOnly` ignores each rule's own `enabled` flag. This produced noisier, less accurate results than a standard axe scan. Removing the custom `runOnly` restores axe-core's true default rule set (96 of 104 rules), 1:1 parity with axe DevTools. Also removed the `isBestPractice()` reclassification in `mapResult()` — `best-practice`-tagged rules (e.g. `heading-order`, `page-has-heading-one`, `landmark-one-main`) are no longer demoted into a separate `'best-practice'` resultType; axe-core treats them as real violations/needs-review, and Prism now does too. `'prism-custom'` rules remain disabled (`registerPrismRules()` still commented out) since those are Prism's own unvalidated custom heuristics, not part of axe-core. Regenerated the `axe-results` visual snapshot to reflect the corrected rule set.
- **Best Practice / Experimental result types disabled (temporary)** — `runAxe()` in `src/core/axe-runner.ts` no longer runs the `best-practice` tag or the 10 Prism custom rules (`prism-custom` tag, `registerPrismRules()` call) — flagged as producing inaccurate results. The corresponding filter chips in `axe-issue-list.ts` are hidden. All custom rule source files (`core/custom-rules/*.ts`) are untouched; re-enable by uncommenting the `registerPrismRules()` call, the `'best-practice'`/`'prism-custom'` tags in the `runOnly.values` array, and the two chip lines in `axe-issue-list.ts`. Regenerated `axe-results` visual snapshot to reflect the removed chips.
- **Visual section hidden from UI (temporary)** — Commented out the "Visual" section (Color Contrast, Touch Target Size buttons) in `src/ui/views/pre-screen.ts`. Underlying code (`contrast-analysis.ts`, `touch-target-analysis.ts`, their result views, and `onRunContrast`/`onRunTouchTargets` handlers/routing in `panel.ts`) is untouched — only the pre-screen entry buttons are disabled. To re-enable, uncomment the `Visual` section block in `pre-screen.ts`. Updated/skipped corresponding Playwright tests: `visual-audits.spec.js` (`Contrast Audit` + `Touch Target Audit` describe blocks skipped), `visual-snapshots.spec.js` (contrast/touch snapshot tests skipped), `panel-lifecycle.spec.js` (button-presence list updated), `scroll-navigation.spec.js` and `card-expand.spec.js` (swapped Contrast/Touch references for other still-active views in shared navigation tests).
- **Accessibility Scorecard hidden from UI (temporary)** — Commented out the Scorecard button in `src/ui/views/pre-screen.ts` so it no longer appears on the pre-screen menu. All underlying code (`onRunScorecard` handler, `scorecard.ts` engine, `scorecard-results.ts` view, routing in `panel.ts`) is untouched and fully functional — only the entry-point button is disabled. To re-enable, uncomment the `renderButton({ id: 'btn-scorecard', ... })` block in `pre-screen.ts`. Corresponding Playwright tests (`advanced-features.spec.js` Scorecard suite, `visual-snapshots.spec.js` scorecard snapshot, `a11y-ception.spec.js` scorecard a11y check) were marked `.skip()` with a note to re-enable alongside the button; `panel-lifecycle.spec.js` button-presence list updated to exclude `btnScorecard`. Regenerated the `pre-screen` visual snapshot to reflect the removed button.
- **Docs fix: "Load unpacked" instructions corrected** — README and AGENTS.md incorrectly said to select the project root when loading the unpacked extension in Chrome/Edge. `manifest.json` only exists in `dist/` after `npm run build` (copied there from `public/` by Vite), so selecting the root caused "Manifest file is missing or unreadable". Both docs now correctly point to `dist/`.
- **Footer attribution (temporary)** — Panel footer credit changed from "Built by Madhur & Alisha" to "Built by Alisha" in `src/ui/views/pre-screen.ts`. Updated `test/specs/panel-lifecycle.spec.js` assertion accordingly and regenerated the `pre-screen` visual regression snapshot to match.

### v3.0.0
- **Detached popup window architecture** — Panel moved from an injected `<div>` into a standalone `chrome.windows.create({ type: 'popup' })` window. Eliminates all host-page CSS conflicts and enables testing at any viewport size including responsive/mobile. The popup connects directly to the content script via `chrome.tabs.connect(tabId)` using a typed message protocol
- **Animated tab walk** — Auto keyboard analysis now visits each focusable element in real time with a progress bar and numbered badge overlays drawn on the page, instead of a static one-shot analysis. The walk respects the current scope if set, and always starts from the top of the page
- **Missed focus detection (experimental)** — After the animated walk, elements that were in the static tab order but did not actually receive focus (e.g. hidden at runtime, intercepted by a focus trap) are flagged in a dedicated experimental section on the keyboard results view
- **Manual keyboard test — start screen + ESC stop** — The manual tab trail now shows an instruction screen before recording begins. Pressing ESC during recording stops the trail and returns focus to the popup
- **Scope-to-selector fixes** — The scope bar now correctly shows the "Scoped:" banner in popup mode (previously only showed when a live DOM `Element` was available). Text input scope re-runs the audit only after the content script confirms the selector matched. `CLEAR_SCOPE` is sent to the content script on every back-navigation, preventing scope bleed-over between audit types
- **Content Security Policy compliance** — All `onmouseover`/`onmouseout` inline event handlers replaced with CSS `:hover` rules (inline handlers are blocked by Chrome extension CSP in Manifest V3)
- **Serialized element safety** — All popup-side rendering functions (`getElementContext`, keyboard group-mode grouping) now guard against receiving serialized plain objects `{selector, snippet}` instead of live DOM `Element` references, preventing `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` crashes that previously kept the keyboard results view frozen after a tab walk
- **Auto focus switching** — Interactive flows (scope picker, manual keyboard) automatically switch browser focus to the inspected tab and return it to the popup when done, via `chrome.tabs.update` and `chrome.windows.update`
- **Flat popup header** — Removed minimize/close buttons; added extension logo, name, page title/URL strip, and download report icon. Matches the Siteimprove-style detached panel UX

### v2.1.0
- **Screen Reader Walk-Through — W3C AccName spec rewrite** — Now uses `dom-accessibility-api` (same algorithm as browsers) for accurate accessible name/role/state computation
- **WCAG Knowledge blocks** — Inline knowledge blocks across Keyboard, Form Labels, ARIA Validation, and Color Contrast views
- **CSS isolation hardening** — All panel styles use `!important` with ID-based specificity
- **Component scoping** — Every result view has a scope bar (CSS selector input + element picker)
- 144 Playwright tests

### v2.0.0
- Initial release with 15+ accessibility checks, Accessibility Scorecard (A–F grading), axe-core integration, 10 custom Prism rules, all audit views, visual overlays, and HTML report export

## Credits

Built by **Alisha**

Powered by [axe-core](https://github.com/dequelabs/axe-core) by Deque Systems and [dom-accessibility-api](https://github.com/eps1lon/dom-accessibility-api)

## License

MIT
