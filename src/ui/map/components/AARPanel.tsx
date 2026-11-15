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
import { SurfaceCloseButton, SurfaceHeader, SURFACE_LABEL, SURFACE_LABEL_MUTED } from './surface/Surface';

type BattleCasualtyPayload = TurnBattle & {
    attacker_casualties?: number | null;
    defender_casualties?: number | null;
    casualties_reported?: boolean;
};

/** Formation link inside a battle row: underlined on hover, gold when focused. */
const AAR_LINK = 'text-[15px] text-[#ddd1b3] underline-offset-2 transition-colors hover:text-[#e0c27a] hover:underline';

// --- Faction tag inks (lightened for the dark surface; same hues as the map) ---
const FACTION_COLOR: Record<string, string> = {
    RS: '#e58a8a',
    RBiH: '#86c890',
    HRHB: '#8bb7e4',
};

// --- Arc display ---
const ARC_COLOR: Record<string, string> = {
    veteran: 'text-emerald-200',
    bloodied: 'text-amber-200',
    shattered: 'text-red-200',
    risen: 'text-emerald-100',
    destroyed: 'text-[#9c917b]',
    garrison: 'text-[#b9ad94]',
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
    decisive_victory: 'text-emerald-100',
    victory: 'text-emerald-200',
    costly_victory: 'text-amber-200',
    stalemate: 'text-[#b9ad94]',
    repulsed: 'text-red-200',
    catastrophic: 'text-red-300',
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
        <section className="flex flex-col gap-2.5" aria-label={title}>
            <button
                type="button"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 border-b border-[#262b35] pb-2 text-left transition hover:text-[#f1e6c8]"
                onClick={() => setOpen((v) => !v)}
            >
                <span className={SURFACE_LABEL}>{title}</span>
                <span className="flex items-center gap-2 text-[15px] text-[#b9ad94]">
                    {count != null && <span className="font-mono tabular-nums">{count}</span>}
                    <span aria-hidden="true">{open ? '▲' : '▼'}</span>
                </span>
            </button>
            {open && children}
        </section>
    );
}

function FactionTag({ faction }: { faction: string }) {
    return (
        <span
            className="shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[13px] font-semibold"
            style={{ color: FACTION_COLOR[faction] ?? '#aaa', borderColor: `${FACTION_COLOR[faction] ?? '#555'}44` }}
        >
            {getPlayerSafeMilitaryFactionName(faction)}
        </span>
    );
}

