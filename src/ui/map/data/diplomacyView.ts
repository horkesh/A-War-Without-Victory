import {
    formatIvpConsequenceLabel,
    getIvpComponentContributions,
    ivpComponentLabel,
    sortIvpConsequenceIds,
    type IvpBreakdownInput,
    type IvpComponentKey,
} from '../../../state/patron_pressure.js';
import { getPeacePlanById } from '../../../sim/negotiation/peace_plan_data.js';
import { getDimensionEffective, type DimensionStore } from '../../../sim/events/strategic_dimensions.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { getPlayerSafeMilitaryFactionName, getPlayerSafeDisplayLabel } from '../utils/playerSafeText';
import type {
    DiplomacyActorView,
    LocalizedCopyToken,
    DiplomacyNeedleHintView,
    DiplomacyPressureReasonView,
    DiplomacyProposalView,
    DiplomacyTimelineEntryView,
    DiplomacyView,
    PatronConfidenceView,
    PatronDefianceCutsView,
    PlayerKnowledgeConfidence,
} from './types';

const PATRON_LABELS: Record<string, string> = {
    serbia: 'Serbia',
    croatia: 'Croatia',
    international_community: 'International Community',
};

const PATRON_LABEL_KEYS: Record<string, string> = {
    serbia: 'diplomacy.patron.serbia',
    croatia: 'diplomacy.patron.croatia',
    international_community: 'diplomacy.patron.internationalCommunity',
};

const FACTION_PATRON: Record<string, string> = {
    RS: 'serbia',
    HRHB: 'croatia',
    RBiH: 'international_community',
};

const PRESSURE_REASON_LABEL_KEYS: Record<string, string> = {
    atrocity_visibility: 'diplomacy.pressureReason.atrocityVisibility',
    enclave_humanitarian_pressure: 'diplomacy.pressureReason.enclaveHumanitarianPressure',
    sarajevo_siege_visibility: 'diplomacy.pressureReason.sarajevoSiegeVisibility',
    negotiation_momentum: 'diplomacy.pressureReason.negotiationMomentum',
};

const RELATIONSHIP_EVENT_LABEL_KEYS: Record<string, string> = {
    belgrade_border_pressure: 'diplomacy.relationshipEvent.belgradeBorderPressure',
};

const CONSEQUENCE_LABEL_KEYS: Record<string, string> = {
    international_sanctions: 'diplomacy.consequence.internationalSanctions',
    drina_blockade: 'diplomacy.consequence.drinaBlockade',
};

function asRecord(value: unknown): Record<string, any> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : undefined;
}

function finiteNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function percentFromRatio(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.max(0, Math.min(100, value * 100));
}

function qualitativeBand(value: number | undefined, bands: readonly [number, string][], fallback: string): string {
    if (value == null || !Number.isFinite(value)) return fallback;
    for (const [floor, label] of bands) {
        if (value >= floor) return label;
    }
    return fallback;
}

function supportBand(value: number | undefined): DiplomacyActorView['supportBand'] {
    return qualitativeBand(value, [
        [70, 'strong'],
        [45, 'steady'],
        [20, 'strained'],
    ], 'limited') as DiplomacyActorView['supportBand'];
}

function pressureBand(value: number | undefined): DiplomacyPressureReasonView['band'] {
    return qualitativeBand(value, [
        [0.67, 'high'],
        [0.34, 'medium'],
        [0.01, 'low'],
    ], 'quiet') as DiplomacyPressureReasonView['band'];
}

function actorPressureBand(value: number | undefined): DiplomacyActorView['constraintBand'] {
    return qualitativeBand(value, [
        [67, 'high'],
        [34, 'elevated'],
        [1, 'limited'],
    ], 'quiet') as DiplomacyActorView['constraintBand'];
}

function confidenceFromValue(value: number | undefined): PlayerKnowledgeConfidence {
    if (value == null) return 'uncertain';
    if (value >= 0.67) return 'likely';
    if (value >= 0.34) return 'uncertain';
    return 'known';
}

