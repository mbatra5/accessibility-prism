import { renderNavBar } from './helpers';

interface PreScreenButton {
  id: string;
  label: string;
  description: string;
  iconBg: string;
  iconStroke: string;
  hoverColor: string;
  icon: string;
}

const SECTION_STYLE = `font-size: 11px !important; font-weight: 700 !important; color: #6B7280 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; margin: 4px 0 6px 0 !important; line-height: 1.5 !important;`;

function renderButton(btn: PreScreenButton): string {
  const base = `padding: 14px !important; background: var(--btn-bg, white) !important; border: 1px solid var(--btn-border, #E5E7EB) !important; border-radius: 10px !important; cursor: pointer !important; text-align: left !important; font-size: 14px !important; box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important; transition: border-color 0.15s, box-shadow 0.15s !important; display: flex !important; align-items: center !important; gap: 14px !important; width: 100% !important;`;
  return `
    <button id="${btn.id}" class="a11y-audit-btn" style="${base}; --audit-btn-hover: ${btn.hoverColor};">
      <span style="width: 34px !important; height: 34px !important; border-radius: 8px !important; background: ${btn.iconBg} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${btn.iconStroke}" stroke-width="2">${btn.icon}</svg>
      </span>
      <div style="display: flex !important; flex-direction: column !important; min-width: 0 !important; flex: 1 !important;">
        <div style="font-weight: 600 !important; color: #1F2937 !important; font-size: 13px !important; line-height: 1.5 !important;">${btn.label}</div>
        <div style="font-size: 12px !important; color: #4B5563 !important; margin-top: 2px !important; line-height: 1.5 !important;">${btn.description}</div>
      </div>
    </button>`;
}

