/**
 * Thin Plate Spline (TPS) Utility Library.
 * Based on Phase H6.0 georeferencing logic.
 */

export function tpsBasis(r: number): number {
    if (r < 1e-10) return 0;
    return r * r * Math.log(r);
}

export interface TpsParams {
    wx: number[];
    wy: number[];
    ax: number[];
    ay: number[];
    pts: number[][];
}

/**
 * Apply TPS transform to project (x,y) to (u,v).
 */
export function applyTps(x: number, y: number, params: TpsParams): [number, number] {
    const { wx, wy, ax, ay, pts } = params;
    let u = ax[0] + ax[1] * x + ax[2] * y;
    let v = ay[0] + ay[1] * x + ay[2] * y;
    for (let i = 0; i < pts.length; i++) {
        const dx = x - pts[i][0];
        const dy = y - pts[i][1];
        const r = Math.sqrt(dx * dx + dy * dy);
        u += wx[i] * tpsBasis(r);
        v += wy[i] * tpsBasis(r);
    }
    return [u, v];
}
