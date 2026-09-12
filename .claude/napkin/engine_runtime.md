# Engine Runtime Archive Pointer

Full pre-restructure archive: ./full_archive_20260708.md

Use this topic when working on war phases, sector construction, formation spawning, command authority, event system, scenario baselines, or deterministic scripts.

High-value current rule: player-only state is gate-invisible; campaign integrals must be contract tests, not assumptions.

## 2026-09-08 — Expanded decision IDs also need expanded receipt keys

When a player-action builder expands an authored response into per-unit IDs, carry the
authored notification payload under each generated ID as well. The resolver looks up the
chosen ID exactly; copying the original map alone silently loses notifications. Verify the
real resolver's emitted receipts, and use a non-target control when a choice names one unit:
the label and `target_formation_id` alone do not prove scoped mechanical effects. BC06's
decoration notification alias and selected-unit effect scope are repaired. Revalidate
the selected active friendly regular formation before any decision mutation; never fall
back to faction-wide effects for invalid targets. Check foreign non-target controls in
the canonical save, since the player projection intentionally hides those formations.


## Demoted from the napkin index 2026-09-10

Oldest two "Engine Runtime Patterns" entries, moved verbatim to bring that category back under
the napkin's stated 10-entry cap. Still true; just no longer session-start reading.

- **[2026-06-23] Same-faction sector edge ownership is singular**
   Do instead: canonicalize duplicate sector edge ownership deterministically after side-coverage recovery.
- **[2026-05-22] COHA expiry must clear combat suppression**
   Do instead: set coha_active: false on expiry; history flags alone must not suppress late-war combat.


<!-- relocated-from-index-2026-09-12:Player & Runtime Truth -->
## Player & Runtime Truth

0c. **[2026-08-12] The early-war force economy has no slack**
   Do instead: expect any added early objective to be paid for elsewhere. Two historically-correct fixes each took their target and each lost more globally (`kijevo_2` −26/2 anchors; `djulici` −6 via `rs_1st_birac` being simultaneously the Zvornik sweep's muscle and Birač's only garrison). Fix the force economy before adding objectives — `docs/plans/2026-08-12-r5-force-economy-engine-health-packet.md`.
1. **[2026-07-06] Player-only state is gate-invisible**
   Do instead: pin campaign integrals in contract tests; validate feel through owner diaries.
2. **[2026-06-26] Missing data is unreported, not favorable**
   Do instead: preserve null/reported flags and render Unreported; keep explicit zeroes as zeroes.
3. **[2026-06-24] Modal-required blockers are required regardless of visual severity**
   Do instead: derive Desk/pre-advance blockers from blocker contracts, not card severity alone.
4. **[2026-07-15] Operation authorization is factual and identity-stable**
   Do instead: use advisory copy and scenario-plan goals/force/command facts for `HISTORICAL_OP:*`; for ordinary Level-1 plans, emit only ready plans with targets, key the decision by exact corps+plan, and retain the resolution until admission/no-reprompt ownership is complete.
5. **[2026-07-10] Advisory copy follows blocker predicates**
   Do instead: use required-response copy only when the same row is a true blocker; filter decided paramilitary rows from manifests and preserve request mode metadata for truthful packets.
6. **[2026-07-11] Level 1 assisted execution is explicit broad staff control**
   Do instead: keep Level 0 manual except accepted `HISTORICAL_OP:*` participants; Level 1+ includes `player_faction` in deterministic corps/brigade staff execution via a merge pass that preserves player-staged attack/movement/posture orders; headless auto-control stays separate.
7. **[2026-07-15] Player/headless equivalence requires bound inputs, not matching labels**
   Do instead: inject accepted pre-planned operations before lifecycle advancement using `resolved_turn`; bind the Electron log/autosave and record target scope, event mode, decision timing, Army HQ ownership, proposals, and transcript. Name player paramilitary scope as unrestricted municipality selection with undefended-only generation. Categorize Electron-only actions as input divergence; only identical state plus phase inputs support nondeterminism claims.


