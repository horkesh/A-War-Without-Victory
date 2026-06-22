// Dilemma-Spine read-model — Phase 3 Thread 2 ("the dilemma spine").
//
// Foregrounds the seven keystone "impossible choice" decision events as the
// backbone of the player experience. Each dilemma row answers, deterministically:
//   - has the player FACED this dilemma yet?
//   - which BRANCH did they choose (response label, when resolvable)?
//   - on which TURN was it decided?
//   - which codex essay (if any) documents it?
//
// This extends Phase 3 Thread 1 (the `RESPONSE:<event>:<id>` atom + the
// `decisionResponses` set on LoadedGameState). It does NOT rebuild Thread 1.
//
// Design rules (mirror consequenceReceipts.ts):
//   - PURE. No state mutation. No engine calls. No Math.random / Date.now /
//     timestamps. Sorted iteration where order matters.
//   - DEFENSIVE. Flag-off / pre-substrate saves carry none of these fields;
//     every projection collapses to a not-yet-faced row.
//   - DETERMINISTIC. A pure function of already-projected UI state
//     (LoadedGameState). The static spine definition is canon-ordered.
//   - READ-ONLY. We surface dilemmas the engine already recorded — we never
//     author sensitive prose here; gated essays are linked/surfaced as-is.
//
// Sensitive-history note: the spine MENTIONS each dilemma by its authored event
// title and links to its already-committed codex essay. It introduces no new
// sensitive prose. Branch labels are the canon response-option labels already
// in the event data.

import type { LoadedGameState } from './types.js';
import { strictCompare } from '../../../state/validateGameState.js';

// Static, build-time-bundled keystone event definitions — used ONLY to resolve
// human-readable branch labels (response-option `label`) for the spine. Mirrors
// CodexPanel.tsx, which statically imports essay_index.json. We never read these
// at engine runtime; they are a pure label lookup. Importing the raw JSON keeps
// the spine in sync with canon labels (no duplicated label strings to drift).
import war1992 from '../../../../data/scenarios/events/war_1992.json';
import war1992HrhbSummer from '../../../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993 from '../../../../data/scenarios/events/war_1993.json';
import war1994 from '../../../../data/scenarios/events/war_1994.json';
import war1995 from '../../../../data/scenarios/events/war_1995.json';

/** Canonical static definition of one keystone dilemma. */
export interface DilemmaSpineDefinition {
    /** Stable id for keying/dedupe. */
    dilemmaId: string;
    /** Player-facing title of the dilemma. */
    title: string;
    /**
     * The keystone decision event id(s) whose firing / response marks this
     * dilemma as faced. Most dilemmas have one fireable event; dilemma #2
     * (Srebrenica demilitarization) additionally lists the upstream
     * future-consequence projection ids that route into it, so `faced` lights
     * up whether the player reached it via the civic or the bosniak-national
     * platform.
     */
    keystoneEventIds: string[];
    /**
     * The fireable event id whose chosen response defines the branch label /
     * decision turn for this dilemma. Always a member of `keystoneEventIds`.
     */
    decisionEventId: string;
    /** Linked codex essay id, or null when no essay documents this dilemma. */
    essayId: string | null;
    /**
     * True when the dilemma's essay/topic is sensitive-history gated. The spine
     * surfaces gated dilemmas read-only; it never authors new prose for them.
     */
    sensitive: boolean;
}

/** Projected view of one keystone dilemma against the player's run. */
export interface DilemmaSpineView {
    dilemmaId: string;
    title: string;
    essayId: string | null;
    sensitive: boolean;
    /** True once any keystone event has fired OR the player recorded a response. */
    faced: boolean;
    /** The chosen response id for the decision event (last-wins), or null. */
    chosenResponseId: string | null;
    /** Human-readable branch label (response-option label) when resolvable,
     *  else neutral player-safe copy, else null when not yet faced. */
    chosenBranchLabel: string | null;
    /** Turn the decision was recorded, or null when not yet decided. */
    decisionTurn: number | null;
}

