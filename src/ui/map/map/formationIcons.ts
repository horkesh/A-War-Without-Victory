import type { Map as MapLibreMap } from 'maplibre-gl';
import { normalizeFactionId } from '../../../state/identity.js';
import { UI_DATA_FONT_FAMILY } from '../styles/typography';
import { COUNTER_PRINT, factionBorderInk, factionInk, rgbaString } from './mapPaperPalette';

// Spec §2.4: rectangular HoI-style counters — faction-colored fill, white abbreviation.
// Printed-counter rendition (2026-11-05): the body is a faction print ink on a paper
// halo with a bevelled edge, the status bars are cream and gold, and the symbol is
// paper-coloured. Geometry, size curve, halo opacity and icon-id grammar are unchanged.
// Canvas is 160×80 at pixelRatio 2 → displayed as 80×40 CSS px per icon-size unit.
export const ICON_WIDTH = 160;
export const ICON_HEIGHT = 80;
const PIXEL_RATIO = 2;
const CORNER_RADIUS = 8; // 4 CSS px at pixelRatio 2
const COUNTER_BODY_INSET = 6;
const COUNTER_BODY_X = COUNTER_BODY_INSET;
const COUNTER_BODY_Y = COUNTER_BODY_INSET;
const COUNTER_BODY_WIDTH = ICON_WIDTH - COUNTER_BODY_INSET * 2;
const COUNTER_BODY_HEIGHT = ICON_HEIGHT - COUNTER_BODY_INSET * 2;
export function drawTacticalSymbol(ctx: CanvasRenderingContext2D, kind: string, w: number, h: number): void {
  const normalized = kind.toLowerCase();
  // Colors are now handled by drawFormationIcon via context settings or manual overrides
  ctx.lineWidth = 2.0 * PIXEL_RATIO;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const centerX = w / 2;
  const centerY = h / 2;
  const symW = w * 0.25;
  const symH = h * 0.35;

  // NATO infantry X (base for many units)
  const drawX = () => {
    ctx.beginPath();
    ctx.moveTo(centerX - symW / 2, centerY - symH / 2);
    ctx.lineTo(centerX + symW / 2, centerY + symH / 2);
    ctx.moveTo(centerX + symW / 2, centerY - symH / 2);
    ctx.lineTo(centerX - symW / 2, centerY + symH / 2);
    ctx.stroke();
  };

  if (normalized === 'brigade' || normalized === 'infantry') {
    drawX();
  } else if (normalized === 'mountain') {
    // Triangle (per asset icon_mountain.svg)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - symH * 0.4);
    ctx.lineTo(centerX - symW * 0.4, centerY + symH * 0.4);
    ctx.lineTo(centerX + symW * 0.4, centerY + symH * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (normalized === 'motorized' || normalized === 'mechanized') {
    // Oval (per asset icon_mechanized.svg)
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, symW * 0.45, symH * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (normalized === 'artillery') {
    // Dot (per asset icon_artillery.svg)
    ctx.beginPath();
    ctx.arc(centerX, centerY, symH * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (normalized === 'enemy_contact') {
    // Spotted enemy unit, unidentified: a bold question mark. The map legend names it
    // ("Spotted enemy unit, unidentified"); a two-letter code here read as an
    // untranslated abbreviation in both languages.
    ctx.font = `bold ${h * 0.5}px "${UI_DATA_FONT_FAMILY}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', centerX, centerY);
  } else {
    // Fallback: abbreviated text
    ctx.font = `bold ${h * 0.42}px "${UI_DATA_FONT_FAMILY}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(normalized.slice(0, 2).toUpperCase(), centerX, centerY);
  }
}

/** Left-edge stripe colors per posture value (8-posture system). */
export const POSTURE_STRIPE: Record<string, string> = {
  hold: 'rgba(140, 140, 140, 0.95)',
  defend: 'rgba(40, 120, 210, 0.95)',
  defend_at_all_costs: 'rgba(255, 255, 255, 0.95)',
  elastic_defense: 'rgba(25, 175, 150, 0.95)',
  counterattack: 'rgba(240, 130, 20, 0.95)',
  dig_in: 'rgba(139, 101, 42, 0.95)',
  attack: 'rgba(205, 45, 45, 0.95)',
  assault: 'rgba(130, 0, 0, 0.95)',
};

function parseReportedBar(token: string | undefined, prefix: 'h' | 'm'): number | undefined {
  if (!token || !new RegExp(`^${prefix}(?:\\d+|unreported)`).test(token)) return undefined;
  const value = parseInt(token.slice(1), 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : undefined;
}

function parseIconId(iconId: string): { kind: string; faction: string; posture?: string; health?: number; morale?: number; forming: boolean } {
  const [kind = 'unit', faction = 'UNKNOWN', ...rest] = iconId.split('__');
  const isStatusToken = (token: string) => /^(?:h|m)(?:\d+|unreported)/.test(token);
  const forming = rest.includes('forming');
  const posture = rest.find((token) => token !== 'forming' && !isStatusToken(token));
  const health = parseReportedBar(rest.find((token) => /^h(?:\d+|unreported)/.test(token)), 'h');
  const morale = parseReportedBar(rest.find((token) => /^m(?:\d+|unreported)/.test(token)), 'm');
  return { kind, faction, posture, health, morale, forming };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Printed-edge bevel: a light line along the top-left edges, a shade along the bottom-right. */
function drawPrintBevel(ctx: CanvasRenderingContext2D): void {
  const x = COUNTER_BODY_X + 3;
  const y = COUNTER_BODY_Y + 3;
  const w = COUNTER_BODY_WIDTH - 6;
  const h = COUNTER_BODY_HEIGHT - 6;
  ctx.save();
  roundedRect(ctx, COUNTER_BODY_X, COUNTER_BODY_Y, COUNTER_BODY_WIDTH, COUNTER_BODY_HEIGHT, CORNER_RADIUS);
  ctx.clip();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COUNTER_PRINT.bevelLight;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.strokeStyle = COUNTER_PRINT.bevelShade;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
}

export function drawFormationIcon(ctx: CanvasRenderingContext2D, iconId: string): void {
  const isWhiteVariant = iconId.startsWith('white__');
  const actualIconId = isWhiteVariant ? iconId.slice(7) : iconId;
  const { kind, faction, posture, forming } = parseIconId(actualIconId);
  const canonicalFaction = normalizeFactionId(faction);
  // Faction bodies are opaque print inks (alpha 1); an unknown faction prints neutral.
  const fill = isWhiteVariant ? 'rgba(255, 255, 255, 1)' : forming ? COUNTER_PRINT.formingFill : rgbaString(factionInk(canonicalFaction), 1);
  const border = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : forming ? COUNTER_PRINT.formingBorder : rgbaString(factionBorderInk(canonicalFaction), 1);
  const symbolColor = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : COUNTER_PRINT.symbol;

  ctx.clearRect(0, 0, ICON_WIDTH, ICON_HEIGHT);

  // Screen-space counters need their own opaque backing over pitched relief.
  roundedRect(ctx, 0, 0, ICON_WIDTH, ICON_HEIGHT, CORNER_RADIUS + 4);
  ctx.fillStyle = COUNTER_PRINT.haloFill;
  ctx.fill();
  ctx.strokeStyle = COUNTER_PRINT.haloBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Background fill
  roundedRect(ctx, COUNTER_BODY_X, COUNTER_BODY_Y, COUNTER_BODY_WIDTH, COUNTER_BODY_HEIGHT, CORNER_RADIUS);
  ctx.fillStyle = fill;
  ctx.fill();

  // Posture stripe: 12px wide left-edge band, clipped to rounded rect
  const stripeColor = posture ? (POSTURE_STRIPE[posture] ?? null) : null;
  if (stripeColor) {
    ctx.save();
    roundedRect(ctx, COUNTER_BODY_X, COUNTER_BODY_Y, COUNTER_BODY_WIDTH, COUNTER_BODY_HEIGHT, CORNER_RADIUS);
    ctx.clip();
    ctx.fillStyle = stripeColor;
    ctx.fillRect(COUNTER_BODY_X, COUNTER_BODY_Y, 12, COUNTER_BODY_HEIGHT);
    ctx.restore();
  }

  if (!isWhiteVariant && !forming) drawPrintBevel(ctx);

  // Border
  ctx.save();
  if (forming) ctx.setLineDash([10, 8]);
  roundedRect(ctx, COUNTER_BODY_X, COUNTER_BODY_Y, COUNTER_BODY_WIDTH, COUNTER_BODY_HEIGHT, CORNER_RADIUS);
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Status Bars: bottom 16px (15-20% of counter)
  const { health, morale } = parseIconId(actualIconId);
  if (!forming && (health !== undefined || morale !== undefined)) {
    const barY = COUNTER_BODY_Y + COUNTER_BODY_HEIGHT - 10;
    const barH = 6;
    const barX = COUNTER_BODY_X + 16;
    const totalW = COUNTER_BODY_WIDTH - 24; // Account for posture stripe and padding

    // Strength (cream; alarm red below 40%)
    if (health !== undefined) {
      const hW = (totalW / 2) - 4;
      const hPct = health / 100;
      ctx.fillStyle = COUNTER_PRINT.barTrack;
      ctx.fillRect(barX, barY, hW, barH);
      ctx.fillStyle = hPct > 0.4 ? COUNTER_PRINT.strengthBar : COUNTER_PRINT.strengthBarLow;
      ctx.fillRect(barX, barY, hW * hPct, barH);
    }

    // Morale (gold)
    if (morale !== undefined) {
      const mW = (totalW / 2) - 4;
      const mPct = morale / 100;
      const mX = barX + (totalW / 2) + 4;
      ctx.fillStyle = COUNTER_PRINT.barTrack;
      ctx.fillRect(mX, barY, mW, barH);
      ctx.fillStyle = COUNTER_PRINT.moraleBar;
      ctx.fillRect(mX, barY, mW * mPct, barH);
    }
  }

  // Draw Tactical Symbol
  ctx.save();
  ctx.strokeStyle = symbolColor;
  ctx.fillStyle = symbolColor;
  drawTacticalSymbol(ctx, kind, ICON_WIDTH, ICON_HEIGHT - 8); // Offset up to make room for bars
  ctx.restore();

  if (forming) {
    ctx.fillStyle = symbolColor;
    ctx.font = `bold 13px "${UI_DATA_FONT_FAMILY}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FORMING', ICON_WIDTH / 2, COUNTER_BODY_Y + COUNTER_BODY_HEIGHT - 8);
  }
}

function createFormationIcon(iconId: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_WIDTH;
  canvas.height = ICON_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  drawFormationIcon(ctx, iconId);

  return ctx.getImageData(0, 0, ICON_WIDTH, ICON_HEIGHT);
}

const dataUrlCache = new Map<string, string>();

export function getIconDataUrl(iconId: string): string {
  if (dataUrlCache.has(iconId)) return dataUrlCache.get(iconId)!;

  const canvas = document.createElement('canvas');
  canvas.width = ICON_WIDTH;
  canvas.height = ICON_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    drawFormationIcon(ctx, iconId);
    const url = canvas.toDataURL('image/png');
    dataUrlCache.set(iconId, url);
    return url;
  }
  return '';
}

export const STACK_BADGE_ICON_SIZE = 64;

export function getStackBadgeLabel(count: number): string {
  return count > 99 ? '99+' : String(Math.max(0, Math.floor(count)));
}

/**
 * Stack-count badge sprite. Drawn by the same Deck icon layer as the counters, right after
 * its own top counter, so the badge can never float apart from (or above other) counters.
 */
export function getStackBadgeIconId(count: number): string {
  return `stack_badge__${getStackBadgeLabel(count)}`;
}

export function getStackBadgeIconDataUrl(count: number): string {
  const key = getStackBadgeIconId(count);
  const cached = dataUrlCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = STACK_BADGE_ICON_SIZE;
  canvas.height = STACK_BADGE_ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawStackBadgeIcon(ctx, getStackBadgeLabel(count));
  const url = canvas.toDataURL('image/png');
  dataUrlCache.set(key, url);
  return url;
}

/** Draws a stack badge sprite (STACK_BADGE_ICON_SIZE square) at the context origin. */
export function drawStackBadgeIcon(ctx: CanvasRenderingContext2D, label: string): void {
  const center = STACK_BADGE_ICON_SIZE / 2;
  ctx.beginPath();
  ctx.arc(center, center, center - 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(18, 18, 16, 1)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(245, 203, 92, 1)';
  ctx.stroke();
  ctx.fillStyle = '#f8e6ad';
  ctx.font = `800 ${label.length >= 3 ? 24 : label.length === 2 ? 30 : 36}px "${UI_DATA_FONT_FAMILY}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, center, center + 2);
}

export type CounterIconAtlasEntry = { x: number; y: number; width: number; height: number; mask: false };
export type CounterIconAtlas = {
  canvas: HTMLCanvasElement;
  mapping: Record<string, CounterIconAtlasEntry>;
};

const ATLAS_WIDTH = 2048;
const ATLAS_CELL_WIDTH = ICON_WIDTH + 4;
const ATLAS_CELL_HEIGHT = ICON_HEIGHT + 4;
const ATLAS_MAX_KEYS = 600;
const atlasKnownKeys = new Set<string>();
let atlasCache: CounterIconAtlas | null = null;

/**
 * One pre-packed sprite atlas for the tactical counter layers (counters, white highlight
 * variants, stack badges), drawn in full by us and handed to Deck as `iconAtlas`.
 *
 * Deck 9.2's auto-packing grows its atlas by copying the old texture into a bigger one;
 * in the Electron/WebGL build that copy comes out blank, so every counter already on the
 * map vanished whenever a new sprite (a new morale step, a new badge count) appeared,
 * leaving stack badges with nothing under them (R8, 2026-11-10). This atlas only grows:
 * it is redrawn from scratch into a fresh canvas when an unseen key arrives, so Deck
 * uploads a brand-new texture and nothing is ever copied.
 * Keys: formation icon ids (`white__` prefix for highlights) and `stack_badge__<label>`.
 */
export function getCounterIconAtlas(keys: Iterable<string>): CounterIconAtlas | null {
  if (typeof document === 'undefined') return null;
  let grew = false;
  for (const key of keys) {
    if (!key || atlasKnownKeys.has(key)) continue;
    atlasKnownKeys.add(key);
    grew = true;
  }
  if (!grew && atlasCache) return atlasCache;
  if (atlasKnownKeys.size > ATLAS_MAX_KEYS) {
    // Bound the texture: keep only what this call needs.
    atlasKnownKeys.clear();
    for (const key of keys) if (key) atlasKnownKeys.add(key);
  }
  const ordered = [...atlasKnownKeys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const columns = Math.floor(ATLAS_WIDTH / ATLAS_CELL_WIDTH);
  const rows = Math.max(1, Math.ceil(ordered.length / columns));
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = rows * ATLAS_CELL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const mapping: Record<string, CounterIconAtlasEntry> = {};
  ordered.forEach((key, index) => {
    const x = (index % columns) * ATLAS_CELL_WIDTH + 2;
    const y = Math.floor(index / columns) * ATLAS_CELL_HEIGHT + 2;
    ctx.save();
    ctx.translate(x, y);
    if (key.startsWith('stack_badge__')) {
      drawStackBadgeIcon(ctx, key.slice('stack_badge__'.length));
      mapping[key] = { x, y, width: STACK_BADGE_ICON_SIZE, height: STACK_BADGE_ICON_SIZE, mask: false };
    } else {
      drawFormationIcon(ctx, key);
      mapping[key] = { x, y, width: ICON_WIDTH, height: ICON_HEIGHT, mask: false };
    }
    ctx.restore();
  });
  atlasCache = { canvas, mapping };
  return atlasCache;
}

export function ensureFormationIcons(map: MapLibreMap, iconIds: string[]): void {
  const uniqueIds = [...new Set(iconIds)].sort((a, b) => a.localeCompare(b));
  for (const iconId of uniqueIds) {
    if (map.hasImage(iconId)) continue;
    map.addImage(iconId, createFormationIcon(iconId), { pixelRatio: PIXEL_RATIO });
  }
}

/**
 * Ensures tactical helper icons (like front line teeth) are registered on the map.
 */
export function ensureTacticalIcons(map: MapLibreMap): void {
  if (map.hasImage('front-line-tooth')) return;

  const size = 32; // 16 CSSpx
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const mid = size / 2;
  const h = size * 0.4;
  const w = size * 0.35;

  // Simple solid triangle pointing UP (rotation handled by MapLibre icon-rotate)
  ctx.fillStyle = 'rgba(20, 20, 25, 0.95)';
  ctx.beginPath();
  ctx.moveTo(mid, mid - h);
  ctx.lineTo(mid - w, mid + h);
  ctx.lineTo(mid + w, mid + h);
  ctx.closePath();
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage('front-line-tooth', imageData, { pixelRatio: PIXEL_RATIO });
}
