import type maplibregl from 'maplibre-gl';

/**
 * Registers custom SVG images on the map for front-line rendering.
 * Currently a no-op stub — front lines are rendered via line-color paint expressions
 * in awwv_map_style.json (black-white stripe pattern via line-dasharray).
 * Extend here if icon-image based indicators are added to the style.
 */
export function addFrontLineIcons(_map: maplibregl.Map): void {
    // no-op — front line style uses line-dasharray, not sprite icons
}
