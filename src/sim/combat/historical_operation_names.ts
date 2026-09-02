/**
 * Display names owned by historical operation catalogues.
 *
 * Reservation is intentionally broader than the set of fully implemented
 * catalogue definitions. A historical name must never become an emergent
 * operation merely because its authored definition is incomplete or disabled.
 */
export const RESERVED_HISTORICAL_OPERATION_NAMES = [
    // VRS / JNA
    'Operacija Vrbas',
    'Operacija Lukavac',
    'Operacija Sadejstvo',
    'Operacija Zvijezda',
    'Operacija Brana',
    'Operacija Breza',
    'Operacija Štit',
    'Operacija Jesen',
    'Operacija Pauk',
    'Operacija Plamen',
    'Operacija Vaganj',
    // ARBiH
    'Operacija Neretva',
    'Operacija Proljeće',
    'Operacija Tigar-Sloboda',
    'Operacija Grmeč',
    'Operacija Domet',
    'Operacija Zora',
    'Operacija Majevica',
    'Operacija Tekbir',
    'Operacija Trokut',
    'Operacija Crveni Lav',
    'Operacija Farz',
    'Operacija Uragan',
    // HVO / HV
    'Operacija Lipanjske Zore',
    'Operacija Bura',
    'Operacija Cincar',
    'Operacija Zima',
    'Operacija Skok',
    'Operacija Ljeto',
    'Operacija Južni Potez',
] as const;

/** Normalize local-language/English labels and year suffixes to an identity stem. */
export function normalizeOperationNameStem(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('en-US')
        .replace(/\b(?:operation|operacija)\b/g, ' ')
        .replace(/\b(?:19)?\d{2}\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

const RESERVED_STEMS = new Set(
    RESERVED_HISTORICAL_OPERATION_NAMES.map(normalizeOperationNameStem),
);

export function isHistoricalOperationNameReserved(name: string): boolean {
    return RESERVED_STEMS.has(normalizeOperationNameStem(name));
}

