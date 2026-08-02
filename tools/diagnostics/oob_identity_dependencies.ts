import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

interface DesignationCatalog { rows: Array<{ id: string }> }
interface OfficerCatalog { officers: Array<{ id: string }> }

export interface OobIdentityDependencyReport {
    scanned_files: string[];
    missing_brigade_ids: string[];
    missing_officer_ids: string[];
    references_by_id: Record<string, string[]>;
}

const SCAN_ROOTS = [
    'data/scenarios',
    'data/derived/startup',
    'data/source',
    'src/sim',
    'src/ui',
] as const;
const TEXT_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx']);

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function listTextFiles(rootDir: string): string[] {
    const files: string[] = [];
    const visit = (absolutePath: string): void => {
        if (!existsSync(absolutePath)) return;
        const stat = statSync(absolutePath);
        if (stat.isFile()) {
            if (TEXT_EXTENSIONS.has(extname(absolutePath).toLowerCase())) files.push(absolutePath);
            return;
        }
        for (const name of readdirSync(absolutePath).sort(compareText)) visit(join(absolutePath, name));
    };
    for (const scanRoot of SCAN_ROOTS) visit(resolve(rootDir, ...scanRoot.split('/')));
    return files.sort(compareText);
}

function quotedReference(text: string, id: string): boolean {
    return text.includes(`'${id}'`) || text.includes(`"${id}"`) || text.includes(`\`${id}\``);
}

export function auditAuthoredIdentityDependencies(rootDir = process.cwd()): OobIdentityDependencyReport {
    const designationPath = resolve(rootDir, 'data', 'source', 'oob_brigade_designations.json');
    const brigadePath = resolve(rootDir, 'data', 'source', 'oob_brigades.json');
    const officerPath = resolve(rootDir, 'data', 'scenarios', 'officers', 'apr1992_officers.json');
    const designationIds = existsSync(designationPath)
        ? readJson<DesignationCatalog>(designationPath).rows.map((row) => row.id).sort(compareText)
        : [];
    const playableBrigadeIds = new Set(
        existsSync(brigadePath) ? readJson<Array<{ id: string }>>(brigadePath).map((row) => row.id) : [],
    );
    const playableOfficerIds = new Set(
        existsSync(officerPath) ? readJson<OfficerCatalog>(officerPath).officers.map((row) => row.id) : [],
    );
    const provenancePath = resolve(rootDir, 'docs', 'provenance', 'OFFICER_OOB_PROVENANCE.json');
    const omittedOfficerIds = new Set<string>();
    const omittedBrigadeIds = new Set<string>();
    if (existsSync(provenancePath)) {
        const manifest = readJson<{ omissions?: Record<string, { record_kind: string; record_id: string }> }>(provenancePath);
        for (const row of Object.values(manifest.omissions ?? {})) {
            if (row.record_kind === 'officer') omittedOfficerIds.add(row.record_id);
            if (row.record_kind === 'brigade') omittedBrigadeIds.add(row.record_id);
        }
    }
    const brigadeUniverse = [...new Set([...designationIds, ...omittedBrigadeIds])].sort(compareText);
    const officerUniverse = [...new Set([...playableOfficerIds, ...omittedOfficerIds])].sort(compareText);
    const files = listTextFiles(rootDir);
    const referencesById = new Map<string, string[]>();
    const recordReference = (id: string, relativePath: string): void => {
        const paths = referencesById.get(id) ?? [];
        paths.push(relativePath);
        referencesById.set(id, paths);
    };
    for (const absolutePath of files) {
        const relativePath = relative(resolve(rootDir), absolutePath).replaceAll('\\', '/');
        const text = readFileSync(absolutePath, 'utf8');
        for (const id of brigadeUniverse) if (quotedReference(text, id)) recordReference(id, relativePath);
        for (const id of officerUniverse) if (quotedReference(text, id)) recordReference(id, relativePath);
    }
    const missingBrigadeIds = brigadeUniverse
        .filter((id) => (referencesById.get(id)?.length ?? 0) > 0 && !playableBrigadeIds.has(id))
        .sort(compareText);
    const missingOfficerIds = officerUniverse
        .filter((id) => (referencesById.get(id)?.length ?? 0) > 0 && !playableOfficerIds.has(id))
        .sort(compareText);
    return {
        scanned_files: files.map((path) => relative(resolve(rootDir), path).replaceAll('\\', '/')),
        missing_brigade_ids: missingBrigadeIds,
        missing_officer_ids: missingOfficerIds,
        references_by_id: Object.fromEntries(
            [...referencesById.entries()]
                .sort(([a], [b]) => compareText(a, b))
                .map(([id, paths]) => [id, [...new Set(paths)].sort(compareText)]),
        ),
    };
}
