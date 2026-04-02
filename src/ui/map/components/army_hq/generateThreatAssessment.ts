import type { LoadedGameState } from '../../data/types';

interface SectorIntelRecordView {
    friendly_sector_id: string;
    enemy_corps_id?: string;
    enemy_faction?: string;
    offensive_signs: boolean;
    posture?: string;
    posture_observed?: string;
    estimated_strength?: number;
    strength_category?: string;
    confidence: number;
}

export interface ThreatItem {
    id: string;
    severity: 'active' | 'hardened' | 'gap';
    title: string;
    detail: string;
    confidence?: number;
    friendlyCorpsId?: string;
    friendlyCorpsName?: string;
}

function frontLabel(corpsName?: string, fallback?: string): string {
    return `${corpsName ?? fallback ?? 'Front'} front`;
}

function describeStrength(strengthCategories: string[]): string {
    if (strengthCategories.length === 0) return 'unknown';
    return strengthCategories[strengthCategories.length - 1].toUpperCase();
}

function classifyMomentum(momentum: number): string {
    if (momentum >= 2) return 'Breakthrough risk elevated';
    if (momentum >= 1) return 'Hostile pressure increasing';
    return 'Contact sustained';
}

export function generateThreatAssessment(
    state: LoadedGameState,
    faction: string,
): ThreatItem[] {
    const items: ThreatItem[] = [];
    let nextId = 0;
    const tid = () => `threat-${nextId++}`;

    const sectorIntel: SectorIntelRecordView[] = (state as LoadedGameState & { sectorIntel?: SectorIntelRecordView[] }).sectorIntel ?? [];
    const allOps = state.operations ?? [];
    const sectors = state.corpsFrontSectors ?? [];
    const formations = state.formations ?? [];

    const formationById = new Map(formations.map((f) => [f.id, f]));

    const sectorToCorps = new Map<string, { corpsId: string; corpsName: string }>();
    for (const sector of sectors) {
        if (sector.faction !== faction) continue;
        sectorToCorps.set(sector.sector_id, {
            corpsId: sector.corps_id,
            corpsName: formationById.get(sector.corps_id)?.name ?? 'Field Command',
        });
    }

    const enemyCorpsToFriendlyCorps = new Map<string, { corpsId: string; corpsName: string }>();
    for (const rec of sectorIntel) {
        const enemyCorpsId = rec.enemy_corps_id ?? '';
        if (!enemyCorpsId || enemyCorpsToFriendlyCorps.has(enemyCorpsId)) continue;
        const friendly = sectorToCorps.get(rec.friendly_sector_id);
        if (friendly) enemyCorpsToFriendlyCorps.set(enemyCorpsId, friendly);
    }

    const offensiveSignsBySector = new Map<string, SectorIntelRecordView[]>();
    for (const rec of sectorIntel) {
        if (!rec.offensive_signs && rec.posture_observed !== 'offensive_prep') continue;
        const list = offensiveSignsBySector.get(rec.friendly_sector_id) ?? [];
        list.push(rec);
        offensiveSignsBySector.set(rec.friendly_sector_id, list);
    }

    for (const [friendlySectorId, records] of offensiveSignsBySector) {
        const corpsInfo = sectorToCorps.get(friendlySectorId);
        const bestConf = Math.max(...records.map((r) => r.confidence));
        const strengthCategories = [
            ...new Set(records.map((r) => r.strength_category).filter((s): s is string => s != null && s !== 'unknown')),
        ];

        items.push({
            id: tid(),
            severity: 'active',
            title: `${frontLabel(corpsInfo?.corpsName)} - hostile offensive preparation`,
            detail: `Strength estimate: ${describeStrength(strengthCategories)}. Confidence ${Math.round(bestConf * 100)}%. ${records.length} sector${records.length > 1 ? 's' : ''} reporting preparation signs.`,
            confidence: bestConf,
            friendlyCorpsId: corpsInfo?.corpsId,
            friendlyCorpsName: corpsInfo?.corpsName,
        });
    }

    const enemyOps = allOps.filter((op) => op.faction !== faction && op.phase === 'execution');
    for (const op of enemyOps) {
        const ourCorps = enemyCorpsToFriendlyCorps.get(op.corps_id);
        items.push({
            id: tid(),
            severity: 'active',
            title: `${frontLabel(ourCorps?.corpsName)} - hostile operation in execution`,
            detail: classifyMomentum(op.momentum ?? 0),
            friendlyCorpsId: ourCorps?.corpsId,
            friendlyCorpsName: ourCorps?.corpsName,
        });
    }

    const enemyStagingOps = allOps.filter(
        (op) =>
            op.faction !== faction &&
            (op.preparation_sub_phase === 'force_staging' ||
                op.preparation_sub_phase === 'assessment' ||
                op.preparation_sub_phase === 'intel_gathering'),
    );
    for (const op of enemyStagingOps) {
        if (enemyOps.some((e) => e.corps_id === op.corps_id)) continue;
        const ourCorps = enemyCorpsToFriendlyCorps.get(op.corps_id);
        items.push({
            id: tid(),
            severity: 'active',
            title: `${frontLabel(ourCorps?.corpsName)} - hostile operation staging`,
            detail: 'Hostile preparations are being organized behind this front.',
            friendlyCorpsId: ourCorps?.corpsId,
            friendlyCorpsName: ourCorps?.corpsName,
        });
    }

    const stalledOps = allOps.filter(
        (op) => op.faction !== faction && op.phase === 'execution' && (op.consecutive_failures_on_current ?? 0) >= 3,
    );
    for (const op of stalledOps) {
        const ourCorps = enemyCorpsToFriendlyCorps.get(op.corps_id);
        items.push({
            id: tid(),
            severity: 'hardened',
            title: `${frontLabel(ourCorps?.corpsName)} - hostile assault spent`,
            detail: 'Recent hostile attacks have stalled and appear to be losing tempo.',
            friendlyCorpsId: ourCorps?.corpsId,
            friendlyCorpsName: ourCorps?.corpsName,
        });
    }

    for (const sector of sectors) {
        if (sector.faction !== faction) continue;
        const sectorRecords = sectorIntel.filter((r) => r.friendly_sector_id === sector.sector_id);
        if (sectorRecords.length === 0) continue;
        const avgConf = sectorRecords.reduce((sum, r) => sum + r.confidence, 0) / sectorRecords.length;
        if (avgConf >= 0.3) continue;
        const corpsInfo = sectorToCorps.get(sector.sector_id);
        items.push({
            id: tid(),
            severity: 'gap',
            title: `${frontLabel(corpsInfo?.corpsName)} - weak intelligence picture`,
            detail: avgConf < 0.15 ? 'Blind sector. Recommend probe or reconnaissance.' : 'Low confidence reporting. Reconnaissance recommended.',
            confidence: avgConf,
            friendlyCorpsId: corpsInfo?.corpsId,
            friendlyCorpsName: corpsInfo?.corpsName,
        });
    }

    return items.slice(0, 10);
}
