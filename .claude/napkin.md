# Napkin Runbook Index

## Curation Rules
- Read this index every session; read topic archives only when relevant.
- Max 10 entries per category; adding an index entry must evict or demote one from that category.
- Keep recurring, high-value rules only; each entry includes a date and Do instead action.
- Full pre-restructure archive: [full_archive_20260708.md](napkin/full_archive_20260708.md).
- Topic archives: [QA gates](napkin/qa_gates.md), [unreported sparse truth](napkin/unreported.md), [map counters](napkin/map_counters.md), [release process](napkin/release_process.md), [engine runtime](napkin/engine_runtime.md), [Warroom/legacy](napkin/warroom_and_legacy.md).

## Current Release State
1. **[2026-08-15] R7 is the current 1.0 critical path; narrow RC is closed**
   Do instead: execute R7 Phase 1.2, then officer/OOB, audio, English accessibility/readability, opening screens, and packaged proof; continue to R8/R9. D-topology is post-1.0/reserved.
2. **[2026-08-15] Retain collapse v3 selection plus reversible D-shape**
   Do instead: preserve the default-OFF two-turn selector and 4.0/0.5 shock/recovery union pass. Do not revive struck breadth tuning; any RBiH/RS Tier-0 opening or neighbour topology requires fresh Section 6 and paired 188w evidence.
3. **[2026-08-15] D-shape proved a live writer, not protected-boundary campaign reach**
   Do instead: cite the `70d5e04c6f49e041` pair as one live non-enclave HRHB write with full protected absence. Keep the discriminating G1 fixture as protected-input proof, and rerun if faction gates/topology change.
4. **[2026-08-15] R7 remains open after RC; localization does not gate 1.0**
   Do instead: finish historical/source remediation, officer/OOB provenance, audio/licensing, English accessibility/readability, opening screens, and packaged proof before R8. Keep `bs` migration, pseudolocalization, Bosnian completion/native review, and locale-specific proof in post-1.0 Phase 3.
5. **[2026-08-15] Publication remains separately authorized**
   Do instead: transient validation packages are allowed, but do not sign, upload, create a public release, or tag `1.0` without an explicit `Publish 1.0` instruction.
6. **[2026-08-15] R7 Phase 1.2 live provenance census**
   Do instead: continue from 2,078 documented / 1,553 source-note / 0 source-floor / 11 actor-specificity / 0 source-tier claims. Keep the 12 known unindexed deposit claims auditable but non-player-facing; mirror every live essay metadata fix into `essay_index.json`. The corpus test now requires the player-facing essay source-floor queue to stay empty.

## Execution & Validation
0. **[2026-08-12] ANY territory-moving change needs 188w — the "catalog-only" carve-out is WITHDRAWN**
   Do instead: treat 40w/43w as a DEVELOPMENT loop only. A one-line objective addition measured +3 with zero regressions at 43w and −26 with two anchor flips at 188w. 43w faithfully reproduces turn-43 state (~4 min vs ~20) so it is useful for iterating — never for adopting. Only provable byte-identity earns a short-horizon-only GO.
0b. **[2026-08-12] Judge findings mechanism-first, not delta-first**
   Do instead: state conclusions as a traced causal chain (this brigade, this turn, this roster) — those survived a session that refuted four separate delta-based readings. Distinguish real cost from op-stream churn by whether damage is CONTIGUOUS with a named mechanism's home region or scattered.
0c. **[2026-08-12] Check the inert-lever list before spending a probe run**
   Do instead: `planning_duration` is inert for ANY op whose brigades are already pre-staged (`stagedEarly` short-circuits the launch gate) — not just event-trigger-bound ops. See `docs/life_lessons/calibration.md:361`. A run was wasted rediscovering this.
0d. **[2026-08-12] Never background a run inside an already-backgrounded call**
   Do instead: one `run_in_background` per run. Chaining `cmd &` inside it orphans the run — the notification fires on the wrapper and the scenario dies mid-flight.
