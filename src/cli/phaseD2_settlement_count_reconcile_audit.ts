/**
 * Phase D2: Settlement count reconciliation audit (audit-only).
 *
 * Explains deterministically why settlements_index_1990 has 6146 settlements
 * while bih_census_1991.json metadata indicates 6140, and classifies the delta
 * without changing mechanics or regenerating data.
 *
 * Inputs (read-only):
 *   - data/derived/settlements_index_1990.json
 *   - data/source/bih_census_1991.json
 *   - data/derived/settlements_substrate.geojson (optional; for substrate presence check)
 *
 * Output: data/derived/_debug/phaseD2_settlement_count_reconcile_report.txt
 *   Deterministic; no timestamps; stable sorted sections.
 *
 * Exit: non-zero ONLY if any input file is missing/unreadable or parsing fails.
 *       Count mismatch does NOT cause failure (audit-only).
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const MAX_FULL_LIST = 500;
const MAX_TRUNCATED = 200;
const REPORT_PATH = resolve(ROOT, 'data/derived/_debug/phaseD2_settlement_count_reconcile_report.txt');


interface SettlementRecord {
    sid?: string;
    source_id?: string;
    mun_code?: string;
    mun?: string;
    name?: string;
    mun1990_id?: string;
    [k: string]: unknown;
}

interface SettlementsIndex {
    settlements?: SettlementRecord[];
    [k: string]: unknown;
}

interface CensusMunicipality {
    n?: string;
    s?: string[];
    p?: number[];
    [k: string]: unknown;
}

interface CensusFile {
    metadata?: { settlement_count?: number; municipality_count?: number;[k: string]: unknown };
    municipalities?: Record<string, CensusMunicipality>;
    [k: string]: unknown;
}

interface GeoFeature {
    type?: string;
    properties?: Record<string, unknown>;
    geometry?: unknown;
}

interface SubstrateGeoJSON {
    type?: string;
    features?: GeoFeature[];
    [k: string]: unknown;
}

function getSid(s: SettlementRecord): string {
    if (typeof s.sid === 'string' && s.sid.length > 0) return s.sid;
    if (typeof s.source_id === 'string' && s.source_id.length > 0 && typeof s.mun_code === 'string') {
        return `${s.mun_code}:${s.source_id}`;
    }
    return '';
}

async function main(): Promise<void> {
    const indexPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
    const censusPath = resolve(ROOT, 'data/source/bih_census_1991.json');
    const substratePath = resolve(ROOT, 'data/derived/settlements_substrate.geojson');

    if (!existsSync(indexPath)) {
        console.error(`Missing: ${indexPath}`);
        process.exit(1);
    }
    if (!existsSync(censusPath)) {
        console.error(`Missing: ${censusPath}`);
        process.exit(1);
    }

    let indexText: string;
    let censusText: string;
    try {
        indexText = await readFile(indexPath, 'utf8');
        censusText = await readFile(censusPath, 'utf8');
    } catch (err) {
        console.error('Failed to read input file:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    let indexData: SettlementsIndex;
    let censusData: CensusFile;
    try {
        indexData = JSON.parse(indexText) as SettlementsIndex;
        censusData = JSON.parse(censusText) as CensusFile;
    } catch (err) {
        console.error('Failed to parse input:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    const settlements: SettlementRecord[] = Array.isArray(indexData.settlements) ? indexData.settlements : [];
    const indexSids = new Set<string>();
    const indexBySid = new Map<string, SettlementRecord>();
    for (const s of settlements) {
        const sid = getSid(s);
        if (sid) {
            indexSids.add(sid);
            indexBySid.set(sid, s);
        }
    }

    const censusSids = new Set<string>();
    const censusMunBySid = new Map<string, string>();
    const censusNameBySid = new Map<string, string>();
    const municipalities = censusData.municipalities ?? {};
    const munCodes = Object.keys(municipalities).sort();
    for (const munCode of munCodes) {
        const mun = municipalities[munCode];
        const name = typeof mun.n === 'string' ? mun.n : '';
        const sArr = Array.isArray(mun.s) ? mun.s : [];
        for (const id of sArr) {
            const sid = `${munCode}:${String(id)}`;
            censusSids.add(sid);
            censusMunBySid.set(sid, munCode);
            censusNameBySid.set(sid, name);
        }
    }

    const count_index = indexSids.size;
    const count_census = censusSids.size;
    const censusMetadataCount = (censusData.metadata?.settlement_count as number) ?? null;

    const in_index_not_in_census = [...indexSids].filter((id) => !censusSids.has(id)).sort();
    const in_census_not_in_index = [...censusSids].filter((id) => !indexSids.has(id)).sort();
    const intersection = [...indexSids].filter((id) => censusSids.has(id));
    const intersection_count = intersection.length;

    let substrateSids: Set<string> | null = null;
    if (existsSync(substratePath)) {
        try {
            const substrateText = await readFile(substratePath, 'utf8');
            const substrate = JSON.parse(substrateText) as SubstrateGeoJSON;
            const features = Array.isArray(substrate.features) ? substrate.features : [];
            substrateSids = new Set<string>();
            for (const f of features) {
                const p = f.properties ?? {};
                const mid = typeof p.municipality_id === 'string' ? p.municipality_id : '';
                const sid = typeof p.sid === 'string' ? p.sid : String(p.sid ?? '');
                if (mid && sid) substrateSids.add(`${mid}:${sid}`);
            }
        } catch {
            substrateSids = null;
        }
    }

    const lines: string[] = [];
    lines.push('Phase D2: Settlement count reconciliation audit');
    lines.push('');
    lines.push('SUMMARY_COUNTS');
    lines.push('---------------');
    lines.push(`count_index: ${count_index}`);
    lines.push(`count_census: ${count_census}`);
    lines.push(`census_metadata_settlement_count: ${censusMetadataCount ?? '(not set)'}`);
    lines.push(`intersection_count: ${intersection_count}`);
    lines.push(`in_index_not_in_census: ${in_index_not_in_census.length}`);
    lines.push(`in_census_not_in_index: ${in_census_not_in_index.length}`);
    lines.push(`delta (index - census): ${count_index - count_census}`);
    lines.push('');

    const fullListThreshold = MAX_FULL_LIST;
    const showFullInIndex = in_index_not_in_census.length <= fullListThreshold;
    const showFullInCensus = in_census_not_in_index.length <= fullListThreshold;

    lines.push('IN_INDEX_NOT_IN_CENSUS');
    lines.push('----------------------');
    lines.push(`total: ${in_index_not_in_census.length}`);
    if (in_index_not_in_census.length > 0) {
        const list = showFullInIndex ? in_index_not_in_census : in_index_not_in_census.slice(0, MAX_TRUNCATED);
        for (const sid of list) {
            const rec = indexBySid.get(sid);
            const mun = rec?.mun ?? '';
            const mun1990 = (rec?.mun1990_id as string) ?? '';
            const name = (rec?.name as string) ?? '';
            const sub = substrateSids?.has(sid) ? 'in_substrate' : 'not_in_substrate';
            lines.push(`${sid}\tmun=${mun}\tmun1990_id=${mun1990}\tname=${name}\t${sub}`);
        }
        if (!showFullInIndex) {
            lines.push(`... and ${in_index_not_in_census.length - MAX_TRUNCATED} more (total ${in_index_not_in_census.length})`);
        }
    }
    lines.push('');

    lines.push('IN_CENSUS_NOT_IN_INDEX');
    lines.push('----------------------');
    lines.push(`total: ${in_census_not_in_index.length}`);
    if (in_census_not_in_index.length > 0) {
        const list = showFullInCensus ? in_census_not_in_index : in_census_not_in_index.slice(0, MAX_TRUNCATED);
        for (const sid of list) {
            const munCode = censusMunBySid.get(sid) ?? '';
            const munName = censusNameBySid.get(sid) ?? '';
            const sub = substrateSids?.has(sid) ? 'in_substrate' : 'not_in_substrate';
            lines.push(`${sid}\tmun_code=${munCode}\tmun_name=${munName}\t${sub}`);
        }
        if (!showFullInCensus) {
            lines.push(`... and ${in_census_not_in_index.length - MAX_TRUNCATED} more (total ${in_census_not_in_index.length})`);
        }
    }
    lines.push('');

    lines.push('CLASSIFICATION');
    lines.push('---------------');
    if (in_index_not_in_census.length > 0) {
        lines.push('in_index_not_in_census: Index includes settlements not present in census (e.g. non-census admin nodes or post-1995 additions).');
    }
    if (in_census_not_in_index.length > 0) {
        lines.push('in_census_not_in_index: Census lists settlement IDs not present in index (possible data integrity gap if index is authoritative).');
    }
    if (in_index_not_in_census.length === 0 && in_census_not_in_index.length === 0) {
        lines.push('No symmetric difference; index and census settlement sets match.');
    }
    lines.push('');

    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, lines.join('\n'), 'utf8');

    console.log('Phase D2 settlement count reconciliation audit');
    console.log('---------------------------------------------');
    console.log(`count_index: ${count_index}`);
    console.log(`count_census: ${count_census}`);
    console.log(`intersection_count: ${intersection_count}`);
    console.log(`in_index_not_in_census: ${in_index_not_in_census.length}`);
    console.log(`in_census_not_in_index: ${in_census_not_in_index.length}`);
    console.log(`Report: ${REPORT_PATH}`);

    const dataIntegrityRisk =
        in_census_not_in_index.length > 0 &&
        (censusData.metadata?.settlement_count != null || count_census > 0);
    if (dataIntegrityRisk) {
        console.log('');
        console.log(
            '** docs/FORAWWV.md may require an addendum ** if census settlement IDs not represented in index/substrate imply a data integrity or authority assumption change. Do NOT edit FORAWWV.md automatically.'
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
