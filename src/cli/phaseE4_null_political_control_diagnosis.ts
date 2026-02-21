/**
 * Phase E4: Null political control diagnosis (audit-only).
 *
 * Quantifies why settlements initialize with political_controller = null.
 * Uses municipality inheritance: settlements inherit controller from mun1990_id.
 * Nulls occur when the mapping has controller=null for that mun1990_id.
 *
 * No heuristics, no filling, no guessing. Deterministic report only.
 *
 * Inputs:
 *   - data/derived/settlements_index_1990.json
 *   - data/derived/municipality_political_controllers_1990.json
 *
 * Output: data/derived/_debug/phaseE4_null_political_control_diagnosis_report.txt
 *   Deterministic; no timestamps; stable sorted.
 *
 * Exit: non-zero only on missing/unreadable input or parse errors.
 *       Never fails due to null counts (audit-only).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


interface SettlementRecord {
    sid?: string;
    mun1990_id?: string;
    [k: string]: unknown;
}

interface SettlementsIndex {
    settlements?: SettlementRecord[];
    [k: string]: unknown;
}

interface ControllerMappingFile {
    controllers_by_mun1990_id?: Record<string, string | null>;
    [k: string]: unknown;
}

function getSid(s: SettlementRecord): string {
    if (typeof s.sid === 'string' && s.sid.length > 0) return s.sid;
    return '';
}

async function main(): Promise<void> {
    const indexPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
    const mappingPath = resolve(ROOT, 'data/derived/municipality_political_controllers_1990.json');
    const reportPath = resolve(ROOT, 'data/derived/_debug/phaseE4_null_political_control_diagnosis_report.txt');

    const [indexText, mappingText] = await Promise.all([
        readFile(indexPath, 'utf8'),
        readFile(mappingPath, 'utf8')
    ]);

    const indexData = JSON.parse(indexText) as SettlementsIndex;
    const mappingData = JSON.parse(mappingText) as ControllerMappingFile;

    const settlements: SettlementRecord[] = Array.isArray(indexData.settlements) ? indexData.settlements : [];
    const controllersByMun1990 = mappingData.controllers_by_mun1990_id ?? {};

    // Sort settlements deterministically
    const sortedSettlements = [...settlements].sort((a, b) => getSid(a).localeCompare(getSid(b)));

    // Per-settlement: mun1990_id → controller
    const mun1990Count: Record<string, number> = {};
    const nullSettlementsByMun: Record<string, number> = {};

    for (const s of sortedSettlements) {
        const mun1990Id = typeof s.mun1990_id === 'string' ? s.mun1990_id : '';
        if (mun1990Id === '') continue;

        mun1990Count[mun1990Id] = (mun1990Count[mun1990Id] ?? 0) + 1;
        const controller = controllersByMun1990[mun1990Id];
        if (controller === null) {
            nullSettlementsByMun[mun1990Id] = (nullSettlementsByMun[mun1990Id] ?? 0) + 1;
        }
    }

    const totalSettlements = settlements.length;
    const totalNullSettlements = Object.values(nullSettlementsByMun).reduce((a, b) => a + b, 0);

    // mun1990_id → controller distribution at mapping level
    const mappingKeys = Object.keys(controllersByMun1990).sort((a, b) => a.localeCompare(b));
    const mappingControllerCounts: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
    const mun1990IdsWithNullController: string[] = [];

    for (const mid of mappingKeys) {
        const c = controllersByMun1990[mid];
        const key = c === null ? 'null' : c;
        if (typeof mappingControllerCounts[key] === 'number') {
            mappingControllerCounts[key]++;
        }
        if (c === null) {
            mun1990IdsWithNullController.push(mid);
        }
    }
    mun1990IdsWithNullController.sort((a, b) => a.localeCompare(b));

    // Top 25 mun1990_ids by null settlement count (count desc, then mun1990_id asc)
    const mun1990WithNullCounts = Object.entries(nullSettlementsByMun)
        .map(([mid, count]) => ({ mun1990_id: mid, null_count: count }))
        .sort((a, b) => {
            if (b.null_count !== a.null_count) return b.null_count - a.null_count;
            return a.mun1990_id.localeCompare(b.mun1990_id);
        });
    const top25 = mun1990WithNullCounts.slice(0, 25);

    // Null settlements grouped by mun1990_id (counts and % within mun)
    const nullByMunEntries = Object.entries(nullSettlementsByMun)
        .map(([mid, nullCount]) => {
            const totalInMun = mun1990Count[mid] ?? 0;
            const pct = totalInMun > 0 ? ((nullCount / totalInMun) * 100).toFixed(1) : '0.0';
            return { mun1990_id: mid, null_count: nullCount, total_in_mun: totalInMun, pct };
        })
        .sort((a, b) => {
            if (b.null_count !== a.null_count) return b.null_count - a.null_count;
            return a.mun1990_id.localeCompare(b.mun1990_id);
        });

    const lines: string[] = [];
    lines.push('Phase E4: Null political control diagnosis');
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-------');
    lines.push(`total_settlements: ${totalSettlements}`);
    lines.push(`total_null_settlements: ${totalNullSettlements}`);
    lines.push(`null_pct: ${totalSettlements > 0 ? ((totalNullSettlements / totalSettlements) * 100).toFixed(1) : '0.0'}%`);
    lines.push('');
    lines.push('MAPPING_LEVEL_CONTROLLER_DISTRIBUTION (mun1990_id -> RBiH/RS/HRHB/null)');
    lines.push('----------------------------------------------------------------------');
    for (const k of ['RBiH', 'RS', 'HRHB', 'null']) {
        lines.push(`${k}: ${mappingControllerCounts[k] ?? 0}`);
    }
    lines.push('');
    lines.push('MUN1990_IDS_WITH_NULL_CONTROLLER_IN_MAPPING (these cause null inheritance)');
    lines.push('---------------------------------------------------------------------------');
    for (const mid of mun1990IdsWithNullController) {
        lines.push(mid);
    }
    lines.push('');
    lines.push('TOP_25_MUN1990_IDS_BY_NULL_SETTLEMENT_COUNT');
    lines.push('-------------------------------------------');
    for (const x of top25) {
        const totalInMun = mun1990Count[x.mun1990_id] ?? 0;
        const pct = totalInMun > 0 ? ((x.null_count / totalInMun) * 100).toFixed(1) : '0.0';
        lines.push(`${x.mun1990_id}\t${x.null_count}\t${totalInMun}\t${pct}%`);
    }
    lines.push('');
    lines.push('NULL_SETTLEMENTS_BY_MUN1990_ID (mun1990_id, null_count, total_in_mun, pct)');
    lines.push('--------------------------------------------------------------------------');
    for (const x of nullByMunEntries) {
        lines.push(`${x.mun1990_id}\t${x.null_count}\t${x.total_in_mun}\t${x.pct}%`);
    }
    lines.push('');
    lines.push('MUNICIPALITIES_REQUIRING_AUTHORITATIVE_ASSIGNMENT');
    lines.push('(mun1990_ids with null in mapping, grouped by null-settlements impact severity)');
    lines.push('------------------------------------------------------------------------------');
    const high = mun1990IdsWithNullController.filter((mid) => (nullSettlementsByMun[mid] ?? 0) >= 50);
    const medium = mun1990IdsWithNullController.filter((mid) => {
        const c = nullSettlementsByMun[mid] ?? 0;
        return c >= 10 && c < 50;
    });
    const low = mun1990IdsWithNullController.filter((mid) => {
        const c = nullSettlementsByMun[mid] ?? 0;
        return c >= 1 && c < 10;
    });
    const zero = mun1990IdsWithNullController.filter((mid) => (nullSettlementsByMun[mid] ?? 0) === 0);
    lines.push('High (>=50 null settlements):');
    for (const mid of high.sort((a, b) => a.localeCompare(b))) {
        lines.push(`  ${mid} (${nullSettlementsByMun[mid]} null)`);
    }
    lines.push('Medium (10-49 null settlements):');
    for (const mid of medium.sort((a, b) => a.localeCompare(b))) {
        lines.push(`  ${mid} (${nullSettlementsByMun[mid]} null)`);
    }
    lines.push('Low (1-9 null settlements):');
    for (const mid of low.sort((a, b) => a.localeCompare(b))) {
        lines.push(`  ${mid} (${nullSettlementsByMun[mid]} null)`);
    }
    lines.push('Zero impact (0 null settlements; mun not in index or no settlements):');
    for (const mid of zero.sort((a, b) => a.localeCompare(b))) {
        lines.push(`  ${mid}`);
    }
    lines.push('');
    lines.push('CANONICAL_FIX_PATH');
    lines.push('------------------');
    lines.push('Initial municipality-level political controllers: data/source/municipalities_1990_initial_political_controllers.json');
    lines.push('Current Phase C derived mapping (post-1995 collapse): data/derived/municipality_political_controllers_1990.json');
    lines.push('To switch init to use initial controllers: update political_control_init.ts to load');
    lines.push('municipalities_1990_initial_political_controllers.json when available and complete.');
    lines.push('');

    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, lines.join('\n'), 'utf8');

    console.log('Phase E4 null political control diagnosis');
    console.log('-----------------------------------------');
    console.log(`total_settlements: ${totalSettlements}`);
    console.log(`total_null_settlements: ${totalNullSettlements}`);
    console.log(`mun1990_ids_with_null_controller: ${mun1990IdsWithNullController.length}`);
    console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
