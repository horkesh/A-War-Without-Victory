import type { EventDefinition, EventResponseOption } from '../../../../sim/events/event_types.js';
import type { FactionId, GameState } from '../../../../state/game_state.js';
import {
    getBranchTagsActive,
    getCounterfactualDivergencePoints,
    getEventChainSummary,
} from '../../../../sim/events/causality_query.js';
import { getPlayerSafeDisplayLabel } from '../../utils/playerSafeText.js';

export interface WrappedSlide {
    id: string;
    title: string;
    subtitle: string;
    heroValue?: string;
    heroLabel?: string;
    detail?: string;
    bullets?: string[];
    data?: Record<string, unknown>;
}

const PLAYER_FACTION_LABELS: Record<string, string> = {
    RBiH: 'Republic of Bosnia and Herzegovina',
    RS: 'Republika Srpska',
    HRHB: 'Herceg-Bosna',
};

const VALID_FACTION_IDS: ReadonlySet<string> = new Set(['RBiH', 'RS', 'HRHB']);

function getFactionDisplayLabel(faction: string | undefined): string {
    if (!faction) return 'Unknown';
    return PLAYER_FACTION_LABELS[faction] ?? faction;
}

function resolveEventFallbackLabel(fallbackId: string): string {
    const displayId = fallbackId.trim().replace(/^(?:evt|event|csq)_/i, '');
    return getPlayerSafeDisplayLabel(displayId || fallbackId, 'Recorded event');
}

function resolveEventDisplayTitle(
    def: EventDefinition | undefined,
    fallbackId: string,
): string {
    const title = def?.title;
    return typeof title === 'string' && title.trim().length > 0
        ? title
        : resolveEventFallbackLabel(fallbackId);
}

function resolveResponseDisplayLabel(
    def: EventDefinition | undefined,
    responseId: string,
    fallback: string,
): string {
    const option = (def?.response_options ?? []).find((o: EventResponseOption) => o.id === responseId);
    const label = option?.label;
    return typeof label === 'string' && label.trim().length > 0
        ? label
        : getPlayerSafeDisplayLabel(responseId, fallback);
}

/**
 * Pure analysis function: reads adapted game state and produces 10 slides
 * summarizing the player's war for the "Chronicle Wrapped" presentation.
 * Always returns exactly 10 slides. All state access is defensive.
 *
 * Phase H Packet 6 (Component E): when `eventCatalog` is provided, up to 3
 * additional causality slides are appended AFTER the canonical 10 — one for
 * the foundational branch tags, one for counterfactual divergences, one for
 * the causal-chain summary. When `eventCatalog` is absent or empty, output
 * is byte-identical to pre-packet behavior (10 slides). The optional-prop +
 * graceful-degradation pattern mirrors `BranchTagBadgeRow` (H3) and the
 * H5 decision-context panel. All causality reads are sorted via
 * `strictCompare` inside the causality_query helpers — no new sources of
 * nondeterminism.
 */
