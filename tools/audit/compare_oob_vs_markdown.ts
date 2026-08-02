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
    [key: string]: unknown;
}

// --- Helpers ---

export function countBrigadesInMarkdown(filePath: string, rootDir = ROOT): number {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`OOB evidence file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    let count = 0;
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
                count++;
            }
        }
    }
    return count;
}

export interface OobComparison {
    markdown_counts: Record<keyof typeof MARKDOWN_SOURCES, number>;
    oob_counts: Record<keyof typeof MARKDOWN_SOURCES, number>;
    deltas: Record<keyof typeof MARKDOWN_SOURCES, number>;
}

export function buildOobComparison(rootDir = ROOT): OobComparison {
    const oobPath = path.join(rootDir, 'data/source/oob_brigades.json');
    const brigades = normalizeOobBrigades(JSON.parse(fs.readFileSync(oobPath, 'utf-8')));
    const factions = Object.keys(MARKDOWN_SOURCES) as Array<keyof typeof MARKDOWN_SOURCES>;
    const markdownCounts = { RBiH: 0, RS: 0, HRHB: 0 };
    const oobCounts = { RBiH: 0, RS: 0, HRHB: 0 };
    for (const brigade of brigades) {
        const faction = brigade.faction as keyof typeof MARKDOWN_SOURCES | undefined;
        if (faction && Object.prototype.hasOwnProperty.call(oobCounts, faction)) oobCounts[faction]++;
    }
    for (const faction of factions) {
        markdownCounts[faction] = countBrigadesInMarkdown(MARKDOWN_SOURCES[faction], rootDir);
    }
    return {
        markdown_counts: markdownCounts,
        oob_counts: oobCounts,
        deltas: Object.fromEntries(factions.map((faction) => [
            faction,
            oobCounts[faction] - markdownCounts[faction],
        ])) as Record<keyof typeof MARKDOWN_SOURCES, number>,
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
