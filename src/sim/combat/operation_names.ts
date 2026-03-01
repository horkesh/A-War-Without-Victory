/**
 * Per-faction operation name pools for sector offensives.
 * Historical names (Balkan Battlegrounds) first, geographic placeholders second.
 * Deterministic selection: namePool[hash(corps_id, turn) % namePool.length].
 */

/** VRS (RS) historical + geographic operation names. */
const RS_NAMES: string[] = [
    'Operacija Koridor', 'Operacija Breza', 'Operacija Lukavac',
    'Operacija Sadejstvo', 'Operacija Spreča', 'Operacija Drina',
    'Operacija Romanija', 'Operacija Majevica', 'Operacija Ozren',
    'Operacija Jahorina', 'Operacija Vrbas', 'Operacija Sava',
    'Operacija Zvijezda', 'Operacija Grmeč', 'Operacija Vlašić',
    'Operacija Trebević', 'Operacija Ukrina', 'Operacija Bosna',
    'Operacija Tara', 'Operacija Una',
];

/** ARBiH (RBiH) historical + geographic operation names. */
const RBiH_NAMES: string[] = [
    'Operacija Uragan', 'Operacija Sana', 'Operacija Vlašić',
    'Operacija Sloboda', 'Operacija Proljeće', 'Operacija Bosna',
    'Operacija Neretva', 'Operacija Igman', 'Operacija Bjelašnica',
    'Operacija Miljacka', 'Operacija Željeznica', 'Operacija Krivaja',
    'Operacija Tara', 'Operacija Una', 'Operacija Rama',
    'Operacija Pliva', 'Operacija Spreča', 'Operacija Lašva',
    'Operacija Vrbanja', 'Operacija Čemernica',
];

/** HVO (HRHB) historical + geographic operation names. */
const HRHB_NAMES: string[] = [
    'Operacija Cincar', 'Operacija Maestral', 'Operacija Južni Potez',
    'Operacija Ljeto', 'Operacija Pliva', 'Operacija Lašva',
    'Operacija Vrbanja', 'Operacija Čemernica', 'Operacija Neretva',
    'Operacija Rama', 'Operacija Drina', 'Operacija Bosna',
    'Operacija Sava', 'Operacija Una', 'Operacija Vrbas',
];

/** Full name pools indexed by faction. */
export const OPERATION_NAMES: Record<string, string[]> = {
    RS: RS_NAMES,
    RBiH: RBiH_NAMES,
    HRHB: HRHB_NAMES,
};

/** Simple deterministic hash for name selection. No randomness. */
function simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/**
 * Pick a deterministic operation name from the faction's pool.
 * Uses hash(corps_id + ':' + turn) to index into the pool.
 */
export function pickOperationName(corpsId: string, turn: number, faction: string): string {
    const pool = OPERATION_NAMES[faction] ?? RS_NAMES;
    const key = `${corpsId}:${turn}`;
    const idx = simpleHash(key) % pool.length;
    return pool[idx]!;
}
