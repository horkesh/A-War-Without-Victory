import { looksLikeRawPlayerFacingToken } from '../utils/playerSafeText';
export interface CommandEntry {
    id: string;
    label: string;
    kind: 'section' | 'brigade' | 'corps' | 'settlement';
    targetId: string;
}
export interface CommandIndexInput {
    playerFaction: string | null;
    formations: ReadonlyArray<{
        id: string;
        name: string;
        faction: string;
        kind: string;
        status: string;
    }>;
    settlementNames: Record<string, string> | null;
    sections: ReadonlyArray<{
        id: string;
        label: string;
    }>;
}
function compare(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
}
function safeName(name: string, id: string): boolean {
    return !!name.trim() && name.trim() !== id && !looksLikeRawPlayerFacingToken(name);
}
/** Player-safe navigation projection. Routing identifiers never participate in matching. */
export function buildCommandIndex(input: CommandIndexInput): CommandEntry[] {
    const rows: CommandEntry[] = input.sections.map(section => ({
        id: `section:${section.id}`, label: section.label, kind: 'section', targetId: section.id,
    }));
    if (input.playerFaction) {
        for (const formation of input.formations) {
            const kind = formation.kind === 'brigade' ? 'brigade'
                : ['corps', 'corps_asset'].includes(formation.kind) ? 'corps' : null;
            if (formation.faction !== input.playerFaction || !kind ||
                formation.status !== 'active' || !safeName(formation.name, formation.id)) continue;
            rows.push({
                id: `${kind}:${formation.id}`,
                label: formation.name.trim(),
                kind,
                targetId: formation.id,
            });
        }
    }
    for (const [id, name] of Object.entries(input.settlementNames ?? {})) {
        if (safeName(name, id)) {
            rows.push({ id: `settlement:${id}`, label: name.trim(), kind: 'settlement', targetId: id });
        }
    }
    return rows.sort((a, b) =>
        compare(normalize(a.label), normalize(b.label)) || compare(a.kind, b.kind) || compare(a.id, b.id));
}
export function queryCommands(entries: readonly CommandEntry[], query: string, limit = 40): CommandEntry[] {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const boundedLimit = Math.max(0, Math.min(100, Number.isFinite(limit) ? Math.floor(limit) : 40));
    return entries.filter(entry => terms.every(term => normalize(entry.label).includes(term))).slice(0, boundedLimit);
}