0e. **[2026-08-12] `matched_osids` is HARD-GATED at 622 — it is NOT advisory, whatever a packet says**
   Do instead: read `engine_health_gate.cjs:345-357` before quoting acceptance criteria. SIX hard checks (all integer) + ONE advisory float (`kw_ratio`, `soft()`); `fail = hardFail || (strict && softFail)`, so never pass `--strict`. The 622 floor is the ONLY criterion that would have caught EH-3's −39 (it passed 30/30 anchors and every §6 invariant). Cross-platform authority = the structural fingerprint, NOT the health gate.
0f. **[2026-08-12] Two persisted numbers can be the SAME quantity at different pipeline stages — check which stage governs**
   Do instead: `force_assessment.total_surplus` (assess-stage, `force_eval.ts:246-249`) vs `zone_assessments[].surplus_brigades` (allocate-stage, after `allocate.ts:277` applies the must-hold multiplier) disagree by construction — 5 vs `[]` for `vrs_drina`. I read the wrong one and wrongly "corrected" a correct agent report. Also: `surplus_brigades` is nested INSIDE `zone_assessments[]`, so a top-level key listing will not show it. Ask which stage the consumer reads.
0g. **[2026-08-12] "Arbitrary" is not "nondeterministic" — and a tolerance band in a comparator creates the latter**
   Do instead: catalog-order selection is fully deterministic (same input ⇒ same output); it is *sensitive*, not nondeterministic. Never use a tolerance band as an equality predicate in a sort comparator — non-transitive ⇒ implementation-defined `Array.prototype.sort` (measured: 9 distinct outputs from 120 permutations of one real 5-brigade axis), and local Node is v24 vs CI 22. Use integer bucketing `Math.floor(x / BAND)` as a PRIMARY sort key, terminating in `strictCompare(id)`.
