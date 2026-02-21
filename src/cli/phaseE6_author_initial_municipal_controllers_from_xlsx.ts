/**
 * Phase E6: Author initial municipal political controllers from authoritative XLSX.
 * Fills null placeholders in municipalities_1990_initial_political_controllers.json
 * using ONLY explicit assignments in src/docs/municipalities_BiH.xlsx.
 * Deterministic parsing and reporting; no heuristics.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const XLSX_PATH = resolve(ROOT, 'src/docs/municipalities_BiH.xlsx');
const REGISTRY_PATH = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
const TARGET_PATH = resolve(ROOT, 'data/source/municipalities_1990_initial_political_controllers.json');
const REPORT_PATH = resolve(ROOT, 'data/derived/_debug/phaseE6_author_initial_municipal_controllers_from_xlsx_report.txt');

const MUN1990_ID_REGEX = /^[a-z0-9_]+$/;
const ALLOWED_CONTROLLERS = ['RBiH', 'RS', 'HRHB'] as const;
type ControllerId = (typeof ALLOWED_CONTROLLERS)[number] | null;

/** Identifier column: prefer mun1990_id, else Pre-1995 municipality. */
const ID_COLUMN_CANDIDATES = ['mun1990_id', 'Pre-1995 municipality'] as const;
/** Controller column in XLSX (Party that won 1990 elections). */
const CONTROLLER_COLUMN = 'Party that won 1990 elections';

