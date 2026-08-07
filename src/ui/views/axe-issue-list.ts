import type { AxeViolation, AxeResultType, ComponentCluster, ComponentIssue } from '../../core/types';
import type { PageRegion } from '../../core/region-detection';
import { parseWcagInfo, getElementContext } from '../../utils/wcag-map';
import { escHtml } from '../../utils/escape';
import { IMPACT, WCAG_LEVEL, HIGHLIGHT, BORDER, RESULT_TYPE } from '../tokens';
import { renderNavBar, renderAccordion, attachAccordionListeners, renderCountBadge, hoverListeners } from './helpers';

const UNCATEGORIZED_ID = 'cmp_uncategorized';

const IMPACT_LEVELS = ['critical', 'serious', 'moderate', 'minor'] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

function normalizeImpactKey(impact: string | null | undefined): ImpactLevel {
  const k = (impact || 'minor').toLowerCase();
  return (IMPACT_LEVELS as readonly string[]).includes(k) ? (k as ImpactLevel) : 'minor';
}

export type GroupMode = 'rule' | 'region' | 'component';

export interface AxeListData {
  violations: AxeViolation[];
  components: Map<string, ComponentCluster>;
  dedupedIssues: ComponentIssue[];
  regions: PageRegion[];
  searchQuery: string;
  filterSeverity: 'ALL' | 'AA' | 'AAA';
  groupMode: GroupMode;
  activeResultTypes: Set<AxeResultType>;
  /** Active axe impact levels; default all four. */
  filterImpact: Set<string>;
}

function resultTypeBadge(type: AxeResultType): string {
  const t = RESULT_TYPE[type];
  return `<span style="background: ${t.bg} !important; color: ${t.text} !important; border: 1px solid ${t.border} !important; padding: 2px 7px !important; border-radius: 4px !important; font-size: 10px !important; font-weight: 600 !important; white-space: nowrap !important;">${t.icon} ${t.label}</span>`;
}

function resultTypeChip(type: AxeResultType, active: boolean, count: number): string {
  const t = RESULT_TYPE[type];
  const bg = active ? t.bg : 'white';
  const border = active ? t.border : '#D1D5DB';
  const color = active ? t.text : '#6B7280';
  return `
    <button type="button" class="result-type-chip" data-type="${type}" style="padding: 6px 12px !important; border: 1.5px solid ${border} !important; border-radius: 6px !important; font-size: 11px !important; cursor: pointer !important; background: ${bg} !important; color: ${color} !important; font-weight: 600 !important; transition: all 0.15s !important; display: flex !important; align-items: center !important; gap: 4px !important; white-space: nowrap !important;">
      <span style="font-size: 10px !important;">${t.icon}</span>
      ${t.label}
      <span style="background: ${active ? t.badge : '#D1D5DB'} !important; color: white !important; padding: 1px 6px !important; border-radius: 10px !important; font-size: 10px !important; font-weight: 700 !important; min-width: 18px !important; text-align: center !important;">${count}</span>
    </button>`;
}

function impactFilterChip(level: ImpactLevel, active: boolean, count: number): string {
  const t = IMPACT[level];
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  const bg = active ? t.bg : 'white';
  const border = active ? t.border : '#D1D5DB';
  const color = active ? t.text : '#6B7280';
  return `
    <button type="button" class="result-type-chip impact-filter-chip" data-impact="${level}" style="padding: 6px 12px !important; border: 1.5px solid ${border} !important; border-radius: 6px !important; font-size: 11px !important; cursor: pointer !important; background: ${bg} !important; color: ${color} !important; font-weight: 600 !important; transition: all 0.15s !important; display: flex !important; align-items: center !important; gap: 4px !important; white-space: nowrap !important;">
      ${label}
      <span style="background: ${active ? t.badge : '#D1D5DB'} !important; color: white !important; padding: 1px 6px !important; border-radius: 10px !important; font-size: 10px !important; font-weight: 700 !important; min-width: 18px !important; text-align: center !important;">${count}</span>
    </button>`;
}

