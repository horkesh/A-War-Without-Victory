import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    CounterOffer,
    CounterOfferFaction,
    NegotiationDelta,
    NegotiationState,
    PeacePlanDefinition,
} from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPeacePlanById } from './peace_plan_data.js';
import type { HistoricalCounterOfferEnvelope } from './historical_envelopes.js';
import { getCounterOfferEnvelopeForPlan } from './historical_envelopes.js';

const COUNTER_FACTIONS: readonly CounterOfferFaction[] = ['HRHB', 'RBiH', 'RS'];
const CHAIN_DEPTH_CAP = 2;

export interface CounterOfferResolutionReport {
    created_counter_offer_ids: string[];
}

type ParentOffer = PeacePlanDefinition | {
    id?: string;
    plan_id?: string;
    parent_offer_id?: string;
    chain_depth?: number;
    proposed_split?: Record<string, number>;
    institutional_model?: string;
};

export interface PlayerCounterOfferPayload {
    parentOfferId: string;
    planId: string;
    response: 'conditional_accept' | 'counter';
    proposedSplit: Record<CounterOfferFaction, number>;
    rider?: string;
}

function ensureNegotiationState(state: GameState): NegotiationState {
    if (!state.military.negotiation) {
        state.military.negotiation = {
            capital: {},
            patron_relationships: {},
            peace_plan_history: [],
            pending_counter_offers: [],
        };
    }
    if (!Array.isArray(state.military.negotiation.pending_counter_offers)) {
        state.military.negotiation.pending_counter_offers = [];
    }
    state.military.negotiation.pending_counter_offers = sortCounterOffers(state.military.negotiation.pending_counter_offers);
    return state.military.negotiation;
}

function ensureNegotiationStatus(state: GameState): NonNullable<GameState['political']['negotiation_status']> {
    if (!state.political.negotiation_status) {
        state.political.negotiation_status = {
            ceasefire_active: false,
            ceasefire_since_turn: null,
            last_offer_turn: null,
            last_counter_turn: {},
        };
    }
    if (!state.political.negotiation_status.last_counter_turn) {
        state.political.negotiation_status.last_counter_turn = {};
    }
    return state.political.negotiation_status;
}

function parentPlanId(parent: ParentOffer): string {
    const explicitPlanId = 'plan_id' in parent ? parent.plan_id : undefined;
    return String(explicitPlanId ?? parent.id ?? '');
}

function parentOfferId(parent: ParentOffer): string {
    const parentOffer = 'parent_offer_id' in parent ? parent.parent_offer_id : undefined;
    const explicitPlanId = 'plan_id' in parent ? parent.plan_id : undefined;
    return String(parent.id ?? parentOffer ?? explicitPlanId ?? '');
}

function parentChainDepth(parent: ParentOffer): number {
    const chainDepth = 'chain_depth' in parent ? parent.chain_depth : undefined;
    return Number.isInteger(chainDepth) ? Number(chainDepth) : 0;
}

function nextCounterId(existing: readonly CounterOffer[], author: CounterOffer['author']): string {
    const prefix = `${author}_`;
    let maxSeen = 0;
    for (const offer of existing) {
        if (!offer.id.startsWith(prefix)) continue;
        const suffix = Number.parseInt(offer.id.slice(prefix.length), 10);
        if (Number.isInteger(suffix) && suffix > maxSeen) maxSeen = suffix;
    }
    return `${author}_${String(maxSeen + 1).padStart(3, '0')}`;
}

function cloneSplit(split: Record<CounterOfferFaction, number>): Record<CounterOfferFaction, number> {
    return {
        RBiH: split.RBiH,
        RS: split.RS,
        HRHB: split.HRHB,
    };
}

function buildDelta(
    planId: string,
    faction: CounterOfferFaction,
    envelope: HistoricalCounterOfferEnvelope,
): NegotiationDelta | null {
    const factionEnvelope = envelope.delta_bounds_per_faction[faction];
    if (!factionEnvelope?.counter_legal) return null;
    return {
        plan_id: planId,
        response: factionEnvelope.response,
        proposed_split: cloneSplit(factionEnvelope.proposed_split),
        institutional_model: factionEnvelope.institutional_model,
        rider: factionEnvelope.rider,
        source_citation: factionEnvelope.source_citation,
    };
}

export function sortCounterOffers(offers: readonly CounterOffer[]): CounterOffer[] {
    return [...offers].sort((a, b) => strictCompare(a.id, b.id));
}