/**
 * Authoritative mapping from XLSX party token (after trim) to controller.
 * Only these tokens are accepted; any other value causes FAIL.
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

interface RegistryRow {
    mun1990_id: string;
    name: string;
    normalized_name: string;
}

interface TargetJson {
    meta: { purpose?: string; id_scheme?: string; allowed_values?: unknown[]; notes?: string };
    controllers_by_mun1990_id: Record<string, ControllerId>;
    null_justifications_by_mun1990_id?: Record<string, string>;
    controller_justifications_by_mun1990_id?: Record<string, string>;
    missing_in_authoritative_source?: string[];
    unmapped_rows?: Array<{ row_index: number; raw_identifier: string; raw_controller: string }>;
    conflicts?: Array<{ mun1990_id: string; current: ControllerId; authoritative: ControllerId }>;
}

interface UnmappedRow {
    row_index: number;
    raw_identifier: string;
    raw_controller: string;
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

    const idColCandidate = ID_COLUMN_CANDIDATES.find((h) => headers.includes(h));
    const idCol = idColCandidate != null ? headers.indexOf(idColCandidate) : -1;
    if (idCol < 0) {
        throw new Error(
            `XLSX missing identifier column. Looked for: ${ID_COLUMN_CANDIDATES.join(', ')}. Headers: ${headers.join(', ')}`
        );
    }

    const controllerCol = headers.indexOf(CONTROLLER_COLUMN);
    if (controllerCol < 0) {
        throw new Error(
            `XLSX missing controller column "${CONTROLLER_COLUMN}". Headers: ${headers.join(', ')}`
        );
    }

    const registryRaw = JSON.parse(await readFile(REGISTRY_PATH, 'utf8')) as {
        rows?: RegistryRow[];
    };
    const registryRows: RegistryRow[] = registryRaw.rows ?? [];
    const nameToMun1990Id = new Map<string, string>();
    const normalizedNameToMun1990Id = new Map<string, string>();
    for (const row of registryRows) {
        nameToMun1990Id.set(row.name, row.mun1990_id);
        normalizedNameToMun1990Id.set(row.normalized_name, row.mun1990_id);
    }

    const targetRaw = JSON.parse(await readFile(TARGET_PATH, 'utf8')) as TargetJson;
    const controllers = { ...targetRaw.controllers_by_mun1990_id };
    const nullJustifications = { ...(targetRaw.null_justifications_by_mun1990_id ?? {}) };
    let controllerJustifications: Record<string, string> = { ...(targetRaw.controller_justifications_by_mun1990_id ?? {}) };
    const missingInSource: string[] = [];
    const unmappedRows: UnmappedRow[] = [];
    const conflicts: Array<{ mun1990_id: string; current: ControllerId; authoritative: ControllerId }> = [];
    const unexpectedTokens: string[] = [];

    const xlsxRowsByMun1990Id = new Map<string, Array<{ rowIndex: number; controller: ControllerId }>>();

    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const rawId = getCellStr(sheet, r, idCol);
        const rawController = getCellStr(sheet, r, controllerCol);
        if (!rawId) continue;

        let mun1990_id: string | undefined;
        if (idColCandidate === 'mun1990_id') {
            if (!MUN1990_ID_REGEX.test(rawId)) {
                unmappedRows.push({ row_index: r + 1, raw_identifier: rawId, raw_controller: rawController });
                continue;
            }
            const inRegistry = registryRows.some((row) => row.mun1990_id === rawId);
            if (!inRegistry) {
                unmappedRows.push({ row_index: r + 1, raw_identifier: rawId, raw_controller: rawController });
                continue;
            }
            mun1990_id = rawId;
        } else {
            mun1990_id = nameToMun1990Id.get(rawId) ?? normalizedNameToMun1990Id.get(rawId);
            if (mun1990_id == null) {
                unmappedRows.push({ row_index: r + 1, raw_identifier: rawId, raw_controller: rawController });
                continue;
            }
        }

        let controller: ControllerId;
        if (rawController === '' || rawController.toLowerCase() === 'null') {
            controller = null;
        } else if (ALLOWED_CONTROLLERS.includes(rawController as (typeof ALLOWED_CONTROLLERS)[number])) {
            controller = rawController as ControllerId;
        } else if (AUTHORITATIVE_PARTY_TO_CONTROLLER[rawController] !== undefined) {
            controller = AUTHORITATIVE_PARTY_TO_CONTROLLER[rawController];
        } else {
            if (!unexpectedTokens.includes(rawController)) unexpectedTokens.push(rawController);
            continue;
        }

        const list = xlsxRowsByMun1990Id.get(mun1990_id) ?? [];
        list.push({ rowIndex: r + 1, controller });
        xlsxRowsByMun1990Id.set(mun1990_id, list);
    }

    unexpectedTokens.sort((a, b) => a.localeCompare(b));
    if (unexpectedTokens.length > 0) {
        const msg = `Unexpected controller tokens in XLSX (must be RBiH, RS, HRHB, null, or a key in AUTHORITATIVE_PARTY_TO_CONTROLLER): ${unexpectedTokens.join(', ')}`;
        process.stderr.write(msg + '\n');
        process.exit(1);
    }

    const duplicateConflicts: Array<{ mun1990_id: string; rows: number[]; controllers: string[] }> = [];
    for (const [mun1990_id, list] of xlsxRowsByMun1990Id) {
        if (list.length > 1) {
            const controllersInRows = [...new Set(list.map((x) => String(x.controller)))];
            if (controllersInRows.length > 1) {
                duplicateConflicts.push({
                    mun1990_id,
                    rows: list.map((x) => x.rowIndex).sort((a, b) => a - b),
                    controllers: controllersInRows.sort((a, b) => a.localeCompare(b))
                });
            }
        }
    }
    if (duplicateConflicts.length > 0) {
        duplicateConflicts.sort((a, b) => a.mun1990_id.localeCompare(b.mun1990_id));
        const reportLines: string[] = [
            'Phase E6: Author initial municipal controllers from XLSX',
            '',
            'STATUS: FAIL',
            'REASON: Duplicate mun1990_id in XLSX with conflicting controllers',
            '',
            'DUPLICATE_MUN1990_ID_CONFLICTS: ' + duplicateConflicts.length,
            ...duplicateConflicts.map(
                (d) => `  ${d.mun1990_id} rows=[${d.rows.join(', ')}] controllers=[${d.controllers.join(', ')}]`
            )
        ];
        await mkdir(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
        await writeFile(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');
        process.stderr.write(
            `Duplicate mun1990_id in XLSX with conflicting controllers: ${duplicateConflicts.map((d) => d.mun1990_id).join(', ')}. Report: ${REPORT_PATH}\n`
        );
        process.exit(1);
    }

    const authoritativeByMun1990Id = new Map<string, ControllerId>();
    for (const [mun1990_id, list] of xlsxRowsByMun1990Id) {
        authoritativeByMun1990Id.set(mun1990_id, list[0].controller);
    }

    const registryOrder = registryRows.map((r) => r.mun1990_id);
    let updatedFromNullToNonNull = 0;

    for (const mun1990_id of registryOrder) {
        const current = controllers[mun1990_id] ?? null;
        const auth = authoritativeByMun1990Id.get(mun1990_id);

        if (auth !== undefined) {
            controllerJustifications[mun1990_id] = 'Auth: src/docs/municipalities_BiH.xlsx';
            if (current === null && auth !== null) {
                controllers[mun1990_id] = auth;
                updatedFromNullToNonNull += 1;
                if (nullJustifications[mun1990_id]) delete nullJustifications[mun1990_id];
            } else if (current !== null && auth !== null && current !== auth) {
                conflicts.push({ mun1990_id, current, authoritative: auth });
            } else if (current === null && auth === null) {
                // keep null
            }
        } else {
            if (controllers[mun1990_id] === null || controllers[mun1990_id] === undefined) {
                missingInSource.push(mun1990_id);
                nullJustifications[mun1990_id] = 'Missing in src/docs/municipalities_BiH.xlsx; pending resolution';
            }
        }
    }

    missingInSource.sort((a, b) => a.localeCompare(b));
    conflicts.sort((a, b) => a.mun1990_id.localeCompare(b.mun1990_id));
    unmappedRows.sort((a, b) => a.row_index - b.row_index);

    const out: TargetJson = {
        meta: targetRaw.meta,
        controllers_by_mun1990_id: controllers,
        null_justifications_by_mun1990_id: Object.keys(nullJustifications).length > 0 ? nullJustifications : undefined,
        controller_justifications_by_mun1990_id:
            Object.keys(controllerJustifications).length > 0 ? controllerJustifications : undefined,
        missing_in_authoritative_source: missingInSource.length > 0 ? missingInSource : undefined,
        unmapped_rows: unmappedRows.length > 0 ? unmappedRows : undefined,
        conflicts: conflicts.length > 0 ? conflicts : undefined
    };

    await writeFile(TARGET_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

    const count = (c: ControllerId) =>
        Object.values(controllers).filter((v) => (v === null ? c === null : v === c)).length;
    const beforeRBiH = Object.values(targetRaw.controllers_by_mun1990_id ?? {}).filter((v) => v === 'RBiH').length;
    const beforeRS = Object.values(targetRaw.controllers_by_mun1990_id ?? {}).filter((v) => v === 'RS').length;
    const beforeHRHB = Object.values(targetRaw.controllers_by_mun1990_id ?? {}).filter((v) => v === 'HRHB').length;
    const beforeNull = Object.values(targetRaw.controllers_by_mun1990_id ?? {}).filter((v) => v == null).length;

    const reportLines: string[] = [
        'Phase E6: Author initial municipal controllers from XLSX',
        '',
        'XLSX_SHEET_USED: ' + sheetName,
        'HEADER_MAPPING: ' + headers.join(' | '),
        'IDENTIFIER_COLUMN: ' + (idColCandidate ?? ''),
        'CONTROLLER_COLUMN: ' + CONTROLLER_COLUMN,
        '',
        'COUNTS_BEFORE: RBiH=' + beforeRBiH + ', RS=' + beforeRS + ', HRHB=' + beforeHRHB + ', null=' + beforeNull,
        'COUNTS_AFTER: RBiH=' + count('RBiH') + ', RS=' + count('RS') + ', HRHB=' + count('HRHB') + ', null=' + count(null),
        'UPDATED_FROM_NULL_TO_NON_NULL: ' + updatedFromNullToNonNull,
        '',
        'MISSING_IN_AUTHORITATIVE_SOURCE: ' + missingInSource.length,
        ...missingInSource.map((id) => '  ' + id),
        '',
        'UNMAPPED_ROWS: ' + unmappedRows.length,
        ...unmappedRows.map((u) => `  row_index=${u.row_index} raw_identifier=${JSON.stringify(u.raw_identifier)} raw_controller=${JSON.stringify(u.raw_controller)}`),
        '',
        'CONFLICTS: ' + conflicts.length,
        ...conflicts.map((c) => `  ${c.mun1990_id} current=${c.current} authoritative=${c.authoritative}`)
    ];

    await mkdir(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
    await writeFile(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

    if (unmappedRows.length > 0) {
        process.stderr.write(`Phase E6: ${unmappedRows.length} unmapped XLSX row(s); see report. Exit 1.\n`);
        process.exit(1);
    }

    process.stdout.write(
        `Phase E6: Updated ${updatedFromNullToNonNull} municipalities from null to non-null. ` +
        `Missing in source: ${missingInSource.length}. Conflicts: ${conflicts.length}. Report: ${REPORT_PATH}\n`
    );
}

main().catch((err) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
});
