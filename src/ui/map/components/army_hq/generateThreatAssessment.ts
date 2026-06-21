import type { LoadedGameState } from '../../data/types';
import { t, type MessageKey } from '../../i18n';
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
    severity: 'offensive' | 'hardened' | 'gap';
    title: string;
    detail: string;
    confidence?: number;
    friendlyCorpsId?: string;
    friendlyCorpsName?: string;
    friendlySectorId?: string;
    friendlySectorName?: string;
}

function frontLabel(corpsName?: string, fallback?: string): string {
    return t('threatAssessment.frontLabel', { name: corpsName ?? fallback ?? t('threatAssessment.frontFallback') });
}

/** Map raw engine strength_category enum values to player-safe uncertainty language. */
const STRENGTH_DISPLAY: Record<string, MessageKey> = {
    thin: 'threatAssessment.strength.thin',
    moderate: 'threatAssessment.strength.moderate',
    dense: 'threatAssessment.strength.dense',
    fortress: 'threatAssessment.strength.fortress',
};

function describeStrength(strengthCategories: string[]): string {
    if (strengthCategories.length === 0) return t('threatAssessment.strength.unknown');
    const raw = strengthCategories[strengthCategories.length - 1].toLowerCase();
    return t(STRENGTH_DISPLAY[raw] ?? 'threatAssessment.strength.reported');
}

function describeConfidence(confidence: number): string {
    if (confidence >= 0.8) return t('threatAssessment.confidence.high');
    if (confidence >= 0.5) return t('threatAssessment.confidence.moderate');
    return t('threatAssessment.confidence.low');
}

export function generateThreatAssessment(
    state: LoadedGameState,
    faction: string,
): ThreatItem[] {
    const items: ThreatItem[] = [];
    let nextId = 0;
    const tid = () => `threat-${nextId++}`;

    // NOTE: sources from sector_intel observation records, not live engine activity
    // (intentional intel-fog — see docs/PROJECT_LEDGER_KNOWLEDGE.md)
    const sectorIntel: SectorIntelRecordView[] = (state as LoadedGameState & { sectorIntel?: SectorIntelRecordView[] }).sectorIntel ?? [];
    const sectors = state.corpsFrontSectors ?? [];
    const formations = state.formations ?? [];

    const formationById = new Map(formations.map((f) => [f.id, f]));

    const sectorToCorps = new Map<string, { corpsId: string; corpsName: string; sectorName: string }>();
    for (const sector of sectors) {
        if (sector.faction !== faction) continue;
        sectorToCorps.set(sector.sector_id, {
            corpsId: sector.corps_id,
            corpsName: getPlayerSafeCorpsName(
                formationById.get(sector.corps_id)?.name,
                sector.corps_id,
                'Field Command',
            ),
            sectorName: sector.display_name,
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
            severity: 'offensive',
            title: t('threatAssessment.offensive.title', { front: frontLabel(corpsInfo?.corpsName) }),
            detail: t(records.length === 1 ? 'threatAssessment.offensive.detail.one' : 'threatAssessment.offensive.detail.many', {
                strength: describeStrength(strengthCategories),
                confidence: describeConfidence(bestConf),
                count: records.length,
            }),
            confidence: bestConf,
            friendlyCorpsId: corpsInfo?.corpsId,
            friendlyCorpsName: corpsInfo?.corpsName,
            friendlySectorId,
            friendlySectorName: corpsInfo?.sectorName,
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
            title: t('threatAssessment.hardened.title', { front: frontLabel(ourCorps?.corpsName) }),
            detail: avgConf >= 0.75
                ? t('threatAssessment.hardened.detail.consistent')
                : t('threatAssessment.hardened.detail.reported'),
            confidence: avgConf,
            friendlyCorpsId: ourCorps?.corpsId,
            friendlyCorpsName: ourCorps?.corpsName,
            friendlySectorId,
            friendlySectorName: ourCorps?.sectorName,
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
            title: t('threatAssessment.gap.title', { front: frontLabel(corpsInfo?.corpsName) }),
            detail: avgConf < 0.15 ? t('threatAssessment.gap.detail.blind') : t('threatAssessment.gap.detail.low'),
            confidence: avgConf,
            friendlyCorpsId: corpsInfo?.corpsId,
            friendlyCorpsName: corpsInfo?.corpsName,
            friendlySectorId: sector.sector_id,
            friendlySectorName: corpsInfo?.sectorName,
        });
    }

    return items.slice(0, 10);
}