/**
 * The canonical seven-dilemma spine, in narrative/canon order.
 *
 * Source-of-truth mapping (verified against data/scenarios/events/ and
 * data/scenarios/essays/essay_index.json):
 *   1. RS Six Strategic Goals     event rs_strategic_goals (war_1992)         essay_rs_strategic_goals          [GATED]
 *   2. Srebrenica demilitarization event srebrenica_demilitarization_1993 (war_1993)  essay_srebrenica_enclave_forms_1992 [GATED]
 *   3. Vance-Owen                  event vance_owen_plan_1993 (war_1993)       essay_vance_owen_plan_1993        [SAFE]
 *   4. Owen-Stoltenberg            event owen_stoltenberg_plan_1993 (war_1993) essay_owen_stoltenberg_plan_1993  [SAFE]
 *   5. Contact Group              event contact_group_plan_1994 (war_1994)    essay_contact_group_plan_1994     [SAFE]
 *   6. HVO alliance-vs-republic    event hrhb_political_goal (war_1992)        essay_hrhb_political_goal         [GATED]
 *   7. Karadžić–Mladić split       event karadzic_mladic_split_1995 (war_1995) (no essay)                       [SAFE]
 *
 * Dilemma #2 note: the prompt named two ids,
 * `civic_to_srebrenica_demilitarization` /
 * `bosniak_national_to_srebrenica_demilitarization`. Those are NOT fireable
 * events — they are `future_consequences[*]` projection rows inside upstream
 * decisions that BOTH open the real fireable event
 * `srebrenica_demilitarization_1993`. So the `keystone_dilemma` tag and the
 * decision-label/turn resolution attach to the real event; the two projection
 * ids are kept in `keystoneEventIds` only so `faced` can also light up off the
 * upstream civic/bosniak-national choice.
 *
 * Future: the "patron dependence" dilemma has no single keystone event and is
 * intentionally OMITTED from this v1 spine.
 */
export const DILEMMA_SPINE: readonly DilemmaSpineDefinition[] = [
    {
        dilemmaId: 'rs_six_strategic_goals',
        title: 'The Six Strategic Goals',
        keystoneEventIds: ['rs_strategic_goals'],
        decisionEventId: 'rs_strategic_goals',
        essayId: 'essay_rs_strategic_goals',
        sensitive: true,
    },
    {
        dilemmaId: 'srebrenica_demilitarization',
        title: 'The Demilitarization of Srebrenica',
        keystoneEventIds: [
            'srebrenica_demilitarization_1993',
            'civic_to_srebrenica_demilitarization',
            'bosniak_national_to_srebrenica_demilitarization',
        ],
        decisionEventId: 'srebrenica_demilitarization_1993',
        essayId: 'essay_srebrenica_enclave_forms_1992',
        sensitive: true,
    },
    {
        dilemmaId: 'vance_owen_plan',
        title: 'The Vance-Owen Peace Plan',
        keystoneEventIds: ['vance_owen_plan_1993'],
        decisionEventId: 'vance_owen_plan_1993',
        essayId: 'essay_vance_owen_plan_1993',
        sensitive: false,
    },
    {
        dilemmaId: 'owen_stoltenberg_plan',
        title: 'The Owen-Stoltenberg Plan',
        keystoneEventIds: ['owen_stoltenberg_plan_1993'],
        decisionEventId: 'owen_stoltenberg_plan_1993',
        essayId: 'essay_owen_stoltenberg_plan_1993',
        sensitive: false,
    },
    {
        dilemmaId: 'contact_group_plan',
        title: 'The Contact Group Plan',
        keystoneEventIds: ['contact_group_plan_1994'],
        decisionEventId: 'contact_group_plan_1994',
        essayId: 'essay_contact_group_plan_1994',
        sensitive: false,
    },
    {
        dilemmaId: 'hrhb_alliance_or_republic',
        title: 'What Is Herceg-Bosna?',
        keystoneEventIds: ['hrhb_political_goal'],
        decisionEventId: 'hrhb_political_goal',
        essayId: 'essay_hrhb_political_goal',
        sensitive: true,
    },
    {
        dilemmaId: 'karadzic_mladic_split',
        title: 'Karadžić Moves Against Mladić',
        keystoneEventIds: ['karadzic_mladic_split_1995'],
        decisionEventId: 'karadzic_mladic_split_1995',
        essayId: null,
        sensitive: false,
    },
];

/** Minimal structural shape of a raw event row we read for label resolution. */
interface RawEventRowForLabels {
    id?: unknown;
    response_options?: Array<{ id?: unknown; label?: unknown }>;
}

/**
 * Build a `${event_id}::${response_id}` -> label lookup, restricted to the
 * keystone decision events. Pure, computed once at module load from the
 * build-time-bundled event JSON. Defensive against malformed rows.
 */
function buildKeystoneLabelMap(): ReadonlyMap<string, string> {
    const wanted = new Set(DILEMMA_SPINE.map((d) => d.decisionEventId));
    const out = new Map<string, string>();
    const files: unknown[] = [war1992, war1992HrhbSummer, war1993, war1994, war1995];
    for (const file of files) {
        if (!Array.isArray(file)) continue;
        for (const rawRow of file as RawEventRowForLabels[]) {
            const eventId = typeof rawRow?.id === 'string' ? rawRow.id : undefined;
            if (!eventId || !wanted.has(eventId)) continue;
            const options = Array.isArray(rawRow.response_options) ? rawRow.response_options : [];
            for (const opt of options) {
                const optId = typeof opt?.id === 'string' ? opt.id : undefined;
                const label = typeof opt?.label === 'string' ? opt.label.trim() : '';
                if (optId && label.length > 0) {
                    out.set(`${eventId}::${optId}`, label);
                }
            }
        }
    }
    return out;
}

const KEYSTONE_LABEL_MAP: ReadonlyMap<string, string> = buildKeystoneLabelMap();
const RECORDED_CHOICE_LABEL = 'Recorded choice';

