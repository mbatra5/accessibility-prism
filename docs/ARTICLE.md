Accessibility Prism: An All-in-One Chrome Extension for Accessibility Testing
===

*Alisha Chawla & Madhur Batra · Accessibility Prism v3.0.1*

Accessibility testing often starts simple: check the headings, look at contrast, tab through the page, confirm the form has labels. In practice, those checks quickly scatter across automated scanners, keyboard tools, screen readers, and ARIA validators.

Most accessibility problems do not start as accessibility problems. They start as a `<div>` given a click handler, a heading used because it looked the right size, a modal that never returns focus, or an icon button shipped without a label. By the time anyone notices, the page is live, a real user cannot complete the flow, and three teams are debating who owns the fix.

Accessibility Prism is a Chrome extension that brings automated and manual accessibility checks into one detached panel, with findings drawn directly onto the page so developers, QA, designers, and product managers can see what is wrong and why.

Two gaps kept coming up in the tools we tried: understanding what a screen reader is likely to announce and verifying what actually happens when someone navigates with the keyboard. Prism tackles both directly — computing announcements from the W3C accessible name specification and testing whether elements actually receive focus instead of inferring keyboard behaviour from the DOM.

> The best accessibility tool is the one your designers and product managers will actually open before the page ships.
>
> — The reason this extension exists.

## Different Ways to Look at Accessibility

Accessibility is not a single scan. A page can pass automated checks and still have a broken tab order, an inaccessible modal, a meaningless accessible name, or content that is announced in the wrong sequence.

Accessibility Prism brings these different perspectives into one place. Here are the audit areas it covers — what each one checks, and why it matters.

### 1. Full Page Scan

**What it checks:** the whole page through axe-core, returning Violations, Needs Review, and Best Practice findings. Results can be filtered by result type, impact, and WCAG level, searched by text, and grouped by rule, page region, or UI component.

**Why it matters:** this catches the failures a machine can detect on its own — missing labels, invalid ARIA, insufficient contrast, broken references. Separating true conformance failures from recommendations means you know what actually blocks a release rather than treating every finding as equal.

<!-- SCREENSHOT: full page scan results with filters visible -->

### 2. Partial Page Scan & Component Scoping

**What it checks:** the same axe-core analysis narrowed to a single element. Every result view carries a scope bar, so you can type a CSS selector or use the element picker to re-run any audit against one component instead of the whole page.

**Why it matters:** a full-page scan of a busy template buries the issue you are actually working on. Scoping lets you check a card, a menu, or a form on its own — and re-check it after a fix without rescanning everything.

<!-- SCREENSHOT: scope bar with element picker active -->

### 3. Heading Structure

**What it checks:** the outline built from native `<h1>`–`<h6>` elements — skip-level detection, empty headings, and multiple or missing H1s — with level markers drawn directly on the page. Emptiness is judged by accessible name rather than text content, so a heading labelled via `aria-label` or containing an `<img alt>` is correctly treated as non-empty. ARIA headings declared with `role="heading"` and `aria-level` are not currently included in this outline; axe-core's own heading rules in the Full Page Scan do cover them.

**Why it matters:** screen reader users navigate by heading. A skipped level or a heading chosen for its font size rather than its meaning removes an entire route through the page, even when the layout looks perfectly ordered.

<!-- SCREENSHOT: H1-H6 badges drawn over a page -->

### 4. Landmark Overview

**What it checks:** landmark mapping across both native elements (`<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`, `<form>`, `<section>`) and their explicit `role=` equivalents, with dashed-border overlays and role labels drawn over each region. Each landmark's accessible name is resolved from `aria-label`, `aria-labelledby`, or a contained heading, and a missing `main` is reported as an error.

**Why it matters:** landmarks are how assistive technology users jump straight to navigation, search, or main content. Without them, reaching the middle of a page means tabbing through everything above it.

<!-- SCREENSHOT: landmark borders and role labels -->

### 5. Alt Text Audit

**What it checks:** missing alternative text, empty `alt` on meaningful images, suspicious phrasing such as "image of", and excessively long descriptions — across `<img>`, `<svg role="img">`, and `<input type="image">`.

**Why it matters:** this is the difference between an image that conveys its meaning and one announced as a filename. Automation can find the missing ones; the audit surfaces the ones that are technically present but useless.

<!-- SCREENSHOT: alt text findings list -->

### 6. Keyboard Analysis

**What it checks:** tab order and focus traps, by walking the page in real time — scrolling as it goes and drawing numbered badges with connecting arrows so you can watch the order unfold. Prism attempts to focus each element and records whether focus was genuinely received, so elements skipped at runtime or intercepted by a trap can be identified. Skipped-stop detection is currently marked experimental in the panel.

**Why it matters:** almost every accessibility tool works out keyboard behaviour by reading the DOM — what is focusable in theory, and in what order. That misses the failures that matter most, because a page can look flawless on paper and still trap or skip a real user.

<!-- SCREENSHOT: numbered tab-order badges with connecting arrows -->

### 7. Manual Keyboard Test

**What it checks:** your own tab trail. You tab through the page yourself and Prism records the real path, drawing it back as numbered arrows over the page.

**Why it matters:** custom widgets, roving tabindex, and anything driven by JavaScript cannot be reasoned about reliably by a static analyser. Recording what actually happened when a human pressed Tab is the only honest way to check them.

<!-- SCREENSHOT: manual tab trail with numbered arrows -->

### 8. Component Keyboard Flow

**What it checks:** tab stops and keyboard issues within a single UI component rather than the full page.

**Why it matters:** when a menu, carousel, or dialog misbehaves, you want that component's flow in isolation — not two hundred tab stops with the four you care about somewhere in the middle.