function getFactionPatronState(state: any, factionId: string): Record<string, any> | undefined {
    const factions = Array.isArray(state?.factions) ? state.factions : [];
    const faction = factions.find((entry: any) => entry?.id === factionId);
    return asRecord(faction?.patron_state);
}

function actorStanceSummary(actor: Pick<DiplomacyActorView, 'faction' | 'patronLabel' | 'supportBand' | 'constraintBand' | 'commitmentBand' | 'isolationBand' | 'sanctionsActive'>): string {
    const forceLabel = getPlayerSafeMilitaryFactionName(actor.faction);
    if (actor.sanctionsActive) {
        return `${actor.patronLabel} is constrained by sanctions and keeps the ${forceLabel} channel under pressure.`;
    }
    if (actor.constraintBand === 'high' || actor.constraintBand === 'elevated') {
        return `${actor.patronLabel} support is ${actor.supportBand}, but constraint is ${actor.constraintBand}; expect limited room for independent bargaining.`;
    }
    if (actor.supportBand === 'strong' && actor.commitmentBand === 'likely') {
        return `${actor.patronLabel} support is strong and commitment appears likely.`;
    }
    if (actor.isolationBand === 'high' || actor.isolationBand === 'elevated') {
        return `${actor.patronLabel} channel is diplomatically isolated; outside pressure can bite quickly.`;
    }
    return `${actor.patronLabel} channel is quiet; staff sees no dominant external pressure signal.`;
}

function actorStanceSummaryToken(actor: Pick<DiplomacyActorView, 'faction' | 'supportBand' | 'constraintBand' | 'commitmentBand' | 'isolationBand' | 'sanctionsActive'>): LocalizedCopyToken {
    const forceLabel = getPlayerSafeMilitaryFactionName(actor.faction);
    if (actor.sanctionsActive) {
        return { key: 'diplomacy.actor.summary.sanctions', params: { force: forceLabel } };
    }
    if (actor.constraintBand === 'high' || actor.constraintBand === 'elevated') {
        return { key: 'diplomacy.actor.summary.constrained' };
    }
    if (actor.supportBand === 'strong' && actor.commitmentBand === 'likely') {
        return { key: 'diplomacy.actor.summary.strong' };
    }
    if (actor.isolationBand === 'high' || actor.isolationBand === 'elevated') {
        return { key: 'diplomacy.actor.summary.isolated' };
    }
    return { key: 'diplomacy.actor.summary.quiet' };
}

function buildActor(state: any, faction: string, relationship: Record<string, any> | undefined): DiplomacyActorView {
    const patronState = getFactionPatronState(state, faction);
    const patronId = String(relationship?.patron_id ?? FACTION_PATRON[faction] ?? 'international_community');
    const support = typeof relationship?.support_level === 'number'
        ? relationship.support_level
        : percentFromRatio(patronState?.material_support_level);
    const constraint = percentFromRatio(patronState?.constraint_severity);
    const isolation = percentFromRatio(patronState?.diplomatic_isolation);
    const commitment = percentFromRatio(patronState?.patron_commitment);
    const actor: DiplomacyActorView = {
        faction,
        patronId,
        patronLabel: PATRON_LABELS[patronId] ?? patronId,
        patronLabelToken: PATRON_LABEL_KEYS[patronId] ? { key: PATRON_LABEL_KEYS[patronId] } : undefined,
        supportBand: supportBand(support),
        constraintBand: actorPressureBand(
            typeof relationship?.override_authority === 'number'
                ? Math.max(finiteNumber(relationship.override_authority), finiteNumber(constraint))
                : constraint,
        ),
        commitmentBand: qualitativeBand(commitment, [
            [67, 'likely'],
            [34, 'uncertain'],
            [1, 'limited'],
        ], 'unknown') as DiplomacyActorView['commitmentBand'],
        isolationBand: actorPressureBand(isolation),
        sanctionsActive: Boolean(relationship?.sanctions_active),
        stanceSummary: '',
        events: Array.isArray(relationship?.relationship_events)
            ? relationship.relationship_events.filter((event: unknown): event is string => typeof event === 'string').sort(strictCompare)
            : [],
    };
    actor.stanceSummary = actorStanceSummary(actor);
    actor.stanceSummaryToken = actorStanceSummaryToken(actor);
    return actor;
}

