import type { AxeViolation, ComponentCluster, ComponentIssue, KeyboardIssue, ComponentTabFlow, HeadingAnalysisResult, LandmarkAnalysisResult, ContrastIssue, FocusManagementIssue, LiveRegionResult, TouchTargetIssue, AltTextIssue, AccNameResult, AriaValidationResult, FormLabelsResult, AccNameEntry } from '../core/types';
import type { PageRegion } from '../core/region-detection';
import { PANEL_CSS } from './panel-styles';
import { BORDER } from './tokens';
import * as icons from './icons';

import { renderPreScreen, attachPreScreenListeners } from './views/pre-screen';
import { renderAxeIssueList, attachAxeListListeners, type GroupMode, type AxeListData } from './views/axe-issue-list';
import { renderAxeIssueDetails, attachAxeDetailsListeners } from './views/axe-issue-details';
import { renderKeyboardResults, attachKeyboardListeners, type KbGroupMode, type KbData } from './views/keyboard-results';
import { renderManualTracking, attachManualListeners, updateManualTrailLog, type TrailEntry } from './views/manual-tracking';
import type { SerializedTrailEntry } from '../messages';
import { renderComponentFlowList, attachFlowListListeners } from './views/component-flow-list';
import { renderComponentFlowDetail, attachFlowDetailListeners } from './views/component-flow-detail';
import { renderHeadingResults, attachHeadingListeners } from './views/heading-results';
import { renderLandmarkResults, attachLandmarkListeners } from './views/landmark-results';
import { renderContrastResults, attachContrastListeners } from './views/contrast-results';
import { renderFocusMgmtResults, attachFocusMgmtListeners } from './views/focus-mgmt-results';
import { renderLiveRegionResults, attachLiveRegionListeners } from './views/live-region-results';
import { renderTouchTargetResults, attachTouchTargetListeners } from './views/touch-target-results';
import { renderAltTextResults, attachAltTextListeners } from './views/alt-text-results';
import { renderAccNameResults, attachAccNameListeners, type AccNameData } from './views/acc-name-results';
import { renderAriaResults, attachAriaListeners } from './views/aria-validation-results';
import { renderFormLabelsResults, attachFormLabelsListeners } from './views/form-labels-results';
import { renderSrWalkthrough, attachWalkthroughListeners, type WalkthroughData } from './views/sr-walkthrough';
import { renderReadingOrderResults, attachReadingOrderListeners } from './views/reading-order-results';
import { renderScorecardResults, attachScorecardListeners } from './views/scorecard-results';
import type { ScorecardResult } from '../core/scorecard';

interface PanelCallbacks {
  onRunAxe: () => void;
  onRunAutoKeyboard: () => void;
  onStartManualKeyboard: () => void;
  onBeginManualRecording: () => void;
  onStopManualKeyboard: () => void;
  onResetManualTrail: () => void;
  onHighlightBySelector?: (selector: string) => void;
  onExportReport: () => void;
  onViolationClick: (nodes: Element[]) => void;
  onShowComponentFlow: (flow: ComponentTabFlow, instanceIdx: number) => void;
  onRunHeadings: () => void;
  onRunLandmarks: () => void;
  onRunContrast: () => void;
  onRunFocusMgmt: () => void;
  onRunLiveRegions: () => void;
  onRunTouchTargets: () => void;
  onRunAltText: () => void;
  onPartialScan: () => void;
  onScopePick: () => void;
  onScopeSelector: (selector: string) => boolean;
  onClearScope: () => void;
  onRunAccNames: () => void;
  onRunAriaValidation: () => void;
  onRunFormLabels: () => void;
  onRunSrWalkthrough: () => void;
  onRunReadingOrder: () => void;
  onRunScorecard: () => void;
  onExportScorecard: () => void;
  onRefresh: () => void;
  onClose: () => void;
  onCancelTabWalk?: () => void;
  onShowInDevTools?: (auditType: 'acc-names' | 'aria' | 'form-labels', index: number, selector: string) => void;
  /** True when running as the detached popup window (vs. the injected standalone fixture). */
  isPopupWindow?: boolean;
}

type ViewName =
  | 'pre-screen'
  | 'axe-issue-list'
  | 'axe-issue-details'
  | 'keyboard-issues'
  | 'manual-tracking'
  | 'component-flow-list'
  | 'component-flow-detail'
  | 'heading-results'
  | 'landmark-results'
  | 'contrast-results'
  | 'focus-mgmt-results'
  | 'live-region-results'
  | 'touch-target-results'
  | 'alt-text-results'
  | 'acc-name-results'
  | 'aria-validation-results'
  | 'form-labels-results'
  | 'sr-walkthrough'
  | 'reading-order'
  | 'scorecard';

export class FloatingPanel {
  private container!: HTMLElement;
  private callbacks: PanelCallbacks;
  private collapsed = false;
  private currentView: ViewName = 'pre-screen';
  /** View that was last painted; used to save scroll before `currentView` updates ahead of `render()`. */
  private lastRenderedView: ViewName = 'pre-screen';
  private scrollPositions = new Map<ViewName, number>();
  /** When true, the next cross-view render keeps stored scroll for `currentView` (e.g. back navigation). */
  private preserveScrollOnNavigate = false;

  // Axe state
  private violations: AxeViolation[] = [];
  private components = new Map<string, ComponentCluster>();
  private dedupedIssues: ComponentIssue[] = [];
  private regions: PageRegion[] = [];
  private searchQuery = '';
  private filterSeverity: 'ALL' | 'AA' | 'AAA' = 'ALL';
  private groupMode: GroupMode = 'rule';
  private activeResultTypes = new Set<import('../core/types').AxeResultType>(['violation', 'best-practice']);
  private filterImpact = new Set<string>(['critical', 'serious', 'moderate', 'minor']);
  private activeViolation: AxeViolation | null = null;

