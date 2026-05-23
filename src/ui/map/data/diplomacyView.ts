import {
    formatIvpConsequenceLabel,
    getIvpComponentContributions,
    ivpComponentLabel,
    sortIvpConsequenceIds,
    type IvpBreakdownInput,
    type IvpComponentKey,
} from '../../../state/patron_pressure.js';
import { getPeacePlanById } from '../../../sim/negotiation/peace_plan_data.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type {
    DiplomacyActorView,
    DiplomacyNeedleHintView,
    DiplomacyPressureReasonView,
    DiplomacyProposalView,
    DiplomacyTimelineEntryView,
    DiplomacyView,
    PlayerKnowledgeConfidence,
} from './types';

const PATRON_LABELS: Record<string, string> = {
    serbia: 'Serbia',
    croatia: 'Croatia',
    international_community: 'International Community',
};

const FACTION_PATRON: Record<string, string> = {
    RS: 'serbia',
    HRHB: 'croatia',
    RBiH: 'international_community',
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

function buildActor(state: any, faction: string, relationship: Record<string, any> | undefined): DiplomacyActorView {
    const patronState = getFactionPatronState(state, faction);
    const patronId = String(relationship?.patron_id ?? FACTION_PATRON[faction] ?? 'international_community');
    const support = typeof relationship?.support_level === 'number'
        ? relationship.support_level
        : percentFromRatio(patronState?.material_support_level);
    const constraint = percentFromRatio(patronState?.constraint_severity);
    const isolation = percentFromRatio(patronState?.diplomatic_isolation);
    const commitment = percentFromRatio(patronState?.patron_commitment);
    return {
        faction,
        patronId,
        patronLabel: PATRON_LABELS[patronId] ?? patronId,
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
        events: Array.isArray(relationship?.relationship_events)
            ? relationship.relationship_events.filter((event: unknown): event is string => typeof event === 'string').sort(strictCompare)
            : [],
    };
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
            statusLabel: 'Menu prepared',
            detail: `${territorialCount} territorial and ${institutionalCount} institutional items ready for review.`,
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
            statusLabel: 'Awaiting presidential response',
            detail: def?.narrative ?? 'International mediators have tabled a proposal.',
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
    }));
}

function buildNegotiationTimeline(
    activeProposals: DiplomacyProposalView[],
    externalActors: DiplomacyActorView[],
    activeConsequences: DiplomacyView['activeConsequences'],
): DiplomacyTimelineEntryView[] {
    const proposalEntries: DiplomacyTimelineEntryView[] = activeProposals.map((proposal) => ({
        id: `proposal:${proposal.id}`,
        label: proposal.name,
        detail: proposal.statusLabel,
        turn: proposal.turnOffered,
        confidence: proposal.confidence,
    }));
    const relationshipEntries: DiplomacyTimelineEntryView[] = externalActors.flatMap((actor) => actor.events.map((event) => ({
        id: `patron:${actor.faction}:${event}`,
        label: `${actor.patronLabel}: ${event.replace(/_/g, ' ')}`,
        detail: `${actor.faction} channel relationship signal.`,
        turn: undefined,
        confidence: 'likely' as const,
    })));
    const consequenceEntries: DiplomacyTimelineEntryView[] = activeConsequences.map((item) => ({
        id: `consequence:${item.id}`,
        label: item.label,
        detail: 'Active international-pressure consequence.',
        turn: undefined,
        confidence: 'known' as const,
    }));

    return [...proposalEntries, ...relationshipEntries, ...consequenceEntries]
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
            detail: `${patronStance.patronLabel} pressure is ${patronStance.constraintBand}; staff expects less room for independent bargaining until that channel softens.`,
            confidence: 'likely',
        });
    }
    for (const reason of pressureReasons.filter((entry) => entry.band === 'high' || entry.band === 'medium').slice(0, 3)) {
        hints.push({
            id: `pressure:${reason.key}`,
            label: `Reduce ${reason.label}`,
            detail: `${reason.label} is ${reason.band}; this is one of the visible signals shaping external pressure.`,
            confidence: reason.confidence,
        });
    }
    if (activeProposals.length > 0) {
        hints.push({
            id: 'proposal-resolution',
            label: 'Resolve the active proposal packet',
            detail: `${activeProposals.length} proposal surface${activeProposals.length === 1 ? ' is' : 's are'} awaiting review; leaving it open keeps the diplomatic agenda unresolved.`,
            confidence: 'known',
        });
    }
    return hints.sort((a, b) => strictCompare(a.label, b.label) || strictCompare(a.id, b.id));
}

export function buildDiplomacyView(state: unknown, playerFaction?: string | null): DiplomacyView {
    const s = asRecord(state) ?? {};
    const externalActors = buildExternalActors(s);
    const actorFaction = playerFaction ?? (typeof s.meta?.player_faction === 'string' ? s.meta.player_faction : null);
    const patronStance = actorFaction
        ? externalActors.find((actor) => actor.faction === actorFaction)
        : undefined;
    const activeProposals = buildActiveProposals(s);
    const pressureReasons = buildPressureReasons(s);
    const activeConsequences = buildConsequences(s);
    const negotiationTimeline = buildNegotiationTimeline(activeProposals, externalActors, activeConsequences);
    const needleHints = buildNeedleHints(patronStance, pressureReasons, activeProposals);

    return {
        playerFaction: actorFaction ?? null,
        hasSignals: Boolean(patronStance)
            || activeProposals.length > 0
            || externalActors.length > 0
            || pressureReasons.length > 0
            || activeConsequences.length > 0,
        patronStance,
        activeProposals,
        externalActors,
        pressureReasons,
        activeConsequences,
        negotiationTimeline,
        needleHints,
    };
}
