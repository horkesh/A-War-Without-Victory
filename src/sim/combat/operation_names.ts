/**
 * Per-faction operation name pools for bot-generated operations.
 *
 * Historical names (Balkan Battlegrounds, ICTY records) listed first,
 * then faction-flavored placeholders. Sequential consumption — each name
 * used at most once per game. Deterministic: hash selects starting index,
 * then scans forward for first unused name.
 *
 * Naming conventions follow historical patterns:
 *   VRS: JNA bureaucratic style — nature, geography, fortification + year
 *   ARBiH: Evolved identity — weather, animals, aspirational, Islamic terms
 *   HVO: Croatian tradition — punchy weather/force metaphors
 *
 * Pre-planned and triggered operation names are NOT in these pools
 * (they use explicit names like "Operation Koridor", "Operation Jajce").
 */

import type { GameState } from '../../state/game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// VRS (RS) — JNA-inherited bureaucratic style
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Historical names first (Koridor 92 through Vaganj 95),
 * then JNA-style placeholders: nature, minerals, fortification terms.
 *
 * Note: "Koridor", "Drina", "Prsten", "Foca", "Prijedor", "Bosanski Novi",
 * "Posavina Corridor", "Kotor Varos", "Jajce", "Cerska-Kamenica" are
 * reserved for pre-planned/triggered ops and excluded here.
 */
const RS_NAMES: string[] = [
    // --- Historical (BB1/BB2, ICTY) ---
    'Operacija Vrbas',          // Vrbas 92 — Jajce salient, Oct 1992
    'Operacija Lukavac',        // Lukavac 93 — counter-offensive, Ozren, Jul 1993
    'Operacija Sadejstvo',      // Cooperation — Posavina, Jul 1993
    'Operacija Zvijezda',       // Star 94 — Gorazde, Apr 1994
    'Operacija Brana',          // Dam 94 — Vozuca defensive, Jun 1994
    'Operacija Breza',          // Birch 94 — 1st Krajina, Sep 1994
    'Operacija Štit',           // Shield 94 — western Bosnia, Nov 1994
    'Operacija Jesen',          // Autumn 94 — Herzegovina, Nov 1994
    'Operacija Pauk',           // Spider — Bihac, joint VRS/SVK, Nov 1994
    'Operacija Plamen',         // Flame 95 — Orasje, May 1995
    'Operacija Krivaja',        // Krivaja 95 — Srebrenica, Jul 1995
    'Operacija Stup\u010Danica', // Stupchanica 95 — Zepa, Jul 1995
    'Operacija Vaganj',         // Vaganj 95 — defensive umbrella, 1995
    // --- Placeholders: JNA-style nature/fortification ---
    'Operacija Grom',           // Thunder
    'Operacija Čelik',          // Steel
    'Operacija Hrast',          // Oak
    'Operacija Kamen',          // Stone
    'Operacija Oklop',          // Armor
    'Operacija Vihor',          // Whirlwind
    'Operacija Soko',           // Falcon
    'Operacija Ponor',          // Abyss
    'Operacija Grab',           // Hornbeam (tree)
    'Operacija Klin',           // Wedge
    'Operacija Gvožđe',        // Iron
    'Operacija Bedem',          // Rampart
    'Operacija Bastion',        // Bastion
    'Operacija Stjena',         // Cliff
    'Operacija Munja',          // Lightning
    'Operacija Topola',         // Poplar
    'Operacija Javor',          // Maple
    'Operacija Odmazda',        // Retribution
    'Operacija Zaslon',         // Screen/Shield
    'Operacija Udar',           // Strike
    'Operacija Tvrđava',       // Fortress
    'Operacija Bunar',          // Well
    'Operacija Redut',          // Redoubt
    'Operacija Prodor',         // Breakthrough
    'Operacija Obruč',         // Ring/Encirclement
    'Operacija Bor',            // Pine
    'Operacija Vijak',          // Screw/Bolt
];

// ═══════════════════════════════════════════════════════════════════════════
// ARBiH (RBiH) — evolved identity: weather, animals, aspirational, Islamic
// ═══════════════════════════════════════════════════════════════════════════

const RBiH_NAMES: string[] = [
    // --- Historical (BB1/BB2, ICTY) ---
    'Operacija Neretva',        // Neretva 93 — anti-HVO, Sep 1993
    'Operacija Proljeće',      // Spring 94 — Ozren/Vozuca, 1994
    'Operacija Tigar-Sloboda',  // Tiger-Freedom 94 — vs Abdic, Jun 1994
    'Operacija Grmeč',         // Grmec 94 — 5th Corps offensive, Oct 1994
    'Operacija Domet',          // Range 95 — Vlasic liberation, Mar 1995
    'Operacija Zora',           // Dawn — 5th Corps vs Bihac siege, May 1995
    'Operacija Majevica',       // Majevica — 2nd Corps, Mar 1995
    'Operacija Tekbir',         // Tekbir 95 — Sarajevo breakout attempt, Jun 1995
    'Operacija Trokut',         // Triangle — 5th Corps, Jul 1995
    'Operacija Crveni Lav',     // Red Lion — Vozuca phase 1, Sep 1995
    'Operacija Farz',           // Farz 95 — 3rd Corps Vozuca, Sep 1995
    'Operacija Uragan',         // Hurricane — 2nd Corps Vozuca, Sep 1995
    'Operacija Sana',           // Sana 95 — 5th Corps, Sep 1995
    // --- Placeholders: aspirational + nature + Islamic ---
    'Operacija Sabur',          // Patience (Islamic virtue)
    'Operacija Nada',           // Hope
    'Operacija Osvit',          // First light / Daybreak
    'Operacija Hajka',          // Hunt / Chase
    'Operacija Pravda',         // Justice
    'Operacija Oluja',          // Storm
    'Operacija Kiša',           // Rain
    'Operacija Sjena',          // Shadow
    'Operacija Šahin',         // Peregrine falcon (Islamic/Turkish)
    'Operacija Ćuprija',      // Bridge (Turkish/Bosnian)
    'Operacija Džihad',        // Struggle (spiritual, not holy war)
    'Operacija Gazija',         // Veteran warrior (Turkish/Bosnian)
    'Operacija Ihlas',          // Sincerity (Islamic term)
    'Operacija Grad',           // Hail (weather)
    'Operacija Lavina',         // Avalanche
    'Operacija Kopljem',        // By the Spear
    'Operacija Ponos',          // Pride
    'Operacija Izlaz',          // Way out / Exit
    'Operacija Odbrana',        // Defense
    'Operacija Naprijed',       // Forward
    'Operacija Odluka',         // Decision
    'Operacija Čelik',         // Steel
    'Operacija Rijeka',         // River
    'Operacija Biser',          // Pearl
    'Operacija Plamičak',      // Little Flame
    'Operacija Strijela',       // Arrow
    'Operacija Kalem',          // Graft (agricultural — building something new)
];

