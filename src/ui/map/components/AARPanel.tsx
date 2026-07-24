/**
 * After-Action Report panel.
 * Displays the compiled TurnSummary for the most recently completed turn.
 * Player-initiated (not auto-shown). Available at any time once a turn has been advanced.
 */
import { useState } from 'react';
import type { TurnSummary, TurnBattle, ArcTransition, DecorationAward, TurnNotableEvent } from '../../../state/turn_summary.js';
import { useGameStore } from '../store/gameStore';
import { formatTurnLabel, toTitleCase } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import {
    getPlayerSafeBrigadeName,
    getPlayerSafeDisplacementGroupLabel,
    getPlayerSafeFormationNarrativeArcLabel,
    getPlayerSafeMilitaryFactionName,
} from '../utils/playerSafeText';
import { EmptyState } from './EmptyState';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { shouldNarrateTerritorySummary } from '../data/territorySummaryGuard';
import { getDecorationName } from '../utils/decorationUtils';
import type { FieldInspectionTarget } from '../utils/fieldInspectionTarget';
import { inspectOnField } from '../utils/shellNavigation';
import { resolveMapFormationInspectionTarget } from '../map/mapSelectionRouting';
import { projectOperationLifecycle } from '../data/operationLifecycleProjection';

type BattleCasualtyPayload = TurnBattle & {
    attacker_casualties?: number | null;
    defender_casualties?: number | null;
    casualties_reported?: boolean;
};

// --- Faction colors ---
const FACTION_COLOR: Record<string, string> = {
    RS: '#c04040',
    RBiH: '#4a9a55',
    HRHB: '#4080b8',
};

// --- Arc display ---
const ARC_COLOR: Record<string, string> = {
    veteran: 'text-green-400',
    bloodied: 'text-amber-400',
    shattered: 'text-red-400',
    risen: 'text-emerald-300',
    destroyed: 'text-neutral-500',
    garrison: 'text-neutral-400',
};

// --- Outcome display ---
const OUTCOME_LABEL_KEY: Record<string, MessageKey> = {
    decisive_victory: 'aar.outcome.decisive',
    victory: 'aar.outcome.victory',
    costly_victory: 'aar.outcome.costly',
    stalemate: 'aar.outcome.stalemate',
    repulsed: 'aar.outcome.repulsed',
    catastrophic: 'aar.outcome.collapse',
};
const OUTCOME_COLOR: Record<string, string> = {
    decisive_victory: 'text-green-300',
    victory: 'text-green-400',
    costly_victory: 'text-amber-400',
    stalemate: 'text-neutral-400',
    repulsed: 'text-red-400',
    catastrophic: 'text-red-600',
};
const INTEL_FRICTION_LABEL_KEY: Record<string, MessageKey> = {
    stale_intel: 'aar.friction.staleIntel',
    defender_opsec: 'aar.friction.defenderOpsec',
    ambush_risk: 'aar.friction.ambushRisk',
};
const CONFIDENCE_BAND_LABEL_KEY: Record<string, MessageKey> = {
    low: 'aar.confidence.low',
    medium: 'aar.confidence.medium',
    high: 'aar.confidence.high',
};

function reportedNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// --- Notable event labels ---
const NOTABLE_LABEL_KEY: Record<TurnNotableEvent['kind'], MessageKey> = {
    graz_accords_activated: 'aar.notable.graz',
    truce_broken: 'aar.notable.truceBroken',
    washington_agreement: 'aar.notable.washington',
    rbih_hrhb_framework_activated: 'aar.notable.framework',
    operation_storm: 'aar.notable.storm',
    ceasefire_activated: 'aar.notable.ceasefire',
    siege_formed: 'aar.notable.siegeFormed',
    siege_broken: 'aar.notable.siegeBroken',
    first_battle: 'aar.notable.firstBattle',
};

