# Independent T3 physical routing implementation review

## Verdict

**GO — no blocking correctness, canon, ownership, or determinism finding in the frozen change.**

The production edit is confined to `processOsidColumnMovement`: it stops passing the corps-sector footprint as an intermediate-node allow-list to the existing terrain-weighted faction-friendly Dijkstra. Destination authority still executes before pathfinding; political controller/alliance traversal, terrain cost, strict OSID tie-breaking, order owner, transit duration, location immobility at start, and no-path rejection are unchanged. `dijkstraFriendlyPath`, `buildCorpsAllowedOsids`, and `sector_offensive_launch_helpers.ts` are unchanged.

The diagnostic fields that formerly described the applied corps mask are now `null`, which truthfully reports that T3 applied no routing-scope mask. The diagnostic still reports formation/loan/routing identity and the rejection reason.

## Canon and system boundary

The change implements the approved boundary in `MOVEMENT_AUTHORITY.md` section 2a: routine scope constrains the destination, never every intermediate node of a permitted route. It also matches the Rulebook's multi-hop friendly-rear movement and the Systems Manual/ADR statement that sectors are standing-OG frontage and assignment snapshots, not territorial ownership.

Existing authority remains in the correct tiers:

- T1/T2 continue to choose assignments and destinations.
- `isRoutineScopeEnforcedForOrder` still rejects unauthorized routine destinations before transit.
- Operation and player-authorized orders keep their existing precedence and owner.
- T3 continues to require politically friendly, allied, or unoccupied intermediate OSIDs and only executes the chosen destination.
- Supply is neither added as authority nor bypassed; this T3 pathfinder did not consume supply before the change.
- Enclave destination legality remains a T2 producer responsibility in `bot_brigade_eval_front.ts`, where `restrictSectorMarchDestinations` and final enclave guards are unchanged. The removed corps footprint was not an enclave boundary and always exempted the destination, so it was not an enclave destination guard.

No sensitive-history panel is triggered by this generic routing correction because enclave mechanics and authored sensitive outcomes are unchanged. If later work changes enclave destination legality or Srebrenica/Žepa mechanics, the gameplay-programmer plus historian requirement applies then.

## Test and retained-production evidence

- RED: 2 expected failures with 30 passing, covering the friendly route outside the corps footprint and truthful null diagnostic scope.
- GREEN: 5 files, 163/163. The suite covers column movement, shared routine scope, reserve/loan boundaries, and unchanged enclave displacement behavior.
- Final tightened unit: 32/32. The new positive test checks exact path, owner, no teleport, reversed edge/sector insertion equality, and serialized state round-trip. The negative test retains `no_friendly_path` when an intermediate is hostile. Existing routine-scope tests retain out-of-subsegment rejection and operation/player authorization behavior.
- Typecheck exits 0 after final test tightening. `git diff --check` exits 0.
- Fresh retained production player turn 2 used the exact frozen source hash. Phase 34 starts transit on the expected seven-node friendly path with `turns_remaining: 4`, retains `owner: bot_discretionary`, leaves physical location at Luke, emits no column rejection, prevents later reissue, and retains the four expected RBiH controls. Child/wrapper exit `0/0`; artifact contract passes.

The enclave movement destination observer was not rerun in the implementer's five-file batch. This is not a blocking gap for this two-file change: the enclave producer and predicate are outside the diff, the removed T3 mask was neither enclave-specific nor a destination guard, and existing source/tests pin those T2 exits. The next broader validation should include the existing enclave/sector-march suite rather than adding an enclave rule to T3.

## Scope limits and remaining gates

This review establishes the narrow implementation and the observed player turn-2 transit only. It does not establish brigade 109's turn-6 movement, a historical score improvement, or qualification.

Before adoption as a qualified calibration result, the owner still must run the already-governed broader suite and historical campaign plan, including provenance/anchor review. The binding acceptance criterion remains turn 39 at least `707/712` with zero formerly-correct losses. The existing qualified `700/712` with seven losses remains unmet. Full suite, 188-week calibration, package/build/native validation, and final documentation/ledger work remain pending as reported by the implementer.

## Frozen bindings

- HEAD baseline: `29b2cf9b67a9bf9e3529d3c684f0e3a25495abc0`
- `src/sim/combat/osid_column_movement.ts`: `31de47a728a2382a23f4eb9a7f665f6c6f1fe5cbcef8d6da59d8221ec7d29c73`
- `tests/osid_column_movement.test.ts`: `e7276027be9ff0ae1888143d3e6fdeaeb1436d11ca6c384d44e0c1d2aa0f88d3`
- RED log: `ea4497c8bce372789d9e11d26061d420f320e8a5c2b4b8a7ae8d4a92cde7aae6`
- five-file GREEN log: `41d9c61e8320d6c975eda18d7ba55165564544d70fd259038b27f79c92b759e7`
- final 32/32 log: `a64e3f72b5df9f4f2e3b882a2f6826814a3a15a7a93073b93958981a245106ef`
- final typecheck log: `025017ea5dc29eb540825da9ff5c7b5c7d6db81cfd98633b026692edf3831584`
- retained production receipt: `3fdcaa95e90ebade5127133b0a452f184569947188dcac22865bd1127a769b9e`
- retained production dependencies: `1af43fc05cbb6c081e0a2b7f2db549f42a6b73d64f2b3bfe06b74c30d880be57`
- retained production boundary: `4e9eb753f9bab5281ada7f8f61b5c88ce4054a1c425684091b3c4ed614699d7d`
- retained production result: `d147a6e1046b71c03172c9c8c7f20c6779a0a1a1b64dbd96743c6293a1c10687`

