/** Clamp value to [0, 1]. */
export function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Clamp value to [min, max]. */
export function clamp(v: number, min: number, max: number): number {
    return v < min ? min : v > max ? max : v;
}
