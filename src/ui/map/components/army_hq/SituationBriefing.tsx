/**
 * SituationBriefing — emergent intelligence panel for Army HQ.
 * Scans LoadedGameState and produces prioritized alerts so the player
 * knows what needs attention without reading every panel.
 */
import type { LoadedGameState, FactionId } from '../../data/types';
import { turnToDateString } from '../../utils/formatters';

// ── Types ────────────────────────────────────────────────────────────
export type BriefingTarget =
    | { type: 'corps'; corpsId: string }
    | { type: 'sector'; sectorId: string }
    | { type: 'operation'; operationKey: string }
    | { type: 'none' };

export interface BriefingItem {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    title: string;
    detail: string;
    corpsId?: string;
    target: BriefingTarget;
}

export interface SituationBriefingProps {
    items: BriefingItem[];
    onNavigate?: (target: BriefingTarget) => void;
}

// ── Pure briefing generator ──────────────────────────────────────────
const MAX_ITEMS = 12;

export function generateBriefing(
    state: LoadedGameState,
    faction: Exclude<FactionId, null>,
): BriefingItem[] {
    const items: BriefingItem[] = [];
    let nextId = 0;
    const id = () => `brief-${nextId++}`;

    const formations = state.formations ?? [];
    const brigades = formations.filter(
        (f) => f.kind === 'brigade' && f.status === 'active' && f.faction === faction,
    );
    const corpsFormations = formations.filter(
        (f) => (f.kind === 'corps' || f.kind === 'corps_asset') && f.faction === faction,
    );
    const brigadesByCorps = new Map<string, typeof brigades>();
    for (const b of brigades) {
        const cid = b.corps_id ?? '';
        const list = brigadesByCorps.get(cid) || [];
        list.push(b);
        brigadesByCorps.set(cid, list);
    }
    const sectors = (state.corpsFrontSectors ?? []).filter((s) => s.faction === faction);
    const operations = (state.operations ?? []).filter((op) =>
        corpsFormations.some((c) => c.id === op.corps_id),
    );
    const pendingOfficerEvents = (state.pendingOfficerEvents ?? []).filter(
        (e) => e.faction === faction && !e.acknowledged,
    );

    // ── CRITICAL ─────────────────────────────────────────────────────

    // Pending event decisions
    const pendingDecisions = (state.pendingEventDecisions ?? []).filter(
        (d) => d.faction === faction,
    );
    for (const decision of pendingDecisions) {
        items.push({
            id: id(), severity: 'critical', category: 'event_decision',
            title: decision.event_title ?? `Decision: ${decision.event_id}`,
            detail: `${decision.response_options?.length ?? 0} options — awaiting your response`,
            target: { type: 'none' },
        });
    }

    // Enclaves with critical supply
    for (const [enclaveId, enc] of Object.entries(state.enclaveResilience ?? {})) {
        if (enc.supply_state === 'critical' && enc.faction === faction) {
            items.push({
                id: id(), severity: 'critical', category: 'supply',
                title: `${enc.display_name ?? enclaveId} supply critical`,
                detail: `Enclave resilience ${enc.resilience ?? 0} — isolated ${enc.isolation_turns ?? 0} turns`,
                target: { type: 'none' },
            });
        }
    }

    // Corps with no sectors but has brigades
    for (const corps of corpsFormations) {
        const corpsHasSectors = sectors.some((s) => s.corps_id === corps.id);
        const corpsBrigades = brigadesByCorps.get(corps.id) ?? [];
        if (!corpsHasSectors && corpsBrigades.length > 0) {
            items.push({
                id: id(), severity: 'critical', category: 'sectors',
                title: `${corps.name ?? corps.id} has no front sectors assigned`,
                detail: `${corpsBrigades.length} brigades without sector assignment`,
                corpsId: corps.id,
                target: { type: 'corps', corpsId: corps.id },
            });
        }
    }

    // Operations awaiting GO/NO-GO
    for (const op of operations) {
        const subPhase = op.preparation_sub_phase;
        if (subPhase === 'assessment' || subPhase === 'ready') {
            items.push({
                id: id(), severity: 'critical', category: 'operations',
                title: `Op ${op.name ?? 'UNNAMED'} awaits GO/NO-GO`,
                detail: subPhase === 'ready'
                    ? 'Forces staged and ready — awaiting launch order'
                    : `Commander assessment: ${op.commander_assessment ?? 'pending'}`,
                corpsId: op.corps_id,
                target: { type: 'operation', operationKey: `${op.corps_id}|${op.name}` },
            });
        }
    }

    // Pending officer events
    if (pendingOfficerEvents.length > 0) {
        items.push({
            id: id(), severity: 'critical', category: 'personnel',
            title: `${pendingOfficerEvents.length} personnel decision${pendingOfficerEvents.length > 1 ? 's' : ''} pending`,
            detail: pendingOfficerEvents.map((e) => e.officer_name).join(', '),
            target: { type: 'none' },
        });
    }

    // Corps avg cohesion < 40
    for (const corps of corpsFormations) {
        const corpsBrigades = brigadesByCorps.get(corps.id) ?? [];
        if (corpsBrigades.length === 0) continue;
        const avgCohesion = corpsBrigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / corpsBrigades.length;
        if (avgCohesion < 40) {
            items.push({
                id: id(), severity: 'critical', category: 'cohesion',
                title: `${corps.name ?? corps.id} cohesion critical (${Math.round(avgCohesion)})`,
                detail: `${corpsBrigades.length} brigades, avg cohesion ${Math.round(avgCohesion)}`,
                corpsId: corps.id,
                target: { type: 'corps', corpsId: corps.id },
            });
        }
    }

    // ── WARNING ──────────────────────────────────────────────────────

    // Low intel sectors
    for (const sector of sectors) {
        if ((sector.intel_confidence ?? 1) < 0.3) {
            items.push({
                id: id(), severity: 'warning', category: 'intel',
                title: `Low intel in ${sector.display_name ?? sector.sector_id}`,
                detail: `Intel confidence ${Math.round((sector.intel_confidence ?? 0) * 100)}%`,
                corpsId: sector.corps_id,
                target: { type: 'sector', sectorId: sector.sector_id },
            });
        }
    }

    // War exhaustion
    const exhaustion = state.warPhaseExhaustion?.[faction] ?? 0;
    if (exhaustion > 20) {
        items.push({
            id: id(), severity: 'warning', category: 'exhaustion',
            title: `War exhaustion ${Math.round(exhaustion)} -- offensive capacity degraded`,
            detail: exhaustion > 40 ? 'Critical exhaustion level' : 'Moderate exhaustion',
            target: { type: 'none' },
        });
    }

    // Combat ineffective brigades by corps
    const ineffByCorps: Record<string, number> = {};
    for (const b of brigades) {
        if ((b.personnel ?? 9999) < 400) {
            const cid = b.corps_id ?? 'unknown';
            ineffByCorps[cid] = (ineffByCorps[cid] ?? 0) + 1;
        }
    }
    for (const [corpsId, count] of Object.entries(ineffByCorps)) {
        const corpsName = corpsFormations.find((c) => c.id === corpsId)?.name ?? corpsId;
        items.push({
            id: id(), severity: 'warning', category: 'personnel',
            title: `${count} brigade${count > 1 ? 's' : ''} combat ineffective in ${corpsName}`,
            detail: 'Personnel below 400 — cannot attack',
            corpsId,
            target: { type: 'corps', corpsId },
        });
    }

    // Low supply reserves
    const reserves = state.factionReserves?.[faction];
    if (reserves && (reserves.generalSupply ?? 100) < 30) {
        items.push({
            id: id(), severity: 'warning', category: 'supply',
            title: `Supply reserves LOW (${Math.round(reserves.generalSupply ?? 0)})`,
            detail: 'General supply critically low — operations constrained',
            target: { type: 'none' },
        });
    }

    // Alliance deteriorating (RBiH/HRHB only)
    if ((faction === 'RBiH' || faction === 'HRHB') && state.war_alliance_rbih_hrhb != null) {
        const alliance = state.war_alliance_rbih_hrhb;
        if (alliance < 0.5) {
            items.push({
                id: id(), severity: 'warning', category: 'diplomacy',
                title: `Alliance deteriorating (${(alliance * 100).toFixed(0)}%)`,
                detail: alliance < 0.2 ? 'War between factions imminent' : 'Cooperation strained',
                target: { type: 'none' },
            });
        }
    }

    // Thin front sectors
    for (const sector of sectors) {
        const brigadeCount = (sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0);
        const edgeCount = sector.edge_ids?.length ?? 0;
        if (brigadeCount < 2 && edgeCount > 4) {
            items.push({
                id: id(), severity: 'warning', category: 'defense',
                title: `Thin front: ${sector.display_name ?? sector.sector_id}`,
                detail: `${brigadeCount} brigade${brigadeCount !== 1 ? 's' : ''} covering ${edgeCount} edges`,
                corpsId: sector.corps_id,
                target: { type: 'sector', sectorId: sector.sector_id },
            });
        }
    }

    // ── INFO ─────────────────────────────────────────────────────────

    // Operations in execution
    for (const op of operations) {
        if (op.phase === 'execution') {
            const captured = op.current_objective_index ?? 0;
            const total = op.objectives?.length ?? 0;
            items.push({
                id: id(), severity: 'info', category: 'operations',
                title: `Op ${op.name ?? 'UNNAMED'} in execution`,
                detail: `${captured}/${total} objectives captured`,
                corpsId: op.corps_id,
                target: { type: 'operation', operationKey: `${op.corps_id}|${op.name}` },
            });
        }
    }

    // Territory info
    items.push({
        id: id(), severity: 'info', category: 'territory',
        title: turnToDateString(state.turn ?? 0),
        detail: `${brigades.length} active brigades, ${operations.length} operations`,
        target: { type: 'none' },
    });

    // Battles this turn
    const battles = state.latestTurnSummary?.battles ?? [];
    const factionBattles = battles.filter(
        (b) => b.attacker_faction === faction || b.defender_faction === faction,
    );
    if (factionBattles.length > 0) {
        items.push({
            id: id(), severity: 'info', category: 'combat',
            title: `${factionBattles.length} engagement${factionBattles.length > 1 ? 's' : ''} this turn`,
            detail: 'See battle reports for details',
            target: { type: 'none' },
        });
    }

    // Sort: critical > warning > info
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

    return items.slice(0, MAX_ITEMS);
}