export function renderAxeIssueList(data: AxeListData): string {
  const active = data.activeResultTypes;
  const filterImpact = data.filterImpact;
  const violationsByResultType = data.violations.filter(v => active.has(v.resultType));
  const visibleViolations = violationsByResultType.filter(v => filterImpact.has(normalizeImpactKey(v.impact)));

  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  violationsByResultType.forEach(v => {
    const key = normalizeImpactKey(v.impact);
    counts[key] += v.nodes.length;
  });

  const typeCounts: Record<AxeResultType, number> = { violation: 0, 'needs-review': 0, 'best-practice': 0, experimental: 0 };
  data.violations.forEach(v => { typeCounts[v.resultType] = (typeCounts[v.resultType] || 0) + v.nodes.length; });

  let html = renderNavBar('Issues', true, 'Back');

  // Result type filter chips
  // TEMPORARILY DISABLED — 'best-practice' and 'experimental' chips hidden while those
  // classifications are disabled at the source (see core/axe-runner.ts runAxe()).
  html += `
    <div style="padding: 10px 16px !important; background: white !important; border-bottom: 1px solid ${BORDER} !important; display: flex !important; gap: 8px !important; flex-wrap: wrap !important;">
      ${resultTypeChip('violation', active.has('violation'), typeCounts.violation)}
      ${resultTypeChip('needs-review', active.has('needs-review'), typeCounts['needs-review'])}
      ${/* resultTypeChip('best-practice', active.has('best-practice'), typeCounts['best-practice']) */ ''}
      ${/* typeCounts.experimental > 0 ? resultTypeChip('experimental', active.has('experimental'), typeCounts.experimental) : '' */ ''}
    </div>
  `;

  // Impact filter chips
  html += `
    <div style="padding: 10px 16px !important; background: white !important; border-bottom: 1px solid ${BORDER} !important; display: flex !important; gap: 8px !important; flex-wrap: wrap !important;">
      ${impactFilterChip('critical', filterImpact.has('critical'), counts.critical)}
      ${impactFilterChip('serious', filterImpact.has('serious'), counts.serious)}
      ${impactFilterChip('moderate', filterImpact.has('moderate'), counts.moderate)}
      ${impactFilterChip('minor', filterImpact.has('minor'), counts.minor)}
    </div>
  `;

  // Search + severity filter + group mode
  html += `
    <div style="background: white !important; padding: 12px 16px !important; border-bottom: 1px solid ${BORDER} !important;">
      <div style="display: flex !important; gap: 8px !important; margin-bottom: 10px !important; align-items: center !important;">
        <input type="text" id="filter-search" aria-label="Search issues" value="${escHtml(data.searchQuery)}" placeholder="Search by rule, WCAG criterion, tag..." style="flex: 1 !important; min-width: 0 !important; padding: 8px 12px !important; border: 1px solid #D1D5DB !important; border-radius: 8px !important; font-size: 13px !important; outline: none !important; color: #1F2937 !important; background: white !important; transition: border-color 0.15s !important;" onfocus="this.style.setProperty('border-color','#6366F1','important')" onblur="this.style.setProperty('border-color','#D1D5DB','important')" />
        <select id="filter-severity" aria-label="Filter by WCAG level" style="width: 110px !important; flex-shrink: 0 !important; padding: 8px 6px !important; border: 1px solid #D1D5DB !important; border-radius: 8px !important; font-size: 12px !important; background: white !important; color: #374151 !important; cursor: pointer !important;">
          <option value="ALL" ${data.filterSeverity === 'ALL' ? 'selected' : ''}>All levels</option>
          <option value="AA" ${data.filterSeverity === 'AA' ? 'selected' : ''}>A + AA</option>
          <option value="AAA" ${data.filterSeverity === 'AAA' ? 'selected' : ''}>AAA only</option>
        </select>
      </div>
      <div style="display: flex !important; gap: 8px !important; flex-wrap: wrap !important;">
        ${(['rule', 'region', 'component'] as GroupMode[]).map(mode => {
          const isActive = data.groupMode === mode;
          return `<button class="group-mode-btn" data-mode="${mode}" style="padding: 6px 14px !important; border: 1px solid ${isActive ? '#6366F1' : '#D1D5DB'} !important; border-radius: 6px !important; font-size: 12px !important; cursor: pointer !important; background: ${isActive ? '#EEF2FF' : 'white'} !important; color: ${isActive ? '#6366F1' : '#6B7280'} !important; font-weight: ${isActive ? '600' : '500'} !important; transition: all 0.15s !important; white-space: nowrap !important; flex-shrink: 0 !important;">
            ${mode === 'rule' ? 'By Rule' : mode === 'region' ? 'By Region' : 'By Component'}
          </button>`;
        }).join('')}
      </div>
    </div>
  `;

  html += `<div id="scroll-area" class="a11y-scroll-area" tabindex="0">`;

  const filteredData = { ...data, violations: visibleViolations };

  if (data.groupMode === 'component') {
    html += renderComponentGroup(filteredData);
  } else if (data.groupMode === 'region') {
    html += renderRegionGroup(filteredData);
  } else {
    html += renderRuleGroup(filteredData);
  }

  html += `</div>`;
  return html;
}