function notableEventLabel(kind: string): string {
    return t(NOTABLE_LABEL_KEY[kind as TurnNotableEvent['kind']] ?? 'aar.notable.fallback');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
    title,
    count,
    children,
    defaultOpen = true,
}: {
    title: string;
    count?: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-panel-border/50 pt-2 mb-2">
            <button
                type="button"
                className="w-full flex justify-between items-center text-xs uppercase tracking-wide text-text-secondary font-semibold mb-1.5 hover:text-text-primary transition-colors"
                onClick={() => setOpen((v) => !v)}
            >
                <span>{title}</span>
                <span className="flex items-center gap-1.5">
                    {count != null && <span className="text-text-muted font-mono">{count}</span>}
                    <span className="text-text-muted">{open ? '▲' : '▼'}</span>
                </span>
            </button>
            {open && children}
        </div>
    );
}

function FactionTag({ faction }: { faction: string }) {
    return (
        <span
            className="text-xs font-mono px-1 rounded border"
            style={{ color: FACTION_COLOR[faction] ?? '#aaa', borderColor: `${FACTION_COLOR[faction] ?? '#555'}44` }}
        >
            {getPlayerSafeMilitaryFactionName(faction)}
        </span>
    );
}

function DisplacementGroupTag({ group }: { group: string }) {
    return (
        <span
            className="text-xs font-mono px-1 rounded border"
            style={{ color: FACTION_COLOR[group] ?? '#aaa', borderColor: `${FACTION_COLOR[group] ?? '#555'}44` }}
        >
            {getPlayerSafeDisplacementGroupLabel(group)}
        </span>
    );
}

