# Routine movement scope — candidate review (owner packet 2026-09-18)

Branch `codex/january-1993-operations-20260914`, base HEAD `5f6cf6d02`.
Reviewed the UNCOMMITTED candidate found in the working tree (new
`src/sim/combat/brigade_routine_scope.ts` + 5 patched sources + 3 test files).

## Verdict on the inherited candidate

The shared-authority design is SOUND and is kept:
- one side-effect-free `resolveRoutineMovementScope` used by T2, T3 and T6;
- `owner==='bot_discretionary'` (written only by the T2 aggregator,
  `bot_brigade_ai_osid.ts:931,939`) is the correct routine marker, so authored /
  operation / player / lifecycle producers keep their authority;
- the T3 revalidation sits in `processOsidColumnMovement` Pass 2, which runs at
  `war_phases.ts:1537`, BEFORE triggered-operation admission at :2075 — so a rejected
  routine order never creates the spurious transit that excluded the 19th.

Typecheck clean; 60 focused tests green. But those are helper-level tests, and TWO
BLOCKER defects survive them, both in the T2 producer — the layer with no composed test.

## BLOCKER 1 — enemy goal set filtered through a friendly-destination scope

`bot_brigade_eval_front.ts` Rule 5b:
    redeployTargetSet = filterToRoutineScope(routineScope, new Set(directive.offensive_targets))

`directive.offensive_targets` are ENEMY OSIDs; `scope.destinations` are the sub-segment's
`friendly_osids`. The intersection is empty for every restricted brigade. Consequences:
`hasAdjacentTarget` is forced false (the gate INVERTS), and `findNearestOffensiveTarget`
gets an empty goal set and always returns null, so Rule 5b never fires at all.

Isolated repro (`tests/_scope_probe.test.ts`, producer-level `evaluateFrontCoverage`):
brigade at A, assigned sub-segment front {A,B}, adjacent enemy Y (not a target),
offensive target X adjacent to B.
  pre-change source : movement_orders = {b1: "B"}
  candidate         : movement_orders = {}
B is INSIDE the assigned sub-segment front, so the suppressed move was in scope. This is a
set-type confusion, not a policy consequence.

Correct shape: the BFS goal set is not a destination set. Scope the offensive targets by
ADJACENCY to an in-scope destination, and leave the returned first step alone.

## BLOCKER 2 — a first step (intermediate node) is scope-checked, freezing the brigade

`bot_brigade_eval_movement.ts` `.offensiveTarget` block:
    isDestinationInRoutineScope(routineScope, directiveTarget)

`findNearestOffensiveTarget` returns the FIRST STEP of a multi-hop path, not the
destination. Requiring that intermediate node to lie on the assigned sub-segment front is
exactly what the packet forbids ("Do not make legal journeys impossible by requiring every
path node to lie on the assigned sub-segment front").

Worse, the block still does `posture_orders.push('defend')` and `return true` when the check
suppresses the move, so the `.ownCorpsFront` rule BELOW it — which would legally walk the
brigade to its own assigned front — never runs. That violates "Rejection of one movement
candidate must not suppress unrelated lawful orders or all subsequent brigade
decision-making", and turns the formation into the sub-segment-bound garrison the packet
explicitly rules out.

Isolated repro (`tests/_scope_probe2.test.ts`, producer-level `evaluateInteriorMovement`):
interior brigade at R, assigned front {F}, path R-M-F, target X adjacent to F.
  pre-change source : movement_orders = {b1: "M"}   (walks toward its own front)
  candidate         : movement_orders = {}          (frozen in the interior, forever)

## Withdrawn claim (recorded so it is not re-derived)

I first read the patched `targetOsids` block at `bot_brigade_eval_front.ts:~729` as Rule 5b2
(`sector_reassignment_orders`) and believed explicit reassignment had been narrowed. That is
WRONG. Rule 5b2 (~686-714) is UNPATCHED and correctly retains its authority; the patched
near-identical block is Rule 5c (`reinforce_sector_ids`), a discretionary corps directive.
The two blocks differ only in their guard, which is why the diff context mis-attributed.
Narrowing Rule 5c is within the stated policy; recorded as a behaviour change, not a defect.

## Correctly-shaped sites (no change needed)

- `eval_front` scopedFrontSet / scopedReachableCorpsFront / scopedSafeFront / overstack
  `allowedFronts`: all are friendly candidate-destination sets. Correct.
- `eval_movement` `.prioritySector` and `.ownCorpsFront`: scope the friendly GOAL set and
  leave the returned first step unchecked. Correct — this is the shape the two blockers
  should have used.
- `bot_brigade_movement_ai.issueInteriorMovement`: passes the empty set rather than
  `undefined` when restricted, so the caller cannot fall back to a faction-wide hunt. Correct.
- `commander_march_correction` (T6): now consumes the same shared decision. Correct.
- `osid_column_movement` Pass 2 revalidation: accept/reject only, no destination choice, no
  relocation. Correct.

---

# Independent review of the candidate (second reviewer, read-only)

An independent reviewer audited the inherited candidate against the policy without being given
my findings first. It confirmed BLOCKER 1 and BLOCKER 2 and added material I had missed, plus a
THIRD blocker that corrects my own correction.

## BLOCKER 3 — `owner: 'bot_discretionary'` marks BOT output, not ROUTINE output

The T2 aggregator (`bot_brigade_ai_osid.ts:931,937-941`) stamps that tag on EVERY evaluator's
order alike. So the candidate's claim — "only the T2 aggregator's explicit `bot_discretionary`
tag marks routine output, so this never guesses by producer" — is false in effect: the tag
separates bot from authored, not routine from authorized.

Consequences the reviewer traced:
- **3a. Rule 5b2 survives at the producer but dies downstream.** My earlier correction was right
  that `sector_reassignment_orders` is unpatched in `evaluateFrontCoverage` — but for a distant
  reassignment (`hops >= COLUMN_MARCH_MIN_HOPS`) it writes `column_march_orders`, which becomes a
  `stance:'column'`, `owner:'bot_discretionary'` order that the T3 revalidation deletes next turn
  because the destination is the NEW sector's front. Long reassignments die; short ones (which
  write `movement_orders` with no column stance and are never revalidated) survive by accident.
