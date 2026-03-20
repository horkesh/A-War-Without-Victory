import type { Map as MapLibreMap } from 'maplibre-gl';
import { normalizeFactionId } from '../../../state/identity.js';

// Spec §2.4: rectangular HoI-style counters — faction-colored fill, white abbreviation.
// Canvas is 160×80 at pixelRatio 2 → displayed as 80×40 CSS px per icon-size unit.
export const ICON_WIDTH = 160;
export const ICON_HEIGHT = 80;
const PIXEL_RATIO = 2;
const CORNER_RADIUS = 8; // 4 CSS px at pixelRatio 2

const FACTION_FILL: Record<string, string> = {
  RS: 'rgba(178, 60, 60, 0.92)',
  RBiH: 'rgba(55, 135, 70, 0.92)',
  HRHB: 'rgba(50, 108, 168, 0.92)',
};

const FACTION_BORDER: Record<string, string> = {
  RS: 'rgba(120, 30, 30, 0.95)',
  RBiH: 'rgba(30, 90, 45, 0.95)',
  HRHB: 'rgba(25, 65, 115, 0.95)',
};

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
    ctx.font = `bold ${h * 0.42}px "IBM Plex Mono", monospace`;
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

function parseIconId(iconId: string): { kind: string; faction: string; posture?: string; health?: number; morale?: number } {
  const [kind = 'unit', faction = 'UNKNOWN', posture, hStr, mStr] = iconId.split('__');
  const health = hStr ? parseInt(hStr.slice(1)) : undefined;
  const morale = mStr ? parseInt(mStr.slice(1)) : undefined;
  return { kind, faction, posture, health, morale };
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

export function drawFormationIcon(ctx: CanvasRenderingContext2D, iconId: string): void {
  const isWhiteVariant = iconId.startsWith('white__');
  const actualIconId = isWhiteVariant ? iconId.slice(7) : iconId;
  const { kind, faction, posture } = parseIconId(actualIconId);
  const canonicalFaction = normalizeFactionId(faction);
  const fill = isWhiteVariant ? 'rgba(255, 255, 255, 0.98)' : (FACTION_FILL[canonicalFaction] ?? 'rgba(90, 90, 100, 0.92)');
  const border = isWhiteVariant ? 'rgba(20, 20, 20, 0.95)' : (FACTION_BORDER[canonicalFaction] ?? 'rgba(50, 50, 60, 0.95)');
  const symbolColor = isWhiteVariant ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.97)';

  ctx.clearRect(0, 0, ICON_WIDTH, ICON_HEIGHT);

  // Background fill
  roundedRect(ctx, 2, 2, ICON_WIDTH - 4, ICON_HEIGHT - 4, CORNER_RADIUS);
  ctx.fillStyle = fill;
  ctx.fill();

  // Posture stripe: 12px wide left-edge band, clipped to rounded rect
  const stripeColor = posture ? (POSTURE_STRIPE[posture] ?? null) : null;
  if (stripeColor) {
    ctx.save();
    roundedRect(ctx, 2, 2, ICON_WIDTH - 4, ICON_HEIGHT - 4, CORNER_RADIUS);
    ctx.clip();
    ctx.fillStyle = stripeColor;
    ctx.fillRect(2, 2, 12, ICON_HEIGHT - 4);
    ctx.restore();
  }

  // Border
  roundedRect(ctx, 2, 2, ICON_WIDTH - 4, ICON_HEIGHT - 4, CORNER_RADIUS);
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Status Bars: bottom 16px (15-20% of counter)
  const { health, morale } = parseIconId(actualIconId);
  if (health !== undefined || morale !== undefined) {
    const barY = ICON_HEIGHT - 12;
    const barH = 6;
    const totalW = ICON_WIDTH - 24; // Account for posture stripe and padding

    // Health (Green/Red)
    if (health !== undefined) {
      const hW = (totalW / 2) - 4;
      const hPct = health / 100;
      ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
      ctx.fillRect(18, barY, hW, barH);
      ctx.fillStyle = hPct > 0.4 ? 'rgba(50, 200, 50, 0.9)' : 'rgba(200, 50, 50, 0.9)';
      ctx.fillRect(18, barY, hW * hPct, barH);
    }

    // Morale (Cyan)
    if (morale !== undefined) {
      const mW = (totalW / 2) - 4;
      const mPct = morale / 100;
      const mX = 18 + (totalW / 2) + 4;
      ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
      ctx.fillRect(mX, barY, mW, barH);
      ctx.fillStyle = 'rgba(50, 200, 255, 0.9)';
      ctx.fillRect(mX, barY, mW * mPct, barH);
    }
  }

  // Draw Tactical Symbol
  ctx.save();
  ctx.strokeStyle = symbolColor;
  ctx.fillStyle = symbolColor;
  drawTacticalSymbol(ctx, kind, ICON_WIDTH, ICON_HEIGHT - 8); // Offset up to make room for bars
  ctx.restore();
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