// ═══════════════════════════════════════════════════════════════════════════
// HVO (HRHB) — Croatian tradition: weather, force, action
// ═══════════════════════════════════════════════════════════════════════════

const HRHB_NAMES: string[] = [
    // --- Historical (BB1/BB2, Croatian military records) ---
    'Operacija Lipanjske Zore',  // June Dawns — Herzegovina, Jun 1992
    'Operacija Bura',            // Bora wind — Nevesinje, Nov 1992
    'Operacija Cincar',          // Mt Cincar — first joint HVO-ARBiH, Nov 1994
    'Operacija Zima',            // Winter 94 — SW Bosnia, Dec 1994
    'Operacija Skok',            // Leap — Dinara positions, Apr 1995
    'Operacija Ljeto',           // Summer 95 — Grahovo/Glamoc, Jul 1995
    'Operacija Maestral',        // Mistral wind — western Bosnia, Sep 1995
    'Operacija Južni Potez',    // Southern Move — final offensive, Oct 1995
    // --- Placeholders: Croatian weather/force/action ---
    'Operacija Jugo',            // Sirocco wind (Adriatic)
    'Operacija Bljesak',         // Flash
    'Operacija Guja',            // Viper
    'Operacija Vihor',           // Whirlwind
    'Operacija Grmljavina',      // Thunderstorm
    'Operacija Strijela',        // Arrow
    'Operacija Udar',            // Strike
    'Operacija Nakovanj',        // Anvil
    'Operacija Čekić',          // Hammer
    'Operacija Kobac',           // Sparrowhawk
    'Operacija Kuna',            // Marten (Croatian national animal)
    'Operacija Obzor',           // Horizon
    'Operacija Svitanje',        // Daybreak
    'Operacija Krijes',          // Bonfire
    'Operacija Vjetar',          // Wind
    'Operacija Pljusak',         // Downpour
    'Operacija Grom',            // Thunder
    'Operacija Plima',           // Tide
    'Operacija Oseka',           // Ebb tide
    'Operacija Proboj',          // Breakthrough
    'Operacija Karike',          // Links (chain)
    'Operacija Tmina',           // Darkness
    'Operacija Žalac',          // Sting
    'Operacija Oštrica',        // Blade
    'Operacija Sjekira',         // Axe
    'Operacija Snaga',           // Strength/Power
    'Operacija Oklop',           // Armor
    'Operacija Juriš',          // Assault / Charge
];

// ═══════════════════════════════════════════════════════════════════════════
// Name pools indexed by faction
// ═══════════════════════════════════════════════════════════════════════════

export const OPERATION_NAMES: Record<string, readonly string[]> = {
    RS: RS_NAMES,
    RBiH: RBiH_NAMES,
    HRHB: HRHB_NAMES,
};

// ═══════════════════════════════════════════════════════════════════════════
// Sequential consumption (no repeats)
// ═══════════════════════════════════════════════════════════════════════════

/** Simple deterministic hash for starting index. No randomness. */
export function simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/**
 * Pick a unique operation name from the faction's pool.
 *
 * Sequential consumption: hash determines starting index, then scans
 * forward for the first name not in `state.used_operation_names`.
 * Each name is used at most once per game. If pool is exhausted,
 * appends a numeric suffix to recycle from the top.
 */
export function pickOperationName(
    corpsId: string,
    turn: number,
    faction: string,
    state?: GameState,
): string {
    const pool = OPERATION_NAMES[faction] ?? RS_NAMES;
    const used = state?.military?.used_operation_names ?? {};
    const key = `${corpsId}:${turn}`;
    const startIdx = simpleHash(key) % pool.length;

    function markUsed(name: string): string {
        if (state) {
            if (!state.military.used_operation_names) state.military.used_operation_names = {};
            state.military.used_operation_names[name] = turn;
        }
        return name;
    }

    // Scan forward from hash index for first unused name
    for (let i = 0; i < pool.length; i++) {
        const idx = (startIdx + i) % pool.length;
        const name = pool[idx]!;
        if (!used[name]) return markUsed(name);
    }

    // Pool exhausted — recycle with numeric suffix
    for (let i = 0; i < pool.length; i++) {
        const idx = (startIdx + i) % pool.length;
        const name = `${pool[idx]!} 2`;
        if (!used[name]) return markUsed(name);
    }

    // Absolute fallback (should never reach in practice with 40+ names)
    return markUsed(`Operacija ${turn}-${corpsId.slice(-4)}`);
}