function buildExternalActors(state: any): DiplomacyActorView[] {
    const relationships = asRecord(state?.military?.negotiation?.patron_relationships);
    const factionIds = new Set<string>();
    for (const faction of Object.keys(relationships ?? {})) factionIds.add(faction);
    for (const faction of Array.isArray(state?.factions) ? state.factions : []) {
        if (typeof faction?.id === 'string' && faction?.patron_state) factionIds.add(faction.id);
    }

    return [...factionIds]
        .sort(strictCompare)
        .map((faction) => buildActor(state, faction, asRecord(relationships?.[faction])));
}

function buildActiveProposals(state: any): DiplomacyProposalView[] {
    const negotiation = asRecord(state?.military?.negotiation);
    const proposals: DiplomacyProposalView[] = [];
    const pendingDayton = asRecord(negotiation?.pending_dayton);
    if (pendingDayton && !negotiation?.dayton_result) {
        const territorialCount = Array.isArray(pendingDayton.territorial_packages) ? pendingDayton.territorial_packages.length : 0;
        const institutionalCount = Array.isArray(pendingDayton.institutional_packages) ? pendingDayton.institutional_packages.length : 0;
        proposals.push({
            id: 'dayton:pending',
            kind: 'dayton',
            name: 'Dayton negotiation menu',
            nameToken: { key: 'diplomacy.proposal.dayton.name' },
            statusLabel: 'Menu prepared',
            statusLabelToken: { key: 'diplomacy.proposal.dayton.status' },
            detail: `${territorialCount} territorial and ${institutionalCount} institutional items ready for review.`,
            detailToken: {
                key: 'diplomacy.proposal.dayton.detail',
                params: { territorialCount, institutionalCount },
            },
            confidence: 'known',
        });
    }

    const pendingPeacePlan = asRecord(negotiation?.pending_peace_plan);
    const planId = typeof pendingPeacePlan?.plan_id === 'string' ? pendingPeacePlan.plan_id : '';
    if (planId) {
        const def = getPeacePlanById(planId);
        const turnOffered = pendingPeacePlan && typeof pendingPeacePlan.turn_offered === 'number'
            ? pendingPeacePlan.turn_offered
            : undefined;
        proposals.push({
            id: `peace:${planId}`,
            kind: 'peace_plan',
            name: def?.name ?? 'Peace proposal',
            nameToken: def ? undefined : { key: 'diplomacy.proposal.peace.defaultName' },
            statusLabel: 'Awaiting presidential response',
            statusLabelToken: { key: 'diplomacy.proposal.peace.status' },
            detail: def?.narrative ?? 'International mediators have tabled a proposal.',
            detailToken: def ? undefined : { key: 'diplomacy.proposal.peace.defaultDetail' },
            turnOffered,
            confidence: 'known',
        });
    }

    return proposals.sort((a, b) => strictCompare(a.name, b.name) || strictCompare(a.id, b.id));
}

function buildPressureReasons(state: any): DiplomacyPressureReasonView[] {
    const ivp = asRecord(state?.political?.international_visibility_pressure) as IvpBreakdownInput | undefined;
    return getIvpComponentContributions(ivp)
        .map((entry) => ({
            key: entry.key,
            label: ivpComponentLabel(entry.key),
            labelToken: PRESSURE_REASON_LABEL_KEYS[entry.key] ? { key: PRESSURE_REASON_LABEL_KEYS[entry.key] } : undefined,
            band: pressureBand(entry.raw),
            confidence: confidenceFromValue(entry.raw),
        }))
        .filter((entry) => entry.band !== 'quiet')
        .sort((a, b) => {
            const rawA = finiteNumber(ivp?.[a.key as IvpComponentKey]);
            const rawB = finiteNumber(ivp?.[b.key as IvpComponentKey]);
            return rawB - rawA || strictCompare(a.key, b.key);
        });
}