  // Keyboard state
  private keyboardIssues: KeyboardIssue[] = [];
  private componentFlows: ComponentTabFlow[] = [];
  private kbGroupMode: KbGroupMode = 'type';
  private kbSeverityFilter = new Set<'error' | 'warning' | 'info'>(['error', 'warning', 'info']);
  // Animated tab walk progress (null when idle)
  private tabWalkProgress: { index: number; total: number } | null = null;
  // Missed focus stops from Phase 7B
  private missedTabStops: import('../messages').SerializedTrailEntry[] = [];

  // Component flow state
  private activeFlowIdx = 0;
  private activeInstanceIdx = 0;

  // Manual tracking state — accepts both live Elements (standalone) and serialized entries (popup)
  private manualTrail: TrailEntry[] = [];
  private manualRecordingStarted = false;

  // New analysis states
  private headingData: HeadingAnalysisResult = { headings: [], issues: [] };
  private landmarkData: LandmarkAnalysisResult = { landmarks: [], issues: [] };
  private contrastIssues: ContrastIssue[] = [];
  private focusMgmtIssues: FocusManagementIssue[] = [];
  private liveRegionData: LiveRegionResult = { regions: [], issues: [] };
  private liveRegionSeverityFilter = new Set<string>(['warning', 'info']);
  private touchTargetIssues: TouchTargetIssue[] = [];
  private altTextIssues: AltTextIssue[] = [];
  private altTextSeverityFilter = new Set<string>(['error', 'warning', 'info']);
  private formLabelsSeverityFilter = new Set<string>(['error', 'warning', 'info']);

  // Screen reader analysis states
  private accNameResult: AccNameResult = { entries: [], issueCount: 0, warningCount: 0 };
  private accNameSeverityFilter = new Set<string>(['error', 'warning']);
  private accNameSearch = '';
  private ariaResult: AriaValidationResult = { issues: [], errorCount: 0, warningCount: 0 };
  private ariaSeverityFilter = new Set<string>(['error', 'warning', 'info']);
  private formLabelsResult: FormLabelsResult = { issues: [], totalControls: 0, labeledControls: 0 };
  private walkthroughEntries: AccNameEntry[] = [];
  private walkthroughIndex = 0;
  private readingOrderEntries: AccNameEntry[] = [];

  // Scorecard
  private scorecardData: ScorecardResult | null = null;

  // Page info (populated from CONTENT_READY in popup mode)
  private pageUrl = '';
  private pageTitle = '';

  // Partial scan scope
  private scopeElement: Element | null = null;
  private scopeLabel = '';
  private pendingRerunView: string | null = null;

  constructor(callbacks: PanelCallbacks) {
    this.callbacks = callbacks;
    this.createPanel();
    this.render();
  }

  // === Public API ===

  // hide()/show() are kept for the standalone test fixture (index.html mode).
  // In popup window mode the panel is always full-viewport; closing the popup destroys it.
  public hide() { this.container.style.setProperty('display', 'none', 'important'); }
  public show() { this.container.style.setProperty('display', 'flex', 'important'); }

  public setPageInfo(url: string, title: string) {
    this.pageUrl = url;
    this.pageTitle = title;
    this.render();
  }

  public setScopeElement(el: Element, label: string) {
    this.scopeElement = el;
    this.scopeLabel = label;
    if (this.pendingRerunView) {
      this.currentView = this.pendingRerunView as any;
      this.pendingRerunView = null;
      this.rerunCurrentAudit();
    }
  }

  public clearScope() {
    this.scopeElement = null;
    this.scopeLabel = '';
    this.callbacks.onClearScope();
  }

  /** Allow popup-mode callbacks to set up a deferred re-run tied to the current view. */
  public prepareScopePickRerun() {
    this.pendingRerunView = this.currentView;
  }

  /** Cancel any pending deferred re-run (e.g. when selector was not found). */
  public cancelPendingRerun() {
    this.pendingRerunView = null;
  }

  public getScopeElement(): Element | null { return this.scopeElement; }

  public showLoading(label: string) {
    const scrollArea = this.container.querySelector('#scroll-area');
    if (!scrollArea) return;
    scrollArea.innerHTML = `
      <div style="display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; padding: 60px 20px !important; gap: 16px !important;">
        <div class="a11y-spinner"></div>
        <span style="font-size: 14px !important; color: #6B7280 !important; font-weight: 500 !important;">${label}</span>
      </div>
    `;
  }

  public updateAxeResults(violations: AxeViolation[], components: Map<string, ComponentCluster>, dedupedIssues: ComponentIssue[], regions: PageRegion[]) {
    this.violations = violations;
    this.components = components;
    this.dedupedIssues = dedupedIssues;
    this.regions = regions;
    this.currentView = 'axe-issue-list';
    this.render();
  }

  public updateKeyboardResults(issues: KeyboardIssue[], componentFlows: ComponentTabFlow[], missedStops?: import('../messages').SerializedTrailEntry[]) {
    this.tabWalkProgress = null;
    this.keyboardIssues = issues;
    this.componentFlows = componentFlows;
    this.missedTabStops = missedStops ?? [];
    this.currentView = 'keyboard-issues';
    this.render();
  }

  /** Phase 7A: show live tab-walk progress bar in the loading area */
  public startTabWalk(total: number) {
    this.tabWalkProgress = { index: 0, total };
    this.currentView = 'keyboard-issues';
    this.renderTabWalkProgress();
  }

  public updateTabWalkStep(index: number, total: number) {
    this.tabWalkProgress = { index, total };
    this.renderTabWalkProgress();
  }

