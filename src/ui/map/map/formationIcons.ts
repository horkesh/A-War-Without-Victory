import type { Map as MapLibreMap } from 'maplibre-gl';

const FACTION_STROKE: Record<string, string> = {
  RS: 'rgb(180, 50, 50)',
  RBiH: 'rgb(55, 140, 75)',
  HRHB: 'rgb(50, 110, 170)',
};

function kindAbbrev(kind: string): string {
  const normalized = kind.toLowerCase();
  if (normalized === 'army_hq') return 'A';
  if (normalized === 'corps') return 'C';
  if (normalized === 'corps_asset') return 'CA';
  if (normalized === 'brigade') return 'B';
  return normalized.slice(0, 2).toUpperCase() || 'U';
}

function parseIconId(iconId: string): { kind: string; faction: string } {
  const [kind = 'unit', faction = 'UNKNOWN'] = iconId.split('__');
  return { kind, faction };
}

function createFormationIcon(iconId: string): ImageData {
  const { kind, faction } = parseIconId(iconId);
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create 2D canvas context');

  const stroke = FACTION_STROKE[faction] ?? 'rgb(90, 90, 100)';

  ctx.clearRect(0, 0, 48, 48);
  ctx.fillStyle = 'rgba(245, 241, 230, 0.95)';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.fillRect(6, 10, 36, 28);
  ctx.strokeRect(6, 10, 36, 28);

  ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
  ctx.font = 'bold 14px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kindAbbrev(kind), 24, 24);

  return ctx.getImageData(0, 0, 48, 48);
}

export function ensureFormationIcons(map: MapLibreMap, iconIds: string[]): void {
  const uniqueIds = [...new Set(iconIds)].sort((a, b) => a.localeCompare(b));
  for (const iconId of uniqueIds) {
    if (map.hasImage(iconId)) continue;
    map.addImage(iconId, createFormationIcon(iconId), { pixelRatio: 2 });
  }
}