function buildConsequences(state: any): DiplomacyView['activeConsequences'] {
    const ids = Array.isArray(state?.political?.ivp_consequences_active)
        ? state.political.ivp_consequences_active.filter((id: unknown): id is string => typeof id === 'string')
        : [];
    return sortIvpConsequenceIds(ids).map((id) => ({
        id,
        label: formatIvpConsequenceLabel(id),
        labelToken: CONSEQUENCE_LABEL_KEYS[id] ? { key: CONSEQUENCE_LABEL_KEYS[id] } : undefined,
    }));
}

function buildNegotiationTimeline(
    activeProposals: DiplomacyProposalView[],
    externalActors: DiplomacyActorView[],
    activeConsequences: DiplomacyView['activeConsequences'],
    patronDefianceCuts: PatronDefianceCutsView | undefined,
    actorFaction: string | null,
): DiplomacyTimelineEntryView[] {
    const proposalEntries: DiplomacyTimelineEntryView[] = activeProposals.map((proposal) => ({
        id: `proposal:${proposal.id}`,
        label: proposal.name,
        labelToken: proposal.nameToken,
        detail: proposal.statusLabel,
        detailToken: proposal.statusLabelToken,
        turn: proposal.turnOffered,
        confidence: proposal.confidence,
    }));
    const relationshipEntries: DiplomacyTimelineEntryView[] = externalActors.flatMap((actor) => actor.events.map((event) => ({
        id: `patron:${actor.faction}:${event}`,
        label: `${actor.patronLabel}: ${getPlayerSafeDisplayLabel(event)}`,
        labelToken: {
            key: 'diplomacy.timeline.relationshipLabel',
            params: RELATIONSHIP_EVENT_LABEL_KEYS[event] ? undefined : { event: getPlayerSafeDisplayLabel(event) },
            paramKeys: {
                ...(actor.patronLabelToken ? { patron: actor.patronLabelToken.key } : {}),
                ...(RELATIONSHIP_EVENT_LABEL_KEYS[event] ? { event: RELATIONSHIP_EVENT_LABEL_KEYS[event] } : {}),
            },
        },
        detail: `${getPlayerSafeMilitaryFactionName(actor.faction)} channel relationship signal.`,
        detailToken: {
            key: 'diplomacy.timeline.relationshipDetail',
            params: { force: getPlayerSafeMilitaryFactionName(actor.faction) },
        },
        turn: undefined,
        confidence: 'likely' as const,
    })));
    const consequenceEntries: DiplomacyTimelineEntryView[] = activeConsequences.map((item) => ({
        id: `consequence:${item.id}`,
        label: item.label,
        detail: 'Active international-pressure consequence.',
        detailToken: { key: 'diplomacy.timeline.consequenceDetail' },
        turn: undefined,
        confidence: 'known' as const,
    }));
    const patronCutEntries: DiplomacyTimelineEntryView[] = actorFaction && patronDefianceCuts?.entries
        ? patronDefianceCuts.entries.map((entry) => ({
            id: `patron-defiance:${actorFaction}:${entry.turn}:${entry.cutFraction}:${entry.supportAfter}`,
            label: `${PATRON_LABELS[FACTION_PATRON[actorFaction]] ?? 'Patron'} material support cut`,
            labelToken: {
                key: 'diplomacy.timeline.patronCutLabel',
                params: PATRON_LABEL_KEYS[FACTION_PATRON[actorFaction]]
                    ? undefined
                    : { patron: PATRON_LABELS[FACTION_PATRON[actorFaction]] ?? 'Patron' },
                paramKeys: PATRON_LABEL_KEYS[FACTION_PATRON[actorFaction]]
                    ? { patron: PATRON_LABEL_KEYS[FACTION_PATRON[actorFaction]] }
                    : undefined,
            },
            detail: `${getPlayerSafeMilitaryFactionName(actorFaction)} channel lost ${Math.round(entry.cutFraction * 100)}% of material support; support after cut ${Math.round(entry.supportAfter * 100)}%.`,
            detailToken: {
                key: 'diplomacy.timeline.patronCutDetail',
                params: {
                    force: getPlayerSafeMilitaryFactionName(actorFaction),
                    pct: Math.round(entry.cutFraction * 100),
                    support: Math.round(entry.supportAfter * 100),
                },
            },
            turn: entry.turn,
            confidence: 'known' as const,
        }))
        : [];

    return [...proposalEntries, ...relationshipEntries, ...consequenceEntries, ...patronCutEntries]
        .sort((a, b) => (a.turn ?? 9999) - (b.turn ?? 9999) || strictCompare(a.label, b.label) || strictCompare(a.id, b.id));
}