/** Same ordering as `renderComponentGroup` for click handlers. */
function getSortedFilteredComponentGroups(data: AxeListData): [string, ComponentIssue[]][] {
  const filtered = data.dedupedIssues.filter(i => {
    if (!data.activeResultTypes.has(i.resultType)) return false;
    if (!data.filterImpact.has(normalizeImpactKey(i.severity))) return false;
    const s = data.searchQuery.toLowerCase();
    if (s) {
      const wcag = parseWcagInfo(i.tags || []);
      const searchableText = [i.help, i.ruleId, i.componentName, wcag.fullLabel, wcag.level, ...(i.tags || [])].join(' ').toLowerCase();
      if (!searchableText.includes(s)) return false;
    }
    const wcag = parseWcagInfo(i.tags || []);
    if (data.filterSeverity === 'AA' && wcag.level === 'AAA') return false;
    if (data.filterSeverity === 'AAA' && wcag.level !== 'AAA') return false;
    return true;
  });
  const byComponentFiltered = new Map<string, ComponentIssue[]>();
  filtered.forEach(issue => {
    if (!byComponentFiltered.has(issue.componentId)) byComponentFiltered.set(issue.componentId, []);
    byComponentFiltered.get(issue.componentId)!.push(issue);
  });
  return Array.from(byComponentFiltered.entries()).sort((a, b) => {
    const ac = a[1].reduce((s, i) => s + i.count, 0);
    const bc = b[1].reduce((s, i) => s + i.count, 0);
    return bc - ac;
  });
}

function filterViolations(violations: AxeViolation[], search: string, sev: string, filterImpact: Set<string>): AxeViolation[] {
  return violations.filter(v => {
    if (!filterImpact.has(normalizeImpactKey(v.impact))) return false;
    const s = search.toLowerCase();
    if (s) {
      const wcag = parseWcagInfo(v.tags);
      const searchableText = [
        v.help, v.id, v.description,
        wcag.fullLabel, wcag.level,
        ...v.tags
      ].join(' ').toLowerCase();
      if (!searchableText.includes(s)) return false;
    }
    const wcag = parseWcagInfo(v.tags);
    if (sev === 'AA' && wcag.level === 'AAA') return false;
    if (sev === 'AAA' && wcag.level !== 'AAA') return false;
    return true;
  });
}

function renderRuleGroup(data: AxeListData): string {
  const filtered = filterViolations(data.violations, data.searchQuery, data.filterSeverity, data.filterImpact);
  if (filtered.length === 0) return `<div style="text-align: center; padding: 24px; color: #15803D; font-weight: 500; font-size: 14px;">No issues found matching your filters.</div>`;

  let html = '';
  filtered.forEach(v => {
    const wcag = parseWcagInfo(v.tags);
    const impact = IMPACT[(v.impact || 'minor') as keyof typeof IMPACT] || IMPACT.minor;
    html += `
      <div class="rule-card" data-id="${v.id}" style="border-left: 3px solid ${impact.badge} !important; border-radius: 8px !important; padding: 16px !important; margin-bottom: 10px !important; cursor: pointer !important; transition: border-color 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;">
        <div style="display: flex !important; align-items: center !important; gap: 6px !important; margin-bottom: 8px !important;">
          <h3 style="margin: 0 !important; font-size: 14px !important; font-weight: 600 !important; line-height: 1.5 !important; color: #1F2937 !important; flex: 1 !important;">${escHtml(v.help)}</h3>
        </div>
        <div style="display: flex !important; justify-content: space-between !important; align-items: center !important;">
          <div style="display: flex !important; align-items: center !important; gap: 6px !important; flex-wrap: wrap !important;">
            ${resultTypeBadge(v.resultType)}
            <span style="background: ${WCAG_LEVEL[wcag.level]} !important; color: white !important; padding: 3px 8px !important; border-radius: 4px !important; font-weight: 600 !important; font-size: 11px !important;">${wcag.level}</span>
            <span style="font-size: 12px !important; color: #6B7280 !important;">${wcag.fullLabel || v.id}</span>
          </div>
          <div style="display: flex !important; align-items: center !important; gap: 8px !important;">
            ${renderCountBadge(v.nodes.length, impact.badge)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      </div>
    `;
  });
  return html;
}