function DisplacementGroupTag({ group }: { group: string }) {
    return (
        <span
            className="shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[13px] font-semibold"
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
        <div className="flex flex-col gap-1">
            <button
                type="button"
                aria-expanded={expanded}
                className="self-start text-[15px] text-[#b9ad94] transition-colors hover:text-[#f1e6c8]"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▾' : '▸'} {t('aar.defenders', { count: sorted.length })}
            </button>
            {expanded && (
                <div className="flex flex-col gap-1 pl-4">
                    {sorted.map((c) => {
                        const brigadeLabel = getPlayerSafeBrigadeName(formationNameById.get(c.brigade_id));
                        return (
                        <div key={c.brigade_id} className="flex items-center gap-2 text-[15px] tabular-nums text-[#a99e86]">
                            <span className="w-6 text-right text-[#c2b69c]">{c.distance_hops === 0 ? '⊕' : `${c.distance_hops}↷`}</span>
                            {c.is_home_municipality && <span title={t('aar.homeMunicipality')}>⌂</span>}
                            {onSelectFormation ? (
                                <button
                                    type="button"
                                    data-testid="aar-formation-link"
                                    data-role="defender-contribution"
                                    data-formation-id={c.brigade_id}
                                    data-osid={osid ?? undefined}
                                    className={`${AAR_LINK} truncate`}
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
    const outcomeColor = OUTCOME_COLOR[battle.outcome] ?? 'text-[#c2b69c]';
    const attackerIds = Array.isArray(battle.all_attacker_ids) ? battle.all_attacker_ids : [];
    // Enemy attackers reach the client as one fogged contact, so a concentrated
    // enemy assault is labelled without a brigade count.
    const countLabel = attackerIds.length > 1
        ? t('aar.concentratedAttackShort', { count: attackerIds.length })
        : battle.was_concentrated
            ? t('aar.concentratedAttackUncounted')
            : null;
    const supportingAttackerIds = attackerIds.filter((id) => id !== battle.primary_attacker_id);
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
            className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-3 text-[15px]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <FactionTag faction={battle.attacker_faction} />
                    <span aria-hidden="true" className="text-[#b9ad94]">→</span>
                    <FactionTag faction={battle.defender_faction} />
                    <span className="min-w-0 truncate text-[17px] font-semibold capitalize text-[#f1e6c8]">{label}</span>
                    {countLabel && <span className="font-mono text-[14px] text-[#b9ad94]">{countLabel}</span>}
                    {battle.territory_flipped && <span className="text-[15px] text-amber-200">⬡ {t('aar.flip')}</span>}
                </div>
                <span className={`${outcomeColor} shrink-0 whitespace-nowrap font-mono text-[15px] font-semibold`}>{outcomeLabel}</span>
            </div>
            {hasReportedLosses && (
                <div className="tabular-nums text-[#c2b69c]">
                    {t('aar.attackerShort')} −{attackerCasualties.toLocaleString()}  ·  {t('aar.defenderShort')} −{defenderCasualties.toLocaleString()}
                </div>
            )}
            {!casualtiesReported && (
                <div className="tabular-nums text-[#a99e86]">
                    {t('aar.casualtiesUnreported')}
                </div>
            )}
            {battle.execution_friction && (
                <div className="text-amber-200">
                    {battle.execution_friction.labels.map((label) => t(INTEL_FRICTION_LABEL_KEY[label] ?? 'aar.friction.commandFriction')).join(' / ')}
                    {battle.execution_friction.attacker_confidence_band
                        ? ` (${t('aar.confidenceBand', {
                            band: t(CONFIDENCE_BAND_LABEL_KEY[battle.execution_friction.attacker_confidence_band] ?? 'aar.confidence.uncertain'),
                        })})`
                        : ''}
                </div>
            )}
            {onSelectFormation && (
                <div className="flex flex-wrap items-center gap-2 text-[#a99e86]">
                    <button
                        type="button"
                        data-testid="aar-formation-link"
                        data-role="attacker"
                        data-formation-id={battle.primary_attacker_id}
                        data-osid={battle.osid}
                        className={AAR_LINK}
                        onClick={() => onSelectFormation(battle.primary_attacker_id, battle.osid)}
                    >
                        {primaryAttackerLabel}
                    </button>
                    {supportingAttackerIds.map((id) => (
                        <button
                            key={id}
                            type="button"
                            data-testid="aar-formation-link"
                            data-role="attacker"
                            data-formation-id={id}
                            data-osid={battle.osid}
                            className={AAR_LINK}
                            onClick={() => onSelectFormation(id, battle.osid)}
                        >
                            {getPlayerSafeBrigadeName(formationNameById.get(id))}
                        </button>
                    ))}
                    {battle.primary_defender_id && (
                        <>
                            <span>{t('aar.vs')}</span>
                            <button
                                type="button"
                                data-testid="aar-formation-link"
                                data-role="defender"
                                data-formation-id={battle.primary_defender_id}
                                data-osid={battle.osid}
                                className={AAR_LINK}
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
        <div className="text-[15px] py-1 flex items-center gap-2">
            <FactionTag faction={t.faction} />
            <span className="text-[#f1e6c8] truncate flex-1">{t.formation_name}</span>
            <span className={`${ARC_COLOR[t.from_arc] ?? 'text-[#c2b69c]'} text-[15px]`}>{getPlayerSafeFormationNarrativeArcLabel(t.from_arc)}</span>
            <span className="text-[#a99e86] text-[15px]">→</span>
            <span className={`${ARC_COLOR[t.to_arc] ?? 'text-[#c2b69c]'} text-[15px] font-semibold`}>{getPlayerSafeFormationNarrativeArcLabel(t.to_arc)}</span>
        </div>
    );
}

function DecorationRow({ award }: { award: DecorationAward }) {
    return (
        <div className="text-[15px] py-1 flex items-center gap-2">
            <FactionTag faction={award.faction} />
            <span className="text-[#f1e6c8] truncate flex-1">{award.formation_name}</span>
            <span className="text-accent-gold text-[15px] font-semibold">{getDecorationName(award.faction, award.decoration.tier)}</span>
        </div>
    );
}

function TerritoryNet({ net }: { net: Partial<Record<string, number>> }) {
    const entries = Object.entries(net).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return <span className="text-[#a99e86] text-[15px]">{t('aar.noChanges')}</span>;
    return (
        <div className="flex gap-4 text-[15px] tabular-nums">
            {entries.map(([faction, delta]) => (
                <span key={faction} className="flex items-center gap-1">
                    <FactionTag faction={faction} />
                    <span className={delta! > 0 ? 'text-emerald-200' : delta! < 0 ? 'text-red-200' : 'text-[#c2b69c]'}>
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
            className="rounded-md border border-[#2a303c] border-l-4 border-l-[#c9a75c] bg-[#161a22] px-5 py-4 text-[16px] leading-relaxed text-[#ddd1b3]"
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
                <div className={embedded ? "flex flex-col gap-6 text-[15px]" : "flex flex-1 flex-col gap-6 overflow-auto px-7 py-6 text-[15px]"}>
                    {!summary ? (
                        operationalActivity ?? (
                            <div className="py-8 text-[17px] text-[#c2b69c]">
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
                                                    <div key={flip.osid} className="text-[15px] flex gap-1.5 items-center">
                                                        <span className="text-[#a99e86]">⬡</span>
                                                        <span className="text-[#f1e6c8] capitalize">{label}</span>
                                                        {flip.from && <FactionTag faction={flip.from} />}
                                                        <span className="text-[#a99e86]">→</span>
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
                                            <div className={`${SURFACE_LABEL_MUTED} mb-1.5`}>{t('aar.decorationsAwarded')}</div>
                                            {summary.decoration_awards.map((a) => <DecorationRow key={`${a.formation_id}-${a.decoration.tier}`} award={{ ...a, formation_name: formationNameById.get(a.formation_id) ?? a.formation_name }} />)}
                                        </div>
                                    )}
                                    {summary.arc_transitions.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className={`${SURFACE_LABEL_MUTED} mb-1.5`}>{t('aar.arcChanges')}</div>
                                            {summary.arc_transitions.map((t) => <ArcRow key={t.formation_id} t={t} />)}
                                        </div>
                                    )}
                                    {summary.formation_spawns.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className={`${SURFACE_LABEL_MUTED} mb-1.5`}>{t('aar.formationsActivated')}</div>
                                            {summary.formation_spawns.map((s) => (
                                                <div key={s.formation_id} className="text-[15px] py-1 flex gap-2">
                                                    <FactionTag faction={s.faction} />
                                                    <span className="text-[#f1e6c8]">{s.formation_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {summary.formation_destructions.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className={`${SURFACE_LABEL_MUTED} mb-1.5`}>{t('aar.formationsDestroyed')}</div>
                                            {summary.formation_destructions.map((d) => (
                                                <div key={d.formation_id} className="text-[15px] py-1 flex gap-2">
                                                    <FactionTag faction={d.faction} />
                                                    <span className="text-[#c2b69c] line-through">{d.formation_name}</span>
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
                                                <div className="text-[15px] tabular-nums flex gap-3 text-[#c2b69c]">
                                                    {sup != null && (
                                                        <span>
                                                            {t('aar.supply')}{' '}
                                                            <span className={sup > 0 ? 'text-emerald-200' : 'text-red-200'}>
                                                                {sup > 0 ? '+' : ''}{sup.toFixed(1)}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {mun != null && (
                                                        <span>
                                                            {t('aar.munitions')}{' '}
                                                            <span className={mun > 0 ? 'text-emerald-200' : 'text-red-200'}>
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
                                    <div className="space-y-0.5 text-[15px]">
                                        <div className="flex justify-between">
                                            <span className="text-[#c2b69c]">{t('aar.totalDisplaced')}</span>
                                            <span className="tabular-nums text-[#f1e6c8]">{summary.displacement_total.toLocaleString()}</span>
                                        </div>
                                        {summary.displacement_hotspot && (
                                            <div className="flex justify-between">
                                                <span className="text-[#c2b69c]">{t('aar.hotspot')}</span>
                                                <span className="text-amber-200">{toTitleCase(summary.displacement_hotspot)}</span>
                                            </div>
                                        )}
                                        {Object.entries(summary.displacement_by_ethnicity)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([eth, count]) => (
                                                <div key={eth} className="flex justify-between">
                                                    <DisplacementGroupTag group={eth} />
                                                    <span className="tabular-nums text-[#c2b69c]">{count?.toLocaleString()}</span>
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
                                        <div key={e.kind + (e.faction ?? '') + (e.osid ?? '')} className="text-[15px] py-1 flex gap-2 items-start">
                                            <span className="shrink-0 font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-[#e0c27a] mt-0.5">
                                                {notableEventLabel(e.kind)}
                                            </span>
                                            <span className="text-[#c2b69c]">{e.description}</span>
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
                className="absolute inset-0 bg-[#05070a]/70 pointer-events-auto cursor-default"
                onClick={onClose}
            />
            <div className="relative panel-slide-in-right pointer-events-auto mr-4 mt-[4.5rem] flex max-h-[calc(var(--interface-viewport-height,100vh)-6rem)] w-[min(40rem,calc(var(--interface-viewport-width,100vw)-2rem))] flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
                <SurfaceHeader
                    eyebrow={summary ? formatTurnLabel(loadedGameState.label) : t('aar.title')}
                    title={t('aar.title')}
                    close={<SurfaceCloseButton onClick={onClose} aria-label={t('aar.close')} />}
                />
                {body}
            </div>
        </div>
    );
}