/**
 * Resolve the chosen response id + decision turn for a decision event from the
 * raw event_decision_log. Last-wins (matches consequenceReceipts /
 * causality_query decision-by-event semantics): the LAST log entry for the
 * event owns the current decision. Returns nulls when no log entry exists.
 *
 * Deterministic: the log is an ordered array; we walk it forward and keep the
 * last match, so iteration order of the source array fully determines output.
 */
function resolveDecisionForEvent(
    decisionLog: ReadonlyArray<{ event_id: string; response_id: string; turn: number }>,
    eventId: string,
): { responseId: string; turn: number } | null {
    let found: { responseId: string; turn: number } | null = null;
    for (const dec of decisionLog) {
        if (dec.event_id === eventId) {
            found = { responseId: dec.response_id, turn: dec.turn };
        }
    }
    return found;
}

/**
 * Project the keystone-dilemma spine against a loaded UI game state.
 *
 * `faced` is true when ANY keystone event id for the dilemma appears in the
 * fired-event set OR the player/bot recorded a response for it
 * (`decisionResponses` carries `${event_id}:${response_id}`). `chosenResponseId`
 * + `decisionTurn` come from the raw event_decision_log entry for the dilemma's
 * decision event (last-wins). `chosenBranchLabel` resolves the canon
 * response-option label, falling back to neutral player-safe copy.
 *
 * Pure + deterministic; returns one view per spine definition, in canon order.
 * Returns a fully not-yet-faced spine for empty / flag-off states (never []),
 * so the UI can always render the full backbone.
 */
export function buildDilemmaSpine(
    loaded: Pick<LoadedGameState, 'firedEvents' | 'decisionResponses' | 'rawGameState'> | null | undefined,
): DilemmaSpineView[] {
    // `faced` must use the UNCAPPED raw fired-event ids. `firedEvents`
    // (deriveFiredEvents) is capped to the 20 most-recent for the timeline view,
    // so a dilemma that fired >20 events ago would wrongly read "Not yet faced"
    // on older/long-running saves (Codex P2, PR #82). Union both: the raw set is
    // authoritative; the view is a robustness fallback if rawGameState is absent.
    const firedIds = new Set<string>(
        (loaded?.rawGameState?.military?.fired_event_ids ?? []) as ReadonlyArray<string>,
    );
    for (const entry of loaded?.firedEvents ?? []) {
        if (entry?.id) firedIds.add(entry.id);
    }
    const pendingDecisionIds = new Set<string>(
        ((loaded?.rawGameState?.military?.pending_event_decisions ?? []) as ReadonlyArray<{ event_id?: unknown }>)
            .map((decision) => typeof decision?.event_id === 'string' ? decision.event_id : '')
            .filter(Boolean),
    );
    const decisionResponses = loaded?.decisionResponses ?? null;
    const decisionLog = (loaded?.rawGameState?.military?.event_decision_log ?? []) as ReadonlyArray<{
        event_id: string;
        response_id: string;
        turn: number;
    }>;

    const views: DilemmaSpineView[] = DILEMMA_SPINE.map((def) => {
        // faced: any keystone event fired, OR any keystone event has a recorded
        // response (decisionResponses is a set of `${event_id}:${response_id}`).
        const facedByFire = def.keystoneEventIds.some((id) => firedIds.has(id) && !pendingDecisionIds.has(id));
        const facedByResponse = decisionResponses
            ? def.keystoneEventIds.some((id) => {
                for (const key of decisionResponses) {
                    const sep = key.indexOf(':');
                    if (sep > 0 && key.slice(0, sep) === id) return true;
                }
                return false;
            })
            : false;
        const faced = facedByFire || facedByResponse;

        const decision = resolveDecisionForEvent(decisionLog, def.decisionEventId);
        const chosenResponseId = decision?.responseId ?? null;
        const decisionTurn = decision?.turn ?? null;
        let chosenBranchLabel: string | null = null;
        if (chosenResponseId) {
            chosenBranchLabel =
                KEYSTONE_LABEL_MAP.get(`${def.decisionEventId}::${chosenResponseId}`) ?? RECORDED_CHOICE_LABEL;
        }

        return {
            dilemmaId: def.dilemmaId,
            title: def.title,
            essayId: def.essayId,
            sensitive: def.sensitive,
            faced,
            chosenResponseId,
            chosenBranchLabel,
            decisionTurn,
        };
    });

    // Stable canon order is already enforced by DILEMMA_SPINE iteration; the
    // explicit sort guards against accidental future reordering of the source.
    views.sort((a, b) => {
        const aIdx = DILEMMA_SPINE.findIndex((d) => d.dilemmaId === a.dilemmaId);
        const bIdx = DILEMMA_SPINE.findIndex((d) => d.dilemmaId === b.dilemmaId);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return strictCompare(a.dilemmaId, b.dilemmaId);
    });

    return views;
}