function filterRegionViolations(violations: import('../../core/region-detection').RegionViolation[], data: AxeListData): import('../../core/region-detection').RegionViolation[] {
  return violations.filter(v => {
    if (!data.activeResultTypes.has(v.resultType as AxeResultType)) return false;
    if (!data.filterImpact.has(normalizeImpactKey(v.impact))) return false;
    const s = data.searchQuery.toLowerCase();
    if (s) {
      const wcag = parseWcagInfo(v.tags);
      const searchableText = [v.help, v.ruleId, wcag.fullLabel, wcag.level, ...v.tags].join(' ').toLowerCase();
      if (!searchableText.includes(s)) return false;
    }
    const wcag = parseWcagInfo(v.tags);
    if (data.filterSeverity === 'AA' && wcag.level === 'AAA') return false;
    if (data.filterSeverity === 'AAA' && wcag.level !== 'AAA') return false;
    return true;
  });
}

function renderRegionGroup(data: AxeListData): string {
  let html = '';
  data.regions.forEach((region, rIdx) => {
    const filtered = filterRegionViolations(region.violations, data);
    if (filtered.length === 0) return;

    const ruleGroups = new Map<string, { help: string; tags: string[]; nodes: { node: Element; html: string }[] }>();
    filtered.forEach(v => {
      if (!ruleGroups.has(v.ruleId)) ruleGroups.set(v.ruleId, { help: v.help, tags: v.tags, nodes: [] });
      ruleGroups.get(v.ruleId)!.nodes.push({ node: v.node, html: v.html });
    });

    let body = '';
    ruleGroups.forEach((group, ruleId) => {
      const wcag = parseWcagInfo(group.tags);
      body += renderRuleSubGroup(ruleId, group.help, wcag, group.nodes, `region-${rIdx}`);
    });

    html += renderAccordion(
      `region-${rIdx}`,
      `<span style="font-weight: 600; font-size: 14px; color: #1F2937;">${escHtml(region.name)}</span>`,
      renderCountBadge(filtered.length),
      body
    );
  });
  return html;
}

