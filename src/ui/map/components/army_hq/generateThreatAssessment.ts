import type { LoadedGameState } from '../../data/types';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';

interface SectorIntelRecordView {
    friendly_sector_id: string;
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

/** Map raw engine strength_category enum values to player-safe uncertainty language. */
const STRENGTH_DISPLAY: Record<string, string> = {
    thin:     'limited enemy presence (assessed)',
    moderate: 'moderate enemy strength (estimated)',
    dense:    'significant enemy presence (estimated)',
    fortress: 'heavily fortified (assessed)',
};

function describeStrength(strengthCategories: string[]): string {
    if (strengthCategories.length === 0) return 'enemy strength unknown';
    const raw = strengthCategories[strengthCategories.length - 1].toLowerCase();
    return STRENGTH_DISPLAY[raw] ?? 'enemy presence reported (estimated)';
}

function describeConfidence(confidence: number): string {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.5) return 'Moderate confidence';
    return 'Low confidence';
}

export function generateThreatAssessment(
    state: LoadedGameState,
    faction: string,
): ThreatItem[] {
    const items: ThreatItem[] = [];
    let nextId = 0;
    const tid = () => `threat-${nextId++}`;

    const sectorIntel: SectorIntelRecordView[] = (state as LoadedGameState & { sectorIntel?: SectorIntelRecordView[] }).sectorIntel ?? [];
    const sectors = state.corpsFrontSectors ?? [];
    const formations = state.formations ?? [];

    const formationById = new Map(formations.map((f) => [f.id, f]));

    const sectorToCorps = new Map<string, { corpsId: string; corpsName: string }>();
    for (const sector of sectors) {
        if (sector.faction !== faction) continue;
        sectorToCorps.set(sector.sector_id, {
            corpsId: sector.corps_id,
            corpsName: getPlayerSafeCorpsName(
                formationById.get(sector.corps_id)?.name,
                sector.corps_id,
                'Field Command',
            ),
        });
    }

    const offensiveSignsBySector = new Map<string, SectorIntelRecordView[]>();
    const defensivePostureBySector = new Map<string, SectorIntelRecordView[]>();
    for (const rec of sectorIntel) {
        if (rec.offensive_signs || rec.posture_observed === 'offensive_prep') {
            const list = offensiveSignsBySector.get(rec.friendly_sector_id) ?? [];
            list.push(rec);
            offensiveSignsBySector.set(rec.friendly_sector_id, list);
        }
        if (rec.posture === 'defending' || rec.posture_observed === 'defending') {
            const list = defensivePostureBySector.get(rec.friendly_sector_id) ?? [];
            list.push(rec);
            defensivePostureBySector.set(rec.friendly_sector_id, list);
        }
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
            detail: `Strength estimate: ${describeStrength(strengthCategories)}. ${describeConfidence(bestConf)}. ${records.length} sector${records.length > 1 ? 's' : ''} reporting preparation signs.`,
            confidence: bestConf,
            friendlyCorpsId: corpsInfo?.corpsId,
            friendlyCorpsName: corpsInfo?.corpsName,
        });
    }

    for (const [friendlySectorId, records] of defensivePostureBySector) {
        if (offensiveSignsBySector.has(friendlySectorId)) continue;
        const avgConf = records.reduce((sum, record) => sum + record.confidence, 0) / records.length;
        if (avgConf < 0.5) continue;
        const ourCorps = sectorToCorps.get(friendlySectorId);
        items.push({
            id: tid(),
            severity: 'hardened',
            title: `${frontLabel(ourCorps?.corpsName)} - hostile defenses consolidating`,
            detail: avgConf >= 0.75
                ? 'Entrenchment and defensive posture are consistently reported along this front.'
                : 'Defensive preparations are being reported along this front.',
            confidence: avgConf,
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
