export interface AxeCheckResult {
  id: string;
  message: string;
  impact: string;
  data: any;
}

export interface AxeViolationNode {
  target: string[];
  html: string;
  element: Element | null;
  failureSummary: string;
  any: AxeCheckResult[];
  all: AxeCheckResult[];
  none: AxeCheckResult[];
}

export type AxeResultType = 'violation' | 'needs-review' | 'best-practice' | 'experimental';

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null | undefined;
  tags: string[];
  help: string;
  helpUrl: string;
  description: string;
  nodes: AxeViolationNode[];
  resultType: AxeResultType;
}

export interface ComponentCluster {
  id: string;
  signature: string;
  elements: Element[];
  name: string;
  confidence: number;
}

export interface ComponentIssue {
  componentId: string;
  componentName: string;
  ruleId: string;
  severity: string | null | undefined;
  help: string;
  helpUrl: string;
  tags?: string[];
  resultType: AxeResultType;
  count: number;
  instanceCount: number;
  nodes: Element[];
}

export type KeyboardIssueType =
  | 'not-focusable'
  | 'positive-tabindex'
  | 'missing-skip-link'
  | 'focus-trap-missing'
  | 'tab-visual-mismatch'
  | 'missing-focus-style'
  | 'mouse-only-handler'
  | 'phantom-focus'
  | 'redundant-focus'
  | 'focusable-in-aria-hidden'
  | 'no-accessible-name'
  | 'double-tab-stop';

export type KeyboardPriority = 1 | 2 | 3 | 4;

export interface KeyboardIssue {
  element: Element;
  type: KeyboardIssueType;
  severity: 'error' | 'warning' | 'info';
  priority: KeyboardPriority;
  description: string;
}

export const KB_TYPE_LABELS: Record<KeyboardIssueType, string> = {
  'not-focusable': 'Not Keyboard Focusable',
  'positive-tabindex': 'Positive Tabindex',
  'missing-skip-link': 'Missing Skip Link',
  'focus-trap-missing': 'Focus Trap Missing',
  'tab-visual-mismatch': 'Tab/Visual Order Mismatch',
  'missing-focus-style': 'Missing Focus Indicator',
  'mouse-only-handler': 'Mouse-Only Handler',
  'phantom-focus': 'Phantom Focus (No Interaction)',
  'redundant-focus': 'Redundant Focus (Inside Clickable)',
  'focusable-in-aria-hidden': 'Focusable Inside aria-hidden',
  'no-accessible-name': 'No Accessible Name',
  'double-tab-stop': 'Double/Redundant Tab Stop',
};

export const KB_TYPE_PRIORITY: Record<KeyboardIssueType, KeyboardPriority> = {
  'focusable-in-aria-hidden': 1,
  'focus-trap-missing': 1,
  'not-focusable': 1,
  'phantom-focus': 2,
  'no-accessible-name': 2,
  'mouse-only-handler': 2,
  'double-tab-stop': 3,
  'redundant-focus': 3,
  'positive-tabindex': 3,
  'tab-visual-mismatch': 3,
  'missing-focus-style': 4,
  'missing-skip-link': 4,
};

export const KB_PRIORITY_LABELS: Record<KeyboardPriority, string> = {
  1: 'P1 Critical',
  2: 'P2 High',
  3: 'P3 Medium',
  4: 'P4 Low',
};

export interface ComponentTabFlow {
  component: ComponentCluster;
  instances: {
    root: Element;
    focusable: Element[];
    entryFrom: Element | null;
    exitTo: Element | null;
    issues: KeyboardIssue[];
  }[];
}

// === Heading Analysis ===

export interface HeadingNode {
  element: Element;
  level: number;
  text: string;
  /** Full accessible name (per W3C accname computation) — accounts for aria-label,
   * aria-labelledby, and img alt text, unlike `text` which is raw visible textContent. */
  accessibleName: string;
}

export type HeadingIssueType = 'missing-h1' | 'multiple-h1' | 'skipped-level' | 'empty-heading';

export interface HeadingIssue {
  type: HeadingIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  element: Element | null;
}

