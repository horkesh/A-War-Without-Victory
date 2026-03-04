import type { Map as MapLibreMap } from 'maplibre-gl';

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

function kindAbbrev(kind: string): string {
  const normalized = kind.toLowerCase();
  if (normalized === 'brigade') return 'B';
  if (normalized === 'corps_asset') return 'CA';
  // Fallback for any future kinds
  return normalized.slice(0, 2).toUpperCase() || 'U';
}

/** Left-edge stripe colors per posture value. */
const POSTURE_STRIPE: Record<string, string> = {
  defend: 'rgba(40, 120, 210, 0.95)',
  probe: 'rgba(210, 155, 25, 0.95)',
  attack: 'rgba(205, 45, 45, 0.95)',
  elastic_defense: 'rgba(25, 175, 150, 0.95)',
  consolidation: 'rgba(110, 110, 75, 0.95)',
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

  const fill = FACTION_FILL[faction] ?? 'rgba(90, 90, 100, 0.92)';
  const border = FACTION_BORDER[faction] ?? 'rgba(50, 50, 60, 0.95)';

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

  // Kind abbreviation — white, centered, bold
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.font = `bold ${H * 0.42}px "IBM Plex Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kindAbbrev(kind), W / 2, H / 2);

  return ctx.getImageData(0, 0, W, H);
}

export function ensureFormationIcons(map: MapLibreMap, iconIds: string[]): void {
  const uniqueIds = [...new Set(iconIds)].sort((a, b) => a.localeCompare(b));
  for (const iconId of uniqueIds) {
    if (map.hasImage(iconId)) continue;
    map.addImage(iconId, createFormationIcon(iconId), { pixelRatio: PIXEL_RATIO });
  }
}
