/**
 * Phase E7: Canonicalize municipalities_BiH.xlsx into a deterministic, conflict-free
 * municipal controller mapping with explicit overrides (no heuristics).
 *
 * Produces:
 * - Conflict report (always): data/derived/_debug/phaseE7_municipalities_BiH_conflicts_report.txt
 * - Canonical mapping (on success only): data/_deprecated/derived/municipalities_BiH_initial_controller_map.json
 *   (Deprecated: authoritative mun1990 controllers live in data/source/municipalities_1990_initial_political_controllers.json; this file is kept for E8 regeneration only.)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const XLSX_PATH = resolve(ROOT, 'src/docs/municipalities_BiH.xlsx');
const REGISTRY_PATH = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
const OVERRIDES_PATH = resolve(ROOT, 'src/docs/municipalities_BiH_overrides.json');
const REPORT_PATH = resolve(ROOT, 'data/derived/_debug/phaseE7_municipalities_BiH_conflicts_report.txt');
const OUTPUT_PATH = resolve(ROOT, 'data/_deprecated/derived/municipalities_BiH_initial_controller_map.json');

const PRE1995_COLUMN = 'Pre-1995 municipality';
const CONTROLLER_COLUMN = 'Party that won 1990 elections';

const ALLOWED_CONTROLLERS = ['RBiH', 'RS', 'HRHB'] as const;
type ControllerId = (typeof ALLOWED_CONTROLLERS)[number] | null;

/**
 * Authoritative mapping from XLSX party token (after trim) to controller.
 * Same as E6 - no heuristics.
 */
const AUTHORITATIVE_PARTY_TO_CONTROLLER: Record<string, ControllerId> = {
    'Stranka demokratske akcije': 'RBiH',
    'Srpska demokratska stranka': 'RS',
    'Hrvatska demokratska zajednica BiH': 'HRHB',
    'Savez komunista BiH - Stranka demokratskih promjena': null
};

function trim(s: string): string {
    return s.trim();
}

interface XlsxRow {
    rowIndex: number;
    pre1995Name: string;
    rawParty: string;
    controller: ControllerId;
}

function getCellStr(sheet: XLSX.WorkSheet, r: number, c: number): string {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    if (cell == null || cell.v == null) return '';
    return trim(String(cell.v));
}