- **3b. Operation approach marches.** The candidate's exemption predicate was narrower than
  `getSectorOffensiveApproachOsids`, the predicate the attack evaluator actually uses to issue
  those marches, in three ways: plain adjacency vs `getTacticalAdjacentOsids`, own-faction control
  vs allied control, and no Wave-10 sub-segment fallback. That fallback's own comment records that
  its absence reproduces `spawned-no-attack` / `no_logged_attempt` for deep HVO targets.
- **3c.** The added comment "catches a pending order whose assignment became invalid after issue"
  mis-describes the check. Phase order is `osid-column-movement`(1537) →
  `assign-brigades-to-subsegments`(1598) → `generate-bot-corps-orders`(2418) →
  `commander-correct-march-orders`(2597) → `generate-bot-brigade-orders`(2625), so the assignment
  in force at revalidation is the same one in force at issue. It cannot go stale in between.

## MAJOR findings adopted

- **Rule 5c (`reinforce_sector_ids`) narrowing is out of policy.** Those are sectors the CORPS
  COMMANDER flagged as under-density — by construction OTHER sectors — so intersecting them with
  the brigade's own sub-segment empties the set in exactly the case the rule exists for. Corps
  density equalization was dead for every assigned brigade. Same argument for `priority_sector_id`.
- **T6 silently stopped correcting reserve/rear and non-line formations.** The old T6 restricted
  on `assigned_sub_segment_id` alone. Reserves keep a STALE `assigned_sub_segment_id` because
  `subsegment_assignment.ts` skips them, so they WERE corrected before and were not after.
- **Performance.** The scope was resolved up to 4x per brigade per turn, each call sorting all
  sector keys twice and copying every sector's `sub_segments`, inside a hot loop that is memoized
  and perf-instrumented precisely to avoid that.

Determinism: no new defect (verified independently) — no `Math.random`, wall-clock or timestamp,
and every scoped set is consumed as a membership predicate or re-sorted before use.

---

# What was implemented

- **`brigade_routine_scope.ts` rewritten** as the single shared decision, now making the packet's
  three distinctions explicitly: routine / higher-priority-authority / established special case.
- **`filterOffensiveTargetsToRoutineScope`** scopes ENEMY targets by ADJACENCY to an in-scope
  destination. Fixes BLOCKER 1 without inverting the gate; the returned first step is not checked.
- **BLOCKER 2** fixed: the `.offensiveTarget` block no longer scope-checks a first step and now
  DECLINES (returns false) instead of claiming the brigade, so `.ownCorpsFront` and `.fallback`
  still run. An interior brigade can again walk to its own assigned front.
- **`isDestinationAuthorizedByDirective`** exempts destinations in a sector the corps directive
  names for this brigade (`sector_reassignment_orders`, `priority_sector_id`,
  `reinforce_sector_ids`). Fixes BLOCKER 3a.
- **`isDestinationAuthorizedByOperation`** now calls the REAL `getSectorOffensiveApproachOsids`.
  To break the import cycle, `getBrigadeAxis` / `isOperationParticipant` /
  `getSectorOffensiveApproachOsids` were moved VERBATIM into the leaf module
  `operation_approach_osids.ts` and re-exported from `bot_brigade_ai_osid.ts`, so every existing
  import path is unchanged. Fixes BLOCKER 3b.
