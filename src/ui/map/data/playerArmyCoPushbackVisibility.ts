/**
 * Player-scoped Army CO pushback visibility read-model projection.
 *
 * UI-2 Decision Room Pushback Explanations (Batch 41). Reads the already-
 * derived pushback signals that the adapter exposes on `LoadedGameState`
 * (`pendingOfficerEvents` of type order_pushback / order_refused /
 * order_modified / order_exceeded / army_directive_pushback /
 * army_co_proposes_op plus the optional `armyCoDecisionTraces` pass-through)
 * and condenses them into a compact projection the Decision Room can
 * surface without inventing new simulation authority.
 *
 * Ownership: singular consumer-side projection. The engine and the
 * adapter remain the source of pushback truth; the canonical pushback
 * surfaces are `ArmyCoPushbackPanel` (mounted in Pre-Advance Command
 * Review) and `OrderInterpretationPanel` (mounted in Army HQ Decision
 * Room area). This module only re-shapes the already player-faction-
 * filtered slices into a presentation-ready signal card.
 *
 * Determinism: pure over the inputs, no Math.random / Date.now. Iterates
 * in sorted id / faction order.
 *
 * Player safety: only reads the player faction's own pending officer
 * events and trace slice; enemy pushback signals are never surfaced.
 */
import type { LoadedGameState } from './types.js';
import { t } from '../i18n/index.js';

export type PlayerPushbackSeverity = 'blocking' | 'warning' | 'info';

export interface PlayerArmyCoPushbackView {
    playerFaction: string;
    hasSignal: boolean;
    refusedCount: number;
    pushbackCount: number;
    modifiedCount: number;
    autonomousProposalCount: number;
    traceObjectionCount: number;
    severity: PlayerPushbackSeverity;
    headline: string;
    rationale: string;
    evidence: string[];
}

interface TraceLike {
    turn: number;
    campaign_role: string;
    rationale: string;
}

type LooseLGS = LoadedGameState & {
    armyCoDecisionTraces?: Record<string, TraceLike[]>;
    military?: { army_co_decision_traces?: Record<string, TraceLike[]> };
};
type PendingOfficerEventType = NonNullable<LoadedGameState['pendingOfficerEvents']>[number]['type'];

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function isObjectionRationale(rationale: string | undefined): boolean {
    if (!rationale) return false;
    const r = rationale.toLowerCase();
    return (
        r.includes('pushes back') ||
        r.includes('untenable') ||
        r.includes('asks for an override') ||
        r.includes('partial') ||
        r.includes('refused')
    );
}

function isRefusalRationale(rationale: string | undefined): boolean {
    if (!rationale) return false;
    const r = rationale.toLowerCase();
    return r.includes('refused') || r.includes('refuses');
}

function readPlayerTraces(state: LooseLGS, playerFaction: string): TraceLike[] {
    const traces =
        state.armyCoDecisionTraces ??
        state.military?.army_co_decision_traces ??
        null;
    if (!traces) return [];
    const arr = traces[playerFaction];
    return Array.isArray(arr) ? arr : [];
}

function isCommandPushbackEvent(type: PendingOfficerEventType): boolean {
    return type === 'order_refused'
        || type === 'order_pushback'
        || type === 'order_modified'
        || type === 'order_exceeded'
        || type === 'army_directive_pushback'
        || type === 'army_co_proposes_op';
}