export function generateWrappedSlides(
    state: any,
    eventCatalog?: ReadonlyMap<string, EventDefinition>,
): WrappedSlide[] {
    const slides: WrappedSlide[] = [];

    const turnSummaries: any[] = state?.turnSummaries ?? [];
    const formations: any[] = state?.formations ?? [];
    const strategicDimensions: Record<string, Record<string, { base_value: number; event_modifier: number; effective_value: number }>> | undefined = state?.strategicDimensions;
    const negotiatingCapital: Record<string, number> | undefined = state?.negotiatingCapital;
    const firedEvents: any[] = state?.firedEvents ?? [];
    const historicalEventsByTurn: any[] = state?.historicalEventsByTurn ?? [];
    const historicalComparison: { divergence_notes?: string[] } | undefined = state?.historicalComparison;
    const playerFaction: string = state?.player_faction ?? 'Unknown';
    const playerFactionLabel = getFactionDisplayLabel(playerFaction);
    const currentTurn: number = state?.turn ?? 0;
    const phase: string = state?.phase ?? 'unknown';

    // --- Slide 1: your_war ---
    slides.push({
        id: 'your_war',
        title: 'Your War',
        subtitle: `You led ${playerFactionLabel} through ${currentTurn} weeks of conflict`,
        heroValue: String(currentTurn),
        heroLabel: 'weeks at war',
        detail: `Phase: ${phase}`,
        data: { faction: playerFaction, turn: currentTurn, phase },
    });

    // --- Slide 2: the_opening ---
    const earlyTurns = turnSummaries.filter((s: any) => (s?.turn ?? 0) <= 8);
    let earlyGains = 0;
    let earlyLosses = 0;
    for (const s of earlyTurns) {
        const net = s?.territory_net ?? {};
        const factionNet = net[playerFaction] ?? 0;
        if (factionNet > 0) earlyGains += factionNet;
        else earlyLosses += Math.abs(factionNet);
    }
    const earlyBattles = earlyTurns.reduce((sum: number, s: any) => sum + (Array.isArray(s?.battles) ? s.battles.length : 0), 0);
    slides.push({
        id: 'the_opening',
        title: 'The Opening',
        subtitle: `The first 8 weeks set the stage`,
        heroValue: earlyBattles > 0 ? String(earlyBattles) : '0',
        heroLabel: 'early battles',
        detail: `Territory shifts: +${earlyGains} / -${earlyLosses} positions`,
        data: { earlyGains, earlyLosses, earlyBattles },
    });

    // --- Slide 3: bloodiest_week ---
    let bloodiestTurn = 0;
    let bloodiestCasualties = 0;
    for (const s of turnSummaries) {
        let turnCasualties = 0;
        if (Array.isArray(s?.battles)) {
            for (const b of s.battles) {
                turnCasualties += (b?.attacker_casualties ?? 0) + (b?.defender_casualties ?? 0);
            }
        }
        if (turnCasualties > bloodiestCasualties) {
            bloodiestCasualties = turnCasualties;
            bloodiestTurn = s?.turn ?? 0;
        }
    }
    slides.push({
        id: 'bloodiest_week',
        title: 'Bloodiest Week',
        subtitle: bloodiestCasualties > 0 ? `Week ${bloodiestTurn} saw the worst fighting` : 'No battles recorded',
        heroValue: bloodiestCasualties > 0 ? String(bloodiestCasualties) : '0',
        heroLabel: 'casualties in one week',
        detail: bloodiestTurn > 0 ? `Turn ${bloodiestTurn}` : undefined,
        data: { bloodiestTurn, bloodiestCasualties },
    });

    // --- Slide 4: best_brigade ---
    const brigades = formations.filter((f: any) => f?.kind === 'brigade');
    let bestBrigade: any = null;
    let bestScore = -1;
    for (const b of brigades) {
        const decorationCount = Array.isArray(b?.decorations) ? b.decorations.length : 0;
        const battlesFought = b?.combatSummary?.battles_fought ?? 0;
        const score = decorationCount * 3 + battlesFought;
        if (score > bestScore) {
            bestScore = score;
            bestBrigade = b;
        }
    }
    const bestName = bestBrigade?.name ?? 'None';
    const bestDecorations = Array.isArray(bestBrigade?.decorations) ? bestBrigade.decorations.length : 0;
    const bestBattles = bestBrigade?.combatSummary?.battles_fought ?? 0;
    slides.push({
        id: 'best_brigade',
        title: 'Best Brigade',
        subtitle: bestBrigade ? `${bestName} stood above the rest` : 'No brigades found',
        heroValue: bestBrigade ? bestName : '-',
        heroLabel: bestBrigade ? `${bestDecorations} decorations, ${bestBattles} battles` : '',
        detail: bestBrigade?.narrativeArc ? `Arc: ${bestBrigade.narrativeArc}` : undefined,
        data: { brigadeId: bestBrigade?.id, decorations: bestDecorations, battles: bestBattles },
    });

    // --- Slide 5: what_you_built ---
    let peakTerritory = 0;
    let totalGained = 0;
    let runningTerritory = 0;
    for (const s of turnSummaries) {
        const net = s?.territory_net ?? {};
        const factionNet = net[playerFaction] ?? 0;
        if (factionNet > 0) totalGained += factionNet;
        runningTerritory += factionNet;
        if (runningTerritory > peakTerritory) peakTerritory = runningTerritory;
    }
    const totalFormations = formations.filter((f: any) => f?.faction === playerFaction).length;
    let opsLaunched = 0;
    for (const s of turnSummaries) {
        if (Array.isArray(s?.notable_events)) {
            for (const e of s.notable_events) {
                const text = (e?.text ?? e?.id ?? '').toLowerCase();
                if (text.includes('operation') && text.includes('launch')) {
                    opsLaunched++;
                }
            }
        }
    }
    slides.push({
        id: 'what_you_built',
        title: 'What You Built',
        subtitle: `Your forces at their peak`,
        heroValue: String(totalFormations),
        heroLabel: 'formations fielded',
        detail: `Peak territory gain: +${peakTerritory} positions. Operations launched: ${opsLaunched}`,
        data: { peakTerritory, totalFormations, opsLaunched, totalGained },
    });

    // --- Slide 6: what_it_cost ---
    let totalCasualties = 0;
    let totalDisplaced = 0;
    for (const s of turnSummaries) {
        if (Array.isArray(s?.battles)) {
            for (const b of s.battles) {
                totalCasualties += (b?.attacker_casualties ?? 0) + (b?.defender_casualties ?? 0);
            }
        }
        totalDisplaced += s?.displacement_total ?? 0;
    }
    slides.push({
        id: 'what_it_cost',
        title: 'What It Cost',
        subtitle: 'The price of this war',
        heroValue: String(totalCasualties),
        heroLabel: 'total casualties (all factions)',
        detail: `${totalDisplaced} people displaced`,
        data: { totalCasualties, totalDisplaced },
    });

    // --- Slide 7: world_watching ---
    const playerDimensions = strategicDimensions?.[playerFaction];
    const internationalStanding = playerDimensions?.['international_standing'] ?? playerDimensions?.['International Standing'];
    const intlValue = internationalStanding?.effective_value;
    const internationalStandingDetail = internationalStanding && intlValue != null
        ? `Base: ${internationalStanding.base_value.toFixed(1)}, modifier: ${internationalStanding.event_modifier >= 0 ? '+' : ''}${internationalStanding.event_modifier.toFixed(1)}`
        : undefined;
    slides.push({
        id: 'world_watching',
        title: 'The World Was Watching',
        subtitle: intlValue != null
            ? `Your international standing: ${intlValue.toFixed(1)}`
            : 'International standing data unavailable',
        heroValue: intlValue != null ? intlValue.toFixed(1) : '-',
        heroLabel: 'international standing',
        detail: internationalStandingDetail,
        data: { internationalStanding: internationalStanding ?? null },
    });

    // --- Slide 8: your_decisions ---
    const decisionEvents = firedEvents.filter((e: any) => e?.isDecision === true);
    const decisionCount = decisionEvents.length;
    const totalEvents = historicalEventsByTurn.length + firedEvents.length;
    slides.push({
        id: 'your_decisions',
        title: 'Your Decisions',
        subtitle: decisionCount > 0
            ? `You made ${decisionCount} critical decision${decisionCount !== 1 ? 's' : ''}`
            : 'No decision events recorded',
        heroValue: String(decisionCount),
        heroLabel: 'decisions made',
        detail: `${totalEvents} total events witnessed`,
        data: { decisionCount, totalEvents },
    });

    // --- Slide 9: at_the_table ---
    const playerCapital = negotiatingCapital?.[playerFaction];
    const allCapitals = negotiatingCapital ?? {};
    slides.push({
        id: 'at_the_table',
        title: 'At the Table',
        subtitle: playerCapital != null
            ? `Your negotiating capital: ${playerCapital.toFixed(0)}`
            : 'Negotiating capital data unavailable',
        heroValue: playerCapital != null ? playerCapital.toFixed(0) : '-',
        heroLabel: 'negotiating capital',
        detail: Object.entries(allCapitals)
            .map(([f, v]) => `${f}: ${(v as number).toFixed(0)}`)
            .join(' | ') || undefined,
        data: { playerCapital: playerCapital ?? null, allCapitals },
    });

    // --- Slide 10: another_such_victory ---
    const finalDimensions: Record<string, unknown> = {};
    if (playerDimensions) {
        for (const [dim, val] of Object.entries(playerDimensions)) {
            finalDimensions[dim] = val?.effective_value ?? 0;
        }
    }
    const divergenceNotes = Array.isArray(historicalComparison?.divergence_notes)
        ? historicalComparison.divergence_notes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
        : [];
    slides.push({
        id: 'another_such_victory',
        title: 'Another Such Victory',
        subtitle: divergenceNotes.length > 0
            ? 'History remembered this war differently'
            : 'And we are undone',
        heroValue: negotiatingCapital?.[playerFaction] != null
            ? negotiatingCapital[playerFaction].toFixed(0)
            : '-',
        heroLabel: 'final score',
        detail: playerFactionLabel,
        bullets: divergenceNotes.slice(0, 3),
        data: finalDimensions,
    });

    // --- Phase H Packet 6 (Component E): causality slides ---
    // Optional, append-only. When eventCatalog is absent / empty, no slides
    // are appended and the output is byte-identical to pre-packet behavior.
    if (eventCatalog && eventCatalog.size > 0) {
        const causalitySlides = generateCausalitySlides(
            state,
            playerFaction,
            playerFactionLabel,
            eventCatalog,
        );
        for (const s of causalitySlides) slides.push(s);
    }

    return slides;
}

