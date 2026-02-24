/**
 * Rich tooltips with 300ms hover delay. Dismiss on mouse-out; do not block click.
 * Used for settlement, formation, and front edge (content from state).
 */

const DELAY_MS = 300;

let timeoutId: ReturnType<typeof setTimeout> | null = null;
let tooltipEl: HTMLElement | null = null;

function ensureElement(): HTMLElement {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'hoi-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function show(x: number, y: number, html: string): void {
  const el = ensureElement();
  el.innerHTML = html;
  el.setAttribute('aria-hidden', 'false');
  el.style.display = 'block';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  const rect = el.getBoundingClientRect();
  const pad = 8;
  if (rect.right > window.innerWidth) el.style.left = `${window.innerWidth - rect.width - pad}px`;
  if (rect.bottom > window.innerHeight) el.style.top = `${window.innerHeight - rect.height - pad}px`;
  if (parseFloat(el.style.left) < pad) el.style.left = `${pad}px`;
  if (parseFloat(el.style.top) < pad) el.style.top = `${pad}px`;
}

function hide(): void {
  if (timeoutId != null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
    tooltipEl.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Schedule showing a tooltip after DELAY_MS. Cancel any previous schedule.
 * Call cancel() on mouseleave.
 */
export function scheduleShow(clientX: number, clientY: number, content: string): void {
  cancel();
  timeoutId = setTimeout(() => {
    timeoutId = null;
    show(clientX + 12, clientY + 12, content);
  }, DELAY_MS);
}

export function cancel(): void {
  if (timeoutId != null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  hide();
}

/** Formation tooltip HTML from brigade row data + optional corps name. */
export function formatFormationTooltip(data: {
  name: string;
  personnel: number;
  cohesion: number;
  posture: string;
  corpsName?: string;
  aorCount?: number;
  frontCount?: number;
  order?: string;
}): string {
  const lines: string[] = [
    `<div class="hoi-tooltip-title">${escapeHtml(data.name)}</div>`,
    data.corpsName ? `<div class="hoi-tooltip-row">${escapeHtml(data.corpsName)}</div>` : '',
    `<div class="hoi-tooltip-row">Personnel: ${data.personnel.toLocaleString()}</div>`,
    `<div class="hoi-tooltip-row">Cohesion: ${barSegments(data.cohesion)} ${data.cohesion}</div>`,
    `<div class="hoi-tooltip-row">Posture: ${escapeHtml(data.posture)}</div>`,
  ];
  if (data.aorCount != null) {
    const aor = data.frontCount != null ? `${data.aorCount} settlements (${data.frontCount} front)` : `${data.aorCount} settlements`;
    lines.push(`<div class="hoi-tooltip-row">AoR: ${aor}</div>`);
  }
  if (data.order) lines.push(`<div class="hoi-tooltip-row">Order: ${escapeHtml(data.order)}</div>`);
  lines.push('<div class="hoi-tooltip-row">Status: Active</div>');
  return lines.filter(Boolean).join('');
}

/** Settlement tooltip HTML (for map hover in Phase 4). */
export function formatSettlementTooltip(data: {
  name: string;
  municipality?: string;
  controller: string | null;
  pop?: number;
}): string {
  const lines: string[] = [
    `<div class="hoi-tooltip-title">${escapeHtml(data.name)}</div>`,
    data.municipality ? `<div class="hoi-tooltip-row">Municipality: ${escapeHtml(data.municipality)}</div>` : '',
    `<div class="hoi-tooltip-row">Controller: ${escapeHtml(data.controller ?? '—')}</div>`,
  ];
  if (data.pop != null) lines.push(`<div class="hoi-tooltip-row">Pop: ${data.pop.toLocaleString()}</div>`);
  return lines.join('');
}

/** Front edge tooltip HTML (for map hover in Phase 4). */
export function formatFrontEdgeTooltip(data: {
  sideA: string | null;
  sideB: string | null;
  persistence?: number;
  pressure?: number;
  formationA?: string;
  formationB?: string;
}): string {
  const sides = [data.sideA ?? '—', data.sideB ?? '—'].join(' — ');
  const lines: string[] = [
    '<div class="hoi-tooltip-title">FRONT</div>',
    `<div class="hoi-tooltip-row">${escapeHtml(sides)}</div>`,
  ];
  if (data.persistence != null) lines.push(`<div class="hoi-tooltip-row">Persistence: ${data.persistence} turns</div>`);
  if (data.pressure != null) lines.push(`<div class="hoi-tooltip-row">Pressure: ${data.pressure.toFixed(1)}</div>`);
  if (data.formationA) lines.push(`<div class="hoi-tooltip-row">${escapeHtml(data.sideA ?? '')}: ${escapeHtml(data.formationA)}</div>`);
  if (data.formationB) lines.push(`<div class="hoi-tooltip-row">${escapeHtml(data.sideB ?? '')}: ${escapeHtml(data.formationB)}</div>`);
  return lines.join('');
}

function barSegments(pct: number, segments = 10): string {
  const filled = Math.min(segments, Math.max(0, Math.floor((pct / 100) * segments)));
  return '■'.repeat(filled) + '□'.repeat(segments - filled);
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