export interface HeadingAnalysisResult {
  headings: HeadingNode[];
  issues: HeadingIssue[];
}

// === Landmark Analysis ===

export type LandmarkIssueType = 'missing-main' | 'missing-nav' | 'duplicate-landmark' | 'nested-landmark' | 'content-outside-landmark';

export interface LandmarkInfo {
  element: Element;
  role: string;
  label: string;
}

export interface LandmarkIssue {
  type: LandmarkIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  element: Element | null;
}

export interface LandmarkAnalysisResult {
  landmarks: LandmarkInfo[];
  issues: LandmarkIssue[];
}

// === Color Contrast ===

export interface ContrastIssue {
  element: Element;
  text: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredAA: number;
  requiredAAA: number;
  passesAA: boolean;
  passesAAA: boolean;
  fontSize: number;
  isBold: boolean;
  isLargeText: boolean;
}

// === Focus Management ===

export type FocusIssueType =
  | 'no-focus-trap'
  | 'no-return-focus'
  | 'no-escape-close'
  | 'missing-role-dialog'
  | 'missing-aria-label'
  | 'no-initial-focus';

export interface FocusManagementIssue {
  type: FocusIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  element: Element;
}

// === Live Region Monitor ===

export interface LiveRegionInfo {
  element: Element;
  role: string;
  ariaLive: string;
  ariaAtomic: string;
  hasContent: boolean;
}

export type LiveRegionIssueType = 'missing-aria-live' | 'implicit-live-region' | 'live-region-hidden' | 'empty-alert';

export const LR_TYPE_LABELS: Record<LiveRegionIssueType, string> = {
  'empty-alert': 'Empty Alert Region',
  'live-region-hidden': 'Hidden Live Region',
  'implicit-live-region': 'Implicit Live Region',
  'missing-aria-live': 'Missing Semantic Role',
};

export interface LiveRegionIssue {
  type: LiveRegionIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  element: Element;
}

export interface LiveRegionResult {
  regions: LiveRegionInfo[];
  issues: LiveRegionIssue[];
}

// === Touch Target Size ===

export interface TouchTargetIssue {
  element: Element;
  width: number;
  height: number;
  minRequired: number;
  level: 'AA' | 'AAA';
  severity: 'error' | 'warning';
  description: string;
  context: string;
}

// === Alt Text Audit ===

export type AltTextIssueType =
  | 'missing-alt'
  | 'empty-alt-in-link'
  | 'suspicious-alt'
  | 'long-alt'
  | 'decorative-with-role';

export interface AltTextIssue {
  element: Element;
  type: AltTextIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  currentAlt: string | null;
}

// === Accessible Name Inspector ===

export interface AccNameEntry {
  /** DOM element reference. Null for entries sourced from the chrome.automation AX tree
   *  (which have no 1:1 element mapping). Highlight overlay is skipped when null. */
  element: Element | null;
  role: string;
  name: string;
  description: string;
  states: string[];
  ariaHidden: boolean;
  severity?: 'error' | 'warning' | 'pass';
  announcement?: string;
}

export interface AccNameResult {
  entries: AccNameEntry[];
  issueCount: number;
  warningCount: number;
}

// === ARIA Validation ===

export type AriaIssueType =
  | 'invalid-role'
  | 'redundant-role'
  | 'missing-required-prop'
  | 'broken-reference'
  | 'hidden-focusable'
  | 'presentation-conflict'
  | 'invalid-value'
  | 'positive-tabindex';

export interface AriaIssue {
  element: Element;
  type: AriaIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
}

export interface AriaValidationResult {
  issues: AriaIssue[];
  errorCount: number;
  warningCount: number;
}

// === Form Labels ===

export type FormLabelIssueType =
  | 'missing-label'
  | 'placeholder-only'
  | 'title-only'
  | 'missing-fieldset-legend'
  | 'ungrouped-radio';

export interface FormLabelIssue {
  element: Element;
  type: FormLabelIssueType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  labelMethod: string;
  fieldType: string;
}

export interface FormLabelsResult {
  issues: FormLabelIssue[];
  totalControls: number;
  labeledControls: number;
}