export function renderPreScreen(): string {
  let html = renderNavBar('Select Analysis', false);

  html += `<div id="scroll-area" tabindex="0" style="padding: 16px !important; display: flex !important; flex-direction: column !important; gap: 6px !important; background: #F9FAFB !important; overflow-y: auto !important; flex: 1 !important;">`;

  // --- Full Scorecard ---
  // TEMPORARILY DISABLED IN UI — uncomment to re-enable the Scorecard button on pre-screen.
  // (onRunScorecard handler + scorecard view/routing logic left untouched elsewhere.)
  // html += renderButton({
  //   id: 'btn-scorecard', label: 'Accessibility Scorecard', description: 'Run all checks, get a scored report with plain-English findings',
  //   iconBg: '#1E293B', iconStroke: '#FFFFFF', hoverColor: '#2563EB',
  //   icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  // });
  //
  // html += `<div style="height: 6px !important;"></div>`;

  // --- WCAG Violations ---
  html += `<div style="${SECTION_STYLE}">WCAG Violations</div>`;
  html += renderButton({
    id: 'btn-auto-axe', label: 'Full Page Scan (Axe)', description: 'Run axe-core on the entire page',
    iconBg: '#EEF2FF', iconStroke: '#6366F1', hoverColor: '#6366F1',
    icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
  });
  html += renderButton({
    id: 'btn-partial-scan', label: 'Partial Page Scan', description: 'Pick an element and scan only that section',
    iconBg: '#EEF2FF', iconStroke: '#2563EB', hoverColor: '#2563EB',
    icon: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>',
  });

  // --- Structure & Semantics ---
  html += `<div style="${SECTION_STYLE} margin-top: 10px;">Structure &amp; Semantics</div>`;
  html += renderButton({
    id: 'btn-headings', label: 'Heading Structure', description: 'Analyze heading hierarchy, skip levels, missing h1',
    iconBg: '#FFF8F1', iconStroke: '#F97316', hoverColor: '#F97316',
    icon: '<path d="M4 12h8"></path><path d="M4 18V6"></path><path d="M12 18V6"></path><path d="M17 10l3-3-3-3"></path><path d="M20 7h-7"></path>',
  });
  html += renderButton({
    id: 'btn-landmarks', label: 'Landmark Overview', description: 'Map ARIA landmarks, detect missing main/nav',
    iconBg: '#F0FDF4', iconStroke: '#16A34A', hoverColor: '#16A34A',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path>',
  });
  html += renderButton({
    id: 'btn-alt-text', label: 'Alt Text Audit', description: 'Check images for missing, suspicious, or long alt text',
    iconBg: '#EFF6FF', iconStroke: '#2563EB', hoverColor: '#2563EB',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path>',
  });

  // --- Visual ---
  // TEMPORARILY DISABLED IN UI — uncomment to re-enable the Visual section (Color Contrast, Touch Target Size).
  // html += `<div style="${SECTION_STYLE} margin-top: 10px;">Visual</div>`;
  // html += renderButton({
  //   id: 'btn-contrast', label: 'Color Contrast', description: 'Check text contrast ratios against WCAG AA/AAA',
  //   iconBg: '#F5F3FF', iconStroke: '#7C3AED', hoverColor: '#7C3AED',
  //   icon: '<circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 0 20z"></path>',
  // });
  // html += renderButton({
  //   id: 'btn-touch', label: 'Touch Target Size', description: 'Measure interactive elements against WCAG 2.5.5/2.5.8',
  //   iconBg: '#FEF2F2', iconStroke: '#EF4444', hoverColor: '#EF4444',
  //   icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
  // });

  // --- Keyboard & Focus ---
  html += `<div style="${SECTION_STYLE} margin-top: 10px;">Keyboard &amp; Focus</div>`;
  html += renderButton({
    id: 'btn-auto-key', label: 'Keyboard Analysis', description: 'Detect tab order, focus traps, and keyboard issues',
    iconBg: '#FFF8F1', iconStroke: '#F97316', hoverColor: '#F97316',
    icon: '<rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="7" y1="16" x2="17" y2="16"></line>',
  });
  html += renderButton({
    id: 'btn-manual-key', label: 'Manual Keyboard Test', description: 'Tab through the page and record your focus trail',
    iconBg: '#F0FDF4', iconStroke: '#16A34A', hoverColor: '#16A34A',
    icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
  });
  html += renderButton({
    id: 'btn-component-flow', label: 'Component Keyboard Flow', description: 'Inspect tab flow within individual components',
    iconBg: '#F5F3FF', iconStroke: '#6366F1', hoverColor: '#6366F1',
    icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>',
  });
  html += renderButton({
    id: 'btn-focus-mgmt', label: 'Focus Management', description: 'Validate dialog/modal focus trapping and return focus',
    iconBg: '#EEF2FF', iconStroke: '#6366F1', hoverColor: '#6366F1',
    icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  });

  // --- Screen Reader ---
  html += `<div style="${SECTION_STYLE} margin-top: 10px;">Screen Reader Simulation</div>`;
  html += renderButton({
    id: 'btn-acc-names', label: 'Accessible Name Inspector', description: 'See computed name, role, state for every element',
    iconBg: '#F0FDF4', iconStroke: '#16A34A', hoverColor: '#16A34A',
    icon: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
  });
  html += renderButton({
    id: 'btn-aria-validation', label: 'ARIA Validation', description: 'Detect broken refs, invalid roles, forbidden patterns',
    iconBg: '#FEF2F2', iconStroke: '#EF4444', hoverColor: '#EF4444',
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  });
  html += renderButton({
    id: 'btn-form-labels', label: 'Form Labels Audit', description: 'Find unlabeled or poorly labeled form controls',
    iconBg: '#EEF2FF', iconStroke: '#6366F1', hoverColor: '#6366F1',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
  });
  html += renderButton({
    id: 'btn-sr-walkthrough', label: 'Announcement Walk-Through', description: 'Step through elements hearing what a screen reader says',
    iconBg: '#F5F3FF', iconStroke: '#7C3AED', hoverColor: '#7C3AED',
    icon: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
  });
  html += renderButton({
    id: 'btn-reading-order', label: 'Reading Order', description: 'Visualize DOM reading order with numbered markers',
    iconBg: '#FFF8F1', iconStroke: '#F97316', hoverColor: '#F97316',
    icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>',
  });

  // --- Monitoring ---
  html += `<div style="${SECTION_STYLE} margin-top: 10px;">Monitoring</div>`;
  html += renderButton({
    id: 'btn-live-regions', label: 'Live Region Monitor', description: 'Detect aria-live regions and role="alert" elements',
    iconBg: '#FFF8F1', iconStroke: '#D97706', hoverColor: '#D97706',
    icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>',
  });

  html += `</div>`;

  html += `
    <div style="padding: 10px 16px !important; border-top: 1px solid #E5E7EB !important; background: #F9FAFB !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; flex-shrink: 0 !important;">
      <span style="font-size: 11px !important; color: #6B7280 !important; line-height: 1.5 !important;">v3.0.1</span>
      <span style="color: #9CA3AF !important;">·</span>
      <span style="font-size: 11px !important; color: #6B7280 !important; line-height: 1.5 !important;">Powered by axe-core + Prism Rules</span>
      <span style="color: #9CA3AF !important;">·</span>
      <span style="font-size: 11px !important; color: #6B7280 !important; line-height: 1.5 !important;">Built by Alisha</span>
    </div>
  `;

  return html;
}

