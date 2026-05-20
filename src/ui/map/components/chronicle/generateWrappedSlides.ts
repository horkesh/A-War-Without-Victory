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

function getFactionDisplayLabel(faction: string | undefined): string {
    if (!faction) return 'Unknown';
    return PLAYER_FACTION_LABELS[faction] ?? faction;
}

/**
 * Pure analysis function: reads adapted game state and produces 10 slides
 * summarizing the player's war for the "Chronicle Wrapped" presentation.
 * Always returns exactly 10 slides. All state access is defensive.
 */
export function generateWrappedSlides(state: any): WrappedSlide[] {
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

    return slides;
}
