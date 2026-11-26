/**
 * §27 (orchestrator ruling 2026-11-26): ONE predicate for "the RBiH-HRHB alliance held".
 *
 * Both the `alliance_held` path-not-taken ghost (`predAllianceHeld`) and the Ahmići essay's
 * alliance-held note and ghost summary (`ALLIANCE_HELD` atom, fed by the GameStateAdapter) read
 * this function, so the two texts can never disagree. It holds only when:
 * - the alliance record `political.rbih_hrhb_state` is present (fails closed when absent);
 * - its `war_started_turn` is null (the alliance never fell to the hostile threshold);
 * - `croat_bosniak_war_begins_1993` has never fired (`event_fire_counts` is 0 or absent).
 *
 * Read-only; it writes nothing and feeds no sim reader.
 */

export const CROAT_BOSNIAK_WAR_ONSET_EVENT_ID = 'croat_bosniak_war_begins_1993';

export interface AllianceHeldStateView {
    political?: {
        rbih_hrhb_state?: { readonly war_started_turn?: number | null } | null;
    } | null;
    military?: {
        event_fire_counts?: Readonly<Record<string, number | undefined>> | null;
    } | null;
}

/** Fire count of the onset event, read the way the ghost operands read it (non-finite = 0). */
export function croatBosniakOnsetFireCount(state: AllianceHeldStateView | null | undefined): number {
    const raw = state?.military?.event_fire_counts?.[CROAT_BOSNIAK_WAR_ONSET_EVENT_ID];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

export function rbihHrhbAllianceHeld(state: AllianceHeldStateView | null | undefined): boolean {
    const record = state?.political?.rbih_hrhb_state;
    if (!record || record.war_started_turn != null) return false;
    return croatBosniakOnsetFireCount(state) === 0;
}
