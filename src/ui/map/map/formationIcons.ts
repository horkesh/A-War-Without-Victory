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