export function generateCounterOffer(
    state: GameState,
    faction: CounterOfferFaction,
    parent: ParentOffer,
    envelope: HistoricalCounterOfferEnvelope | null,
): CounterOffer | null {
    if (!envelope) return null;
    const planId = parentPlanId(parent);
    if (!planId || envelope.plan_id !== planId) return null;
    const depth = parentChainDepth(parent) + 1;
    if (depth > CHAIN_DEPTH_CAP) return null;

    const status = ensureNegotiationStatus(state);
    if (status.last_counter_turn?.[faction] === state.meta.turn) return null;

    const delta = buildDelta(planId, faction, envelope);
    if (!delta) return null;

    const existing = state.military.negotiation?.pending_counter_offers ?? [];
    return {
        id: nextCounterId(existing, faction),
        author: faction,
        parent_offer_id: parentOfferId(parent),
        delta,
        chain_depth: depth,
        created_turn: state.meta.turn,
    };
}

function pendingParentOffer(state: GameState): ParentOffer | null {
    const pending = state.military.negotiation?.pending_peace_plan;
    if (!pending?.plan_id) return null;
    return getPeacePlanById(pending.plan_id) ?? null;
}

export function resolveCounterOffers(state: GameState): CounterOfferResolutionReport {
    if (state.meta.phase !== 'war' || state.meta.game_over) {
        return { created_counter_offer_ids: [] };
    }
    const neg = ensureNegotiationState(state);
    const status = ensureNegotiationStatus(state);
    const parent = pendingParentOffer(state);
    if (!parent) return { created_counter_offer_ids: [] };

    const planId = parentPlanId(parent);
    const envelope = getCounterOfferEnvelopeForPlan(planId);
    if (!envelope) return { created_counter_offer_ids: [] };

    const playerFaction = state.meta.player_faction ?? 'RBiH';
    const created: CounterOffer[] = [];
    const lastCounterTurn = status.last_counter_turn ?? (status.last_counter_turn = {});
    for (const faction of COUNTER_FACTIONS) {
        if (faction === playerFaction) continue;
        const counter = generateCounterOffer(state, faction, parent, envelope);
        if (!counter) continue;
        created.push(counter);
        lastCounterTurn[faction] = state.meta.turn;
        neg.pending_counter_offers = sortCounterOffers([...(neg.pending_counter_offers ?? []), counter]);
    }

    return {
        created_counter_offer_ids: sortCounterOffers(created).map((offer) => offer.id),
    };
}

export function submitPlayerCounterOffer(state: GameState, payload: PlayerCounterOfferPayload): CounterOffer {
    const neg = ensureNegotiationState(state);
    const status = ensureNegotiationStatus(state);
    const playerFaction = state.meta.player_faction ?? 'RBiH';
    const faction = COUNTER_FACTIONS.includes(playerFaction as CounterOfferFaction)
        ? playerFaction as CounterOfferFaction
        : 'RBiH';
    if (status.last_counter_turn?.[faction] === state.meta.turn) {
        throw new Error(`Faction ${faction} already submitted a counter-offer on turn ${state.meta.turn}`);
    }
    const envelope = getCounterOfferEnvelopeForPlan(payload.planId);
    if (!envelope) {
        throw new Error(`No cited counter-offer envelope for plan ${payload.planId}`);
    }
    const factionEnvelope = envelope.delta_bounds_per_faction[faction];
    if (!factionEnvelope?.counter_legal) {
        throw new Error(`Faction ${faction} has no cited counter-offer envelope for plan ${payload.planId}`);
    }
    const delta: NegotiationDelta = {
        plan_id: payload.planId,
        response: payload.response,
        proposed_split: cloneSplit(payload.proposedSplit),
        institutional_model: factionEnvelope.institutional_model,
        rider: payload.rider ?? factionEnvelope.rider,
        source_citation: factionEnvelope.source_citation,
    };
    const offer: CounterOffer = {
        id: nextCounterId(neg.pending_counter_offers ?? [], 'PLAYER'),
        author: 'PLAYER',
        parent_offer_id: payload.parentOfferId,
        delta,
        chain_depth: 1,
        created_turn: state.meta.turn,
    };
    neg.pending_counter_offers = sortCounterOffers([...(neg.pending_counter_offers ?? []), offer]);
    const lastCounterTurn = status.last_counter_turn ?? (status.last_counter_turn = {});
    lastCounterTurn[faction] = state.meta.turn;
    return offer;
}

export function isCounterOfferFaction(value: FactionId): value is CounterOfferFaction {
    return COUNTER_FACTIONS.includes(value as CounterOfferFaction);
}
