import { t } from '../i18n/index.js';

/**
 * Sector display names usually carry their own formation type already: computed "OG Tuzla",
 * attested "TG Foča", "Doboj OG 9", "\"Vogošća\" OG", "OZ Central Bosnia", the "Assigned OG" /
 * "Dodijeljeni sektor" fallbacks, or (owner ruling M3, 2026-11-12) a brigade-less sector's
 * "Unheld front near Tuzla" / "Nebranjeni front (Tuzla)". Copy that puts a type word in front of
 * the name ("OG {sector}", "Sektor {sector}") must skip it for those names, or the player reads
 * "OG OG Tuzla" or "OG Unheld front near Tuzla".
 */
const FORMATION_TYPE_TOKEN = /(?:^|[\s"'(.])(?:OG|TG|OZ|[Ss]ektor)(?=$|[\s"')\d.,:])/;

function unheldFrontRoots(): string[] {
    return [
        t('corpsFront.unheldFront', undefined, 'en'),
        t('corpsFront.unheldFront', undefined, 'bcs'),
    ];
}

/** True when the label already names its type (OG/TG/OZ/sektor) or is an unheld-front name. */
export function sectorLabelCarriesOwnType(label: string, unheldFront = false): boolean {
    if (unheldFront) return true;
    const trimmed = label.trim();
    if (FORMATION_TYPE_TOKEN.test(trimmed)) return true;
    return unheldFrontRoots().some((root) => root.length > 0 && trimmed.startsWith(root));
}

/** Whether copy should add its own type prefix (e.g. "OG ") in front of this sector label. */
export function sectorLabelNeedsTypePrefix(label: string, unheldFront = false): boolean {
    return !sectorLabelCarriesOwnType(label, unheldFront);
}
