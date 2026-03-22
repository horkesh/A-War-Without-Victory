/**
 * ThreatAssessment — synthesizes sector intel + enemy operations into
 * a prioritized threat picture for the Army HQ Nerve Center.
 *
 * Data sources:
 *   - sectorIntel[]       → offensive_signs, posture, strength, confidence
 *   - operations[]        → enemy ops (unfiltered by faction)
 *   - corpsFrontSectors[] → sector-to-corps mapping for "which corps faces this?"
 */
import type { LoadedGameState } from '../../data/types';

/** Sector intel record — will be exposed via GameStateAdapter in a future phase. */
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

// ── Types ────────────────────────────────────────────────────────────────

export interface ThreatItem {
    id: string;
    severity: 'active' | 'hardened' | 'gap';
    title: string;
    detail: string;
    confidence?: number;
    friendlyCorpsId?: string;
    friendlyCorpsName?: string;
}

// ── Pure generator ───────────────────────────────────────────────────────

export function generateThreatAssessment(
    state: LoadedGameState,
    faction: string,
): ThreatItem[] {
    const items: ThreatItem[] = [];
    let nextId = 0;
    const tid = () => `threat-${nextId++}`;

    const sectorIntel: SectorIntelRecordView[] = (state as any).sectorIntel ?? [];
    const allOps = state.operations ?? [];
    const sectors = state.corpsFrontSectors ?? [];
    const formations = state.formations ?? [];

    // Pre-index formations for O(1) lookup
    const formationById = new Map(formations.map(f => [f.id, f]));

    // Map friendly sector → corps for labeling + threat attribution
    const sectorToCorps = new Map<string, { corpsId: string; corpsName: string }>();
    for (const s of sectors) {
        if (s.faction === faction) {
            sectorToCorps.set(s.sector_id, {
                corpsId: s.corps_id,
                corpsName: formationById.get(s.corps_id)?.name ?? s.corps_id,
            });
        }
    }

    // Map enemy corps → which of our corps faces them (via sector intel adjacency)
    const enemyCorpsToFriendlyCorps = new Map<string, { corpsId: string; corpsName: string }>();
    for (const rec of sectorIntel) {
        const eCorpsId = rec.enemy_corps_id ?? '';
        if (eCorpsId && !enemyCorpsToFriendlyCorps.has(eCorpsId)) {
            const friendly = sectorToCorps.get(rec.friendly_sector_id);
            if (friendly) enemyCorpsToFriendlyCorps.set(eCorpsId, friendly);
        }
    }

    // ── ACTIVE THREATS ──────────────────────────────────────────────────

    // Enemy offensive preparation detected via sector intel
    const offensiveSignsBySector = new Map<string, SectorIntelRecordView[]>();
    for (const rec of sectorIntel) {
        if (rec.offensive_signs || rec.posture_observed === 'offensive_prep') {
            const list = offensiveSignsBySector.get(rec.friendly_sector_id) ?? [];
            list.push(rec);
            offensiveSignsBySector.set(rec.friendly_sector_id, list);
        }
    }

    for (const [friendlySectorId, records] of offensiveSignsBySector) {
        const corpsInfo = sectorToCorps.get(friendlySectorId);
        const bestConf = Math.max(...records.map(r => r.confidence));
        const enemyCorpsIds = [...new Set(records.map(r => r.enemy_corps_id ?? '').filter(Boolean))];
        const enemyCorpsNames = enemyCorpsIds
            .map((id: string) => formationById.get(id)?.name ?? id)
            .join(', ');
        const strengthCats = [...new Set(records.map(r => r.strength_category).filter((s): s is string => s != null && s !== 'unknown'))];
        const bestStrength = strengthCats.length > 0 ? strengthCats[strengthCats.length - 1] : 'unknown';

        items.push({
            id: tid(),
            severity: 'active',
            title: `${enemyCorpsNames} — OFFENSIVE PREPARATION`,
            detail: `Strength: ${bestStrength.toUpperCase()} · Confidence ${Math.round(bestConf * 100)}% · ${records.length} sector${records.length > 1 ? 's' : ''} reporting`,
            confidence: bestConf,
            friendlyCorpsId: corpsInfo?.corpsId,
            friendlyCorpsName: corpsInfo?.corpsName,
        });
    }

    // Enemy operations in execution against our faction
    const enemyOps = allOps.filter(op => op.faction !== faction && op.phase === 'execution');
    for (const op of enemyOps) {
        const momentum = op.momentum ?? 0;
        const objCount = op.objectives?.length ?? 0;
        const objCaptured = op.current_objective_index ?? 0;
        const corpsName = formationById.get(op.corps_id)?.name ?? op.corps_id;

        // Find which of our corps faces this enemy corps
        const ourCorps = enemyCorpsToFriendlyCorps.get(op.corps_id);

        items.push({
            id: tid(),
            severity: 'active',
            title: `${corpsName} — Op ${op.name ?? 'UNNAMED'} in EXECUTION`,
            detail: `Momentum: ${momentum} · ${objCaptured}/${objCount} objectives${momentum >= 2 ? ' · BREAKTHROUGH RISK' : ''}`,
            friendlyCorpsId: ourCorps?.corpsId,
            friendlyCorpsName: ourCorps?.corpsName,
        });
    }

    // Enemy operations staging / preparing
    const enemyStagingOps = allOps.filter(op =>
        op.faction !== faction &&
        (op.preparation_sub_phase === 'force_staging' || op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'intel_gathering'),
    );
    for (const op of enemyStagingOps) {
        if (enemyOps.some(e => e.corps_id === op.corps_id)) continue; // already shown as execution
        const corpsName = formationById.get(op.corps_id)?.name ?? op.corps_id;
        const ourCorps = enemyCorpsToFriendlyCorps.get(op.corps_id);
        items.push({
            id: tid(),
            severity: 'active',
            title: `${corpsName} — operation staging detected`,
            detail: `Phase: ${op.preparation_sub_phase ?? op.phase}`,
            friendlyCorpsId: ourCorps?.corpsId,
            friendlyCorpsName: ourCorps?.corpsName,
        });
    }

    // ── HARDENED POSITIONS ──────────────────────────────────────────────

    // Enemy operations that are stalled
    const stalledOps = allOps.filter(op =>
        op.faction !== faction &&
        op.phase === 'execution' &&
        (op.consecutive_failures_on_current ?? 0) >= 3,
    );
    for (const op of stalledOps) {
        const corpsName = formationById.get(op.corps_id)?.name ?? op.corps_id;
        items.push({
            id: tid(),
            severity: 'hardened',
            title: `${corpsName} assault SPENT`,
            detail: `Op ${op.name ?? 'UNNAMED'} — ${op.failure_count ?? 0} total failures`,
        });
    }

    // ── INTELLIGENCE GAPS ───────────────────────────────────────────────

    for (const s of sectors) {
        if (s.faction !== faction) continue;
        const sectorRecords = sectorIntel.filter(r => r.friendly_sector_id === s.sector_id);
        if (sectorRecords.length === 0) continue;
        const avgConf = sectorRecords.reduce((sum, r) => sum + r.confidence, 0) / sectorRecords.length;
        if (avgConf < 0.3) {
            const corpsInfo = sectorToCorps.get(s.sector_id);
            items.push({
                id: tid(),
                severity: 'gap',
                title: `${corpsInfo?.corpsName ?? s.sector_id} sector: confidence ${Math.round(avgConf * 100)}%`,
                detail: avgConf < 0.15 ? 'BLIND — recommend PROBE' : 'Low intel — consider reconnaissance',
                confidence: avgConf,
                friendlyCorpsId: corpsInfo?.corpsId,
                friendlyCorpsName: corpsInfo?.corpsName,
            });
        }
    }

    return items.slice(0, 10);
}


