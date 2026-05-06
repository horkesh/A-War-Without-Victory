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
    getPlayerSafeMilitaryFactionName,
} from '../utils/playerSafeText';
import { EmptyState } from './EmptyState';

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
const OUTCOME_LABEL: Record<string, string> = {
    decisive_victory: 'Decisive',
    victory: 'Victory',
    costly_victory: 'Costly',
    stalemate: 'Stalemate',
    repulsed: 'Repulsed',
    catastrophic: 'Collapse',
};
const OUTCOME_COLOR: Record<string, string> = {
    decisive_victory: 'text-green-300',
    victory: 'text-green-400',
    costly_victory: 'text-amber-400',
    stalemate: 'text-neutral-400',
    repulsed: 'text-red-400',
    catastrophic: 'text-red-600',
};

// --- Notable event labels ---
const NOTABLE_LABEL: Record<TurnNotableEvent['kind'], string> = {
    graz_accords_activated: 'Graz Accords',
    truce_broken: 'Truce Broken',
    washington_agreement: 'Washington Agreement',
    operation_storm: 'Operation Storm',
    ceasefire_activated: 'Ceasefire',
    siege_formed: 'Siege Formed',
    siege_broken: 'Siege Broken',
    first_battle: 'First Battle',
};

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
                className="w-full flex justify-between items-center text-[10px] uppercase tracking-wide text-text-secondary font-semibold mb-1.5 hover:text-text-primary transition-colors"
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
            className="text-[9px] font-mono px-1 rounded border"
            style={{ color: FACTION_COLOR[faction] ?? '#aaa', borderColor: `${FACTION_COLOR[faction] ?? '#555'}44` }}
        >
            {getPlayerSafeMilitaryFactionName(faction)}
        </span>
    );
}

