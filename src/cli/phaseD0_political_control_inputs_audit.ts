/**
 * Phase D0: Political control initialization inputs audit (validation-only).
 *
 * Confirms Phase C mun1990_id + mun1990 political controller mapping is consumable
 * as deterministic initialization input. No simulation mechanics changes.
 *
 * Validates:
 *   A) Every settlement has mun1990_id present and matching ^[a-z0-9_]+$
 *   B) Every settlement's mun1990_id exists in the mun1990 registry (110 entries)
 *   C) Every settlement's mun1990_id has an entry in the controller mapping
 *   D) Controller values are one of RBiH, RS, HRHB, or null
 *
 * Inputs (read-only):
 *   - data/derived/settlements_index_1990.json
 *   - data/derived/municipality_political_controllers_1990.json
 *   - data/source/municipalities_1990_registry_110.json
 *
 * Output: data/derived/_debug/phaseD0_political_control_inputs_report.txt
 *   Deterministic; no timestamps; stable sorted sections.
 *
 * Exit: non-zero if any validation A–D fails.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const MUN1990_ID_REGEX = /^[a-z0-9_]+$/;
const ALLOWED_FACTIONS = new Set<string>(['RBiH', 'RS', 'HRHB']);
const MAX_OFFENDERS = 25;


interface SettlementRecord {
    sid?: string;
    source_id?: string;
    mun1990_id?: string;
    [k: string]: unknown;
}

interface SettlementsIndex {
    settlements?: SettlementRecord[];
    [k: string]: unknown;
}

interface RegistryRow {
    mun1990_id: string;
    [k: string]: unknown;
}

interface RegistryFile {
    rows?: RegistryRow[];
    count?: number;
    [k: string]: unknown;
}

interface ControllerMappingFile {
    controllers_by_mun1990_id?: Record<string, string | null>;
    [k: string]: unknown;
}

function getSid(s: SettlementRecord): string {
    if (typeof s.sid === 'string' && s.sid.length > 0) return s.sid;
    if (typeof s.source_id === 'string' && s.source_id.length > 0) return s.source_id;
    return '';
}

function isAllowedController(value: string | null): boolean {
    return value === null || ALLOWED_FACTIONS.has(value);
}

async function main(): Promise<void> {
    const indexPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
    const mappingPath = resolve(ROOT, 'data/derived/municipality_political_controllers_1990.json');
    const registryPath = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
    const reportPath = resolve(ROOT, 'data/derived/_debug/phaseD0_political_control_inputs_report.txt');

    const [indexText, mappingText, registryText] = await Promise.all([
        readFile(indexPath, 'utf8'),
        readFile(mappingPath, 'utf8'),
        readFile(registryPath, 'utf8')
    ]);

    const indexData = JSON.parse(indexText) as SettlementsIndex;
    const mappingData = JSON.parse(mappingText) as ControllerMappingFile;
    const registryData = JSON.parse(registryText) as RegistryFile;

    const settlements: SettlementRecord[] = Array.isArray(indexData.settlements) ? indexData.settlements : [];
    const controllersByMun1990 = mappingData.controllers_by_mun1990_id ?? {};
    const registryRows: RegistryRow[] = Array.isArray(registryData.rows) ? registryData.rows : [];

    const registryIds = new Set<string>();
    for (const row of registryRows) {
        if (typeof row.mun1990_id === 'string') registryIds.add(row.mun1990_id);
    }

    const mappingKeys = new Set<string>(Object.keys(controllersByMun1990));

    const invalidMun1990Id: Array<{ sid: string; mun1990_id: string }> = [];
    const missingRegistry: Array<{ sid: string; mun1990_id: string }> = [];
    const missingMapping: Array<{ sid: string; mun1990_id: string }> = [];
    const invalidController: Array<{ sid: string; mun1990_id: string; value: string | null }> = [];

    const controllerCounts: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };

    const sortedSettlements = [...settlements].sort((a, b) => getSid(a).localeCompare(getSid(b)));

    for (const s of sortedSettlements) {
        const sid = getSid(s);
        const raw = s.mun1990_id;
        const mun1990Id = typeof raw === 'string' ? raw : '';

        if (mun1990Id === '' || !MUN1990_ID_REGEX.test(mun1990Id)) {
            invalidMun1990Id.push({ sid, mun1990_id: mun1990Id || '(missing)' });
            continue;
        }

        if (!registryIds.has(mun1990Id)) {
            missingRegistry.push({ sid, mun1990_id: mun1990Id });
            continue;
        }

        const controller = controllersByMun1990[mun1990Id];
        if (controller === undefined) {
            missingMapping.push({ sid, mun1990_id: mun1990Id });
            continue;
        }

        if (!isAllowedController(controller)) {
            invalidController.push({ sid, mun1990_id: mun1990Id, value: controller });
            continue;
        }

        const key = controller === null ? 'null' : controller;
        controllerCounts[key] = (controllerCounts[key] ?? 0) + 1;
    }

    const uniqueMun1990Ids = new Set(
        settlements.map((s) => (typeof s.mun1990_id === 'string' ? s.mun1990_id : '')).filter(Boolean)
    ).size;

    const hasFailures =
        invalidMun1990Id.length > 0 ||
        missingRegistry.length > 0 ||
        missingMapping.length > 0 ||
        invalidController.length > 0;

    const lines: string[] = [];
    lines.push('Phase D0: Political control initialization inputs audit');
    lines.push('');
    lines.push('COUNTS');
    lines.push('-------');
    lines.push(`settlements: ${settlements.length}`);
    lines.push(`unique_mun1990_ids: ${uniqueMun1990Ids}`);
    lines.push(`invalid_or_missing_mun1990_id: ${invalidMun1990Id.length}`);
    lines.push(`missing_registry_id: ${missingRegistry.length}`);
    lines.push(`missing_mapping_id: ${missingMapping.length}`);
    lines.push(`invalid_controller_value: ${invalidController.length}`);
    lines.push('');
    lines.push('CONTROLLER_COUNTS');
    lines.push('-----------------');
    for (const k of ['RBiH', 'RS', 'HRHB', 'null'].sort()) {
        lines.push(`${k}: ${controllerCounts[k] ?? 0}`);
    }
    lines.push('');
    lines.push('INVALID_OR_MISSING_MUN1990_ID (sid, mun1990_id)');
    lines.push('-----------------------------------------------');
    for (const x of invalidMun1990Id.slice(0, MAX_OFFENDERS)) {
        lines.push(`${x.sid}\t${x.mun1990_id}`);
    }
    if (invalidMun1990Id.length > MAX_OFFENDERS) {
        lines.push(`... and ${invalidMun1990Id.length - MAX_OFFENDERS} more`);
    }
    lines.push('');
    lines.push('MISSING_REGISTRY_ID (sid, mun1990_id)');
    lines.push('------------------------------------');
    for (const x of missingRegistry.slice(0, MAX_OFFENDERS)) {
        lines.push(`${x.sid}\t${x.mun1990_id}`);
    }
    if (missingRegistry.length > MAX_OFFENDERS) {
        lines.push(`... and ${missingRegistry.length - MAX_OFFENDERS} more`);
    }
    lines.push('');
    lines.push('MISSING_MAPPING_ID (sid, mun1990_id)');
    lines.push('-----------------------------------');
    for (const x of missingMapping.slice(0, MAX_OFFENDERS)) {
        lines.push(`${x.sid}\t${x.mun1990_id}`);
    }
    if (missingMapping.length > MAX_OFFENDERS) {
        lines.push(`... and ${missingMapping.length - MAX_OFFENDERS} more`);
    }
    lines.push('');
    lines.push('INVALID_CONTROLLER_VALUE (sid, mun1990_id, value)');
    lines.push('-----------------------------------------------');
    for (const x of invalidController.slice(0, MAX_OFFENDERS)) {
        lines.push(`${x.sid}\t${x.mun1990_id}\t${String(x.value)}`);
    }
    if (invalidController.length > MAX_OFFENDERS) {
        lines.push(`... and ${invalidController.length - MAX_OFFENDERS} more`);
    }
    lines.push('');

    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, lines.join('\n'), 'utf8');

    console.log('Phase D0 political control inputs audit');
    console.log('---------------------------------------');
    console.log(`settlements: ${settlements.length}`);
    console.log(`unique_mun1990_ids: ${uniqueMun1990Ids}`);
    console.log(`invalid_or_missing_mun1990_id: ${invalidMun1990Id.length}`);
    console.log(`missing_registry_id: ${missingRegistry.length}`);
    console.log(`missing_mapping_id: ${missingMapping.length}`);
    console.log('controller counts:');
    console.log(`  RBiH: ${controllerCounts.RBiH ?? 0}, RS: ${controllerCounts.RS ?? 0}, HRHB: ${controllerCounts.HRHB ?? 0}, null: ${controllerCounts.null ?? 0}`);
    if (invalidMun1990Id.length > 0) {
        console.log(`invalid/missing mun1990_id (first ${Math.min(MAX_OFFENDERS, invalidMun1990Id.length)}):`);
        for (const x of invalidMun1990Id.slice(0, MAX_OFFENDERS)) {
            console.log(`  ${x.sid}  ${x.mun1990_id}`);
        }
    }
    if (missingRegistry.length > 0) {
        console.log(`missing registry (first ${Math.min(MAX_OFFENDERS, missingRegistry.length)}):`);
        for (const x of missingRegistry.slice(0, MAX_OFFENDERS)) {
            console.log(`  ${x.sid}  ${x.mun1990_id}`);
        }
    }
    if (missingMapping.length > 0) {
        console.log(`missing mapping (first ${Math.min(MAX_OFFENDERS, missingMapping.length)}):`);
        for (const x of missingMapping.slice(0, MAX_OFFENDERS)) {
            console.log(`  ${x.sid}  ${x.mun1990_id}`);
        }
    }
    if (invalidController.length > 0) {
        console.log(`invalid controller (first ${Math.min(MAX_OFFENDERS, invalidController.length)}):`);
        for (const x of invalidController.slice(0, MAX_OFFENDERS)) {
            console.log(`  ${x.sid}  ${x.mun1990_id}  ${String(x.value)}`);
        }
    }
    console.log(`Report: ${reportPath}`);

    if (hasFailures) {
        console.error('Validation failed: one or more of A–D failed. See report.');
        process.exit(1);
    }
    console.log('PASS: all validations A–D passed.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