function renderComponentGroup(data: AxeListData): string {
  if (data.dedupedIssues.length === 0 && data.components.size === 0) {
    return `<div class="a11y-empty-state">No component clusters detected on this page.</div>`;
  }

  const sorted = getSortedFilteredComponentGroups(data);
  if (sorted.length === 0) {
    return `<div style="text-align: center; padding: 24px; color: #15803D; font-weight: 500; font-size: 14px;">No issues found matching your filters.</div>`;
  }

  let html = '';
  sorted.forEach(([compId, issues], cIdx) => {
    const cluster = data.components.get(compId);
    const compName = issues[0]?.componentName || cluster?.name || `Component ${compId.substring(4, 10)}`;
    const totalIssues = issues.reduce((s, i) => s + i.count, 0);
    const totalInstances = cluster?.elements.length || issues[0]?.instanceCount || 0;

    const affectedElements = new Set<Element>();
    issues.forEach(issue => issue.nodes.forEach(n => {
      if (cluster) {
        const matched = cluster.elements.find(el => el.contains(n) || n.contains(el) || el === n);
        if (matched) affectedElements.add(matched);
      } else {
        affectedElements.add(n);
      }
    }));
    const affectedCount = affectedElements.size;

    let body = '';
    issues.forEach((issue, iIdx) => {
      const wcag = parseWcagInfo(issue.tags || []);
      const ruleKey = `comp-${cIdx}-rule-${iIdx}`;

      let nodeHtml = '';
      issue.nodes.forEach((nodeEl, nIdx) => {
        const context = getElementContext(nodeEl);
        nodeHtml += `
          <div class="comp-node" data-cidx="${cIdx}" data-iidx="${iIdx}" data-nidx="${nIdx}" style="padding: 8px 10px !important; margin-bottom: 4px !important; background: var(--node-bg, white) !important; border: 1px solid var(--node-border, #E5E7EB) !important; border-radius: 6px !important; cursor: pointer !important; font-size: 12px !important; color: #374151 !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: border-color 0.15s !important;">
            <span style="overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; flex: 1 !important;">${escHtml(context)}</span>
            <span style="color: ${HIGHLIGHT} !important; font-weight: 500 !important; flex-shrink: 0 !important; margin-left: 8px !important; font-size: 12px !important;">Highlight &rarr;</span>
          </div>
        `;
      });

      body += renderAccordion(
        ruleKey,
        `<div style="flex: 1 !important; min-width: 0 !important;">
          <div style="font-size: 13px !important; font-weight: 500 !important; margin-bottom: 4px !important; color: #1F2937 !important;">${escHtml(issue.help)}</div>
          <div style="display: flex !important; align-items: center !important; gap: 8px !important;">
            <span style="background: ${WCAG_LEVEL[wcag.level]} !important; color: white !important; padding: 2px 7px !important; border-radius: 4px !important; font-weight: 600 !important; font-size: 11px !important;">${wcag.level}</span>
            <span style="font-size: 12px !important; color: #6B7280 !important;">${issue.ruleId}</span>
          </div>
        </div>`,
        `<span style="background: #F3F4F6 !important; padding: 2px 8px !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 600 !important; color: #6B7280 !important;">${issue.count}</span>`,
        nodeHtml
      );
    });

      body += `
      <button class="comp-highlight-btn" data-compid="${compId}" style="width: 100% !important; padding: 8px !important; background: #F5F3FF !important; border: 1px solid #C4B5FD !important; border-radius: 6px !important; cursor: pointer !important; font-size: 12px !important; color: ${HIGHLIGHT} !important; font-weight: 500 !important; margin-top: 6px !important; transition: all 0.15s !important;">
        Highlight all ${totalInstances} instances on page
      </button>
    `;

    const instanceLabel = compId === UNCATEGORIZED_ID
      ? ''
      : `<div style="font-size: 12px !important; color: #6B7280 !important; margin-top: 2px !important; line-height: 1.5 !important;">${affectedCount} of ${totalInstances} instance${totalInstances !== 1 ? 's' : ''} affected</div>`;

    html += renderAccordion(
      `comp-${cIdx}`,
      `<div style="min-width: 0 !important;">
        <div style="font-weight: 600 !important; font-size: 14px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; color: #1F2937 !important;">${escHtml(compName)}</div>
        ${instanceLabel}
      </div>`,
      renderCountBadge(totalIssues),
      body
    );
  });
  return html;
}

function renderRuleSubGroup(ruleId: string, help: string, wcag: ReturnType<typeof parseWcagInfo>, nodes: { node: Element; html: string }[], parentKey: string): string {
  let html = `
    <div style="margin-bottom: 8px !important; padding: 10px 12px !important; background: #F9FAFB !important; border-radius: 8px !important; border: 1px solid #F3F4F6 !important;">
      <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 6px !important;">
        <span style="font-size: 13px !important; font-weight: 500 !important; color: #1F2937 !important;">${escHtml(help)}</span>
        <span style="background: #F3F4F6 !important; padding: 2px 8px !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 600 !important; color: #6B7280 !important;">${nodes.length}</span>
      </div>
      <div style="display: flex !important; align-items: center !important; gap: 8px !important; margin-bottom: 8px !important;">
        <span style="background: ${WCAG_LEVEL[wcag.level]} !important; color: white !important; padding: 2px 7px !important; border-radius: 4px !important; font-weight: 600 !important; font-size: 11px !important;">${wcag.level}</span>
        <span style="font-size: 12px !important; color: #6B7280 !important;">${ruleId}</span>
      </div>
  `;
  nodes.forEach((n, nIdx) => {
    const context = getElementContext(n.node);
    html += `
      <div class="group-node" data-pkey="${parentKey}" data-rule="${ruleId}" data-nidx="${nIdx}" style="padding: 8px 10px !important; margin-bottom: 4px !important; background: var(--node-bg, white) !important; border: 1px solid var(--node-border, #E5E7EB) !important; border-radius: 6px !important; cursor: pointer !important; font-size: 12px !important; color: #374151 !important; display: flex !important; justify-content: space-between !important; align-items: center !important; transition: border-color 0.15s !important;">
        <span style="overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; flex: 1 !important;">${escHtml(context)}</span>
        <span style="color: ${HIGHLIGHT} !important; font-weight: 500 !important; flex-shrink: 0 !important; margin-left: 8px !important; font-size: 12px !important;">Highlight &rarr;</span>
      </div>
    `;
  });
  html += `</div>`;
  return html;
}