export function buildPlayerArmyCoPushbackVisibility(
    state: LoadedGameState | null,
): PlayerArmyCoPushbackView | null {
    if (!state) return null;
    const playerFaction = state.player_faction ?? null;
    if (!playerFaction) return null;

    const lgs = state as LooseLGS;

    const events = [...(state.pendingOfficerEvents ?? [])]
        .filter((e) => e.faction === playerFaction && !e.acknowledged)
        .sort((a, b) => strictCompare(a.event_id, b.event_id));

    let refusedCount = 0;
    let pushbackCount = 0;
    let modifiedCount = 0;
    let autonomousProposalCount = 0;

    const evidence: string[] = [];
    const reasons: string[] = [];
    let primaryReason: string | null = null;

    for (const ev of events) {
        if (ev.type === 'order_refused') {
            refusedCount++;
            if (ev.reason && primaryReason === null) primaryReason = ev.reason;
        } else if (ev.type === 'order_pushback' || ev.type === 'army_directive_pushback') {
            pushbackCount++;
            if (ev.reason && primaryReason === null) primaryReason = ev.reason;
        } else if (ev.type === 'order_modified' || ev.type === 'order_exceeded') {
            modifiedCount++;
            if (ev.reason && primaryReason === null) primaryReason = ev.reason;
        } else if (ev.type === 'army_co_proposes_op') {
            autonomousProposalCount++;
            if (ev.reason && primaryReason === null) primaryReason = ev.reason;
        }
        if (isCommandPushbackEvent(ev.type) && ev.reason) {
            if (reasons.length < 3) reasons.push(ev.reason);
        }
    }

    const traces = readPlayerTraces(lgs, playerFaction);
    let traceObjectionCount = 0;
    let traceRefusal = false;
    let lastTraceRationale: string | null = null;
    let lastTraceRole: string | null = null;
    for (const trace of traces) {
        if (!isObjectionRationale(trace.rationale)) continue;
        traceObjectionCount++;
        if (isRefusalRationale(trace.rationale)) traceRefusal = true;
        lastTraceRationale = trace.rationale;
        lastTraceRole = trace.campaign_role;
    }

    const hasSignal =
        refusedCount > 0 ||
        pushbackCount > 0 ||
        modifiedCount > 0 ||
        autonomousProposalCount > 0 ||
        traceObjectionCount > 0;

    if (!hasSignal) {
        return {
            playerFaction,
            hasSignal: false,
            refusedCount: 0,
            pushbackCount: 0,
            modifiedCount: 0,
            autonomousProposalCount: 0,
            traceObjectionCount: 0,
            severity: 'info',
            headline: t('decisionRoom.card.pushback.headline.none'),
            rationale: '',
            evidence: [],
        };
    }

    const severity: PlayerPushbackSeverity =
        refusedCount > 0 || traceRefusal
            ? 'blocking'
            : pushbackCount > 0 || autonomousProposalCount > 0 || traceObjectionCount > 0
                ? 'warning'
                : 'info';

    if (refusedCount > 0) {
        evidence.push(t(refusedCount === 1
            ? 'decisionRoom.card.pushback.evidence.refused.one'
            : 'decisionRoom.card.pushback.evidence.refused.many', { count: refusedCount }));
    }
    if (pushbackCount > 0) {
        evidence.push(t(pushbackCount === 1
            ? 'decisionRoom.card.pushback.evidence.pushback.one'
            : 'decisionRoom.card.pushback.evidence.pushback.many', { count: pushbackCount }));
    }
    if (modifiedCount > 0) {
        evidence.push(t(modifiedCount === 1
            ? 'decisionRoom.card.pushback.evidence.modified.one'
            : 'decisionRoom.card.pushback.evidence.modified.many', { count: modifiedCount }));
    }
    if (autonomousProposalCount > 0) {
        evidence.push(t(autonomousProposalCount === 1
            ? 'decisionRoom.card.pushback.evidence.autonomous.one'
            : 'decisionRoom.card.pushback.evidence.autonomous.many', { count: autonomousProposalCount }));
    }
    if (traceObjectionCount > 0) {
        const role = lastTraceRole ? ` (${lastTraceRole})` : '';
        evidence.push(t(traceObjectionCount === 1
            ? 'decisionRoom.card.pushback.evidence.trace.one'
            : 'decisionRoom.card.pushback.evidence.trace.many', { count: traceObjectionCount, role }));
    }

    const proposalOnly =
        autonomousProposalCount > 0 &&
        refusedCount === 0 &&
        pushbackCount === 0 &&
        modifiedCount === 0 &&
        traceObjectionCount === 0;

    const headline =
        proposalOnly
            ? t('decisionRoom.card.pushback.headline.proposal')
        : severity === 'blocking'
            ? t('decisionRoom.card.pushback.headline.refused')
            : t('decisionRoom.card.pushback.headline.pushback');

    const rationale = primaryReason ?? lastTraceRationale ?? (
        proposalOnly
            ? t('decisionRoom.card.pushback.rationale.proposal')
        : severity === 'blocking'
            ? t('decisionRoom.card.pushback.rationale.refused')
            : t('decisionRoom.card.pushback.rationale.pushback')
    );

    if (reasons.length === 0 && lastTraceRationale) {
        evidence.push(lastTraceRationale);
    }

    return {
        playerFaction,
        hasSignal: true,
        refusedCount,
        pushbackCount,
        modifiedCount,
        autonomousProposalCount,
        traceObjectionCount,
        severity,
        headline,
        rationale,
        evidence,
    };
}