- **Rule 5c and `.prioritySector` narrowing REVERTED** — corps authority, exempted at T3/T6 instead.
- **`RoutineScopeConsumer`** ('routing' | 'correction') keeps T6's established contract: T6
  restricts on the assignment alone, as before, so reserve/rear/non-line handling is unchanged.
- **Performance**: both sorts and the array copy removed; `filterToRoutineScope` returns the
  caller's own set unchanged when unrestricted, preserving the memoized front set.

## Superseded expectations, recorded

- The candidate's module doc claimed the `bot_discretionary` tag distinguishes routine output.
  Superseded: authority exemptions do that work, and the doc now says so.
- The candidate's comment claiming the T3 check catches a post-issue assignment change is
  superseded by the pipeline-order finding; the comment now states what it actually catches.
- No test assertion was deleted to reach green. The two previously-conflicting tooth tests
  (`tooth_guard` Test 8 / `retroactive_tooth_eviction` Test 1c) remain as the candidate left them
  and still pass, because the chosen policy is the sub-segment scope they encode.

---

# Second review pass — verification of the fixes, and what it caught

The independent reviewer re-audited the implementation. BLOCKER 1, BLOCKER 2, BLOCKER 3b (with a
byte-faithful extraction), MAJOR 1, MAJOR 2, MAJOR 3 and MINOR 1 verified RESOLVED. It then found
that two things were still wrong, and both were fixed in a third pass:

## NEW-1 — the directive exemption was corps-wide, not brigade-specific

`priority_sector_id` and `reinforce_sector_ids` are corps-level fields, so exempting them handed
EVERY brigade in the corps a blanket waiver over the corps main effort — the exact slice of front
stale orders drag brigades toward, and the drift T6 exists to cancel. It partially re-opened the
persistent-transit class this branch was addressing. They also bought nothing: Rule 5c and
`.prioritySector` write single-hop `movement_orders`, which T3 skips (no `stance:'column'`) and
which do not survive to T6 (`applyBrigadeMovementOrders` replaces the order map with retained
column orders only, `war_phases.ts:1564`). All cost, no benefit.

**Fixed:** both corps-wide arms removed. Only the brigade-specific `sector_reassignment_orders`
remains an exemption. Pinned by K4 (corps-wide fields exempt nobody) and K5 (brigade-specificity).

## NEW-2 — BLOCKER 3a was only half fixed: the exemption keyed on a destination, the producer
emits a first step

Rule 5b2 writes `findNearestFriendlyOsidInSet`'s return value into `column_march_orders`, and that
is the FIRST STEP of the path, not the target sector's front. An exemption asking "is the
destination inside the named sector" therefore passed only the 1-hop case and still deleted every
reassignment 2+ hops out — i.e. exactly the rear brigades (`hops >= COLUMN_MARCH_MIN_HOPS` is what
puts them on the column path) that density equalization exists to move. The original defect was
still live for the population that matters, and the first test K did not catch it because its
destination happened to BE the named sector's only front OSID.

**Fixed:** `isMovementAuthorizedByCorpsReassignment` keys on the ORDER, not the destination — the
authority attaches to the brigade's journey. K3 now drives an intermediate cell in neither sector.

**Guard added beyond the review.** Keying purely on the order would let a brigade holding a live
reassignment also retain an unrelated stale order, which could become a transit and then be
skipped by the bot's in-transit guard while it travelled somewhere nobody ordered. The exemption
therefore also requires the destination to be strictly CLOSER (in hops through friendly territory,
bounded at 24) to the ordered sector's front than the brigade's current location. Pinned by K4b.

## NEW-4 / NEW-6 / NEW-7 — fixed

Roster check restored to its own pass before the sub-segment lookup, so classification no longer
depends on sector key order; three unused imports removed from `bot_brigade_ai_osid.ts` (tsc does
not flag these — `noUnusedLocals` is off — but ESLint would); the two comments claiming a T3/T6
exemption for single-hop rules now state that those orders are never revalidated at either tier.

## NEW-5 — test gaps closed

Added a `consumer: 'correction'` block asserting a reserve-rostered brigade with a stale assignment
and a non-line kind are both still RESTRICTED at T6 while unrestricted at T2 — the MAJOR 2
regression guard that was missing.

---

# OPEN — requires an owner decision, not patched

## NEW-3: the tooth guard, trap reroute and retroactive tooth eviction are now inert for any
brigade with a valid assignment

This is the chosen policy biting, not a code defect, so it was deliberately NOT patched around.

`evaluateSectorMarch`'s tooth guard declines to march into a risky single-OSID sub-segment and
falls through to trap remediation. Trap remediation builds `reachableCorpsFront` across the whole
corps *precisely because* "assigned sector front may be disconnected from brigade location… to
avoid rear lock-in", then intersects it with the assigned sub-segment. For a restricted brigade
that intersection is a subset of the same sub-segment front whose BFS just failed, so the reroute
is a guaranteed no-op. The same holds for the eviction path.