// ── Component ────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
    active: { border: 'border-red-500/60', label: '▲ ACTIVE THREATS', labelColor: 'text-red-400', icon: '!' },
    hardened: { border: 'border-emerald-500/40', label: '△ HARDENED POSITIONS', labelColor: 'text-emerald-400', icon: '✓' },
    gap: { border: 'border-amber-500/40', label: '○ INTELLIGENCE GAPS', labelColor: 'text-amber-400', icon: '?' },
} as const;

interface ThreatAssessmentProps {
    items: ThreatItem[];
    onCorpsClick?: (corpsId: string) => void;
}

export function ThreatAssessment({ items, onCorpsClick }: ThreatAssessmentProps) {
    if (items.length === 0) return null;

    const activeItems = items.filter(i => i.severity === 'active');
    const hardenedItems = items.filter(i => i.severity === 'hardened');
    const gapItems = items.filter(i => i.severity === 'gap');

    return (
        <div className="bg-panel-card border border-panel-border rounded p-4 mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-2 border-b border-panel-border">
                THREAT ASSESSMENT
            </div>
            <div className="space-y-3">
                {activeItems.length > 0 && <ThreatSection severity="active" items={activeItems} onCorpsClick={onCorpsClick} />}
                {hardenedItems.length > 0 && <ThreatSection severity="hardened" items={hardenedItems} onCorpsClick={onCorpsClick} />}
                {gapItems.length > 0 && <ThreatSection severity="gap" items={gapItems} onCorpsClick={onCorpsClick} />}
            </div>
        </div>
    );
}

function ThreatSection({ severity, items, onCorpsClick }: {
    severity: 'active' | 'hardened' | 'gap';
    items: ThreatItem[];
    onCorpsClick?: (corpsId: string) => void;
}) {
    const styles = SEVERITY_STYLES[severity];
    return (
        <div>
            <div className={`text-[10px] uppercase tracking-[0.25em] font-bold ${styles.labelColor} mb-1.5`}>
                {styles.label}
            </div>
            <div className="space-y-1">
                {items.map(item => (
                    <div key={item.id} className={`flex items-start justify-between gap-3 border-l-2 ${styles.border} pl-2 py-1`}>
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] text-text-primary leading-snug font-bold">
                                {item.title}
                            </div>
                            <div className="text-[11px] text-text-secondary leading-snug">
                                {item.detail}
                            </div>
                        </div>
                        {item.friendlyCorpsId && onCorpsClick && (
                            <button
                                type="button"
                                onClick={() => onCorpsClick(item.friendlyCorpsId!)}
                                className="text-amber-400 hover:underline cursor-pointer text-[11px] whitespace-nowrap shrink-0"
                            >
                                → {item.friendlyCorpsName ?? 'Corps'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