export function attachAxeListListeners(container: HTMLElement, data: AxeListData, actions: {
  onBack: () => void;
  onExport: () => void;
  onHighlight: (els: Element[]) => void;
  onNavigateDetails: (v: AxeViolation) => void;
  onFilterChange: (search: string, sev: string, mode: GroupMode, activeTypes: Set<AxeResultType>, filterImpact: Set<string>) => void;
}): void {
  container.querySelector('#btn-back')?.addEventListener('click', () => actions.onBack());

  container.querySelector('#filter-search')?.addEventListener('input', (e) => {
    actions.onFilterChange((e.target as HTMLInputElement).value, data.filterSeverity, data.groupMode, data.activeResultTypes, data.filterImpact);
  });
  container.querySelector('#filter-severity')?.addEventListener('change', (e) => {
    actions.onFilterChange(data.searchQuery, (e.target as HTMLSelectElement).value, data.groupMode, data.activeResultTypes, data.filterImpact);
  });
  container.querySelectorAll('.group-mode-btn').forEach(el => {
    el.addEventListener('click', () => {
      actions.onFilterChange(data.searchQuery, data.filterSeverity, (el.getAttribute('data-mode') as GroupMode) || 'rule', data.activeResultTypes, data.filterImpact);
    });
  });

  container.querySelectorAll('.result-type-chip').forEach(el => {
    el.addEventListener('click', () => {
      const impactAttr = el.getAttribute('data-impact');
      if (impactAttr) {
        const nextImpact = new Set(data.filterImpact);
        if (nextImpact.has(impactAttr)) {
          if (nextImpact.size > 1) nextImpact.delete(impactAttr);
        } else {
          nextImpact.add(impactAttr);
        }
        actions.onFilterChange(data.searchQuery, data.filterSeverity, data.groupMode, data.activeResultTypes, nextImpact);
        return;
      }
      const type = el.getAttribute('data-type') as AxeResultType;
      const next = new Set(data.activeResultTypes);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      actions.onFilterChange(data.searchQuery, data.filterSeverity, data.groupMode, next, data.filterImpact);
    });
  });

  // Navigate to violation details on rule-card click — match against full (unfiltered by type) list
  container.querySelectorAll('.rule-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const v = data.violations.find(v => v.id === id);
      if (v) actions.onNavigateDetails(v);
    });
  });
  hoverListeners(container, '.rule-card', HIGHLIGHT);

  attachAccordionListeners(container);

  container.querySelectorAll('.comp-highlight-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const compId = el.getAttribute('data-compid') || '';
      const cluster = data.components.get(compId);
      if (cluster) actions.onHighlight(cluster.elements);
    });
  });

  container.querySelectorAll('.comp-node').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      
      container.querySelectorAll('.comp-node.is-active, .group-node.is-active').forEach(node => node.classList.remove('is-active'));
      el.classList.add('is-active');

      const cIdx = parseInt(el.getAttribute('data-cidx') || '0', 10);
      const iIdx = parseInt(el.getAttribute('data-iidx') || '0', 10);
      const nIdx = parseInt(el.getAttribute('data-nidx') || '0', 10);

      const sorted = getSortedFilteredComponentGroups(data);
      const entry = sorted[cIdx];
      if (entry) {
        const issue = entry[1][iIdx];
        if (issue?.nodes[nIdx]) actions.onHighlight([issue.nodes[nIdx]]);
      }
    });
  });
  hoverListeners(container, '.comp-node', HIGHLIGHT);

  container.querySelectorAll('.group-node').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();

      container.querySelectorAll('.comp-node.is-active, .group-node.is-active').forEach(node => node.classList.remove('is-active'));
      el.classList.add('is-active');

      const pkey = el.getAttribute('data-pkey') || '';
      const ruleId = el.getAttribute('data-rule') || '';
      const nidx = parseInt(el.getAttribute('data-nidx') || '0', 10);
      const match = pkey.match(/region-(\d+)/);
      if (match) {
        const ridx = parseInt(match[1], 10);
        const region = data.regions[ridx];
        if (region) {
          const matching = region.violations.filter(v => v.ruleId === ruleId);
          if (matching[nidx]) actions.onHighlight([matching[nidx].node]);
        }
      }
    });
  });
  hoverListeners(container, '.group-node', HIGHLIGHT);
}
