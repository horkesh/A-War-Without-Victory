import * as THREE from 'three';

export function makeCanvasProjection(bbox: [number, number, number, number], w: number, h: number) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    return {
        x: (lon: number) => ((lon - minLon) / (maxLon - minLon)) * w,
        y: (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * h,
    };
}

export function sampleHeight(hm: { width: number, height: number, bbox: number[], elevations: number[] }, lon: number, lat: number): number {
    const fx = (lon - hm.bbox[0]!) / (hm.bbox[2]! - hm.bbox[0]!) * (hm.width - 1);
    const fy = (hm.bbox[3]! - lat) / (hm.bbox[3]! - hm.bbox[1]!) * (hm.height - 1);
    const x0 = Math.max(0, Math.min(hm.width - 1, Math.floor(fx)));
    const x1 = Math.min(hm.width - 1, x0 + 1);
    const y0 = Math.max(0, Math.min(hm.height - 1, Math.floor(fy)));
    const y1 = Math.min(hm.height - 1, y0 + 1);
    const dx = fx - x0;
    const dy = fy - y0;
    const s = (i: number, j: number) => hm.elevations[j * hm.width + i] ?? 0;
    return s(x0, y0) * (1 - dx) * (1 - dy) + s(x1, y0) * dx * (1 - dy)
        + s(x0, y1) * (1 - dx) * dy + s(x1, y1) * dx * dy;
}

export function drawLineFeature(
    ctx: OffscreenCanvasRenderingContext2D,
    geom: { type: string; coordinates: unknown },
    proj: { x: (lon: number) => number; y: (lat: number) => number },
    color: string,
    width: number,
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (geom.type === 'LineString') {
        drawCoordLine(ctx, geom.coordinates as number[][], proj);
    } else if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates as number[][][]) {
            drawCoordLine(ctx, line, proj);
        }
    }
}

function drawCoordLine(
    ctx: OffscreenCanvasRenderingContext2D,
    coords: number[][],
    proj: { x: (lon: number) => number; y: (lat: number) => number },
): void {
    if (coords.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(proj.x(coords[0]![0]!), proj.y(coords[0]![1]!));
    for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(proj.x(coords[i]![0]!), proj.y(coords[i]![1]!));
    }
    ctx.stroke();
}

/** 
 * Returns normal vector encoded as [nx, ny, nz] length 1.
 * Using a simple central difference on the heightmap.
 */
export function sampleNormal(hm: { width: number, height: number, bbox: number[], elevations: number[] }, lon: number, lat: number, cellWidthM: number): [number, number, number] {
    const dLon = (hm.bbox[2]! - hm.bbox[0]!) / (hm.width - 1);
    const dLat = (hm.bbox[3]! - hm.bbox[1]!) / (hm.height - 1);
    const hL = sampleHeight(hm, lon - dLon, lat);
    const hR = sampleHeight(hm, lon + dLon, lat);
    const hD = sampleHeight(hm, lon, lat - dLat);
    const hU = sampleHeight(hm, lon, lat + dLat);

    // Gradient: dz/dx and dz/dy
    const dzdx = (hR - hL) / (2 * cellWidthM);
    const dzdy = (hU - hD) / (2 * cellWidthM); // Notice Y is latitude, so up is +lat

    // Normal vector [-dz/dx, -dz/dy, 1] normalized
    const len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);
    return [-dzdx / len, -dzdy / len, 1 / len];
}

/** Calculate simple dot-product hillshade against a light direction [lx, ly, lz]. */
export function computeHillshade(normal: [number, number, number], lightDir: [number, number, number]): number {
    return Math.max(0, normal[0] * lightDir[0] + normal[1] * lightDir[1] + normal[2] * lightDir[2]);
}

export function buildMunBordersTexture(
    hm: { width: number, height: number, bbox: number[] },
    baseFeatures: { features: any[] }
): THREE.CanvasTexture {
    const TEX_W = 2048;
    const TEX_H = 2048;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox as [number, number, number, number], TEX_W, TEX_H);

    ctx.save();
    for (const feature of baseFeatures.features) {
        if (feature.properties?.role === 'boundary' && feature.properties?.admin_level === '4') {
            ctx.setLineDash([8, 8]);
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(160, 160, 160, 0.4)', 2.0);
            drawLineFeature(ctx, feature.geometry, proj, 'rgba(80, 80, 80, 0.6)', 1.0);
        }
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    return texture;
}