function DefenderBreakdown({ contributions, onSelectFormation, osid, formationNameById }: {
    contributions: NonNullable<TurnBattle['defender_contributions']>;
    onSelectFormation?: (id: string, osid?: string | null) => void;
    osid?: string | null;
    formationNameById: Map<string, string>;
}) {
    const [expanded, setExpanded] = useState(false);
    const sorted = [...contributions].sort((a, b) => b.reactive_weight - a.reactive_weight);
    return (
        <div className="ml-6 mt-0.5">
            <button
                type="button"
                className="text-xs text-text-muted hover:text-interactive transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▾' : '▸'} {t('aar.defenders', { count: sorted.length })}
            </button>
            {expanded && (
                <div className="mt-0.5 space-y-px">
                    {sorted.map((c) => {
                        const brigadeLabel = getPlayerSafeBrigadeName(formationNameById.get(c.brigade_id));
                        return (
                        <div key={c.brigade_id} className="text-xs text-text-muted tabular-nums flex items-center gap-1">
                            <span className="text-text-secondary w-3 text-right">{c.distance_hops === 0 ? '⊕' : `${c.distance_hops}↷`}</span>
                            {c.is_home_municipality && <span title={t('aar.homeMunicipality')}>⌂</span>}
                            {onSelectFormation ? (
                                <button
                                    type="button"
                                    data-testid="aar-formation-link"
                                    data-role="defender-contribution"
                                    data-formation-id={c.brigade_id}
                                    data-osid={osid ?? undefined}
                                    className="hover:text-interactive transition-colors truncate"
                                    onClick={() => onSelectFormation(c.brigade_id, osid)}
                                >
                                    {brigadeLabel}
                                </button>
                            ) : (
                                <span className="truncate">{brigadeLabel}</span>
                            )}
                            <span className="ml-auto shrink-0">
                                {c.casualties_taken > 0 ? `−${c.casualties_taken}` : '—'}
                            </span>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
}

function BattleRow({
    battle,
    onSelectFormation,
    osidDisplayNames,
    formationNameById,
}: {
    battle: TurnBattle;
    onSelectFormation?: (id: string, osid?: string | null) => void;
    osidDisplayNames: Record<string, string> | null;
    formationNameById: Map<string, string>;
}) {
    const label = getOsidDisplayName(battle.osid, osidDisplayNames);
    const outcomeLabel = OUTCOME_LABEL_KEY[battle.outcome] ? t(OUTCOME_LABEL_KEY[battle.outcome]) : t('aar.outcome.recorded');
    const outcomeColor = OUTCOME_COLOR[battle.outcome] ?? 'text-text-secondary';
    const countLabel = battle.was_concentrated
        ? t('aar.concentratedAttackShort', { count: battle.all_attacker_ids.length })
        : null;
    const primaryAttackerLabel = getPlayerSafeBrigadeName(formationNameById.get(battle.primary_attacker_id));
    const primaryDefenderLabel = battle.primary_defender_id
        ? getPlayerSafeBrigadeName(formationNameById.get(battle.primary_defender_id))
        : null;
    const casualtyPayload: BattleCasualtyPayload = battle;
    const attackerCasualties = reportedNumber(casualtyPayload.attacker_casualties);
    const defenderCasualties = reportedNumber(casualtyPayload.defender_casualties);
    const casualtiesReported = casualtyPayload.casualties_reported !== false
        && attackerCasualties !== null
        && defenderCasualties !== null;
    const hasReportedLosses = casualtiesReported && (attackerCasualties > 0 || defenderCasualties > 0);

    return (
        <div
            data-testid="aar-battle-row"
            data-osid={battle.osid}
            className="text-xs py-1 border-b border-panel-border/30 last:border-0"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 min-w-0">
                    <FactionTag faction={battle.attacker_faction} />
                    <span className="text-text-secondary">→</span>
                    <FactionTag faction={battle.defender_faction} />
                    {countLabel && <span className="text-xs text-text-muted font-mono">{countLabel}</span>}
                    <span className="text-text-primary capitalize truncate">{label}</span>
                    {battle.territory_flipped && <span className="text-amber-400 text-xs">⬡ {t('aar.flip')}</span>}
                </div>
                <span className={`${outcomeColor} font-mono text-xs shrink-0 ml-2`}>{outcomeLabel}</span>
            </div>
            {hasReportedLosses && (
                <div className="text-xs text-text-muted tabular-nums mt-0.5 ml-6">
                    {t('aar.attackerShort')} −{attackerCasualties.toLocaleString()}  ·  {t('aar.defenderShort')} −{defenderCasualties.toLocaleString()}
                </div>
            )}
            {!casualtiesReported && (
                <div className="text-xs text-text-muted tabular-nums mt-0.5 ml-6">
                    {t('aar.casualtiesUnreported')}
                </div>
            )}
            {battle.execution_friction && (
                <div className="text-xs text-amber-300 mt-0.5 ml-6">
                    {battle.execution_friction.labels.map((label) => t(INTEL_FRICTION_LABEL_KEY[label] ?? 'aar.friction.commandFriction')).join(' / ')}
                    {battle.execution_friction.attacker_confidence_band
                        ? ` (${t('aar.confidenceBand', {
                            band: t(CONFIDENCE_BAND_LABEL_KEY[battle.execution_friction.attacker_confidence_band] ?? 'aar.confidence.uncertain'),
                        })})`
                        : ''}
                </div>
            )}
            {onSelectFormation && (
                <div className="text-xs text-text-muted mt-0.5 ml-6 flex gap-2">
                    <button
                        type="button"
                        data-testid="aar-formation-link"
                        data-role="attacker"
                        data-formation-id={battle.primary_attacker_id}
                        data-osid={battle.osid}
                        className="hover:text-interactive transition-colors"
                        onClick={() => onSelectFormation(battle.primary_attacker_id, battle.osid)}
                    >
                        {primaryAttackerLabel}
                    </button>
                    {battle.primary_defender_id && (
                        <>
                            <span>{t('aar.vs')}</span>
                            <button
                                type="button"
                                data-testid="aar-formation-link"
                                data-role="defender"
                                data-formation-id={battle.primary_defender_id}
                                data-osid={battle.osid}
                                className="hover:text-interactive transition-colors"
                                onClick={() => onSelectFormation(battle.primary_defender_id!, battle.osid)}
                            >
                                {primaryDefenderLabel}
                            </button>
                        </>
                    )}
                </div>
            )}
            {battle.defender_contributions && battle.defender_contributions.length > 1 && (
                <DefenderBreakdown
                    contributions={battle.defender_contributions}
                    onSelectFormation={onSelectFormation}
                    osid={battle.osid}
                    formationNameById={formationNameById}
                />
            )}
        </div>
    );
}

function ArcRow({ t }: { t: ArcTransition }) {
    return (
        <div className="text-xs py-0.5 flex items-center gap-2">
            <FactionTag faction={t.faction} />
            <span className="text-text-primary truncate flex-1">{t.formation_name}</span>
            <span className={`${ARC_COLOR[t.from_arc] ?? 'text-text-secondary'} text-xs`}>{getPlayerSafeFormationNarrativeArcLabel(t.from_arc)}</span>
            <span className="text-text-muted text-xs">→</span>
            <span className={`${ARC_COLOR[t.to_arc] ?? 'text-text-secondary'} text-xs font-semibold`}>{getPlayerSafeFormationNarrativeArcLabel(t.to_arc)}</span>
        </div>
    );
}

function DecorationRow({ award }: { award: DecorationAward }) {
    return (
        <div className="text-xs py-0.5 flex items-center gap-2">
            <FactionTag faction={award.faction} />
            <span className="text-text-primary truncate flex-1">{award.formation_name}</span>
            <span className="text-accent-gold text-xs font-semibold">{getDecorationName(award.faction, award.decoration.tier)}</span>
        </div>
    );
}

function TerritoryNet({ net }: { net: Partial<Record<string, number>> }) {
    const entries = Object.entries(net).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return <span className="text-text-muted text-xs">{t('aar.noChanges')}</span>;
    return (
        <div className="flex gap-4 text-xs tabular-nums">
            {entries.map(([faction, delta]) => (
                <span key={faction} className="flex items-center gap-1">
                    <FactionTag faction={faction} />
                    <span className={delta! > 0 ? 'text-green-400' : delta! < 0 ? 'text-red-400' : 'text-text-secondary'}>
                        {delta! > 0 ? '+' : ''}{delta}
                    </span>
                </span>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface AARPanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** When true, renders content only (no modal wrapper/backdrop). */
    embedded?: boolean;
}

export function AARPanel({ isOpen, onClose, embedded }: AARPanelProps) {
    const [locale] = useLocale();
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

    if (!isOpen || !loadedGameState) return null;

    const inspectAarFormation = (formationId: string, osid?: string | null) => {
        const formation = loadedGameState.formations.find((candidate) => candidate.id === formationId);
        let target: FieldInspectionTarget;
        if (osid) {
            target = resolveMapFormationInspectionTarget(formationId, { location_osid: osid }, loadedGameState);
        } else if (formation?.corps_id) {
            target = { kind: 'field-formation-in-corps', formationId, corpsId: formation.corps_id };
        } else {
            target = { kind: 'field-formation', formationId };
        }
        inspectOnField(useGameStore.getState(), target);
    };

    const rawSummary: TurnSummary | null = loadedGameState.latestTurnSummary;
    const summary: TurnSummary | null = shouldNarrateTerritorySummary(rawSummary) ? rawSummary : null;
    const narrateTerritory = summary != null;
    const operationLifecycle = projectOperationLifecycle(loadedGameState);
    const operationalActivity = operationLifecycle.hasAnyActivity ? (
        <div
            data-testid="aar-operation-activity"
            className="border-l-2 border-accent-gold/50 px-3 py-2 text-[12px] leading-relaxed text-text-secondary"
        >
            {t('aar.operationActivity', {
                executing: operationLifecycle.counts.executing,
                completed: operationLifecycle.counts.completed,
                archived: operationLifecycle.counts.archived,
                personnel: operationLifecycle.personnelActivityCount,
            })}
        </div>
    ) : null;
    const formationNameById = new Map(
        (loadedGameState.formations ?? []).map((formation) => [formation.id, getLocalizedFormationName(formation, locale)] as const),
    );

    const body = (
                <div className={embedded ? "text-xs" : "p-3 overflow-auto text-xs flex-1"}>
                    {!summary ? (
                        operationalActivity ?? (
                            <div className="text-text-muted text-center py-8">
                                {t('aar.noReport')}
                            </div>
                        )
                    ) : (
                        <>
                            {/* Combat */}
                            {summary.battles.length > 0 && (
                                <Section title={t('aar.section.combat')} count={summary.battles.length}>
                                    {summary.battles.map((b) => (
                                        <BattleRow
                                            key={b.osid}
                                            battle={b}
                                            onSelectFormation={inspectAarFormation}
                                            osidDisplayNames={osidDisplayNames}
                                            formationNameById={formationNameById}
                                        />
                                    ))}
                                </Section>
                            )}

                            {/* Territory */}
                            {narrateTerritory && Object.keys(summary.territory_net).length > 0 && (
                                <Section title={t('aar.section.territory')}>
                                    <div className="mb-1.5">
                                        <TerritoryNet net={summary.territory_net} />
                                    </div>
                                    {summary.notable_flips.length > 0 && (
                                    <div className="space-y-0.5">
                                            {summary.notable_flips.map((flip) => {
                                                const label = getOsidDisplayName(flip.osid, osidDisplayNames);
                                                return (
                                                    <div key={flip.osid} className="text-xs flex gap-1.5 items-center">
                                                        <span className="text-text-muted">⬡</span>
                                                        <span className="text-text-primary capitalize">{label}</span>
                                                        {flip.from && <FactionTag faction={flip.from} />}
                                                        <span className="text-text-muted">→</span>
                                                        {flip.to && <FactionTag faction={flip.to} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Section>
                            )}

                            {/* Unit Events */}
                            {(summary.decoration_awards.length > 0 || summary.arc_transitions.length > 0 ||
                              summary.formation_spawns.length > 0 || summary.formation_destructions.length > 0) && (
                                <Section title={t('aar.section.unitEvents')} count={
                                    summary.decoration_awards.length + summary.arc_transitions.length +
                                    summary.formation_spawns.length + summary.formation_destructions.length
                                }>
                                    {summary.decoration_awards.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-xs uppercase tracking-wide text-accent-gold mb-1">{t('aar.decorationsAwarded')}</div>
                                            {summary.decoration_awards.map((a) => <DecorationRow key={`${a.formation_id}-${a.decoration.tier}`} award={{ ...a, formation_name: formationNameById.get(a.formation_id) ?? a.formation_name }} />)}
                                        </div>
                                    )}
                                    {summary.arc_transitions.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">{t('aar.arcChanges')}</div>
                                            {summary.arc_transitions.map((t) => <ArcRow key={t.formation_id} t={t} />)}
                                        </div>
                                    )}
                                    {summary.formation_spawns.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-xs uppercase tracking-wide text-green-400 mb-1">{t('aar.formationsActivated')}</div>
                                            {summary.formation_spawns.map((s) => (
                                                <div key={s.formation_id} className="text-xs py-0.5 flex gap-2">
                                                    <FactionTag faction={s.faction} />
                                                    <span className="text-text-primary">{s.formation_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {summary.formation_destructions.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-xs uppercase tracking-wide text-red-400 mb-1">{t('aar.formationsDestroyed')}</div>
                                            {summary.formation_destructions.map((d) => (
                                                <div key={d.formation_id} className="text-xs py-0.5 flex gap-2">
                                                    <FactionTag faction={d.faction} />
                                                    <span className="text-text-secondary line-through">{d.formation_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Section>
                            )}

                            {/* Faction Pulse */}
                            {(Object.keys(summary.supply_deltas).length > 0 || Object.keys(summary.heavy_munitions_deltas).length > 0) && (
                                <Section title={t('aar.section.factionPulse')} defaultOpen={false}>
                                    {(['RS', 'RBiH', 'HRHB'] as const).map((faction) => {
                                        const sup = summary.supply_deltas[faction];
                                        const mun = summary.heavy_munitions_deltas[faction];
                                        if (sup == null && mun == null) return null;
                                        return (
                                            <div key={faction} className="flex items-center gap-2 py-0.5">
                                                <FactionTag faction={faction} />
                                                <div className="text-xs tabular-nums flex gap-3 text-text-secondary">
                                                    {sup != null && (
                                                        <span>
                                                            {t('aar.supply')}{' '}
                                                            <span className={sup > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                {sup > 0 ? '+' : ''}{sup.toFixed(1)}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {mun != null && (
                                                        <span>
                                                            {t('aar.munitions')}{' '}
                                                            <span className={mun > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                {mun > 0 ? '+' : ''}{mun.toFixed(1)}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </Section>
                            )}

                            {/* Displacement */}
                            {summary.displacement_total > 0 && (
                                <Section title={t('aar.section.displacement')} defaultOpen={false}>
                                    <div className="space-y-0.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">{t('aar.totalDisplaced')}</span>
                                            <span className="tabular-nums text-text-primary">{summary.displacement_total.toLocaleString()}</span>
                                        </div>
                                        {summary.displacement_hotspot && (
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">{t('aar.hotspot')}</span>
                                                <span className="text-amber-400">{toTitleCase(summary.displacement_hotspot)}</span>
                                            </div>
                                        )}
                                        {Object.entries(summary.displacement_by_ethnicity)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([eth, count]) => (
                                                <div key={eth} className="flex justify-between">
                                                    <DisplacementGroupTag group={eth} />
                                                    <span className="tabular-nums text-text-secondary">{count?.toLocaleString()}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </Section>
                            )}

                            {/* Notable Events */}
                            {summary.notable_events.length > 0 && (
                                <Section title={t('aar.section.notableEvents')} count={summary.notable_events.length}>
                                    {summary.notable_events.map((e) => (
                                        <div key={e.kind + (e.faction ?? '') + (e.osid ?? '')} className="text-xs py-0.5 flex gap-2 items-start">
                                            <span className="text-accent-gold text-xs uppercase tracking-wide shrink-0 mt-0.5">
                                                {notableEventLabel(e.kind)}
                                            </span>
                                            <span className="text-text-secondary">{e.description}</span>
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {/* Empty state — data exists but nothing to show */}
                            {summary.battles.length === 0 &&
                             (!narrateTerritory || Object.keys(summary.territory_net).length === 0) &&
                             summary.displacement_total === 0 &&
                             summary.notable_events.length === 0 &&
                             summary.decoration_awards.length === 0 &&
                             summary.arc_transitions.length === 0 && (
                                operationalActivity ?? (
                                    <EmptyState
                                        message={t('aar.quietTurn')}
                                        helpText={t('aar.noSignificantEvents')}
                                    />
                                )
                            )}
                        </>
                    )}
                </div>
    );

    if (embedded) return body;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
            {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: backdrop is now a real <button> for keyboard activation. */}
            <button
                type="button"
                aria-label={t('aar.close')}
                className="absolute inset-0 bg-black/40 pointer-events-auto cursor-default"
                onClick={onClose}
            />
            <div className="relative panel-slide-in-right pointer-events-auto w-[22rem] max-h-[calc(100vh-4rem)] mt-12 mr-2 flex flex-col bg-panel-bg/97 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border shrink-0">
                    <div>
                        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">{t('aar.title')}</span>
                        {summary && <span className="text-xs text-text-secondary ml-2 font-mono">{formatTurnLabel(loadedGameState.label)}</span>}
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('aar.close')} className="text-text-secondary hover:text-interactive text-sm leading-none">&#x2715;</button>
                </div>
                <div className="p-3 overflow-auto text-xs flex-1">
                    {body}
                </div>
            </div>
        </div>
    );
}