function DefenderBreakdown({ contributions, onSelectFormation, formationNameById }: {
    contributions: NonNullable<TurnBattle['defender_contributions']>;
    onSelectFormation?: (id: string) => void;
    formationNameById: Map<string, string>;
}) {
    const [expanded, setExpanded] = useState(false);
    const sorted = [...contributions].sort((a, b) => b.reactive_weight - a.reactive_weight);
    return (
        <div className="ml-6 mt-0.5">
            <button
                type="button"
                className="text-[9px] text-text-muted hover:text-interactive transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▾' : '▸'} {sorted.length} defenders
            </button>
            {expanded && (
                <div className="mt-0.5 space-y-px">
                    {sorted.map((c) => {
                        const brigadeLabel = getPlayerSafeBrigadeName(formationNameById.get(c.brigade_id));
                        return (
                        <div key={c.brigade_id} className="text-[9px] text-text-muted tabular-nums flex items-center gap-1">
                            <span className="text-text-secondary w-3 text-right">{c.distance_hops === 0 ? '⊕' : `${c.distance_hops}↷`}</span>
                            {c.is_home_municipality && <span title="Home municipality">⌂</span>}
                            {onSelectFormation ? (
                                <button
                                    type="button"
                                    className="hover:text-interactive transition-colors truncate"
                                    onClick={() => onSelectFormation(c.brigade_id)}
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
    onSelectFormation?: (id: string) => void;
    osidDisplayNames: Record<string, string> | null;
    formationNameById: Map<string, string>;
}) {
    const label = getOsidDisplayName(battle.osid, osidDisplayNames);
    const outcomeLabel = OUTCOME_LABEL[battle.outcome] ?? battle.outcome;
    const outcomeColor = OUTCOME_COLOR[battle.outcome] ?? 'text-text-secondary';
    const countLabel = battle.was_concentrated ? `${battle.all_attacker_ids.length}×` : null;
    const primaryAttackerLabel = getPlayerSafeBrigadeName(formationNameById.get(battle.primary_attacker_id));
    const primaryDefenderLabel = battle.primary_defender_id
        ? getPlayerSafeBrigadeName(formationNameById.get(battle.primary_defender_id))
        : null;

    return (
        <div className="text-[11px] py-1 border-b border-panel-border/30 last:border-0">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 min-w-0">
                    <FactionTag faction={battle.attacker_faction} />
                    <span className="text-text-secondary">→</span>
                    <FactionTag faction={battle.defender_faction} />
                    {countLabel && <span className="text-[9px] text-text-muted font-mono">{countLabel}</span>}
                    <span className="text-text-primary capitalize truncate">{label}</span>
                    {battle.territory_flipped && <span className="text-amber-400 text-[9px]">⬡ flip</span>}
                </div>
                <span className={`${outcomeColor} font-mono text-[10px] shrink-0 ml-2`}>{outcomeLabel}</span>
            </div>
            {(battle.attacker_casualties > 0 || battle.defender_casualties > 0) && (
                <div className="text-[9px] text-text-muted tabular-nums mt-0.5 ml-6">
                    att −{battle.attacker_casualties.toLocaleString()}  ·  def −{battle.defender_casualties.toLocaleString()}
                </div>
            )}
            {onSelectFormation && (
                <div className="text-[9px] text-text-muted mt-0.5 ml-6 flex gap-2">
                    <button
                        type="button"
                        className="hover:text-interactive transition-colors"
                        onClick={() => onSelectFormation(battle.primary_attacker_id)}
                    >
                        {primaryAttackerLabel}
                    </button>
                    {battle.primary_defender_id && (
                        <>
                            <span>vs</span>
                            <button
                                type="button"
                                className="hover:text-interactive transition-colors"
                                onClick={() => onSelectFormation(battle.primary_defender_id!)}
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
                    formationNameById={formationNameById}
                />
            )}
        </div>
    );
}

function ArcRow({ t }: { t: ArcTransition }) {
    return (
        <div className="text-[11px] py-0.5 flex items-center gap-2">
            <FactionTag faction={t.faction} />
            <span className="text-text-primary truncate flex-1">{t.formation_name}</span>
            <span className={`${ARC_COLOR[t.from_arc] ?? 'text-text-secondary'} text-[10px]`}>{t.from_arc}</span>
            <span className="text-text-muted text-[10px]">→</span>
            <span className={`${ARC_COLOR[t.to_arc] ?? 'text-text-secondary'} text-[10px] font-semibold`}>{t.to_arc}</span>
        </div>
    );
}

function DecorationRow({ award }: { award: DecorationAward }) {
    return (
        <div className="text-[11px] py-0.5 flex items-center gap-2">
            <FactionTag faction={award.faction} />
            <span className="text-text-primary truncate flex-1">{award.formation_name}</span>
            <span className="text-accent-gold text-[10px] font-semibold">{award.decoration.tier.replace('_', ' ')}</span>
        </div>
    );
}

function TerritoryNet({ net }: { net: Partial<Record<string, number>> }) {
    const entries = Object.entries(net).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return <span className="text-text-muted text-[11px]">No changes</span>;
    return (
        <div className="flex gap-4 text-[11px] tabular-nums">
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
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);

    if (!isOpen || !loadedGameState) return null;

    const summary: TurnSummary | null = loadedGameState.latestTurnSummary;
    const formationNameById = new Map(
        (loadedGameState.formations ?? []).map((formation) => [formation.id, formation.name] as const),
    );

    const body = (
                <div className={embedded ? "text-[11px]" : "p-3 overflow-auto text-[11px] flex-1"}>
                    {!summary ? (
                        <div className="text-text-muted text-center py-8">
                            No report yet — advance a turn to generate the first AAR.
                        </div>
                    ) : (
                        <>
                            {/* Combat */}
                            {summary.battles.length > 0 && (
                                <Section title="Combat" count={summary.battles.length}>
                                    {summary.battles.map((b) => (
                                        <BattleRow
                                            key={b.osid}
                                            battle={b}
                                            onSelectFormation={setSelectedFormationId}
                                            osidDisplayNames={osidDisplayNames}
                                            formationNameById={formationNameById}
                                        />
                                    ))}
                                </Section>
                            )}

                            {/* Territory */}
                            {Object.keys(summary.territory_net).length > 0 && (
                                <Section title="Territory">
                                    <div className="mb-1.5">
                                        <TerritoryNet net={summary.territory_net} />
                                    </div>
                                    {summary.notable_flips.length > 0 && (
                                    <div className="space-y-0.5">
                                            {summary.notable_flips.map((flip) => {
                                                const label = getOsidDisplayName(flip.osid, osidDisplayNames);
                                                return (
                                                    <div key={flip.osid} className="text-[10px] flex gap-1.5 items-center">
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
                                <Section title="Unit Events" count={
                                    summary.decoration_awards.length + summary.arc_transitions.length +
                                    summary.formation_spawns.length + summary.formation_destructions.length
                                }>
                                    {summary.decoration_awards.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-[9px] uppercase tracking-wide text-accent-gold mb-1">Decorations Awarded</div>
                                            {summary.decoration_awards.map((a) => <DecorationRow key={`${a.formation_id}-${a.decoration.tier}`} award={a} />)}
                                        </div>
                                    )}
                                    {summary.arc_transitions.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-1">Arc Changes</div>
                                            {summary.arc_transitions.map((t) => <ArcRow key={t.formation_id} t={t} />)}
                                        </div>
                                    )}
                                    {summary.formation_spawns.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-[9px] uppercase tracking-wide text-green-400 mb-1">Formations Activated</div>
                                            {summary.formation_spawns.map((s) => (
                                                <div key={s.formation_id} className="text-[11px] py-0.5 flex gap-2">
                                                    <FactionTag faction={s.faction} />
                                                    <span className="text-text-primary">{s.formation_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {summary.formation_destructions.length > 0 && (
                                        <div className="mb-1.5">
                                            <div className="text-[9px] uppercase tracking-wide text-red-400 mb-1">Formations Destroyed</div>
                                            {summary.formation_destructions.map((d) => (
                                                <div key={d.formation_id} className="text-[11px] py-0.5 flex gap-2">
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
                                <Section title="Faction Pulse" defaultOpen={false}>
                                    {(['RS', 'RBiH', 'HRHB'] as const).map((faction) => {
                                        const sup = summary.supply_deltas[faction];
                                        const mun = summary.heavy_munitions_deltas[faction];
                                        if (sup == null && mun == null) return null;
                                        return (
                                            <div key={faction} className="flex items-center gap-2 py-0.5">
                                                <FactionTag faction={faction} />
                                                <div className="text-[10px] tabular-nums flex gap-3 text-text-secondary">
                                                    {sup != null && (
                                                        <span>
                                                            Supply{' '}
                                                            <span className={sup > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                {sup > 0 ? '+' : ''}{sup.toFixed(1)}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {mun != null && (
                                                        <span>
                                                            Munitions{' '}
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
                                <Section title="Displacement" defaultOpen={false}>
                                    <div className="space-y-0.5 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Total displaced</span>
                                            <span className="tabular-nums text-text-primary">{summary.displacement_total.toLocaleString()}</span>
                                        </div>
                                        {summary.displacement_hotspot && (
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">Hotspot</span>
                                                <span className="text-amber-400">{toTitleCase(summary.displacement_hotspot)}</span>
                                            </div>
                                        )}
                                        {Object.entries(summary.displacement_by_ethnicity)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([eth, count]) => (
                                                <div key={eth} className="flex justify-between">
                                                    <FactionTag faction={eth} />
                                                    <span className="tabular-nums text-text-secondary">{count?.toLocaleString()}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </Section>
                            )}

                            {/* Notable Events */}
                            {summary.notable_events.length > 0 && (
                                <Section title="Notable Events" count={summary.notable_events.length}>
                                    {summary.notable_events.map((e) => (
                                        <div key={e.kind + (e.faction ?? '') + (e.osid ?? '')} className="text-[11px] py-0.5 flex gap-2 items-start">
                                            <span className="text-accent-gold text-[9px] uppercase tracking-wide shrink-0 mt-0.5">
                                                {NOTABLE_LABEL[e.kind] ?? e.kind}
                                            </span>
                                            <span className="text-text-secondary">{e.description}</span>
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {/* Empty state — data exists but nothing to show */}
                            {summary.battles.length === 0 &&
                             Object.keys(summary.territory_net).length === 0 &&
                             summary.displacement_total === 0 &&
                             summary.notable_events.length === 0 &&
                             summary.decoration_awards.length === 0 &&
                             summary.arc_transitions.length === 0 && (
                                <EmptyState
                                    message="Quiet turn"
                                    helpText="No significant events recorded this turn."
                                />
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
                aria-label="Close After-Action Report"
                className="absolute inset-0 bg-black/40 pointer-events-auto cursor-default"
                onClick={onClose}
            />
            <div className="relative panel-slide-in-right pointer-events-auto w-[22rem] max-h-[calc(100vh-4rem)] mt-12 mr-2 flex flex-col bg-panel-bg/97 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border shrink-0">
                    <div>
                        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">After-Action Report</span>
                        {summary && <span className="text-[10px] text-text-secondary ml-2 font-mono">{formatTurnLabel(loadedGameState.label)}</span>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close After-Action Report" className="text-text-secondary hover:text-interactive text-sm leading-none">&#x2715;</button>
                </div>
                <div className="p-3 overflow-auto text-[11px] flex-1">
                    {body}
                </div>
            </div>
        </div>
    );
}