async function main(): Promise<void> {
    const buffer = await readFile(XLSX_PATH);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('XLSX has no sheets');
    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) throw new Error('Sheet has no range');

    const range = XLSX.utils.decode_range(ref);
    const headerRow = range.s.r;
    const headers: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        headers.push(getCellStr(sheet, headerRow, c));
    }

    const pre1995Col = headers.indexOf(PRE1995_COLUMN);
    if (pre1995Col < 0) {
        throw new Error(
            `XLSX missing column "${PRE1995_COLUMN}". Headers: ${headers.join(', ')}`
        );
    }

    const controllerCol = headers.indexOf(CONTROLLER_COLUMN);
    if (controllerCol < 0) {
        throw new Error(
            `XLSX missing column "${CONTROLLER_COLUMN}". Headers: ${headers.join(', ')}`
        );
    }

    JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));

    const overridesRaw = JSON.parse(await readFile(OVERRIDES_PATH, 'utf8')) as {
        meta?: unknown;
        overrides_by_pre1995_name?: Record<string, string | null>;
    };
    const overrides = overridesRaw.overrides_by_pre1995_name ?? {};

    const unexpectedPartyTokens: string[] = [];
    const rowsByPre1995Name = new Map<string, XlsxRow[]>();

    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const pre1995Name = getCellStr(sheet, r, pre1995Col);
        const rawParty = getCellStr(sheet, r, controllerCol);
        if (!pre1995Name) continue;

        let controller: ControllerId;
        if (rawParty === '' || rawParty.toLowerCase() === 'null') {
            controller = null;
        } else if (ALLOWED_CONTROLLERS.includes(rawParty as (typeof ALLOWED_CONTROLLERS)[number])) {
            controller = rawParty as ControllerId;
        } else if (AUTHORITATIVE_PARTY_TO_CONTROLLER[rawParty] !== undefined) {
            controller = AUTHORITATIVE_PARTY_TO_CONTROLLER[rawParty];
        } else {
            if (!unexpectedPartyTokens.includes(rawParty)) unexpectedPartyTokens.push(rawParty);
            continue;
        }

        const list = rowsByPre1995Name.get(pre1995Name) ?? [];
        list.push({ rowIndex: r + 1, pre1995Name, rawParty, controller });
        rowsByPre1995Name.set(pre1995Name, list);
    }

    unexpectedPartyTokens.sort((a, b) => a.localeCompare(b));
    if (unexpectedPartyTokens.length > 0) {
        const msg = `Unexpected party strings in XLSX: ${unexpectedPartyTokens.join(', ')}`;
        process.stderr.write(msg + '\n');
        process.exit(1);
    }

    const allDuplicatePre1995Names: string[] = [];
    const conflictingDuplicates: Array<{
        pre1995Name: string;
        rowNumbers: number[];
        controllers: string[];
        rawParties: string[];
    }> = [];
    const unresolvedConflicts: string[] = [];
    const overrideUnknownMunicipalities: string[] = [];

    const pre1995NamesInXlsx = [...rowsByPre1995Name.keys()].sort((a, b) => a.localeCompare(b));

    for (const overrideName of Object.keys(overrides)) {
        if (!rowsByPre1995Name.has(overrideName)) {
            overrideUnknownMunicipalities.push(overrideName);
        }
    }
    overrideUnknownMunicipalities.sort((a, b) => a.localeCompare(b));

    if (overrideUnknownMunicipalities.length > 0) {
        const msg = `Overrides contain unknown municipality names (not in XLSX): ${overrideUnknownMunicipalities.join(', ')}`;
        process.stderr.write(msg + '\n');
        process.exit(1);
    }

    const controllersByPre1995Name: Record<string, ControllerId> = {};

    for (const pre1995Name of pre1995NamesInXlsx) {
        const rows = rowsByPre1995Name.get(pre1995Name)!;
        const controllers = [...new Set(rows.map((x) => x.controller))];
        const uniqueControllers = [...new Set(rows.map((x) => String(x.controller)))].sort((a, b) =>
            a.localeCompare(b)
        );

        if (rows.length > 1) {
            allDuplicatePre1995Names.push(pre1995Name);
        }

        if (controllers.length === 1) {
            controllersByPre1995Name[pre1995Name] = controllers[0];
        } else {
            conflictingDuplicates.push({
                pre1995Name,
                rowNumbers: rows.map((x) => x.rowIndex).sort((a, b) => a - b),
                controllers: uniqueControllers,
                rawParties: [...new Set(rows.map((x) => x.rawParty))].sort((a, b) => a.localeCompare(b))
            });

            const overrideValue = overrides[pre1995Name];
            if (overrideValue !== undefined) {
                const allowed = ['RBiH', 'RS', 'HRHB', null];
                const resolved: ControllerId =
                    overrideValue === null || overrideValue === 'null' ? null : (overrideValue as ControllerId);
                if (!allowed.includes(resolved)) {
                    process.stderr.write(
                        `Override for "${pre1995Name}" has invalid value: ${JSON.stringify(overrideValue)}\n`
                    );
                    process.exit(1);
                }
                controllersByPre1995Name[pre1995Name] = resolved;
            } else {
                unresolvedConflicts.push(pre1995Name);
            }
        }
    }

    allDuplicatePre1995Names.sort((a, b) => a.localeCompare(b));
    conflictingDuplicates.sort((a, b) => a.pre1995Name.localeCompare(b.pre1995Name));
    unresolvedConflicts.sort((a, b) => a.localeCompare(b));

    const reportLines: string[] = [
        'Phase E7: Canonicalize municipalities_BiH.xlsx duplicates via explicit overrides',
        '',
        'SOURCE: src/docs/municipalities_BiH.xlsx',
        'OVERRIDES: src/docs/municipalities_BiH_overrides.json',
        '',
        'ALL_DUPLICATE_PRE1995_MUNICIPALITIES: ' + allDuplicatePre1995Names.length,
        ...allDuplicatePre1995Names.map((n) => '  ' + n),
        '',
        'CONFLICTING_DUPLICATES: ' + conflictingDuplicates.length,
        ...conflictingDuplicates.map(
            (d) =>
                `  ${d.pre1995Name} rows=[${d.rowNumbers.join(', ')}] controllers=[${d.controllers.join(', ')}] raw_parties=[${d.rawParties.map((p) => JSON.stringify(p)).join(', ')}]`
        ),
        '',
        'UNRESOLVED_CONFLICTS: ' + unresolvedConflicts.length,
        ...unresolvedConflicts.map((n) => '  ' + n),
        '',
        'STATUS: ' + (unresolvedConflicts.length === 0 ? 'SUCCESS' : 'FAIL')
    ];

    await mkdir(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
    await writeFile(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

    if (unresolvedConflicts.length > 0) {
        process.stderr.write(
            `Phase E7: ${unresolvedConflicts.length} unresolved conflict(s). Add overrides to ${OVERRIDES_PATH}. Report: ${REPORT_PATH}\n`
        );
        process.exit(1);
    }

    const sortedKeys = Object.keys(controllersByPre1995Name).sort((a, b) => a.localeCompare(b));
    const sortedControllersByPre1995Name: Record<string, ControllerId> = {};
    for (const k of sortedKeys) {
        sortedControllersByPre1995Name[k] = controllersByPre1995Name[k];
    }

    const output = {
        meta: {
            source_xlsx: 'src/docs/municipalities_BiH.xlsx',
            source_overrides: 'src/docs/municipalities_BiH_overrides.json',
            key: 'pre_1995_municipality_name_trimmed',
            allowed_values: ['RBiH', 'RS', 'HRHB', null]
        },
        controllers_by_pre1995_name: sortedControllersByPre1995Name
    };

    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

    process.stdout.write(
        `Phase E7: Success. Canonical mapping written to ${OUTPUT_PATH}. Report: ${REPORT_PATH}\n`
    );
}

main().catch((err) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
});