  private renderTabWalkProgress() {
    const prog = this.tabWalkProgress;
    if (!prog) return;
    const scrollArea = this.container.querySelector('#scroll-area');
    if (!scrollArea) return;
    const pct = Math.round((prog.index / Math.max(prog.total, 1)) * 100);
    scrollArea.innerHTML = `
      <div style="display:flex !important;flex-direction:column !important;align-items:center !important;
                  justify-content:center !important;padding:60px 24px !important;gap:20px !important;">
        <div class="a11y-spinner"></div>
        <div style="font-size:15px !important;font-weight:600 !important;color:#1F2937 !important;">
          Animated Tab Walk
        </div>
        <div style="font-size:13px !important;color:#6B7280 !important;text-align:center !important;">
          Visiting element ${prog.index} of ${prog.total}…<br>
          Watch the page to see focus moving in real time
        </div>
        <div style="width:100% !important;max-width:280px !important;background:#E5E7EB !important;
                    border-radius:999px !important;height:8px !important;overflow:hidden !important;">
          <div style="width:${pct}% !important;height:100% !important;background:#5C6BC0 !important;
                      border-radius:999px !important;transition:width 0.2s !important;"></div>
        </div>
        <div style="font-size:12px !important;color:#9CA3AF !important;">${pct}% complete</div>
        <button id="btn-cancel-walk"
          style="margin-top:8px !important;padding:8px 20px !important;background:#FEE2E2 !important;
                 color:#B91C1C !important;border:1px solid #FECACA !important;border-radius:8px !important;
                 font-size:13px !important;font-weight:600 !important;cursor:pointer !important;">
          Cancel
        </button>
      </div>
    `;
    const btn = scrollArea.querySelector('#btn-cancel-walk');
    btn?.addEventListener('click', () => {
      // Tell the content script to stop the walk
      this.callbacks.onCancelTabWalk?.();
      // Immediately clear the progress UI — don't wait for a content-script reply
      this.tabWalkProgress = null;
      this.render();
    }, { once: true });
  }

  public updateManualTrail(trail: Element[]) {
    this.manualTrail = trail;
    this.manualRecordingStarted = true;
    if (this.currentView === 'manual-tracking') {
      updateManualTrailLog(trail);
    } else {
      this.currentView = 'manual-tracking';
      this.render();
    }
  }

  /** Called by popup-window mode when receiving TRAIL_UPDATE/TRAIL_COMPLETE messages. */
  public updateSerializedTrail(trail: SerializedTrailEntry[]) {
    this.manualTrail = trail;
    this.manualRecordingStarted = true;
    if (this.currentView === 'manual-tracking') {
      updateManualTrailLog(trail);
    } else {
      this.currentView = 'manual-tracking';
      this.render();
    }
  }

  /** Called by popup-window mode when scope is picked on the host page (no live Element available). */
  public setScopeLabel(label: string) {
    this.scopeLabel = label;
    if (this.pendingRerunView) {
      this.currentView = this.pendingRerunView as any;
      this.pendingRerunView = null;
      this.rerunCurrentAudit();
    } else {
      this.render();
    }
  }

  public updateHeadingResults(data: HeadingAnalysisResult) {
    this.headingData = data;
    this.currentView = 'heading-results';
    this.render();
  }

  public updateLandmarkResults(data: LandmarkAnalysisResult) {
    this.landmarkData = data;
    this.currentView = 'landmark-results';
    this.render();
  }

  public updateContrastResults(issues: ContrastIssue[]) {
    this.contrastIssues = issues;
    this.currentView = 'contrast-results';
    this.render();
  }

  public updateFocusMgmtResults(issues: FocusManagementIssue[]) {
    this.focusMgmtIssues = issues;
    this.currentView = 'focus-mgmt-results';
    this.render();
  }

  public updateLiveRegionResults(data: LiveRegionResult) {
    this.liveRegionData = data;
    this.currentView = 'live-region-results';
    this.render();
  }

  public updateTouchTargetResults(issues: TouchTargetIssue[]) {
    this.touchTargetIssues = issues;
    this.currentView = 'touch-target-results';
    this.render();
  }

  public updateAltTextResults(issues: AltTextIssue[]) {
    this.altTextIssues = issues;
    this.altTextSeverityFilter = new Set(['error', 'warning', 'info']);
    this.currentView = 'alt-text-results';
    this.render();
  }

  public updateAccNameResults(result: AccNameResult) {
    this.accNameResult = result;
    this.accNameSeverityFilter = new Set(['error', 'warning']);
    this.accNameSearch = '';
    this.currentView = 'acc-name-results';
    this.render();
  }

  public updateAriaResults(result: AriaValidationResult) {
    this.ariaResult = result;
    this.ariaSeverityFilter = new Set(['error', 'warning', 'info']);
    this.currentView = 'aria-validation-results';
    this.render();
  }

  public updateFormLabelsResults(result: FormLabelsResult) {
    this.formLabelsResult = result;
    this.formLabelsSeverityFilter = new Set(['error', 'warning', 'info']);
    this.currentView = 'form-labels-results';
    this.render();
  }

  public startWalkthrough(entries: AccNameEntry[]) {
    this.walkthroughEntries = entries;
    this.walkthroughIndex = 0;
    this.currentView = 'sr-walkthrough';
    // Expose announcement list on a stable window key for Playwright test verification.
    // String literals survive minification; property-name access does not.
    (window as unknown as Record<string, unknown>)['__a11y_sr_announcements'] =
      entries.map(e => e.announcement ?? '');
    this.render();
  }

  public showReadingOrder(entries: AccNameEntry[]) {
    this.readingOrderEntries = entries;
    this.currentView = 'reading-order';
    this.render();
  }

  public updateScorecardResults(data: ScorecardResult) {
    this.scorecardData = data;
    this.currentView = 'scorecard';
    this.render();
  }

  // === Panel creation ===

  private createPanel() {
    const existing = document.getElementById('a11y-analyzer-panel');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'a11y-analyzer-panel';
    this.container.setAttribute('data-a11y-extension', 'true');

    if ((window as any).__A11Y_STANDALONE__) {
      // Standalone test fixture mode (index.html) — inject as fixed overlay on the host page
      this.container.setAttribute('style', `
        position: fixed !important;
        bottom: 16px !important;
        right: 16px !important;
        width: 440px !important;
        min-width: 320px !important;
        max-height: 85vh !important;
        background: #FFFFFF !important;
        border: 1px solid ${BORDER} !important;
        border-radius: 14px !important;
        box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06) !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 14px !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        color-scheme: light !important;
        color: #1F2937 !important;
      `.replace(/\n\s*/g, ' '));
      document.body.appendChild(this.container);
      this.injectScopedStyles();
    } else {
      // Popup window mode — fill the entire popup window exactly (panel.html provides body reset)
      this.container.style.cssText = `
        width: 100%;
        min-width: 320px;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 0;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        color: #1F2937;
      `;
      document.body.appendChild(this.container);
    }
  }

