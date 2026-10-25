# Independent turn-2 consumer and canon review

## Verdict

**Actual proof: PASS, bounded.** The preserved normal-player turn proves that the `arbih_182nd_vitezka_light` Delijas column order survives canonical load and the pre-pipeline adapter unchanged, then is first removed by the executed `osid-column-movement` phase as `no_friendly_path`. The rejection records routing corps `arbih_1st_corps`, an 83-OSID sector-derived scope, and both source and destination inside that scope. A later phase reissues the Delijas order but cannot begin transit in the same turn. The four named control checks pass.

**Canon ruling: GO IN PRINCIPLE for a narrow T3 routing repair.** At physical execution, use the existing terrain-weighted faction-friendly/allied Dijkstra without `buildCorpsAllowedOsids` as an intermediate-node mask. Retain every destination-authority, operation, player-order, ownership, enclave, and political-control guard. This is supported directly by `MOVEMENT_AUTHORITY.md` section 2a: routine scope limits destinations and explicitly must not constrain every intermediate route node. The Rulebook defines column movement as multi-hop movement through friendly rear, while the Rulebook, Systems Manual, and ADR-0006 say a corps sector is a standing-OG assignment/frontage entity with no political-control or territorial ownership meaning.

This ruling does not depend on the bot save having zero serialized sectors. That save is trajectory evidence only; it does not reveal the bot's unseen turn-2 phase input. The defect is independently established by the normal-player phase boundary plus the governing movement rule.

## Actual evidence and limits

- The run was one authorized player-only production turn, 2.645 seconds wall-clock by its receipt, with child/wrapper exits `0/0`, no timeout, stable entry bytes, and a passing artifact contract.
- Input was the authenticated canonical player post-turn-1 state. The order was `Luke -> Delijas`, `stance: column`, `owner: bot_discretionary`; movement state was absent.
- The adapter made no order/state change. `osid-column-movement` was the first named change, deleting the order without creating transit and emitting `no_friendly_path`.
- The later order reissue confirms the intended destination persists. It does not repair the lost execution opportunity.
- The retained no-turn reader shows all 712 post-turn-1 controllers and the 182 order match, and finds a faction-friendly route `Luke -> Budmolici -> Dzepi_2 -> Tusila -> Trnovo -> Kijevo_2 -> Delijas` while the 83-OSID corps-restricted search returns null.
- The earlier paired attempt remains a failed diagnostic. Its authenticated bot half and the successful player-only continuation are reused as separate evidence; neither is relabeled as a successful paired run.
- This proves the player turn-2 consumer boundary and the over-restrictive route mask. It does not prove that this repair moves brigade 109, restores any of the seven lost historical cells, or reaches 707/712.

## Smallest safe implementation scope

Change only the T3 physical-route call in `processOsidColumnMovement` (or an equivalently narrow helper used only there): omit the corps-sector `allowedOsids` argument from `dijkstraFriendlyPath`. Preserve the existing Dijkstra, its terrain costs, strict OSID tie-break, faction-friendly/allied controller check, and destination.

Keep unchanged:

- `isRoutineScopeEnforcedForOrder` and `routine_destination_out_of_scope`;
- operation staging/approach authorization, sector reassignment, priority/reinforce authority, player-order precedence, loan/home-corps resolution, and order owner;
- T1/T2 selection, destination, assignment, and enclave eligibility;
- political control, attack/control writers, supply state, and phase order;
- the no-path rejection for routes blocked by hostile political control.

`routing_scope_osid_count` may remain diagnostic context, but must not gate intermediate traversal. A comment calling the standing-OG footprint “corps territory” should be corrected because canon says sectors do not own territory.

Do **not** change `sector_offensive_launch_helpers.ts` in this repair. Its use is an operation-admission/planning feasibility question rather than the observed T3 consumer defect. Review it separately only if a concrete operation fixture shows that its corridor mask conflicts with its own admission contract.

