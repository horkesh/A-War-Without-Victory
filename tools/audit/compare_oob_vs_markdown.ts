import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const MARKDOWN_SOURCES = {
    'RBiH': 'docs/knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md',
    'RS': 'docs/knowledge/VRS_APPENDIX_G_FULL_BRIGADE_LIST.md',
    'HRHB': 'docs/knowledge/HVO_FULL_BRIGADE_LIST.md',
} as const;

interface BrigadeRow {
    id?: string;
    faction?: string;
    recruit_pool_faction?: string;
    [key: string]: unknown;
}

type Faction = keyof typeof MARKDOWN_SOURCES;

interface EvidenceIdentity {
    faction: Faction;
    name: string;
    normalized_name: string;
    source: string;
    line: number;
}

interface IdentityDisposition {
    disposition: 'modeled_extra' | 'evidence_only';
    reason: string;
}

interface AliasDisposition {
    oob_id: string;
    relation: 'designation_alias' | 'cross_faction_operational_alignment';
    reason: string;
    source_url?: string;
    citation?: string;
}

interface DispositionLedger {
    schema_version: 2;
    aliases: Record<string, AliasDisposition>;
    modeled_extras: Record<string, IdentityDisposition>;
    evidence_only: Record<string, IdentityDisposition>;
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function assertRepoSource(rootDir: string, sourceUrl: string, evidenceKey: string): void {
    if (!sourceUrl.startsWith('repo://')) {
        throw new Error(`Alias ${evidenceKey} must cite a repo:// source.`);
    }
    const relativePath = sourceUrl.slice('repo://'.length);
    if (!relativePath || path.isAbsolute(relativePath)) {
        throw new Error(`Alias ${evidenceKey} has a malformed repo:// source.`);
    }
    const resolvedRoot = path.resolve(rootDir);
    const resolvedSource = path.resolve(resolvedRoot, relativePath);
    const relativeToRoot = path.relative(resolvedRoot, resolvedSource);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        throw new Error(`Alias ${evidenceKey} repo:// source escapes the repository.`);
    }
    if (!fs.existsSync(resolvedSource)) {
        throw new Error(`Alias ${evidenceKey} repo:// source is missing: ${sourceUrl}`);
    }
    if (!fs.statSync(resolvedSource).isFile()) {
        throw new Error(`Alias ${evidenceKey} repo:// source is not a file: ${sourceUrl}`);
    }
}

// --- Helpers ---

export function countBrigadesInMarkdown(filePath: string, rootDir = ROOT): number {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) throw new Error(`OOB evidence file not found: ${fullPath}`);
    return readBrigadesInMarkdown(filePath, inferFaction(filePath), rootDir).length;
}

function inferFaction(filePath: string): Faction {
    const entry = (Object.entries(MARKDOWN_SOURCES) as Array<[Faction, string]>).find(([, value]) => value === filePath);
    if (!entry) throw new Error(`Unknown OOB evidence source: ${filePath}`);
    return entry[0];
}

