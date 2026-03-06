import type { Map as MapLibreMap } from 'maplibre-gl';
import { normalizeFactionId } from '../../../state/identity.js';

// Spec §2.4: rectangular HoI-style counters — faction-colored fill, white abbreviation.
// Canvas is 160×80 at pixelRatio 2 → displayed as 80×40 CSS px per icon-size unit.
const W = 160;
const H = 80;
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

function drawTacticalSymbol(ctx: CanvasRenderingContext2D, kind: string, w: number, h: number): void {
  const normalized = kind.toLowerCase();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
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

function parseIconId(iconId: string): { kind: string; faction: string; posture?: string } {
  const [kind = 'unit', faction = 'UNKNOWN', posture] = iconId.split('__');
  return { kind, faction, posture };
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

function createFormationIcon(iconId: string): ImageData {
  const { kind, faction, posture } = parseIconId(iconId);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  const canonicalFaction = normalizeFactionId(faction);
  const fill = FACTION_FILL[canonicalFaction] ?? 'rgba(90, 90, 100, 0.92)';
  const border = FACTION_BORDER[canonicalFaction] ?? 'rgba(50, 50, 60, 0.95)';

  ctx.clearRect(0, 0, W, H);

  // Background fill
  roundedRect(ctx, 2, 2, W - 4, H - 4, CORNER_RADIUS);
  ctx.fillStyle = fill;
  ctx.fill();

  // Posture stripe: 12px wide left-edge band, clipped to rounded rect
  const stripeColor = posture ? (POSTURE_STRIPE[posture] ?? null) : null;
  if (stripeColor) {
    ctx.save();
    roundedRect(ctx, 2, 2, W - 4, H - 4, CORNER_RADIUS);
    ctx.clip();
    ctx.fillStyle = stripeColor;
    ctx.fillRect(2, 2, 12, H - 4);
    ctx.restore();
  }

  // Border
  roundedRect(ctx, 2, 2, W - 4, H - 4, CORNER_RADIUS);
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw Tactical Symbol
  drawTacticalSymbol(ctx, kind, W, H);

  return ctx.getImageData(0, 0, W, H);
}

export function ensureFormationIcons(map: MapLibreMap, iconIds: string[]): void {
  const uniqueIds = [...new Set(iconIds)].sort((a, b) => a.localeCompare(b));
  for (const iconId of uniqueIds) {
    if (map.hasImage(iconId)) continue;
    map.addImage(iconId, createFormationIcon(iconId), { pixelRatio: PIXEL_RATIO });
  }
}
