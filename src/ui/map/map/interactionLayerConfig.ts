export const INTERACTION_HITBOX_OPACITY = 0.01;

export const FRONT_SURFACE_VISIBLE_WIDTHS = {
  z6: 5,
  z10: 9,
  z14: 14,
} as const;

export const FRONT_SURFACE_HITBOX_WIDTHS = {
  z6: 18,
  z10: 30,
  z14: 44,
} as const;

export const SECTOR_DEMARCATION_VISIBLE_WIDTHS = {
  z6: 3,
  z10: 5,
  z14: 8,
} as const;

export const SECTOR_DEMARCATION_HITBOX_WIDTHS = {
  z6: 14,
  z10: 24,
  z14: 36,
} as const;

export function toZoomWidthExpression(widths: { z6: number; z10: number; z14: number }) {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    6,
    widths.z6,
    10,
    widths.z10,
    14,
    widths.z14,
  ] as any;
}