  private injectScopedStyles() {
    const id = 'a11y-panel-scoped-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = PANEL_CSS;
    document.head.appendChild(style);
  }

  // === Main render ===

  private render() {
    const scrollAreaBefore = this.container.querySelector('#scroll-area') as HTMLElement | null;
    if (scrollAreaBefore) {
      this.scrollPositions.set(this.lastRenderedView, scrollAreaBefore.scrollTop);
    }

    if (this.lastRenderedView !== this.currentView) {
      if (!this.preserveScrollOnNavigate) {
        this.scrollPositions.delete(this.currentView);
      }
    }
    this.preserveScrollOnNavigate = false;

    let html = this.renderHeader();

    if (!this.collapsed) {
      html += this.renderViewContent();
    }

    this.container.innerHTML = html;
    // In standalone (injected) mode cap the panel to 85 vh so it doesn't overflow the host page.
    // In popup window mode the container is already sized to fill the OS window — leave it alone.
    if (!this.callbacks.isPopupWindow) {
      this.container.style.setProperty('max-height', this.collapsed ? 'auto' : '85vh', 'important');
    }

    this.attachHeaderListeners();
    if (!this.collapsed) {
      this.attachViewListeners();
    }

    this.lastRenderedView = this.currentView;

    if (!this.collapsed && this.scrollPositions.has(this.currentView)) {
      const savedScroll = this.scrollPositions.get(this.currentView)!;
      const viewAtRestore = this.currentView;
      // Double-rAF ensures layout is complete before restoring scroll position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.currentView !== viewAtRestore) return;
          const scrollArea = this.container.querySelector('#scroll-area') as HTMLElement | null;
          if (scrollArea) scrollArea.scrollTop = savedScroll;
        });
      });
    }
  }

  /** Inline Prism SVG logo extracted from public/icons/prism.svg */
  private static readonly PRISM_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" style="flex-shrink:0 !important;" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="prism-face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <linearGradient id="prism-light" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <rect width="128" height="128" rx="28" fill="#0F172A"/>

  <!-- Incoming light beam -->
  <line x1="14" y1="58" x2="42" y2="58" stroke="url(#prism-light)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>

  <!-- Prism triangle -->
  <polygon points="48,28 88,64 48,100" fill="url(#prism-face)" stroke="#475569" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="48,28 88,64 48,100" fill="none" stroke="#94A3B8" stroke-width="0.5" stroke-linejoin="round" opacity="0.4"/>

  <!-- Light refraction highlight on prism -->
  <line x1="48" y1="42" x2="48" y2="86" stroke="#CBD5E1" stroke-width="1" opacity="0.25"/>

  <!-- 5 spectrum rays exiting prism -->
  <line x1="88" y1="64" x2="116" y2="34" stroke="#16A34A" stroke-width="3.5" stroke-linecap="round" opacity="0.95"/>
  <line x1="88" y1="64" x2="118" y2="48" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" opacity="0.95"/>
  <line x1="88" y1="64" x2="118" y2="64" stroke="#F97316" stroke-width="3.5" stroke-linecap="round" opacity="0.95"/>
  <line x1="88" y1="64" x2="118" y2="80" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round" opacity="0.95"/>
  <line x1="88" y1="64" x2="116" y2="94" stroke="#7C3AED" stroke-width="3.5" stroke-linecap="round" opacity="0.95"/>

  <!-- Small accessibility person icon inside prism -->
  <circle cx="62" cy="54" r="4.5" fill="#E2E8F0" opacity="0.8"/>
  <path d="M62 60 L62 74 M55 66 L69 66 M58 84 L62 74 L66 84" stroke="#E2E8F0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>
