/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: T2/T3/T6 shared movement-authority decision
 * DOMAIN:    Routine (discretionary) movement destination scope
 * ═══════════════════════════════════════════════════════════════
 *
 * POLICY (selected by the owner packet, 2026-09-17/18):
 *   For an ordinary line brigade with a valid current `assigned_sub_segment_id`,
 *   discretionary front repositioning is limited to the friendly front destinations of
 *   that assigned sub-segment. Tactical routing does not implicitly reassign the brigade
 *   to another sub-segment, sector or corps.
 *
 *   Authorized movement keeps its own authority and is NOT narrowed here:
 *     - active operation staging / approach (see `isDestinationAuthorizedByOperation`)
 *     - an explicit corps order moving THIS brigade to another sector
 *       (`directive.sector_reassignment_orders`, see `isMovementAuthorizedByCorpsReassignment`)
 *     - authored pre-planned pre-staging, player orders, army-reserve / loan lifecycle,
 *       combat and lifecycle relocation (all produced outside the routine paths)
 *
 *   The corps-WIDE directive fields `priority_sector_id` and `reinforce_sector_ids` are
 *   deliberately NOT exemptions — see `isMovementAuthorizedByCorpsReassignment`. The rules that
 *   read them (`.prioritySector`, Rule 5c) are simply left unscoped at the producer instead.
 *
 * This module is the single shared, side-effect-free decision used by the order producer
 * (T2), the pending-order → transit revalidation (T3) and the correction layer (T6), so all
 * three agree on the boundary instead of each approximating it.
 * See docs/20_engineering/MOVEMENT_AUTHORITY.md.
 *
 * THREE DISTINCTIONS THIS MODULE MAKES (the packet's requirement):
 *   1. Routine discretionary movement under a valid line assignment  → restricted
 *   2. Movement supported by an actual existing higher-priority authority → exempt
 *   3. Missing / stale assignments, reserves and other special cases  → unrestricted
 *
 * WHAT A "DESTINATION" IS HERE — read before adding a call site:
 *   The restriction applies to the routine DESTINATION, never to an intermediate node of a
 *   permitted route. Several movement helpers return the FIRST STEP of a multi-hop path
 *   (`findNearestOffensiveTarget`, `findNearestFriendlyOsidInSet`); scope-checking such a
 *   return value forbids legal journeys and is a BUG. Scope the GOAL SET those helpers
 *   search toward instead, and only `isDestinationInRoutineScope` a value that is itself a
 *   genuine destination (e.g. `findAdjacentFrontGap`'s single-hop neighbour).
 *   Equally: `friendly_osids` and `enemy_osids` are disjoint by construction, so a set of
 *   ENEMY targets must never be intersected with `scope.destinations` — use
 *   `filterOffensiveTargetsToRoutineScope`, which scopes them by ADJACENCY.
 *
 * MUST NOT: mutate state, choose a strategic destination, or invent a fallback assignment.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { getSectorOffensiveApproachOsids, isOperationParticipant } from './operation_approach_osids.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';

/** Why a formation's routine movement is (or is not) scope-restricted. */
export type RoutineScopeSource =
    | 'assigned_sub_segment'
    | 'missing_assignment'
    | 'stale_assignment'
    | 'reserve_roster'
    | 'non_line_kind';

/**
 * Which consumer is asking. The assignment lookup and destination set are IDENTICAL for
 * both; this axis only selects which established special-case contract applies, so the two
 * tiers stay faithful to their own prior behaviour instead of one silently adopting the
 * other's.
 *
 *  - 'routing'    (T2 order production, T3 revalidation of T2's output) — applies the
 *                 reserve/rear roster and non-line-kind carve-outs. T2 already routes those
 *                 formations through their own evaluators (`evaluateReserve`, and the
 *                 `isReserve` carve-out in `evaluateSectorMarch`), so they are not routine
 *                 line movement and must not be narrowed here.
 *  - 'correction' (T6 `correctMarchOrders` / `correctTransitStates`) — restricts on the
 *                 assignment ALONE, which is T6's established contract. T6 has never had a
 *                 reserve carve-out, and reserves keep a stale `assigned_sub_segment_id`
 *                 (`subsegment_assignment.ts` skips reserves when assigning), so adding the
 *                 carve-out here would silently stop correcting formations T6 used to
 *                 correct. Preserved deliberately, not inherited by accident.
 */
export type RoutineScopeConsumer = 'routing' | 'correction';

export interface RoutineMovementScope {
    /** True when discretionary destinations are restricted to a valid assigned sub-segment. */
    restricted: boolean;
    assignedSubSegmentId?: string;
    /** Allowed friendly front destinations when restricted; empty when unrestricted. */
    destinations: ReadonlySet<string>;
    source: RoutineScopeSource;
}

const EMPTY_DESTINATIONS: ReadonlySet<string> = new Set<string>();

function isLineBrigadeKind(kind: string | undefined): boolean {
    // `kind` is absent on minimal fixtures and old saves; the engine treats it as a brigade
    // (`(f.kind ?? 'brigade')`), so an absent kind is a line formation here too.
    return kind === undefined
        || kind === 'brigade'
        || kind === 'og'
        || kind === 'operational_group'
        || kind === 'hv_phantom';
}

function unrestricted(source: RoutineScopeSource): RoutineMovementScope {
    return { restricted: false, destinations: EMPTY_DESTINATIONS, source };
}

/**
 * Resolve the routine movement scope for a formation from CURRENT state.
 *
 * Established special cases are preserved per `RoutineScopeConsumer`:
 *  - non-line kinds and reserve/rear roster members → unrestricted ('routing' only)
 *  - no `assigned_sub_segment_id` (missing/unassigned) → unrestricted
 *  - stale assignment (sub-segment absent or frontless) → unrestricted
 *  - otherwise → restricted to the assigned sub-segment's friendly front OSIDs
 *
 * Deterministic and allocation-light: this runs per brigade (up to 4x) inside the bot order
 * loop, so it iterates sectors directly and returns on the unique `sub_segment_id` match.
 * No sorting is needed — the reserve test is a pure OR over all sectors and the sub-segment
 * lookup is keyed by a unique id, so iteration order cannot affect the result.
 */
export function resolveRoutineMovementScope(
    state: GameState,
    brigade: FormationState | undefined,
    consumer: RoutineScopeConsumer = 'routing',
): RoutineMovementScope {
    if (!brigade) return unrestricted('non_line_kind');

    const applyRosterCarveOuts = consumer === 'routing';
    if (applyRosterCarveOuts && !isLineBrigadeKind(brigade.kind)) return unrestricted('non_line_kind');

    const sectors = state.military.corps_front_sectors;
    if (!sectors) return unrestricted('stale_assignment');

    // Reserve/rear rosters keep their established (unrestricted) movement contract at T2/T3.
    // This is a SEPARATE pass on purpose: folding it into the sub-segment loop below would make
    // the classification depend on whether the sector holding the brigade on a reserve roster
    // happens to be visited before the sector owning its assigned sub-segment — so a brigade
    // rostered as a reserve in one sector but still carrying a stale assignment in another could
    // come back either `reserve_roster` or `assigned_sub_segment` depending on key order.
    if (applyRosterCarveOuts) {
        for (const sectorId in sectors) {
            const sector = sectors[sectorId];
            if (!sector) continue;
            if ((sector.reserve_brigade_ids ?? []).includes(brigade.id)
                || (sector.rear_brigade_ids ?? []).includes(brigade.id)) {
                return unrestricted('reserve_roster');
            }
        }
    }

    const assignedSubSegmentId = brigade.assigned_sub_segment_id;
    if (!assignedSubSegmentId) return unrestricted('missing_assignment');

    for (const sectorId in sectors) {
        const sector = sectors[sectorId];
        if (!sector) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            if (subSegment.sub_segment_id !== assignedSubSegmentId) continue;
            const friendly = subSegment.friendly_osids ?? [];
            if (friendly.length === 0) return unrestricted('stale_assignment');
            return {
                restricted: true,
                assignedSubSegmentId,
                destinations: new Set(friendly),
                source: 'assigned_sub_segment',
            };
        }
    }
    return unrestricted('stale_assignment');
}

/** True when a destination is permitted by the scope (unrestricted ⇒ always true). */
export function isDestinationInRoutineScope(scope: RoutineMovementScope, destination: string): boolean {
    return !scope.restricted || scope.destinations.has(destination);
}

/**
 * Intersect a candidate set of friendly DESTINATIONS with the scope.
 *
 * When unrestricted this returns the caller's own set unchanged rather than a copy — several
 * call sites pass a memoized front set (`sectorAssignment.frontOsids`) that exists precisely
 * to avoid rebuilding front sets per brigade, and copying it would defeat that. Every
 * consumer treats the result as read-only (`.has` / `.size` / spread).
 *
 * Do NOT use this on a set of enemy OSIDs — see `filterOffensiveTargetsToRoutineScope`.
 */
export function filterToRoutineScope<T extends string>(
    scope: RoutineMovementScope,
    candidates: Set<T>,
): Set<T> {
    if (!scope.restricted) return candidates;
    const out = new Set<T>();
    for (const candidate of candidates) {
        if (scope.destinations.has(candidate)) out.add(candidate);
    }
    return out;
}

/**
 * Scope a set of ENEMY offensive targets to the routine assignment.
 *
 * `directive.offensive_targets` are enemy-held OSIDs and `scope.destinations` are the
 * sub-segment's `friendly_osids`; the two are disjoint by construction, so intersecting them
 * yields the empty set and silently disables (and inverts) every gate built on the result.
 * A target is in scope when it is ADJACENT to a destination the brigade may legally occupy —
 * i.e. the brigade can press that target from its own assigned front.
 *
 * The returned set is a BFS GOAL set. The first step a pathfinder returns toward it is an
 * intermediate node and must NOT be scope-checked.
 */
export function filterOffensiveTargetsToRoutineScope<T extends string>(
    scope: RoutineMovementScope,
    targets: Set<T>,
    adjacency: Map<string, string[]>,
): Set<T> {
    if (!scope.restricted) return targets;
    const out = new Set<T>();
    for (const target of targets) {
        for (const neighbor of adjacency.get(target) ?? []) {
            if (scope.destinations.has(neighbor)) {
                out.add(target);
                break;
            }
        }
    }
    return out;
}

function axisForBrigade(op: CorpsOperation, brigadeId: string): OperationAxis | undefined {
    return op.axes?.find((axis) => axis.assigned_brigades.includes(brigadeId as never));
}

/**
 * True when `destinationOsid` is supported by an ACTIVE operation the brigade participates in
 * — its staging OSID, or one of the operation's approach OSIDs.
 *
 * The approach set is computed by `getSectorOffensiveApproachOsids`, the SAME predicate the
 * attack evaluator uses to pick approach marches (`bot_brigade_eval_attack.ts`). Using a
 * narrower local approximation here would delete the very marches that evaluator issues:
 * it walks `getTacticalAdjacentOsids` (adjacency ∪ war-front edges) rather than plain
 * adjacency, accepts ALLIED control rather than own-faction control only, and has a
 * documented Wave-10 sub-segment fallback for deep HVO targets whose absence reproduces the
 * `spawned-no-attack` / `no_logged_attempt` failure mode.
 */
export function isDestinationAuthorizedByOperation(
    state: GameState,
    brigadeId: string,
    destinationOsid: string,
    adjacency: Map<string, string[]>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
): boolean {
    const formation = state.military.formations?.[brigadeId];
    if (!formation) return false;
    const corpsId = formation.corps_id;
    if (!corpsId) return false;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;

    for (const op of cmd.active_operations ?? []) {
        if (op.phase !== 'planning' && op.phase !== 'execution') continue;
        const axis = axisForBrigade(op, brigadeId);
        const participates = axis ? true : isOperationParticipant(op, brigadeId as never);
        if (!participates) continue;

        const stagingOsid = axis?.staging_osid ?? op.staging_osid;
        if (stagingOsid === destinationOsid) return true;

        const approaches = getSectorOffensiveApproachOsids(
            state,
            op,
            formation.faction as FactionId,
            adjacency as Map<Osid, Osid[]>,
            // `getPoliticalControllerOSID` treats a missing reverse map as "direct lookup
            // only", which is what T6 (no reverse map in its signature) already relied on.
            (reverseMap ?? new Map()) as OperationalToCanonicalReverseMap,
            brigadeId as never,
        );
        if (approaches.has(destinationOsid as Osid)) return true;
    }
    return false;
}

/**
 * True when the corps commander has explicitly ordered THIS brigade to another sector this
 * turn (`directive.sector_reassignment_orders`) — an existing higher-priority authority, not
 * brigade discretion. While such an order stands, the brigade's routine sub-segment scope does
 * not govern its movement, so the journey is exempt.
 *
 * SCOPE OF THE EXEMPTION — deliberately narrow on two axes:
 *
 *  - BRIGADE-SPECIFIC ONLY. The corps-wide directive fields `priority_sector_id` and
 *    `reinforce_sector_ids` are NOT consulted. They name sectors for the whole corps, so
 *    exempting them would hand every brigade in the corps a blanket waiver over the corps main
 *    effort — precisely where stale orders drag brigades, and precisely the drift T6 exists to
 *    cancel. They also buy nothing: Rule 5c and `.prioritySector` write single-hop
 *    `movement_orders`, which T3 never revalidates (it skips anything without `stance:'column'`)
 *    and which do not survive to T6 (`applyBrigadeMovementOrders` replaces the order map with
 *    retained column orders only). All cost, no benefit.
 *
 *  - KEYED ON PROGRESS, NOT ON MEMBERSHIP. Rule 5b2 emits `findNearestFriendlyOsidInSet`'s
 *    return value, which is the FIRST STEP of the path, not the target sector's front. Asking
 *    whether the destination lies INSIDE the named sector would therefore exempt only the 1-hop
 *    case and still delete every reassignment 2+ hops out — i.e. the rear brigades that density
 *    equalization exists to move, which is the original defect. So the test is instead whether
 *    the destination is strictly CLOSER to the ordered sector's front than the brigade's current
 *    location, traversing exactly what the producer's own pathfinder traverses (see
 *    `friendlyHopsToSet`: allied territory and reverse-map-resolved OSIDs included, unbounded).
 *
 *    Progress rather than a blanket order-level waiver matters at BOTH tiers. At T3 it stops a
 *    live reassignment from also shielding an unrelated stale order, which could become a transit
 *    and then be skipped by the bot's in-transit guard while the brigade travelled somewhere
 *    nobody ordered. At T6 it matters more, because T6 does not gate on `order.owner` at all: an
 *    order-blind waiver there would exempt untagged operation, reserve and home-return orders too,
 *    handing a reassigned brigade a total exemption from correction.
 *
 * The directive is read from persisted state and is the same one that was in force when the
 * order was issued: it is regenerated at `generate-bot-corps-orders` and consumed at
 * `generate-bot-brigade-orders` later the same turn, while the T3 revalidation runs at
 * `osid-column-movement` early the NEXT turn — before the next regeneration.
 */
export function isMovementAuthorizedByCorpsReassignment(
    state: GameState,
    brigade: FormationState,
    destinationOsid: string,
    adjacency: Map<string, string[]>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
): boolean {
    const corpsId = brigade.corps_id;
    if (!corpsId) return false;
    const directive = state.military.corps_command?.[corpsId]?.directive;
    if (!directive) return false;
    const reassign = (directive.sector_reassignment_orders ?? []).find((r) => r.brigade_id === brigade.id);
    if (!reassign) return false;

    const targetSector = state.military.corps_front_sectors?.[reassign.to_sector_id];
    if (!targetSector) return false;
    const targetFront = new Set<string>();
    for (const subSegment of targetSector.sub_segments ?? []) {
        for (const osid of subSegment.friendly_osids ?? []) targetFront.add(osid);
    }
    if (targetFront.size === 0) return false;

    // The authority supports movement TOWARD the ordered sector — not anywhere at all while the
    // order stands. Without this, a brigade holding a live reassignment would also keep an
    // unrelated stale order, which could become a transit and then be skipped by the bot's
    // in-transit guard while it travelled somewhere nobody asked for.
    const loc = brigade.location_osid;
    if (!loc) return false;
    const from = friendlyHopsToSet(state, brigade, loc, targetFront, adjacency, reverseMap);
    if (from === null) return false;
    const to = friendlyHopsToSet(state, brigade, destinationOsid, targetFront, adjacency, reverseMap);
    return to !== null && to < from;
}

/**
 * Hops from `start` to the nearest member of `targets` through territory this formation may
 * legally traverse, or null when unreachable.
 *
 * Traversal MUST match the producer's own pathfinder (`findNearestFriendlyOsidInSet`, which
 * Rule 5b2 uses to choose the step being judged): `getPoliticalControllerOSID` so an OSID that
 * resolves only through the reverse map is seen, and `isFriendlyFaction` so ALLIED territory
 * counts. A stricter verifier than producer would deny the exemption on exactly the routes the
 * producer legitimately chose — reintroducing, on a narrower population, the same
 * predicate-divergence bug this module fixed for operation approaches. Unbounded for the same
 * reason: the producer's BFS is uncapped, and this runs only on the rejection path.
 */
function friendlyHopsToSet(
    state: GameState,
    brigade: FormationState,
    start: string,
    targets: ReadonlySet<string>,
    adjacency: Map<string, string[]>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
): number | null {
    if (targets.has(start)) return 0;
    const seen = new Set<string>([start]);
    let frontier = [start];
    let depth = 0;
    while (frontier.length > 0) {
        depth += 1;
        const next: string[] = [];
        for (const osid of frontier) {
            for (const neighbor of adjacency.get(osid) ?? []) {
                if (seen.has(neighbor)) continue;
                seen.add(neighbor);
                if (targets.has(neighbor)) return depth;
                const controller = getPoliticalControllerOSID(state, neighbor, reverseMap ?? undefined);
                if (!isFriendlyFaction(controller, brigade.faction, state)) continue;
                next.push(neighbor);
            }
        }
        frontier = next;
    }
    return null;
}

/**
 * Whether a pending order is a ROUTINE discretionary order whose destination must satisfy
 * the routine scope before it may become a transit.
 *
 * IMPORTANT: `owner: 'bot_discretionary'` marks BOT output, not ROUTINE output — the T2
 * aggregator stamps it on every evaluator's order alike (`bot_brigade_ai_osid.ts`), so the
 * tag alone cannot distinguish a routine march from an operation approach or a
 * corps-directed reassignment. The authority exemptions below do that work; without them
 * this check deletes the orders those authorities exist to produce.
 *
 * Authorized orders are NOT revalidated: authored pre-planned concentration
 * (`owner: 'authored_preplanned'`), active-operation staging/approach, corps-directive-named
 * sectors, reserves/lifecycle, and the untagged producers (triggered pre-staging, commander
 * prepositioning, army-reserve deployment, home return and T6 repair).
 */
export function isRoutineScopeEnforcedForOrder(
    state: GameState,
    brigade: FormationState | undefined,
    order: { owner?: string; destination_sids?: string[]; stance?: string } | undefined,
    adjacency: Map<string, string[]>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
): boolean {
    if (!brigade || !order) return false;
    if (order.owner !== 'bot_discretionary') return false;

    const scope = resolveRoutineMovementScope(state, brigade, 'routing');
    if (!scope.restricted) return false;

    const destination = order.destination_sids?.[0];
    if (!destination) return false;
    // Cheapest checks first: the approach computation below is the only expensive one and runs
    // only after everything else has failed to exempt the order.
    if (isDestinationInRoutineScope(scope, destination)) return false;
    if (isMovementAuthorizedByCorpsReassignment(state, brigade, destination, adjacency, reverseMap)) return false;
    if (isDestinationAuthorizedByOperation(state, brigade.id, destination, adjacency, reverseMap)) return false;

    return true;
}