export function normalizeIdentityName(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\*/g, '')
        .replace(/[“”„'`]/g, '')
        .replace(/\bbrigade\b|\bbrigada\b/g, '')
        .replace(/\bunits?\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

export function readBrigadesInMarkdown(filePath: string, faction: Faction, rootDir = ROOT): EvidenceIdentity[] {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`OOB evidence file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const rows: EvidenceIdentity[] = [];
    let inBrigadeTable = false;

    // console.log(`Scanning ${filePath}...`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Header detection (H1, H2, H3...)
        if (line.startsWith('#')) {
            const upper = line.toUpperCase();
            if (upper.includes('BRIGADES') && upper.includes('FULL LIST')) {
                inBrigadeTable = true;
            } else if (upper.includes('BATTALION') || upper.includes('SPECIAL')) {
                inBrigadeTable = false;
            }
        }

        if (inBrigadeTable && line.startsWith('|')) {
            // Ignore separators
            if (line.includes('---')) continue;
            // Ignore headers (case insensitive check for common header terms)
            if (/^\|\s*(brigade(?:\s*\/\s*unit)?|unit)\s*\|/i.test(line)) continue;

            // Count valid row
            const cols = line.split('|').filter(s => s.trim() !== '');
            if (cols.length >= 2) {
                const name = cols[0].trim();
                rows.push({ faction, name, normalized_name: normalizeIdentityName(name), source: filePath, line: i + 1 });
            }
        }
    }
    return rows;
}

export interface OobComparison {
    markdown_counts: Record<keyof typeof MARKDOWN_SOURCES, number>;
    oob_counts: Record<keyof typeof MARKDOWN_SOURCES, number>;
    deltas: Record<keyof typeof MARKDOWN_SOURCES, number>;
    matched_identities: Array<{
        faction: Faction;
        evidence_faction: Faction;
        oob_id: string;
        oob_name: string;
        evidence_name: string;
        faction_relation: 'direct_same_faction' | AliasDisposition['relation'];
        alias_reason?: string;
        alias_source_url?: string;
        alias_citation?: string;
    }>;
    dispositions: Array<{ kind: 'modeled_extra' | 'evidence_only'; key: string; name: string; reason: string }>;
    unresolved_mismatches: Array<{ kind: 'modeled_extra' | 'evidence_only'; key: string; name: string }>;
    identity_match_ok: boolean;
}

export function buildOobComparison(rootDir = ROOT): OobComparison {
    const oobPath = path.join(rootDir, 'data/source/oob_brigades.json');
    const brigades = normalizeOobBrigades(JSON.parse(fs.readFileSync(oobPath, 'utf-8')));
    const factions = Object.keys(MARKDOWN_SOURCES) as Array<keyof typeof MARKDOWN_SOURCES>;
    const markdownCounts = { RBiH: 0, RS: 0, HRHB: 0 };
    const oobCounts = { RBiH: 0, RS: 0, HRHB: 0 };
    const evidenceRows: EvidenceIdentity[] = [];
    for (const brigade of brigades) {
        const faction = brigade.faction as keyof typeof MARKDOWN_SOURCES | undefined;
        if (faction && Object.prototype.hasOwnProperty.call(oobCounts, faction)) oobCounts[faction]++;
    }
    for (const faction of factions) {
        const rows = readBrigadesInMarkdown(MARKDOWN_SOURCES[faction], faction, rootDir);
        evidenceRows.push(...rows);
        markdownCounts[faction] = rows.length;
    }
    const ledgerPath = path.join(rootDir, 'docs/provenance/OOB_MARKDOWN_IDENTITY_DISPOSITIONS.json');
    if (!fs.existsSync(ledgerPath)) throw new Error(`OOB identity disposition ledger not found: ${ledgerPath}`);
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as DispositionLedger;
    if (ledger.schema_version !== 2) throw new Error('Unsupported OOB identity disposition ledger schema.');
    const evidenceByKey = new Map<string, EvidenceIdentity[]>();
    for (const row of evidenceRows) {
        const key = `${row.faction}:${row.normalized_name}`;
        const bucket = evidenceByKey.get(key) ?? [];
        bucket.push(row);
        evidenceByKey.set(key, bucket);
    }
    const matched: OobComparison['matched_identities'] = [];
    let unmatchedOob: Array<{ faction: Faction; id: string; name: string; recruit_pool_faction?: string }> = [];
    for (const brigade of brigades) {
        const faction = brigade.faction as Faction;
        if (!Object.prototype.hasOwnProperty.call(MARKDOWN_SOURCES, faction)) continue;
        const id = String(brigade.id ?? '');
        const name = String(brigade.name ?? id);
        const key = `${faction}:${normalizeIdentityName(name)}`;
        const bucket = evidenceByKey.get(key);
        const evidence = bucket?.shift();
        if (evidence) matched.push({
            faction,
            evidence_faction: evidence.faction,
            oob_id: id,
            oob_name: name,
            evidence_name: evidence.name,
            faction_relation: 'direct_same_faction',
        });
        else unmatchedOob.push({
            faction,
            id,
            name,
            recruit_pool_faction: typeof brigade.recruit_pool_faction === 'string'
                ? brigade.recruit_pool_faction
                : undefined,
        });
    }
    let unmatchedEvidence = [...evidenceByKey.entries()].flatMap(([key, rows]) => rows.map((row) => ({ key, ...row })));
    for (const [evidenceKey, alias] of Object.entries(ledger.aliases ?? {}).sort(([a], [b]) => strictCompare(a, b))) {
        const evidenceIndex = unmatchedEvidence.findIndex((row) => row.key === evidenceKey);
        const oobIndex = unmatchedOob.findIndex((row) => row.id === alias.oob_id);
        if (evidenceIndex < 0) throw new Error(`Alias evidence identity is not unresolved: ${evidenceKey}`);
        if (oobIndex < 0) throw new Error(`Alias playable identity is not unresolved: ${alias.oob_id}`);
        if (!alias.reason?.trim()) throw new Error(`Alias ${evidenceKey} requires a reviewed reason.`);
        const evidence = unmatchedEvidence[evidenceIndex];
        const oob = unmatchedOob[oobIndex];
        const isCrossFaction = evidence.faction !== oob.faction;
        if (isCrossFaction) {
            if (alias.relation !== 'cross_faction_operational_alignment') {
                throw new Error(`Cross-faction alias ${evidenceKey} requires an explicit operational-alignment relation.`);
            }
            if (oob.recruit_pool_faction !== evidence.faction) {
                throw new Error(`Cross-faction alias ${evidenceKey} must preserve ${evidence.faction} recruitment origin.`);
            }
            if (!alias.source_url || !alias.citation?.trim()) {
                throw new Error(`Cross-faction alias ${evidenceKey} requires an exact source and citation.`);
            }
            assertRepoSource(rootDir, alias.source_url, evidenceKey);
        } else if (alias.relation !== 'designation_alias') {
            throw new Error(`Same-faction alias ${evidenceKey} must use designation_alias.`);
        }
        matched.push({
            faction: oob.faction,
            evidence_faction: evidence.faction,
            oob_id: oob.id,
            oob_name: oob.name,
            evidence_name: evidence.name,
            faction_relation: alias.relation,
            alias_reason: alias.reason,
            alias_source_url: alias.source_url,
            alias_citation: alias.citation,
        });
        unmatchedEvidence.splice(evidenceIndex, 1);
        unmatchedOob.splice(oobIndex, 1);
    }
    const dispositions: OobComparison['dispositions'] = [];
    const unresolved: OobComparison['unresolved_mismatches'] = [];
    for (const row of unmatchedOob) {
        const disposition = ledger.modeled_extras[row.id];
        if (disposition?.disposition === 'modeled_extra' && disposition.reason.trim()) {
            dispositions.push({ kind: 'modeled_extra', key: row.id, name: row.name, reason: disposition.reason });
        } else unresolved.push({ kind: 'modeled_extra', key: row.id, name: row.name });
    }
    for (const row of unmatchedEvidence) {
        const disposition = ledger.evidence_only[row.key];
        if (disposition?.disposition === 'evidence_only' && disposition.reason.trim()) {
            dispositions.push({ kind: 'evidence_only', key: row.key, name: row.name, reason: disposition.reason });
        } else unresolved.push({ kind: 'evidence_only', key: row.key, name: row.name });
    }
    return {
        markdown_counts: markdownCounts,
        oob_counts: oobCounts,
        deltas: Object.fromEntries(factions.map((faction) => [
            faction,
            oobCounts[faction] - markdownCounts[faction],
        ])) as Record<keyof typeof MARKDOWN_SOURCES, number>,
        matched_identities: matched.sort((a, b) => strictCompare(a.oob_id, b.oob_id)),
        dispositions: dispositions.sort((a, b) => strictCompare(a.key, b.key)),
        unresolved_mismatches: unresolved.sort((a, b) => strictCompare(a.key, b.key)),
        identity_match_ok: unresolved.length === 0,
    };
}

export function normalizeOobBrigades(raw: unknown): BrigadeRow[] {
    if (Array.isArray(raw)) return raw as BrigadeRow[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { brigades?: unknown }).brigades)) {
        return (raw as { brigades: BrigadeRow[] }).brigades;
    }
    throw new Error('OOB JSON must contain a brigade array.');
}

// --- Main ---

function main(): void {
    console.log('--- Order of Battle Verification ---\n');
    try {
        const comparison = buildOobComparison(ROOT);
        console.log('| Faction | Markdown Source (Appendix) | OOB JSON (oob_brigades.json) | Delta (JSON - MD) |');
        console.log('|:--------|:---------------------------|:-----------------------------|:------------------|');
        for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
            const mdStr = comparison.markdown_counts[faction].toString().padEnd(26);
            const jsStr = comparison.oob_counts[faction].toString().padEnd(28);
            console.log(`| ${faction.padEnd(7)} | ${mdStr} | ${jsStr} | ${comparison.deltas[faction]} |`);
        }
        console.log('\nNote: Positive Delta means JSON has duplicates or extra units not in Appendix MD.');
        console.log('      Negative Delta means JSON is missing units found in Appendix MD.');
        console.log(`\nIdentity matches: ${comparison.matched_identities.length}`);
        console.log(`Dispositions: ${comparison.dispositions.length}`);
        if (!comparison.identity_match_ok) {
            console.error(`Unresolved identity mismatches: ${JSON.stringify(comparison.unresolved_mismatches, null, 2)}`);
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('OOB comparison failed:', error);
        process.exitCode = 1;
    }
}

function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry != null && path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMainModule()) main();