// ── Component ────────────────────────────────────────────────────────

const SEVERITY_ICON: Record<string, string> = {
    critical: '!',
    warning: '\u25B3',
    info: 'i',
};

const SEVERITY_LABEL: Record<string, string> = {
    critical: 'CRITICAL',
    warning: 'ATTENTION',
    info: 'SITREP',
};

const TARGET_LABELS: Record<BriefingTarget['type'], string> = {
    corps: '→ CORPS',
    sector: '→ SECTOR',
    operation: '→ OP',
    none: '',
};

export function SituationBriefing({ items, onNavigate }: SituationBriefingProps) {
    if (items.length === 0) {
        return (
            <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4">
                <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-2 pb-1.5 border-b border-panel-border">
                    SITUATION BRIEFING
                </div>
                <div className="text-[11px] text-text-secondary italic py-1">
                    No alerts — situation nominal
                </div>
            </div>
        );
    }

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4 mb-4">
            <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-1.5 border-b border-panel-border">
                SITUATION BRIEFING
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map((item) => {
                    const dotColor = item.severity === 'critical' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-amber-400' : 'bg-sky-400';
                    const borderColor = item.severity === 'critical' ? 'border-red-500/30 hover:border-red-500/50' : item.severity === 'warning' ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-panel-border hover:border-panel-border';
                    const hasTarget = item.target.type !== 'none';

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => hasTarget && onNavigate?.(item.target)}
                            disabled={!hasTarget || !onNavigate}
                            className={`text-left rounded-md border ${borderColor} bg-panel-bg p-2.5 transition-colors group disabled:cursor-default`}
                        >
                            <div className="flex items-start gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${dotColor}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] text-text-primary leading-snug font-semibold">
                                        {item.title}
                                    </div>
                                    {item.detail && (
                                        <div className="text-[10px] text-text-secondary leading-snug mt-0.5">
                                            {item.detail}
                                        </div>
                                    )}
                                </div>
                                {hasTarget && onNavigate && (
                                    <span className="text-amber-400/50 group-hover:text-amber-400 text-[9px] font-mono font-bold shrink-0 transition-colors">
                                        {TARGET_LABELS[item.target.type]}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