export function attachPreScreenListeners(container: HTMLElement, actions: {
  onRunAxe: () => void;
  onRunAutoKeyboard: () => void;
  onStartManual: () => void;
  onRunHeadings: () => void;
  onRunLandmarks: () => void;
  onRunContrast: () => void;
  onRunFocusMgmt: () => void;
  onRunLiveRegions: () => void;
  onRunTouchTargets: () => void;
  onRunAltText: () => void;
  onPartialScan: () => void;
  onRunAccNames: () => void;
  onRunAriaValidation: () => void;
  onRunFormLabels: () => void;
  onRunSrWalkthrough: () => void;
  onRunReadingOrder: () => void;
  onRunScorecard: () => void;
}): void {
  function setLoading(id: string, text: string) {
    const el = container.querySelector(`#${id} div div`) as HTMLElement;
    if (el) el.textContent = text;
  }

  container.querySelector('#btn-auto-axe')?.addEventListener('click', () => { setLoading('btn-auto-axe', 'Analyzing...'); actions.onRunAxe(); });
  container.querySelector('#btn-partial-scan')?.addEventListener('click', () => { setLoading('btn-partial-scan', 'Pick an element...'); actions.onPartialScan(); });
  container.querySelector('#btn-auto-key')?.addEventListener('click', () => { setLoading('btn-auto-key', 'Analyzing...'); actions.onRunAutoKeyboard(); });
  container.querySelector('#btn-manual-key')?.addEventListener('click', () => actions.onStartManual());
  container.querySelector('#btn-component-flow')?.addEventListener('click', () => { setLoading('btn-component-flow', 'Detecting...'); actions.onRunAutoKeyboard(); });
  container.querySelector('#btn-headings')?.addEventListener('click', () => { setLoading('btn-headings', 'Analyzing...'); actions.onRunHeadings(); });
  container.querySelector('#btn-landmarks')?.addEventListener('click', () => { setLoading('btn-landmarks', 'Analyzing...'); actions.onRunLandmarks(); });
  container.querySelector('#btn-contrast')?.addEventListener('click', () => { setLoading('btn-contrast', 'Scanning...'); actions.onRunContrast(); });
  container.querySelector('#btn-focus-mgmt')?.addEventListener('click', () => { setLoading('btn-focus-mgmt', 'Checking...'); actions.onRunFocusMgmt(); });
  container.querySelector('#btn-live-regions')?.addEventListener('click', () => { setLoading('btn-live-regions', 'Scanning...'); actions.onRunLiveRegions(); });
  container.querySelector('#btn-touch')?.addEventListener('click', () => { setLoading('btn-touch', 'Measuring...'); actions.onRunTouchTargets(); });
  container.querySelector('#btn-alt-text')?.addEventListener('click', () => { setLoading('btn-alt-text', 'Auditing...'); actions.onRunAltText(); });
  container.querySelector('#btn-acc-names')?.addEventListener('click', () => { setLoading('btn-acc-names', 'Computing...'); actions.onRunAccNames(); });
  container.querySelector('#btn-aria-validation')?.addEventListener('click', () => { setLoading('btn-aria-validation', 'Validating...'); actions.onRunAriaValidation(); });
  container.querySelector('#btn-form-labels')?.addEventListener('click', () => { setLoading('btn-form-labels', 'Auditing...'); actions.onRunFormLabels(); });
  container.querySelector('#btn-sr-walkthrough')?.addEventListener('click', () => { setLoading('btn-sr-walkthrough', 'Preparing...'); actions.onRunSrWalkthrough(); });
  container.querySelector('#btn-reading-order')?.addEventListener('click', () => { setLoading('btn-reading-order', 'Computing...'); actions.onRunReadingOrder(); });
  container.querySelector('#btn-scorecard')?.addEventListener('click', () => { setLoading('btn-scorecard', 'Running all checks...'); actions.onRunScorecard(); });
}