/**
 * Phase H Packet 6 — append-only causality slides for the end-of-campaign
 * Wrapped sequence. Pure derivation over Phase B causality substrate
 * (fired_event_ids / event_decision_log / event_causality_log) via the H2
 * wave-1 query helpers. Slide content is computed at slide-generation time
 * — no new persisted fields (per H1 scoping §11.3 default: live-computed).
 *
 * Returns 0–3 slides depending on which substrate signals are populated:
 *   - Slide F1 `foundational_choice` — appears when the player faction has
 *     activated at least one branch tag via a foundational decision.
 *   - Slide F2 `your_divergences` — appears when the player has at least one
 *     counterfactual divergence point (decided non-historical_default).
 *   - Slide F3 `causal_chain_summary` — appears when the chain summary has
 *     non-zero signal (foundational/downstream/closed/depth/divergence).
 *
 * Determinism: all reads go through causality_query helpers, which sort via
 * `strictCompare`. No Math.random, no Date.now. Order is fixed (F1 → F2 →
 * F3) so the visible slide sequence is stable across runs.
 */
export function generateCausalitySlides(
    state: any,
    playerFaction: string,
    playerFactionLabel: string,
    eventCatalog: ReadonlyMap<string, EventDefinition>,
): WrappedSlide[] {
    const slides: WrappedSlide[] = [];
    if (!eventCatalog || eventCatalog.size === 0) return slides;

    // Cast for query-helper consumption. Helpers defensively read
    // `state.military?.…` — when fields are absent they return [] / zeros.
    const gameState = state as GameState;

    // --- Slide F1: foundational_choice ---
    // Only renders when the player faction id is a canonical FactionId AND
    // at least one branch tag is active for that faction.
    if (VALID_FACTION_IDS.has(playerFaction)) {
        const factionId = playerFaction as FactionId;
        const tags = getBranchTagsActive(gameState, factionId, eventCatalog);
        if (tags.length > 0) {
            // Identify the foundational event (R1/B1/H1 family) the player
            // resolved, if recorded in the decision log. We surface the
            // chosen-option label as the hero value when available.
            const foundationalInfo = pickFoundationalChoice(
                gameState,
                factionId,
                eventCatalog,
            );
            const tagsList = tags.slice(0, 5);
            slides.push({
                id: 'foundational_choice',
                title: 'Foundational Choice',
                subtitle: foundationalInfo
                    ? `${playerFactionLabel} chose: ${foundationalInfo.optionLabel}`
                    : `${playerFactionLabel} branch tags activated`,
                heroValue: String(tags.length),
                heroLabel: tags.length === 1 ? 'branch tag activated' : 'branch tags activated',
                detail: foundationalInfo?.sourceNote,
                bullets: tagsList,
                data: {
                    faction: playerFaction,
                    tags: tags.slice(),
                    foundational_event_id: foundationalInfo?.eventId ?? null,
                    chosen_option_id: foundationalInfo?.optionId ?? null,
                },
            });
        }
    }

    // --- Slide F2: your_divergences ---
    const divergences = getCounterfactualDivergencePoints(gameState, eventCatalog);
    if (divergences.length > 0) {
        const topDivergences = divergences.slice(0, 5);
        const bullets = topDivergences.map((d) => {
            const def = eventCatalog.get(d.event_id);
            const title = resolveEventDisplayTitle(def, d.event_id);
            const chosenOption = resolveResponseDisplayLabel(def, d.chosen_option, 'Chosen response');
            const historicalDefault = resolveResponseDisplayLabel(def, d.historical_default, 'Historical response');
            return `T${d.turn} ${title}: ${chosenOption} (history: ${historicalDefault})`;
        });
        slides.push({
            id: 'your_divergences',
            title: 'You Defied History',
            subtitle:
                divergences.length === 1
                    ? 'One decision broke from the historical path'
                    : `${divergences.length} decisions broke from the historical path`,
            heroValue: String(divergences.length),
            heroLabel: divergences.length === 1 ? 'counterfactual divergence' : 'counterfactual divergences',
            detail: divergences.length > bullets.length
                ? `Showing top ${bullets.length} of ${divergences.length}`
                : undefined,
            bullets,
            data: {
                divergence_count: divergences.length,
                divergences: divergences.slice(),
            },
        });
    }

    // --- Slide F3: causal_chain_summary ---
    const summary = getEventChainSummary(gameState, eventCatalog);
    const hasSignal =
        summary.foundational_count > 0 ||
        summary.downstream_fired_count > 0 ||
        summary.closed_count > 0 ||
        summary.max_depth > 0 ||
        summary.player_divergence_count > 0;
    if (hasSignal) {
        const totalReshaped = summary.foundational_count + summary.downstream_fired_count;
        slides.push({
            id: 'causal_chain_summary',
            title: 'Your Decisions Reshaped The War',
            subtitle:
                totalReshaped > 0
                    ? `${totalReshaped} events fired in your causal chain`
                    : 'The causal substrate persisted your choices',
            heroValue: String(summary.max_depth),
            heroLabel: summary.max_depth === 1 ? 'turn of chain depth' : 'turns of chain depth',
            detail: `${summary.foundational_count} foundational | ${summary.downstream_fired_count} downstream | ${summary.closed_count} closed`,
            bullets: [
                `Foundational events fired: ${summary.foundational_count}`,
                `Downstream events fired: ${summary.downstream_fired_count}`,
                `Events foreclosed: ${summary.closed_count}`,
                `Player divergences: ${summary.player_divergence_count}`,
                `Max chain depth: ${summary.max_depth}`,
            ],
            data: { ...summary },
        });
    }

    return slides;
}