function buildNeedleHints(
    patronStance: DiplomacyActorView | undefined,
    pressureReasons: DiplomacyPressureReasonView[],
    activeProposals: DiplomacyProposalView[],
): DiplomacyNeedleHintView[] {
    const hints: DiplomacyNeedleHintView[] = [];
    if (patronStance && (patronStance.constraintBand === 'high' || patronStance.constraintBand === 'elevated')) {
        hints.push({
            id: `patron-constraint:${patronStance.faction}`,
            label: `Ease ${patronStance.patronLabel} constraint`,
            labelToken: {
                key: 'diplomacy.needle.easePatronConstraint',
                params: patronStance.patronLabelToken ? undefined : { patron: patronStance.patronLabel },
                paramKeys: patronStance.patronLabelToken ? { patron: patronStance.patronLabelToken.key } : undefined,
            },
            detail: `${patronStance.patronLabel} pressure is ${patronStance.constraintBand}; staff expects less room for independent bargaining until that channel softens.`,
            detailToken: {
                key: 'diplomacy.needle.easePatronConstraintDetail',
                params: patronStance.patronLabelToken ? undefined : { patron: patronStance.patronLabel },
                paramKeys: patronStance.patronLabelToken ? { patron: patronStance.patronLabelToken.key } : undefined,
            },
            confidence: 'likely',
        });
    }
    for (const reason of pressureReasons.filter((entry) => entry.band === 'high' || entry.band === 'medium').slice(0, 3)) {
        hints.push({
            id: `pressure:${reason.key}`,
            label: `Reduce ${reason.label}`,
            labelToken: {
                key: 'diplomacy.needle.reducePressure',
                params: reason.labelToken ? undefined : { reason: reason.label },
                paramKeys: reason.labelToken ? { reason: reason.labelToken.key } : undefined,
            },
            detail: `${reason.label} is ${reason.band}; this is one of the visible signals shaping external pressure.`,
            detailToken: {
                key: 'diplomacy.needle.reducePressureDetail',
                params: reason.labelToken ? undefined : { reason: reason.label },
                paramKeys: reason.labelToken ? { reason: reason.labelToken.key } : undefined,
            },
            confidence: reason.confidence,
        });
    }
    if (activeProposals.length > 0) {
        hints.push({
            id: 'proposal-resolution',
            label: 'Resolve the active proposal packet',
            labelToken: { key: 'diplomacy.needle.resolveProposal' },
            detail: `${activeProposals.length} proposal surface${activeProposals.length === 1 ? ' is' : 's are'} awaiting review; leaving it open keeps the diplomatic agenda unresolved.`,
            detailToken: {
                key: activeProposals.length === 1
                    ? 'diplomacy.needle.resolveProposalDetailSingle'
                    : 'diplomacy.needle.resolveProposalDetailMulti',
                params: { count: activeProposals.length },
            },
            confidence: 'known',
        });
    }
    return hints.sort((a, b) => strictCompare(a.label, b.label) || strictCompare(a.id, b.id));
}

function patronConfidenceBand(value: number): PatronConfidenceView['band'] {
    if (value >= 67) return 'high';
    if (value >= 55) return 'steady';
    if (value >= 45) return 'neutral';
    if (value >= 25) return 'low';
    return 'collapsed';
}