Consequence: a brigade assigned to a single-OSID tooth can no longer evict itself from it, and can
no longer route around a disconnected front. It is not a freeze — `evaluateSectorMarch` returns
false and a later evaluator picks the brigade up — but the specific safety mechanism against
garrisoning a death-trap salient is dead for exactly the formations it was written for. Two tests
(`tooth_guard` Test 8, `retroactive_tooth_eviction` Test 1c) now assert that inertness.

The remedy has effectively moved from T2 self-eviction to a T1 corps reassignment, which is the
correct authority under the selected policy — but that is a real change in how a trapped formation
gets rescued, and it should be an explicit owner decision rather than a side effect. Flagged, not
decided here.

## Also open, recorded not fixed

- `offSectorFront` is now a membership test against the sub-segment rather than the sector, so a
  brigade on its own sector's front one sub-segment over is reclassified as off-front. NEW-3 is
  its real consequence.
- Rule 5b2 writes a first step into `column_march_orders`, contradicting the convention documented
  at `bot_brigade_eval_attack.ts:446-449`, so a reassignment advances one hop per turn even when it
  works. Pre-existing, outside this packet.
- Rule 5b off-scope nuance: for a brigade adjacent to enemy but standing off its own scope,
  `hasAdjacentTarget` can now be false where HEAD had it true, pushing it into the redeploy branch.
  Behaviour delta, not a defect; untested.

---

# Third pass — final two MINORs closed, and a correction to the NEW-3 escalation

## `friendlyHopsToSet` traversal divergence (closed)

The progress guard's own BFS traversed with a direct `political_controllers` lookup and strict
own-faction equality, while the producer it judges (`findNearestFriendlyOsidInSet`) uses
`getPoliticalControllerOSID` + `isFriendlyFaction`. A stricter verifier than producer denies the
exemption on exactly the routes the producer legitimately chose — the same predicate-divergence
class as BLOCKER 3b, reintroduced on a narrower population (reassignments whose path crosses
allied or reverse-map-only territory, or whose target is beyond the 24-hop cap).

Fixed: the traversal now uses the same two predicates and is uncapped, matching the producer's
uncapped BFS. It runs only on the rejection path, so cost is bounded.

## Comment defect (closed)

The exemption's docstring bullet was headed "NOT KEYED ON THE DESTINATION" while the body took and
gated on a destination. Rewritten as "KEYED ON PROGRESS, NOT ON MEMBERSHIP", with the traversal
properties documented where a reader of the exemption will see them.

It also now records the stronger reason for the progress guard, which came from review: at T6 the
exemption is **not** gated on `order.owner`, so an order-level waiver there would have exempted
untagged operation, reserve and home-return orders too — handing a reassigned brigade a total
exemption from correction. The progress test closes that as well as the stale-order case.

## CORRECTION to the NEW-3 escalation — T1 does NOT cover it

An earlier draft of this report said the remedy for a brigade stuck on a risky tooth "moves from T2
self-eviction to a T1 corps reassignment." That is WRONG and is withdrawn. Two reasons:

1. **Wrong granularity.** `sector_reassignment_orders` moves a brigade between SECTORS. A tooth is
   a single-OSID SUB-SEGMENT, and the common case is a brigade stuck on a tooth *inside its own
   sector*. No corps-level channel moves a brigade between sub-segments of the same sector —
   `assignBrigadesToSubSegments` owns that boundary and re-derives it from affinity each turn.
2. **No risk signal exists upstream.** `buildSectorReassignmentOrders` (`commander/emit.ts`) is
   driven entirely by reserve shifts and empty-sector relief — density, not danger. And
   `subsegment_assignment.ts` contains zero references to `isMovementDestinationRisky`, salient or
   cut-off; its affinity scoring uses enemy counts, `length_edges`, `WIDE_SEGMENT_THRESHOLD` and
   commander aggressiveness. The tooth-risk signal (≥3 enemy neighbours, or ≤1 friendly neighbour)
   exists only in `graphAnalysis`, which is a **T2** input. Nothing at T1 can see that a brigade is
   sitting on a death-trap salient.

**Honest statement for the owner:** the selected policy REMOVES the only mechanism that evicts a
brigade from a risky tooth, and no existing tier replaces it. A replacement would have to be
BUILT — a risk term in sub-segment affinity, or a corps-level tooth-relief channel. This is a
capability the policy costs, not one that relocates. It is the single open decision from this work.

## Review verdict

The independent reviewer's final verdict: all three original BLOCKERs and all three MAJORs closed
at source level rather than at test level; no blocker remains; merge and run the 39-week.
