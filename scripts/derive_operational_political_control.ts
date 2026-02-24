/**
 * derive_operational_political_control.ts
 *
 * Derives initial political control (April 1992) for operational settlements
 * from their aggregated 1991 census ethnic majority. Logic:
 *   1. Ethnic majority → faction (Bosniak→RBiH, Serb→RS, Croat→HRHB)
 *   2. Municipality controller baseline from April 1992 (for mixed/null cases)
 *   3. RBiH-aligned municipality overrides (HRHB→RBiH in Bihać, Tuzla, etc.)
 *   4. Settlement-level overrides (hardcoded corrections)
 *
 * Output:
 *   - data/derived/operational/operational_political_control.json
 *     Shape: { by_settlement_id: { [osid]: faction } }
 *     Loadable by map_hoi via auto-load or ControlLookup.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(import.meta.dirname ?? '.', '..', 'data');
const OP_DIR = resolve(DATA, 'derived', 'operational');

// ─── Load data ──────────────────────────────────────────────────────────────
const opGeo = JSON.parse(readFileSync(resolve(OP_DIR, 'operational_settlements.geojson'), 'utf8'));

// April 1992 municipality controllers
const munControllers: { controllers_by_mun1990_id: Record<string, string | null> } =
    JSON.parse(readFileSync(resolve(DATA, 'source', 'municipalities_1990_initial_political_controllers_apr1992.json'), 'utf8'));

const settlementOverridesRaw: { overrides: Record<string, string> } =
    JSON.parse(readFileSync(resolve(DATA, 'source', 'settlement_political_controllers_overrides.json'), 'utf8'));

// Parse settlement overrides keyed by numeric census ID → faction
const settlementOverrides = new Map<string, string>();
for (const [key, faction] of Object.entries(settlementOverridesRaw.overrides)) {
    const parts = key.split(':');
    const censusId = parts[parts.length - 1]!;
    settlementOverrides.set(`S${censusId}`, faction);
}

// RBiH-aligned municipalities (HRHB→RBiH, RS stays RS)
const RBIH_ALIGNED = new Set([
    'maglaj', 'bihac', 'gradacac', 'brcko', 'ilijas',
    'tuzla', 'lopare', 'srebrenik', 'tesanj', 'velika_kladusa', 'vogosca',
]);

const MAJORITY_THRESHOLD = 0.40;

// ─── Derive control ─────────────────────────────────────────────────────────
console.log('Deriving operational political control (April 1992)...');

const controlByOsid: Record<string, string> = {};
const counts = { RBiH: 0, RS: 0, HRHB: 0 };

for (const feature of opGeo.features) {
    const p = feature.properties;
    const osid = p.osid as string;
    const mun = p.mun1990_id as string;
    const seedSid = p.sid as string;
    const popTotal = (p.population_total as number) || 0;
    const popB = (p.population_bosniaks as number) || 0;
    const popS = (p.population_serbs as number) || 0;
    const popC = (p.population_croats as number) || 0;

    let faction: string | null = null;

    // Step 1: Settlement-level override on the seed
    if (settlementOverrides.has(seedSid)) {
        faction = settlementOverrides.get(seedSid)!;
    }

    // Step 2: Ethnic majority from aggregated population
    if (!faction && popTotal > 0) {
        const bShare = popB / popTotal;
        const sShare = popS / popTotal;
        const cShare = popC / popTotal;

        if (bShare >= MAJORITY_THRESHOLD) faction = 'RBiH';
        else if (sShare >= MAJORITY_THRESHOLD) faction = 'RS';
        else if (cShare >= MAJORITY_THRESHOLD) faction = 'HRHB';
        else {
            // Mixed — use plurality
            const max = Math.max(bShare, sShare, cShare);
            if (bShare === max) faction = 'RBiH';
            else if (sShare === max) faction = 'RS';
            else if (cShare === max) faction = 'HRHB';
        }
    }

    // Step 3: Fallback to April 1992 municipality controller
    if (!faction) {
        faction = munControllers.controllers_by_mun1990_id[mun] ?? null;
    }

    // Step 4: RBiH-aligned municipality overrides (HRHB→RBiH)
    if (faction === 'HRHB' && RBIH_ALIGNED.has(mun)) {
        faction = 'RBiH';
    }

    // Step 5: Final fallback
    if (!faction) faction = 'RBiH';

    controlByOsid[osid] = faction;
    counts[faction as keyof typeof counts]++;
}

console.log(`  Control: RBiH=${counts.RBiH}, RS=${counts.RS}, HRHB=${counts.HRHB}`);

// ─── Write output ───────────────────────────────────────────────────────────
const payload = {
    meta: {
        total_settlements: Object.keys(controlByOsid).length,
        counts,
        source: 'April 1992 initial control from aggregated 1991 census ethnic majority',
        municipality_controllers: 'municipalities_1990_initial_political_controllers_apr1992.json',
    },
    by_settlement_id: controlByOsid,
};

writeFileSync(
    resolve(OP_DIR, 'operational_political_control.json'),
    JSON.stringify(payload, null, 2)
);
console.log(`  Wrote operational_political_control.json (${Object.keys(controlByOsid).length} entries)`);
console.log('Done.');