/**
 * Player-faction patron-confidence standing. Pure read of the
 * `patron_confidence` strategic dimension (0..100, 50 = neutral). Returns
 * undefined when the player has no faction or the dimension store is absent.
 */
function buildPatronConfidence(state: any, factionId: string | null): PatronConfidenceView | undefined {
    if (!factionId) return undefined;
    const store: DimensionStore | undefined = asRecord(state?.military?.negotiation?.strategic_dimensions);
    if (!store || !store[factionId]?.patron_confidence) return undefined;
    const value = getDimensionEffective(store, factionId, 'patron_confidence');
    return { value, band: patronConfidenceBand(value) };
}

/**
 * Compact player-faction defiance-cut summary from
 * `state.military.patron_defiance_supply_cuts` (#117). Filters to the player
 * faction; returns undefined when there are no player entries (emergent-only —
 * historical/calibration mode never writes these). Picks the most-recent cut by
 * turn (ties broken by max cut_fraction) for the headline line.
 */
function buildPatronDefianceCuts(state: any, factionId: string | null): PatronDefianceCutsView | undefined {
    if (!factionId) return undefined;
    const cuts = Array.isArray(state?.military?.patron_defiance_supply_cuts)
        ? state.military.patron_defiance_supply_cuts
        : [];
    const mine = cuts.filter((cut: any) => asRecord(cut)?.faction === factionId);
    if (mine.length === 0) return undefined;
    const entries: NonNullable<PatronDefianceCutsView['entries']> = mine.map((cut: any) => ({
        turn: finiteNumber(cut?.turn),
        cutFraction: finiteNumber(cut?.cut_fraction),
        supportAfter: finiteNumber(cut?.support_after),
    })).sort((a: NonNullable<PatronDefianceCutsView['entries']>[number], b: NonNullable<PatronDefianceCutsView['entries']>[number]) => (
        b.turn - a.turn
        || b.cutFraction - a.cutFraction
        || a.supportAfter - b.supportAfter
    ));
    const latest = entries[0]!;
    return {
        count: mine.length,
        latestCutFraction: latest.cutFraction,
        latestTurn: latest.turn,
        latestSupportAfter: latest.supportAfter,
        entries,
    };
}

export function buildDiplomacyView(state: unknown, playerFaction?: string | null): DiplomacyView {
    const s = asRecord(state) ?? {};
    const externalActors = buildExternalActors(s);
    const actorFaction = playerFaction ?? (typeof s.meta?.player_faction === 'string' ? s.meta.player_faction : null);
    const patronStance = actorFaction
        ? externalActors.find((actor) => actor.faction === actorFaction)
        : undefined;
    // The player's own patron is surfaced separately as `patronStance`; it must not
    // also appear under "Other Patrons". Filter the player faction's actor out of the
    // returned external-actor list so the current patron is never duplicated (#124).
    const otherActors = actorFaction
        ? externalActors.filter((actor) => actor.faction !== actorFaction)
        : externalActors;
    const activeProposals = buildActiveProposals(s);
    const pressureReasons = buildPressureReasons(s);
    const activeConsequences = buildConsequences(s);
    const patronConfidence = buildPatronConfidence(s, actorFaction);
    const patronDefianceCuts = buildPatronDefianceCuts(s, actorFaction);
    const negotiationTimeline = buildNegotiationTimeline(activeProposals, externalActors, activeConsequences, patronDefianceCuts, actorFaction);
    const needleHints = buildNeedleHints(patronStance, pressureReasons, activeProposals);

    return {
        playerFaction: actorFaction ?? null,
        hasSignals: Boolean(patronStance)
            || activeProposals.length > 0
            || externalActors.length > 0
            || pressureReasons.length > 0
            || activeConsequences.length > 0,
        patronStance,
        patronConfidence,
        patronDefianceCuts,
        activeProposals,
        externalActors: otherActors,
        pressureReasons,
        activeConsequences,
        negotiationTimeline,
        needleHints,
    };
}