## Alliance, supply, and enclave constraints

- **Alliance:** keep the existing `isFriendlyFaction` predicate. Removing only `allowedOsids` makes the already-authorized faction-friendly/allied graph available consistently; it does not create a new alliance policy.
- **Supply:** T3 Dijkstra currently does not consume supply state. This patch must neither add a supply exception nor treat supply reachability as movement authority.
- **Enclaves:** retain all T1/T2 enclave destination and donor-eligibility guards. Add a focused regression showing an enclave-tagged formation cannot use the broader intermediate search to escape an enclave or reach a destination that existing enclave authority rejects. If implementation changes enclave legality or a Srebrenica/Žepa outcome by design, `SENSITIVE_HISTORY_DESIGN_GATE.md` section 6 requires gameplay-programmer plus historian sign-off. A generic corridor-mask correction with enclave behavior demonstrated unchanged does not itself invoke that panel.

## Minimum proof before campaign measurement

1. A focused topology where source and authorized destination are inside the same corps footprint, the only friendly route crosses friendly OSIDs outside it, and the sector-reassignment column begins transit on the canonical path.
2. A hostile or non-friendly intermediate still yields `no_friendly_path`.
3. A routine destination outside its assigned subsegment still yields `routine_destination_out_of_scope`.
4. Enclave destination/escape guards remain binding; operation, player, and higher-priority authority cases retain their current outcomes.
5. Reversed graph/sector insertion yields identical path, cost, transit state, and report; save/load preserves the accepted order/transit.
6. Run the focused column-movement, movement-authority, and corps-boundary suites plus non-incremental typecheck. Independent review must cover canon, systems boundaries, and determinism.

Only after those pass should the owner authorize the governed historical calibration run. The acceptance gate remains **t39 at least 707/712 with zero formerly-correct losses**. The current qualified 700/712 and seven losses remain unresolved; focused tests and this diagnosis waive nothing.

## Bound evidence

- HEAD: `29b2cf9b67a9bf9e3529d3c684f0e3a25495abc0`
- turn-2 entry: `5e4ca0429e8f06e2da1f2f155da29043af7f467e05394af5e44f87c846a9f765`
- turn-2 receipt: `9ab5f34e03dc654c8d85b8148bceec67bb0d30a9fabf468a7441f5dcf6c0216a`
- dependencies: `1aff208ef60ae9762b99cb150ca247ddaa35e404e1d2837444a75d2c544a8d8f`
- boundary: `ed16ee8aa7814224765c1cc74906581ae2776a7046615effaecbb364fa7cda84`
- result: `3fb0bb7679f93a004e473bcbcda497851c4f4bdd39075927a26bf07ffe84a3f1`
- retained route reader result: `39743b98af25fa89931059de656c5bff2e26b3a9cb4990666961893a1e96d7a9`
- `MOVEMENT_AUTHORITY.md`: `de0cbdb5ddc8a1378c9de07a69e105a9c3ee2ba137583c90db762f3e5da33a42`
- `Rulebook_v0_9_0.md`: `3af8cbc4dab090d307ada0d5b72cf96aed4a0dd367aabeae8a137ea9c4858772`
- `Systems_Manual_v0_9_0.md`: `3735d8a6e1d3d89b6070f686bb463c28ba8acca2acf55f0f5c74fb6f1af1236b`
- `Engine_Invariants_v0_9_0.md`: `445c3a78304c8a84db9ba7c94403f183882d6128947a3da5ec2e9235287c7227`
- ADR-0006: `68db00e15a2df359037c72876d0b608d6c31e98fe4ef09f93b386aa962a4f921`
- `osid_column_movement.ts`: `a3600a86885ecd34bb976dd92e784c0f01fe8c1796d66bd2039cf5bae46a6489`
- `sector_offensive_launch_helpers.ts`: `7c86a56bda1dfbca6894eaa64059f7c030b37ee8db140d41ad931b221aa01e19`

