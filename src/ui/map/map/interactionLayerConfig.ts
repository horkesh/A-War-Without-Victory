import type { ExpressionSpecification } from 'maplibre-gl';

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

export function toZoomWidthExpression(widths: { z6: number; z10: number; z14: number }): ExpressionSpecification {
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
  ];
}