<!-- SCREENSHOT: component-scoped keyboard flow -->

### 9. Focus Management

**What it checks:** whether opening a dialog moves focus into it, keeps focus trapped while it is open, and returns focus to the control that opened it on close.

**Why it matters:** these are the three things modals routinely get wrong, and each one strands a keyboard user somewhere they did not ask to be — usually back at the top of the page with their place lost.

<!-- SCREENSHOT: focus management findings -->

### 10. Accessible Name Inspector

**What it checks:** the computed name, role, and state of every significant element on the page, grouped by status as Error, Warning, or Pass.

**Why it matters:** this is how you find the control that announces as nothing more than "button" before a user does. A visible label is not the same as an accessible name, and the two disagree more often than teams expect.

<!-- SCREENSHOT: accessible name inspector grouped results -->

### 11. Announcement Walk-Through

**What it checks:** the same underlying information as the inspector above, but walked in sequence rather than listed — stepping through the page one element at a time in the order a user would encounter them, reading out name, role, state, and description. Computed using the W3C Accessible Name and Description Computation algorithm, the same specification browsers use to build their own accessibility tree.

**Why it matters:** knowing that a rule failed is not the same as knowing what a screen reader user will hear. Checking that normally means using NVDA, JAWS, or VoiceOver and learning to navigate with it, which can be a real barrier for developers, designers, and product managers who simply need to know whether their component announces sensibly.

<!-- SCREENSHOT: announcement walk-through mid-sequence -->

### 12. Reading Order

**What it checks:** the true DOM order a screen reader follows, drawn on the page as numbered markers.

**Why it matters:** CSS can reorder content visually without changing the order it is announced in. Grid, flex `order`, and absolute positioning routinely produce pages that read in one sequence and look like another.

<!-- SCREENSHOT: numbered reading order markers -->

### 13. ARIA Validation

**What it checks:** broken `aria-labelledby` and `aria-describedby` references, invalid roles, forbidden patterns, and missing required properties for the role in use.

**Why it matters:** incorrect ARIA is worse than no ARIA. A reference pointing at an element that does not exist is ignored silently, so the control announces as though the label was never written.

<!-- SCREENSHOT: ARIA validation findings -->

### 14. Form Labels Audit

**What it checks:** unlabelled controls, placeholder-only inputs, `title`-only labelling, and radio or checkbox groups missing a fieldset legend, across native `<input>`, `<select>`, and `<textarea>`. Custom controls built from `<div>` with `role="textbox"` or `role="combobox"` are not covered here — the Accessible Name Inspector is the audit that catches those.

**Why it matters:** an unlabelled field is announced as "edit text" with no indication of what belongs in it. This is the most common reason a form is impossible to complete by ear.

<!-- SCREENSHOT: form labels findings -->

### 15. Live Region Monitor

**What it checks:** explicit `[aria-live]` regions plus the implicit ones — `role="alert"`, `role="status"`, `role="log"`, and `role="progressbar"` — classified as assertive or polite, with a severity breakdown.

**Why it matters:** validation errors, cart updates, and loading states that appear silently simply do not exist for a screen reader user. Getting this wrong in the other direction is just as bad — an assertive region that fires constantly interrupts everything else.

<!-- SCREENSHOT: live region monitor -->

Findings from the page scan and keyboard analysis can be exported as a single self-contained HTML report that opens offline, with each issue carrying its WCAG criterion, the user impact in plain English, and a concrete fix — so it can go straight into a ticket or a handover.

## Who it is for

- **Developers** validating accessibility before opening a pull request, or debugging why a component announces the wrong thing.
- **QA engineers** running keyboard and screen reader checks that no automated suite covers, and capturing them as reproducible findings.
- **Designers** checking focus order, focus indicators, and whether a layout reads in the order it looks.
- **Product managers** confirming a feature is usable before it ships, without needing to install a screen reader.

## Local-First, On Purpose

Accessibility Prism runs entirely in your browser. It requests only `activeTab`, `scripting`, `tabs`, and `windows` — no host permissions, no storage. There are no servers, no telemetry, and no database. The audit ends when you close the panel.

That is also the reason results do not persist between scans: nothing is stored anywhere, including locally.

## Check Any Page Before You Ship It

Accessibility Prism will not replace a full accessibility audit, and it is not meant to. Many accessibility issues still require human judgement, which is exactly why the manual keyboard, announcement, and name inspection tools sit alongside the automated scan rather than behind it.

What it does is make accessibility problems easier to see, understand, and reproduce — while there is still time to fix them.

Because the best time to discover that someone cannot use your page is before you ship it.

Chrome Web Store: *[link to be added]*

GitHub: [github.com/mbatra5/accessibility-prism](https://github.com/mbatra5/accessibility-prism)

## Limitations, Stated Plainly

- Automated scanning catches roughly **30–40%** of accessibility issues. A clean scan means no automatically detectable issues were found — nothing more.
- Simulated screen reader output is not a substitute for real assistive technology testing. Prism computes what *should* be announced per the AccName specification; NVDA, JAWS, and VoiceOver each behave differently in practice.
- Results are per-page and per-session, with no cross-page rollup.
- Automation cannot judge whether alt text is *meaningful*, whether a reading order is *logical*, or whether an error message is *helpful*.

## References

- [axe-core](https://github.com/dequelabs/axe-core) — the underlying rule engine
- [dom-accessibility-api](https://github.com/eps1lon/dom-accessibility-api) — W3C AccName specification implementation
- [Deque University](https://dequeuniversity.com/) — rule reference behind the *Learn more* links in the panel
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) — the standard underpinning every finding in the panel

---

Built by Alisha Chawla and Madhur Batra. Chrome Extension · Manifest V3.