0h. **[2026-08-14] Mutate at EVERY layer the guard claims to cover — the uncovered one is the wiring, not the function**
   Do instead: for each guard ask "is the CALLER forced to use this?", not just "does the function behave?". An implementer ran five honest mutations on the collapse flag-lifecycle fix and still shipped a net that did not catch its own defect — all five hit the pure-function layer, which was already well covered. Conditionalizing the CALL (`if (env) { applyGate(); }`, the original bug verbatim) left all 11 tests GREEN. Same shape twice in one commit: the §6 run-selection helper is genuinely behavioural, but the suite's USE of it is pinned by grep (`src.includes('selectS6RunDirs(')`, `/mtimeMs/`, `/statSync/`) — keep the call, ignore its result, and the pins pass; a `fs/promises` `stat()`+`.mtime` variant contains neither literal. Fix is one line: assert the consumed value EQUALS the helper's output. **But an equality pin catches DIVERGENCE, not the banned MECHANISM** — the honest bypass (mtime DESCENDING, i.e. newest-first, which is what the original defect actually did) passed the new seam pin 7/7, because on this checkout mtime-newest and counter-newest are THE SAME DIR. The most likely bypass evaded both pins on coinciding-by-luck, not by design. So keep BOTH and know what each buys: the grep bans the mechanism, the equality pin binds the answer. Ban the bare token (`mtime`, not just `mtimeMs`) and the async surface (`fs/promises`) — safe when the matcher strips comments first. Third vacuous-guard shipment in this repo; caught only by an independent reviewer told to treat "mutation-verified" as a claim to TEST, not a fact to accept.
0k. **[2026-08-14] "The guard is at the right place" is NOT "the guard is reached" — verify REACHABILITY, then mutate it away**
   Do instead: after locating a guard, ask what input actually arrives there. The §6 canon seat traced every writer of `collapse_damage`, correctly concluded the guard sits at the write root, and called the property STRUCTURAL — then a mutation deleted that guard and **all 21 tests stayed green**. The site has one caller, downstream of a loop-skip that already `continue`s on every guarded OSID, so for guarded input the line is unreachable and no behavioural test can distinguish its presence. Its own self-correction, worth quoting: *"I verified the guard is at the write root; I did not verify the write root is reached by guarded input."* **THE HAZARD IS AN ORDERING OF TWO INDIVIDUALLY-SAFE EDITS:** delete the redundant guard (green, net silently gone), later delete the load-bearing one believing the first covers it ⇒ breach with a green suite. Remedy: document WHICH of N guards is load-bearing (not just that N exist), and where a behavioural test is impossible-by-construction, a source-text pin is the only available instrument — pin the PREDICATE CALL, and put the reason in the failure message, because *pins get removed by people who do not know why they exist*.
0j. **[2026-08-14] NEVER `git checkout --` in a tree another agent is working in — copy the file aside and restore from the copy**
   Do instead: `cp file file.bak` before mutating, restore with `cp`, delete the backup. A reviewer reverting its own mutation with `git checkout -- tests/collapse_phase1_g2_section6_invariant.test.ts` **silently discarded another agent's UNCOMMITTED seam pin** in the same file, then measured and reported a degraded 39/40 (true count 40/40). The implementer had written it, verified it, reported honestly, and been rolled back after its measurement — so BOTH agents reported truthfully and the tree disagreed with both. Same hazard class as committing in a running agent's worktree. Corollary: **a report is only true as of its last measurement, and in a shared tree that window is short** — re-verify immediately before reporting, and treat a count that disagrees with your own file list as the tell.
0i. **[2026-08-14] A loop over an empty key set is a green test that asserted nothing — carry a LIVENESS COUNT**
   Do instead: assert how much was COMPARED, not just that violations were zero. Measured on the current §6 sentinel: `collapse_damage.by_entity` 0 keys, `capacity_modifiers.by_sid` 0 keys, `loss_of_control_trends.by_settlement` 0 records — so ten per-OSID `toBeUndefined()` assertions pass on empty maps and all three full-keyspace loops iterate ZERO times, while the receipt still prints `sentinel=EXECUTED`. Pattern: `expect(comparedCount).toBe(84)` beside `expect(violations).toEqual([])`, and emit the count in the receipt (`EXECUTED(keys=84)`). Same false-green class as `it.skipIf`, arriving by a different route.
3. **[2026-06-26] Packaged runtime resources are release inputs**
   Do instead: keep desktop/full-suite filters covering data/derived, data/ui, scenarios, assets, icons, package locks, and release workflow edits.
5. **[2026-07-06] Output-changing branches need baseline reconciliation**
   Do instead: run npm.cmd run test:baselines; if intentional, refresh with the documented strict rerun path and ledger note.
6. **[2026-07-07] Engine-health refloors use the gate path**
   Do instead: reproduce with engine_health_gate.cjs, update through the gate command, rerun strict JSON, and record evidence.
7. **[2026-07-12] Electron replay proof is an exact-turn hard gate**
   Do instead: bind the actual Electron log and autosave; validate scenario/faction/full control timeline, tour all required surfaces, enforce 12px unclipped essential text and clean runtime/network output, and retain Records/Chronicle screenshot evidence.
8. **[2026-07-17] CI tests cannot depend on local evidence roots**
   Do instead: keep executable QA harnesses under tracked `tools/`; write generated screenshots, saves, and logs under excluded `tmp-*` roots, and prove harness contracts from a clean-checkout path.

## Domain Behavior Guardrails
0. **[2026-08-12] Painted control has FOUR snapshots — a source comment citing one is a trap**
   Do instead: check `jan1993`/`apr1994`/`apr1995`/`oct1995` before acting on any "painted = X" comment. Objective removals justified as "painted RBiH" were true only at oct1995 and made the other three wrong. Objective STRIPPING keys on LIVE control (`buildAxesFromDef` → `getPoliticalControllerOSID`, at INJECTION), never on painted — that confusion sent a 4-specialist panel to a two-thirds-wrong diagnosis.
0b. **[2026-08-12] The BB corpus is local — do not reach for external sources**
   Do instead: `docs/Balkan_Battlegrounds{I,II}.pdf` plus the 406-page extraction at `data/derived/knowledge_base/balkan_battlegrounds/pages`. BB **is** the CIA product. Note the KB indexes by **PDF page** while citations use **printed folio** — BB2 offset is **+19** (KB `BB2_p0478` = printed 459). Coverage: BB1 printed ~19-526 in patches, BB2 printed ~382-541.
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
8. **[2026-07-13] Paramilitary truth has one bounded lifecycle and three ledgers**
   Do instead: reject exact and adjacent organized defense before dispatch; expire spawning and active formations after week 20; dissolve to inactive/disbanded/degraded with zero personnel; write civilian deaths to casualty, event, and municipal `lost_population` ledgers; attribute captures as `paramilitary`, never combat. If defense arrives after dispatch, retreat and dissolve without capture or defender losses.
9. **[2026-06-24] Srebrenica/Zepa fall receipts are event-owned**
   Do instead: keep Krivaja/Stupcanica as chronology/AAR context, not fall-delivery tuning.
10. **[2026-07-12] Records owns operation truth; Chronicle owns one narrative**
   Do instead: project active/history lifecycle once with stable IDs and explicit exclusions; count AAR captures only from attack-backed receipts; grade zero attempts as one-star no-assault with no duration reward; cap ending-force scoring at 100; let Records show the full ledger; and let Chronicle emit exactly one entry per visible completion.

## Map & UI Shell
1. **[2026-07-05] Deck counters are screen symbols, not terrain decals**
   Do instead: keep tactical Deck overlay non-interleaved and counter/label layers depth-disabled.
2. **[2026-07-09] Critical counters do not wait for idle**
   Do instead: render the DOM fallback as soon as control GeoJSON is ready; keep optional overlay sources out of counter readiness gates.
3. **[2026-07-12] Tactical readiness is state-revision readiness**
   Do instead: keep the loading surface active until the required control source and formation counters have rendered for the current turn and loaded-save fingerprint; timeout only required-source failure and leave optional MapLibre errors diagnostic.
4. **[2026-07-04] Stack counters in pixels, not coordinates**
   Do instead: anchor to OSID coordinate, apply Deck pixel offsets, and verify against live UI occluders by screenshot.
5. **[2026-06-25] Formation physical anchors differ from navigation anchors**
   Do instead: use physical location_osid for counters, hovers, stacks, arrows, and settlement truth.
6. **[2026-06-26] Global shortcuts respect focused controls**
   Do instead: guard app-level handlers with interactive-focus checks and use modified shortcuts for global cycling.
7. **[2026-07-12] Map context and telemetry must be bounded**
   Do instead: clear tactical overlays/selections before Warroom transitions; release MapLibre/Deck contexts and callbacks on unmount; expose only bounded aggregate formation-counter status in DOM telemetry.
8. **[2026-07-12] Named counter controls own exact selection**
   Do instead: synchronize accessible DOM counters on camera movement, filter live chrome occluders, and open the button's exact formation id even when its OSID is stacked; keep generic Deck hits stack-aware.
9. **[2026-07-12] QA routes must be visibly mounted**
   Do instead: require visible parent surface, visible target control, and visible changed destination; hidden React/Warroom copies in the DOM are not player-reachable proof.
10. **[2026-07-15] Modal completion actions stay outside narrative scrolling**
   Do instead: keep the only acknowledge/commit action in a persistent footer and scroll the long dispatch body independently; pin DOM ownership and inspect a real Electron viewport.

## 2026-08-15 - Name actors at the claim boundary

The sensitive-history inventory's `both sides` / `all sides` pattern found ten genuinely vague combined-party formulations and one spatial phrase (`surrounded on all sides`). All required review, but only the former required actor attribution.

**Reusable rule:** resolve generic-symmetry findings by reading the full claim, naming the political or military actors supported by its evidence, and preserving asymmetric responsibility. Recast spatial collisions without changing meaning. Keep the player-facing actor-specificity queue pinned at zero and mirror every essay edit into the runtime index.

## Engine Runtime Patterns
1. **[2026-07-13] Terminal lifecycle truth must close live synthetic commands**
   Do instead: project authoritative event flags through persisted lifecycle state, retire synthetic commands only after spawned subordinates are gone, and hide them from live UI without deleting historical AARs.
2. **[2026-06-30] War spawn directives run during War turns**
   Do instead: run deterministic pool-to-formation spawning before reinforcement for spawn-capable directives.
3. **[2026-06-30] Final geometry can reopen front-sector coverage**
   Do instead: rerun dropped-front recovery after final-save geometry projection and classify no-donor scarcity honestly.
4. **[2026-06-29] Sector defense cannot suppress local militia floor**
   Do instead: merge physical target defenders first and preserve the shared militia-defense floor.
5. **[2026-06-23] Same-faction sector edge ownership is singular**
   Do instead: canonicalize duplicate sector edge ownership deterministically after side-coverage recovery.
6. **[2026-05-22] COHA expiry must clear combat suppression**
   Do instead: set coha_active: false on expiry; history flags alone must not suppress late-war combat.
7. **[2026-07-12] Desktop mutations are serialize-autosave-broadcast transactions**
   Do instead: converge mutating IPC on the canonical helper, roll back in-memory serialization on autosave failure, and broadcast the persisted state to every renderer including the caller.
8. **[2026-07-12] Recruitment shares eligibility and physical placement truth**
   Do instead: use one evaluator for catalog/apply, preserve autonomy 0/1 player exclusion and autonomy 2+ staff control, and require a controlled home-municipality `location_osid`; command anchors are not placement.
9. **[2026-07-15] Active assignments retain transit intent**
   Do instead: while an elite loan remains active and the formation is outside receiving territory, retain or reacquire a valid deterministic column order; match simultaneous reserve requests globally so one brigade cannot satisfy multiple requests.
10. **[2026-07-15] Empty fronts require call-chain and movement proof**
   Do instead: verify canonical helpers have production callers; distinguish legal isolation from reachable gaps; resolve reachable gaps through explicit T1 intent, T2 routing, and delayed T3 movement, while marking no-donor sectors `unstaffed_front` instead of teleporting or paper-staffing.

## Shell & Command Reliability
1. **[2026-06-06] Windows-safe local CLIs are repo contract**
   Do instead: use local package entrypoints or repo wrappers; do not rely on PATH/.bin luck.
1b. **[2026-08-10] node_modules/.bin can be unpopulated on a checkout — `npm run` then fails silently on `tsx`/`tsc`**
   Do instead: run `npm rebuild` to repopulate `.bin` (confirmed fix — 237 entries restored, all subprocess-spawning tests that shell out via `npm run` then pass). Until then, invoke entrypoints directly: `node node_modules/tsx/dist/cli.mjs <script.ts>` and `node node_modules/typescript/bin/tsc --noEmit`. This caused 6 of 15 `test:vitest:fast` failures this session (audit_state/political_control_audit_cli/data_extract1990/desktop_sim_bundle_smoke) — all local-environment noise, NOT code regressions; CI's fresh `npm ci` would not reproduce this.
2. **[2026-06-26] Generic abort filters are too broad**
   Do instead: ignore only deliberate subframe or named teardown aborts; keep real request failures reportable.
3. **[2026-06-26] Browser gates use tileless proof by default**
   Do instead: let gate launchers disable PMTiles unless the test explicitly needs tile binaries.
4. **[2026-07-12] Direct Electron QA requires its tactical Vite host**
   Do instead: start `npm.cmd run dev:map -- --port 3002 --strictPort`, verify HTTP readiness, then launch the direct Playwright/Electron harness; classify missing-host startup timeouts as harness precondition failures.
5. **[2026-02-21] Avoid giant expanded path lists**
   Do instead: run rg on roots or use targeted file lists when the repo has huge generated/vendor directories.
6. **[2026-07-17] Poll browser-owned fixture status**
   Do instead: start large renderer save loads behind a unique token and poll synchronous browser-owned status from Node; do not directly await a churn-prone renderer promise through `Runtime.callFunctionOn`.

## User Directives
1. **[2026-08-15] Do not stop for routine implementation decisions**
   Do instead: decide from canon/evidence or convene the Pyrrhic panel; continue until a genuine authority/safety blocker or the active roadmap outcome is complete.
2. **[2026-06-20] Do not edit FORAWWV automatically**
   Do instead: flag design insights for a Pyrrhic panel; only edit canon with explicit approval.
3. **[2026-06-26] Packaging remains paused until owner satisfaction**
   Do instead: use release checks/probes as verification, but do not create installer/release artifacts as product work before D2/D3 gates.