</svg>`;

  private renderHeader(): string {
    const isPopup = this.callbacks.isPopupWindow ?? false;

    // === Popup window header — clean white ===
    if (isPopup) {
      const displayUrl = this.pageUrl
        ? (this.pageUrl.length > 52 ? this.pageUrl.slice(0, 50) + '…' : this.pageUrl)
        : '';
      const displayTitle = this.pageTitle || '';
      
      const pageStrip = displayUrl
        ? `<div style="padding: 6px 16px !important; display: flex !important; align-items: center !important; gap: 8px !important; border-top: 1px solid #E5E7EB !important;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0 !important;"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            <span style="display:flex !important; flex-direction:column !important; min-width:0 !important; gap:1px !important;">
              ${displayTitle ? `<span style="font-size:11px !important; font-weight:600 !important; color:#374151 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; line-height:1.3 !important;">${displayTitle}</span>` : ''}
              <span style="font-size:10px !important; color:#6B7280 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; line-height:1.3 !important; font-family:monospace !important;">${displayUrl}</span>
            </span>
           </div>`
        : '';

      return `
        <div id="panel-header" style="background: #ffffff !important; border-bottom: 1px solid #E5E7EB !important; user-select: none !important; flex-shrink: 0 !important;">
          <div style="padding: 12px 16px !important; display: flex !important; align-items: center !important; justify-content: space-between !important;">
            <div style="display: flex !important; align-items: center !important; gap: 9px !important;">
              ${FloatingPanel.PRISM_LOGO_SVG}
              <span style="font-size:14px !important; font-weight:700 !important; color:#1F2937 !important; letter-spacing:-0.01em !important;">Accessibility Prism</span>
            </div>
            <div style="display:flex !important; align-items:center !important; gap:4px !important;">
              <div class="a11y-tooltip-wrap" style="position:relative !important; display:inline-flex !important;">
                <button id="btn-refresh" aria-label="Clear results and overlay"
                  style="background:transparent !important; border:1px solid transparent !important; padding:6px !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor:pointer !important; color:#6B7280 !important; border-radius:6px !important; transition:background 0.15s, border-color 0.15s, color 0.15s !important;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
                <span class="a11y-tooltip" role="tooltip">Clear results &amp; overlay</span>
              </div>
              <div class="a11y-tooltip-wrap" style="position:relative !important; display:inline-flex !important;">
                <button id="btn-export" aria-label="Download accessibility report"
                  class="a11y-hdr-btn-export-popup"
                  style="background:transparent !important; border:1px solid transparent !important; padding:6px !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor:pointer !important; color:#4B5563 !important; border-radius:6px !important; transition:background 0.15s, border-color 0.15s !important;">
                  ${icons.ICON_EXPORT}
                </button>
                <span class="a11y-tooltip" role="tooltip">Download report</span>
              </div>
            </div>
          </div>
          ${pageStrip}
        </div>
      `;
    }

    // === Standalone / test fixture header — keeps collapse + close ===
    return `
      <div id="panel-header" style="padding: 12px 16px !important; background: #ffffff !important; border-bottom: 1px solid #E5E7EB !important; color: #1F2937 !important; display: flex !important; align-items: center !important; justify-content: space-between !important; cursor: pointer !important; border-radius: ${this.collapsed ? '12px' : '12px 12px 0 0'} !important; user-select: none !important;">
        <div style="display: flex !important; align-items: center !important; gap: 8px !important;">
          ${FloatingPanel.PRISM_LOGO_SVG}
          <span class="a11y-panel-title" style="color:#1F2937 !important;">Accessibility Prism</span>
          <span style="background: #EEF2FF !important; padding: 2px 8px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 700 !important; color: #4F46E5 !important; line-height: 1.5 !important;">v3</span>
        </div>
        <div style="display: flex !important; align-items: center !important; gap: 8px !important;">
          <div class="a11y-tooltip-wrap" style="position:relative !important; display:inline-flex !important;">
            <button id="btn-refresh" aria-label="Clear results and overlay"
              class="a11y-hdr-btn a11y-hdr-btn-light"
              style="background: #F3F4F6 !important; border: 1px solid #E5E7EB !important; border-radius: 6px !important; width: 30px !important; height: 30px !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; color: #6B7280 !important; transition: all 0.15s !important;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            </button>
            <span class="a11y-tooltip" role="tooltip">Clear results &amp; overlay</span>
          </div>
          <div class="a11y-tooltip-wrap" style="position:relative !important; display:inline-flex !important;">
            <button id="btn-export" aria-label="Download accessibility report"
              class="a11y-hdr-btn a11y-hdr-btn-light"
              style="background: #F3F4F6 !important; border: 1px solid #E5E7EB !important; border-radius: 6px !important; width: 30px !important; height: 30px !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; color: #4B5563 !important; transition: all 0.15s !important;">
              ${icons.ICON_EXPORT}
            </button>
            <span class="a11y-tooltip" role="tooltip">Download report</span>
          </div>
          <button id="btn-close-panel" title="Close Accessibility Prism"
            class="a11y-hdr-btn a11y-hdr-btn-close-light"
            style="background: #F3F4F6 !important; border: 1px solid #E5E7EB !important; border-radius: 6px !important; width: 30px !important; height: 30px !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; color: #4B5563 !important; transition: all 0.15s !important;">
            ${icons.ICON_CLOSE}
          </button>
          <span id="collapse-icon" style="display: flex !important; align-items: center !important; color: #6B7280 !important; margin-left: 4px !important;">
            ${this.collapsed ? icons.ICON_MAXIMIZE : icons.ICON_MINIMIZE}
          </span>
        </div>
      </div>
    `;
  }

  public destroy() {
    this.container.remove();
    document.getElementById('a11y-panel-scoped-styles')?.remove();
  }

  private attachHeaderListeners() {
    this.container.querySelector('#btn-export')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onExportReport();
    });

    this.container.querySelector('#btn-refresh')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetToHome();
      this.callbacks.onRefresh();
    });

    // Standalone fixture only: collapse toggle + close button
    if (!this.callbacks.isPopupWindow) {
      const header = this.container.querySelector('#panel-header') as HTMLElement;
      if (header) {
        header.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.closest('#btn-export') || target.closest('#btn-refresh') || target.closest('#btn-close-panel')) return;
          this.collapsed = !this.collapsed;
          this.render();
        });
      }
      this.container.querySelector('#btn-close-panel')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onClose();
      });
    }
  }

  /** Reset all panel state and return to the home screen. Called by the refresh button. */
  private resetToHome() {
    this.currentView = 'pre-screen';
    this.scopeElement = null;
    this.scopeLabel = '';
    this.pendingRerunView = null;
    this.violations = [];
    this.components = new Map();
    this.dedupedIssues = [];
    this.regions = [];
    this.keyboardIssues = [];
    this.componentFlows = [];
    this.headingData = { headings: [], issues: [] };
    this.landmarkData = { landmarks: [], issues: [] };
    this.contrastIssues = [];
    this.focusMgmtIssues = [];
    this.liveRegionData = { regions: [], issues: [] };
    this.touchTargetIssues = [];
    this.altTextIssues = [];
    this.accNameResult = { entries: [], issueCount: 0, warningCount: 0 };
    this.ariaResult = { issues: [], errorCount: 0, warningCount: 0 };
    this.formLabelsResult = { issues: [], totalControls: 0, labeledControls: 0 };
    this.walkthroughEntries = [];
    this.walkthroughIndex = 0;
    this.readingOrderEntries = [];
    this.scorecardData = null;
    this.manualTrail = [];
    this.manualRecordingStarted = false;
    this.tabWalkProgress = null;
    this.scrollPositions.clear();
    this.render();
  }

  // === View rendering delegation ===

  private renderScopeBanner(): string {
    if (this.scopeElement || this.scopeLabel) {
      return `
        <div style="padding: 6px 16px !important; background: #EFF6FF !important; border-bottom: 1px solid #BFDBFE !important; display: flex !important; align-items: center !important; gap: 8px !important; font-size: 12px !important; color: #1E40AF !important; box-sizing: border-box !important; margin: 0 !important; line-height: 1.4 !important;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" style="flex-shrink: 0 !important;">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span style="font-weight: 600 !important; color: #1E40AF !important; font-size: 12px !important; line-height: 1.4 !important;">Scoped:</span>
          <code style="background: #DBEAFE !important; padding: 1px 6px !important; border-radius: 4px !important; font-size: 11px !important; color: #1E3A8A !important; max-width: 180px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; line-height: 1.4 !important; box-sizing: border-box !important; margin: 0 !important;">${this.escHtml(this.scopeLabel)}</code>
          <button id="btn-clear-scope" style="margin-left: auto !important; background: none !important; border: 1px solid #93C5FD !important; border-radius: 4px !important; padding: 2px 8px !important; font-size: 11px !important; color: #1D4ED8 !important; cursor: pointer !important; font-weight: 600 !important; line-height: 1.4 !important; box-sizing: border-box !important; margin: 0 !important;">Clear</button>
        </div>
      `;
    }

    return `
      <div style="padding: 6px 12px !important; background: #F9FAFB !important; border-bottom: 1px solid #E5E7EB !important; display: flex !important; align-items: center !important; gap: 6px !important; box-sizing: border-box !important; margin: 0 !important; line-height: 1.4 !important;">
        <input id="scope-selector-input" type="text" placeholder="Scope to selector…"
          style="flex: 1 !important; padding: 4px 8px !important; border: 1px solid #D1D5DB !important; border-radius: 6px !important; font-size: 11px !important; font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important; background: white !important; color: #1F2937 !important; outline: none !important; box-sizing: border-box !important; height: 28px !important; margin: 0 !important; line-height: 1.4 !important; min-width: 0 !important;" />
        <button id="btn-scope-apply" title="Apply selector scope"
          style="padding: 4px 8px !important; background: #2563EB !important; color: white !important; border: none !important; border-radius: 6px !important; cursor: pointer !important; font-size: 11px !important; font-weight: 600 !important; white-space: nowrap !important; box-sizing: border-box !important; height: 28px !important; margin: 0 !important; line-height: 1.4 !important;">Scope</button>
        <button id="btn-scope-pick" title="Pick element on page"
          style="padding: 4px 6px !important; background: #F3F4F6 !important; border: 1px solid #D1D5DB !important; border-radius: 6px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; height: 28px !important; width: 28px !important; margin: 0 !important; flex-shrink: 0 !important;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>
    `;
  }

  private escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private renderViewContent(): string {
    const sb = this.renderScopeBanner();
    switch (this.currentView) {
      case 'pre-screen': return renderPreScreen();
      case 'axe-issue-list': return sb + renderAxeIssueList(this.getAxeListData());
      case 'axe-issue-details':
        if (!this.activeViolation) return sb + renderAxeIssueList(this.getAxeListData());
        return sb + renderAxeIssueDetails(this.activeViolation);
      case 'keyboard-issues': return sb + renderKeyboardResults(this.getKbData());
      case 'manual-tracking': return renderManualTracking(this.manualTrail, this.manualRecordingStarted);
      case 'component-flow-list': return sb + renderComponentFlowList(this.componentFlows);
      case 'component-flow-detail': {
        const flow = this.componentFlows[this.activeFlowIdx];
        if (!flow) return sb + renderComponentFlowList(this.componentFlows);
        return sb + renderComponentFlowDetail(flow, this.activeInstanceIdx);
      }
      case 'heading-results': return sb + renderHeadingResults(this.headingData);
      case 'landmark-results': return sb + renderLandmarkResults(this.landmarkData);
      case 'contrast-results': return sb + renderContrastResults(this.contrastIssues);
      case 'focus-mgmt-results': return sb + renderFocusMgmtResults(this.focusMgmtIssues);
      case 'live-region-results': return sb + renderLiveRegionResults({ result: this.liveRegionData, severityFilter: this.liveRegionSeverityFilter });
      case 'touch-target-results': return sb + renderTouchTargetResults(this.touchTargetIssues);
      case 'alt-text-results': return sb + renderAltTextResults(this.altTextIssues, this.altTextSeverityFilter);
      case 'acc-name-results': return sb + renderAccNameResults(this.getAccNameData());
      case 'aria-validation-results': return sb + renderAriaResults(this.ariaResult, this.ariaSeverityFilter);
      case 'form-labels-results': return sb + renderFormLabelsResults(this.formLabelsResult, this.formLabelsSeverityFilter);
      case 'sr-walkthrough': return sb + renderSrWalkthrough(this.getWalkthroughData());
      case 'reading-order': return sb + renderReadingOrderResults(this.readingOrderEntries);
      case 'scorecard': return this.scorecardData ? renderScorecardResults(this.scorecardData) : renderPreScreen();
      default: return renderPreScreen();
    }
  }

  private rerunCurrentAudit() {
    const viewToCallback: Record<string, (() => void) | undefined> = {
      'axe-issue-list': () => this.callbacks.onRunAxe(),
      'heading-results': () => this.callbacks.onRunHeadings(),
      'landmark-results': () => this.callbacks.onRunLandmarks(),
      'contrast-results': () => this.callbacks.onRunContrast(),
      'alt-text-results': () => this.callbacks.onRunAltText(),
      'form-labels-results': () => this.callbacks.onRunFormLabels(),
      'acc-name-results': () => this.callbacks.onRunAccNames(),
      'aria-validation-results': () => this.callbacks.onRunAriaValidation(),
      'keyboard-issues': () => this.callbacks.onRunAutoKeyboard(),
      'focus-mgmt-results': () => this.callbacks.onRunFocusMgmt(),
      'touch-target-results': () => this.callbacks.onRunTouchTargets(),
      'live-region-results': () => this.callbacks.onRunLiveRegions(),
      'sr-walkthrough': () => this.callbacks.onRunSrWalkthrough(),
      'reading-order': () => this.callbacks.onRunReadingOrder(),
      'scorecard': () => this.callbacks.onRunScorecard(),
    };
    const cb = viewToCallback[this.currentView];
    if (cb) cb();
  }

  private attachViewListeners() {
    const backToHome = () => {
      this.preserveScrollOnNavigate = true;
      this.currentView = 'pre-screen';
      this.clearScope();
      this.callbacks.onViolationClick([]);
      this.render();
    };
    const highlight = (els: (Element | null)[]) =>
      this.callbacks.onViolationClick(els.filter((e): e is Element => e !== null));

    // Scope banner listeners (present on every result view)
    this.container.querySelector('#btn-clear-scope')?.addEventListener('click', () => {
      this.clearScope();
      this.callbacks.onViolationClick([]);
      this.rerunCurrentAudit();
    });
    this.container.querySelector('#btn-scope-pick')?.addEventListener('click', () => {
      this.pendingRerunView = this.currentView;
      this.callbacks.onScopePick();
    });
    const scopeInput = this.container.querySelector('#scope-selector-input') as HTMLInputElement | null;
    const scopeApplyBtn = this.container.querySelector('#btn-scope-apply');
    const applyScope = () => {
      if (!scopeInput) return;
      const sel = scopeInput.value.trim();
      if (!sel) return;
      const ok = this.callbacks.onScopeSelector(sel);
      if (ok) {
        this.rerunCurrentAudit();
      } else {
        scopeInput.style.setProperty('border-color', '#EF4444', 'important');
        scopeInput.style.setProperty('box-shadow', '0 0 0 2px rgba(239,68,68,0.15)', 'important');
        setTimeout(() => {
          scopeInput?.style.setProperty('border-color', '#D1D5DB', 'important');
          scopeInput?.style.setProperty('box-shadow', 'none', 'important');
        }, 1500);
      }
    };
    scopeApplyBtn?.addEventListener('click', applyScope);
    scopeInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyScope(); });

    switch (this.currentView) {
      case 'pre-screen':
        attachPreScreenListeners(this.container, {
          onRunAxe: () => this.callbacks.onRunAxe(),
          onRunAutoKeyboard: () => this.callbacks.onRunAutoKeyboard(),
          onStartManual: () => { this.manualRecordingStarted = false; this.currentView = 'manual-tracking'; this.render(); },
          onRunHeadings: () => this.callbacks.onRunHeadings(),
          onRunLandmarks: () => this.callbacks.onRunLandmarks(),
          onRunContrast: () => this.callbacks.onRunContrast(),
          onRunFocusMgmt: () => this.callbacks.onRunFocusMgmt(),
          onRunLiveRegions: () => this.callbacks.onRunLiveRegions(),
          onRunTouchTargets: () => this.callbacks.onRunTouchTargets(),
          onRunAltText: () => this.callbacks.onRunAltText(),
          onPartialScan: () => this.callbacks.onPartialScan(),
          onRunAccNames: () => this.callbacks.onRunAccNames(),
          onRunAriaValidation: () => this.callbacks.onRunAriaValidation(),
          onRunFormLabels: () => this.callbacks.onRunFormLabels(),
          onRunSrWalkthrough: () => this.callbacks.onRunSrWalkthrough(),
          onRunReadingOrder: () => this.callbacks.onRunReadingOrder(),
          onRunScorecard: () => this.callbacks.onRunScorecard(),
        });
        break;

      case 'axe-issue-list':
        attachAxeListListeners(this.container, this.getAxeListData(), {
          onBack: backToHome,
          onExport: () => this.callbacks.onExportReport(),
          onHighlight: highlight,
          onNavigateDetails: (v) => {
            this.activeViolation = v;
            this.currentView = 'axe-issue-details';
            this.render();
          },
          onFilterChange: (search, sev, mode, activeTypes, impactSet) => {
            this.searchQuery = search; this.filterSeverity = sev as any; this.groupMode = mode; this.activeResultTypes = activeTypes; this.filterImpact = impactSet;
            const cursorPos = (this.container.querySelector('#filter-search') as HTMLInputElement)?.selectionStart ?? search.length;
            this.render();
            const input = this.container.querySelector('#filter-search') as HTMLInputElement;
            if (input) { input.focus(); input.setSelectionRange(cursorPos, cursorPos); }
          },
        });
        break;

      case 'axe-issue-details':
        if (this.activeViolation) {
          attachAxeDetailsListeners(this.container, this.activeViolation, {
            onBack: () => {
              this.preserveScrollOnNavigate = true;
              this.currentView = 'axe-issue-list';
              this.render();
            },
            onHighlight: highlight,
          });
        }
        break;

      case 'keyboard-issues':
        attachKeyboardListeners(this.container, this.getKbData(), {
          onBack: backToHome,
          onHighlight: highlight,
          onNavigateFlow: () => { this.currentView = 'component-flow-list'; this.render(); },
          onGroupModeChange: (mode) => { this.kbGroupMode = mode; this.render(); },
          onSeverityFilterChange: (filter) => { this.kbSeverityFilter = filter; this.render(); },
        });
        break;

      case 'manual-tracking':
        attachManualListeners(this.container, {
          onBeginRecording: () => {
            this.manualRecordingStarted = true;
            this.callbacks.onBeginManualRecording();
            this.render();
          },
          onReset: () => this.callbacks.onResetManualTrail(),
          onStop: () => this.callbacks.onStopManualKeyboard(),
          onBack: () => { this.callbacks.onStopManualKeyboard(); this.manualRecordingStarted = false; backToHome(); },
          onHighlightTrailEntry: (selector) => {
            if (this.callbacks.onHighlightBySelector) {
              // Popup mode: delegate to content script via message
              this.callbacks.onHighlightBySelector(selector);
            } else {
              // Standalone mode: query the injected-page DOM directly
              highlight([document.querySelector(selector)]);
            }
          },
        });
        break;

      case 'component-flow-list':
        attachFlowListListeners(this.container, this.componentFlows, {
          onBack: () => {
            this.preserveScrollOnNavigate = true;
            this.currentView = this.keyboardIssues.length > 0 ? 'keyboard-issues' : 'pre-screen';
            this.callbacks.onViolationClick([]);
            this.render();
          },
          onSelectFlow: (idx) => { this.activeFlowIdx = idx; this.activeInstanceIdx = 0; this.currentView = 'component-flow-detail'; this.render(); },
        });
        break;

      case 'component-flow-detail': {
        const flow = this.componentFlows[this.activeFlowIdx];
        if (flow) {
          attachFlowDetailListeners(this.container, flow, this.activeInstanceIdx, {
            onBack: () => {
              this.preserveScrollOnNavigate = true;
              this.currentView = 'component-flow-list';
              this.callbacks.onViolationClick([]);
              this.render();
            },
            onHighlight: highlight,
            onPrev: () => { this.activeInstanceIdx--; this.render(); },
            onNext: () => { this.activeInstanceIdx++; this.render(); },
            onShowFlow: (f, idx) => this.callbacks.onShowComponentFlow(f, idx),
          });
        }
        break;
      }

      case 'heading-results':
        attachHeadingListeners(this.container, this.headingData, { onBack: backToHome, onHighlight: highlight });
        break;

      case 'landmark-results':
        attachLandmarkListeners(this.container, this.landmarkData, { onBack: backToHome, onHighlight: highlight });
        break;

      case 'contrast-results':
        attachContrastListeners(this.container, this.contrastIssues, { onBack: backToHome, onHighlight: highlight });
        break;

      case 'focus-mgmt-results':
        attachFocusMgmtListeners(this.container, this.focusMgmtIssues, { onBack: backToHome, onHighlight: highlight });
        break;

      case 'live-region-results':
        attachLiveRegionListeners(
          this.container,
          { result: this.liveRegionData, severityFilter: this.liveRegionSeverityFilter },
          {
            onBack: backToHome,
            onHighlight: highlight,
            onSeverityChange: next => {
              this.liveRegionSeverityFilter = next;
              this.render();
            },
          },
        );
        break;

      case 'touch-target-results':
        attachTouchTargetListeners(this.container, this.touchTargetIssues, { onBack: backToHome, onHighlight: highlight });
        break;

      case 'alt-text-results':
        attachAltTextListeners(
          this.container,
          this.altTextIssues,
          {
            onBack: backToHome,
            onHighlight: highlight,
            onSeverityChange: next => {
              this.altTextSeverityFilter = next;
              this.render();
            },
          },
          this.altTextSeverityFilter,
        );
        break;

      case 'acc-name-results':
        attachAccNameListeners(this.container, this.getAccNameData(), {
          onBack: backToHome,
          onHighlight: highlight,
          onShowInDevTools: this.callbacks.onShowInDevTools
            ? (idx, sel) => this.callbacks.onShowInDevTools!('acc-names', idx, sel)
            : undefined,
          onSeverityChange: next => {
            this.accNameSeverityFilter = next;
            this.render();
          },
          onSearchInput: value => {
            this.accNameSearch = value;
            const cursorPos =
              (this.container.querySelector('.a11y-search-input') as HTMLInputElement)?.selectionStart ??
              value.length;
            this.render();
            const input = this.container.querySelector('.a11y-search-input') as HTMLInputElement;
            if (input) {
              input.focus();
              input.setSelectionRange(cursorPos, cursorPos);
            }
          },
        });
        break;

      case 'aria-validation-results':
        attachAriaListeners(
          this.container,
          this.ariaResult,
          {
            onBack: backToHome,
            onHighlight: highlight,
            onShowInDevTools: this.callbacks.onShowInDevTools
              ? (idx, sel) => this.callbacks.onShowInDevTools!('aria', idx, sel)
              : undefined,
            onSeverityChange: next => {
              this.ariaSeverityFilter = next;
              this.render();
            },
          },
          this.ariaSeverityFilter,
        );
        break;

      case 'form-labels-results':
        attachFormLabelsListeners(
          this.container,
          this.formLabelsResult,
          {
            onBack: backToHome,
            onHighlight: highlight,
            onShowInDevTools: this.callbacks.onShowInDevTools
              ? (idx, sel) => this.callbacks.onShowInDevTools!('form-labels', idx, sel)
              : undefined,
            onSeverityChange: next => {
              this.formLabelsSeverityFilter = next;
              this.render();
            },
          },
          this.formLabelsSeverityFilter,
        );
        break;

      case 'sr-walkthrough':
        attachWalkthroughListeners(this.container, this.getWalkthroughData(), {
          onBack: backToHome, onHighlight: highlight,
          onNavigate: (idx) => { this.walkthroughIndex = idx; this.render(); },
        });
        break;

      case 'reading-order':
        attachReadingOrderListeners(this.container, this.readingOrderEntries, { onBack: backToHome, onHighlight: highlight });
        break;

      case 'scorecard':
        if (this.scorecardData) {
          attachScorecardListeners(this.container, this.scorecardData, {
            onBack: backToHome,
            onExportScorecard: () => this.callbacks.onExportScorecard(),
          });
        }
        break;
    }
  }

  // === Data helpers ===

  private getAxeListData(): AxeListData {
    return {
      violations: this.violations, components: this.components, dedupedIssues: this.dedupedIssues,
      regions: this.regions, searchQuery: this.searchQuery, filterSeverity: this.filterSeverity,
      groupMode: this.groupMode, activeResultTypes: this.activeResultTypes,
      filterImpact: this.filterImpact,
    };
  }

  private getKbData(): KbData {
    return {
      issues: this.keyboardIssues, componentFlows: this.componentFlows, components: this.components,
      groupMode: this.kbGroupMode, severityFilter: this.kbSeverityFilter,
      missedStops: this.missedTabStops,
    };
  }

  private getAccNameData(): AccNameData {
    return {
      result: this.accNameResult,
      searchQuery: this.accNameSearch,
      activeSeverities: this.accNameSeverityFilter,
    };
  }

  private getWalkthroughData(): WalkthroughData {
    return { entries: this.walkthroughEntries, currentIndex: this.walkthroughIndex };
  }
}