<!-- relocated-from-index-2026-09-12:Operations & Narrative Truth -->
## Operations & Narrative Truth

1. **[2026-07-13] Paramilitary truth has one bounded lifecycle and three ledgers**
   Do instead: reject exact and adjacent organized defense before dispatch; expire spawning and active formations after week 20; dissolve to inactive/disbanded/degraded with zero personnel; write civilian deaths to casualty, event, and municipal `lost_population` ledgers; attribute captures as `paramilitary`, never combat. If defense arrives after dispatch, retreat and dissolve without capture or defender losses.
2. **[2026-06-24] Srebrenica/Zepa fall receipts are event-owned**
   Do instead: keep Krivaja/Stupcanica as chronology/AAR context, not fall-delivery tuning.
3. **[2026-07-12] Records owns operation truth; Chronicle owns one narrative**
   Do instead: project active/history lifecycle once with stable IDs and explicit exclusions; count AAR captures only from attack-backed receipts; grade zero attempts as one-star no-assault with no duration reward; cap ending-force scoring at 100; let Records show the full ledger; and let Chronicle emit exactly one entry per visible completion.


<!-- relocated-from-index-2026-09-12:Engine Runtime Patterns -->
## Engine Runtime Patterns
1. **[2026-08-31] Rear-pocket cleanup is consolidation, not enclave expansion**
   Do instead: allow paramilitary cleanup inside an authored enclave boundary, but require a CorpsOperation for outward territorial change. Keep the enclave list complete enough that legitimate interior cells are not accidentally blocked.
2. **[2026-08-31] Operation assembly is not six copies of the brigade attack floor**
   Do instead: count active, non-disrupted formation presence for an authored assembly contract; let the combined predictor judge strength. Keep the generic 500-person attack floor. Any exceptional operation execution multiplier must be persisted, bounded, applied per participating formation during execution in both prediction and resolution, and must never write control directly. Never derive a whole mixed stack's multiplier from its first attacker.
3. **[2026-07-13] Terminal lifecycle truth must close live synthetic commands**
   Do instead: project authoritative event flags through persisted lifecycle state, retire synthetic commands only after spawned subordinates are gone, and hide them from live UI without deleting historical AARs.
4. **[2026-06-30] War spawn directives run during War turns**
   Do instead: run deterministic pool-to-formation spawning before reinforcement for spawn-capable directives.
5. **[2026-06-30] Final geometry can reopen front-sector coverage**
   Do instead: rerun dropped-front recovery after final-save geometry projection and classify no-donor scarcity honestly.
6. **[2026-06-29] Sector defense cannot suppress local militia floor**
   Do instead: merge physical target defenders first and preserve the shared militia-defense floor.
7. **[2026-07-12] Desktop mutations are serialize-autosave-broadcast transactions**
   Do instead: converge mutating IPC on the canonical helper, roll back in-memory serialization on autosave failure, and broadcast the persisted state to every renderer including the caller.
8. **[2026-07-12] Recruitment shares eligibility and physical placement truth**
   Do instead: use one evaluator for catalog/apply, preserve autonomy 0/1 player exclusion and autonomy 2+ staff control, and require a controlled home-municipality `location_osid`; command anchors are not placement.
9. **[2026-07-15] Active assignments retain transit intent**
   Do instead: while an elite loan remains active and the formation is outside receiving territory, retain or reacquire a valid deterministic column order; match simultaneous reserve requests globally so one brigade cannot satisfy multiple requests.
10. **[2026-07-15] Empty fronts require call-chain and movement proof**
   Do instead: verify canonical helpers have production callers; distinguish legal isolation from reachable gaps; resolve reachable gaps through explicit T1 intent, T2 routing, and delayed T3 movement, while marking no-donor sectors `unstaffed_front` instead of teleporting or paper-staffing.
