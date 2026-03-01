import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Register a small triangle icon ("front-tooth") for HoI-style teeth along front lines.
 * The triangle points upward; MapLibre auto-rotates it along the line direction,
 * and `icon-rotate` flips it to face the correct side (toward enemy territory).
 */
export function addFrontLineIcons(map: MapLibreMap): void {
    if (map.hasImage('front-tooth')) return;

    const size = 12;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);    // top center
    ctx.lineTo(size, size);      // bottom right
    ctx.lineTo(0, size);         // bottom left
    ctx.closePath();
    ctx.fill();

    map.addImage('front-tooth', ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
}