/**
 * Helper: find the chosen foundational option for `faction` from the decision
 * log. Foundational events are the R1/B1/H1 family roots — identified by
 * scanning `state.military.event_decision_log` for player-source decisions
 * tagged to a foundational event in the catalog. We classify "foundational"
 * structurally: an event with `historical_default_response_id` and a
 * non-empty `sets_flags` payload on at least one response option that
 * matches the faction prefix. First match wins (turn-ascending).
 *
 * Returns null when no foundational decision was recorded for the faction.
 */
function pickFoundationalChoice(
    state: GameState,
    faction: FactionId,
    eventCatalog: ReadonlyMap<string, EventDefinition>,
): { eventId: string; optionId: string; optionLabel: string; sourceNote?: string } | null {
    const decisionLog = state.military?.event_decision_log ?? [];
    if (decisionLog.length === 0) return null;
    const prefix = faction.toLowerCase() + '_';
    // Filter to player-source decisions for the faction, then sort by turn
    // ascending so we surface the earliest foundational choice.
    const playerDecisions = decisionLog
        .filter((d) => d.decision_source === 'player' && d.faction === faction)
        .slice()
        .sort((a, b) => a.turn - b.turn);
    for (const dec of playerDecisions) {
        const def = eventCatalog.get(dec.event_id);
        if (!def) continue;
        if (typeof def.historical_default_response_id !== 'string') continue;
        const option = (def.response_options ?? []).find((o) => o.id === dec.response_id);
        if (!option) continue;
        const sets = option.sets_flags;
        if (!sets) continue;
        let hasFactionFlag = false;
        for (const key of Object.keys(sets)) {
            if (key.startsWith(prefix)) {
                hasFactionFlag = true;
                break;
            }
        }
        if (!hasFactionFlag) continue;
        return {
            eventId: dec.event_id,
            optionId: option.id,
            optionLabel: resolveResponseDisplayLabel(def, option.id, 'Foundational response'),
            sourceNote: def.source_note,
        };
    }
    return null;
}
