# Napkin Runbook Index

## Curation Rules
- Read this index every session; read topic archives only when relevant.
- Max 10 entries per category; adding an index entry must evict or demote one from that category.
- Keep recurring, high-value rules only; each entry includes a date and Do instead action.
- **A written rule is the WEAKEST form of enforcement — treat every entry here as a candidate for promotion, not a solution.** Tier ladder: 0 impossible (the failure cannot be expressed) > 1 refused (blocked at the attempt) > 2 caught pre-merge (a test fails) > 3 caught post-merge > 4 prompted (a hook warns) > 5 written (here). On 2026-09-10, five rules from tiers 4-5 were violated in a single session, one of them written INTO the stash message that was then popped; everything that actually saved work that day was tier 0-2. **A tier-4 warning does not work: `guard_pipe_exit_code` fired on its violation twice and was stepped over both times.**
- **A COUNT WRITTEN INTO PROSE IS NEVER RE-DERIVED, AND THREE OF THEM WERE WRONG IN TWO DAYS.** `qwen3-coder` recorded at 8 prompt tok/s (measures **254**); the napkin's largest category reported as "0 entries" (it held **13,684 bytes**); the open-gates register's lesson-pointer backlog recorded as "160 of 244" (it is **15 of 23**, and was 20 in total at that gate's own commit). Each came from a pattern that could not match what it was counting, and each survived because nothing recomputed it. The 160 was the expensive one: it made an afternoon's cleanup read like a week, so nobody started. ⇒ **If a figure will be cited, make it a command, not a sentence** — `npm run gates`, `npm run receipts`, `npm run lessons:pointers`, `npm run local:benchmark`. ⇒ When you must write a number down, write the command that produced it beside it. ⇒ Re-deriving a cited figure before repeating it costs seconds; all three of these were repeated into decisions.
- **To promote an entry:** state the failure as a predicate over a concrete ACTION (not advice); find the earliest point that predicate is decidable; install at the strongest tier available there; PROVE it fires by mutation, or it is tier 5 in costume; record the tier reached. Templates: `tools/hooks/guard_stash_pop.sh` (blocks on command POSITION, so prose mentions stay writable) and `guard_pipe_exit_code.sh` (blocks only the narrow shape that is never intentional, advisory elsewhere). **Write the ALLOW cases first — all six defects across both guards were found by allow-cases, none by deny-cases, and a guard that blocks real work gets switched off.** Most entries here cannot be mechanised; the point is to find the few that can.
- Full pre-restructure archive: [full_archive_20260708.md](napkin/full_archive_20260708.md).
- Topic archives: [QA gates](napkin/qa_gates.md), [unreported sparse truth](napkin/unreported.md), [map counters](napkin/map_counters.md), [release process](napkin/release_process.md), [engine runtime](napkin/engine_runtime.md), [Warroom/legacy](napkin/warroom_and_legacy.md).

## Current Release State
1. **[2026-08-22] HV 1995 timing+mobility is one atomic candidate, and its first 188w result got worse**
   Do instead: keep all six defs at turn 174 in the same tree as both live T3 executor changes (`osid_column_movement` and `brigade_movement_orders`); never land legs with turn 150. The controlled combined run `...n227` scored **609/712, 31/31 anchors**: 3/6 wave formations recorded movement, 0 appeared in 637 full-stack battle records, and Mistral 2 stayed blocked through turn 188. Treat this as an engine-fix candidate with unresolved calibration/mechanism evidence, not a +16 lane.
2. **[2026-08-23] The CI/manifest anomaly is settled; reconcile pins only from byte-identical local/CI evidence**
   Do instead: compare actual hash values, not failure counts. Latest CI `32619857153` and a clean local run exposed the same 24 mismatch keys and all 24 local artifact hashes matched CI's actual hashes byte-for-byte. Across the previous CI run, 18 actual hashes stayed fixed and only six 188w hashes moved with the later accepted roster calibration. The workflow caches npm dependencies only, not scenario artifacts. This is sufficient evidence for the deliberate 24-pin reconciliation; it does not authorize an unrelated refloor.
3. **[2026-08-27] Reduced RE is seven 1.0 outcomes, not an engine-cleanup programme**
   Do instead: execute only P1, P2A, P2B, P3, P4, P5, P6, and P7 from the sole RE contract, one exact-file packet at a time. Use one implementer + domain reviewer + QA, one correction/confirmation pass, and no per-packet campaign. The corrected baseline's +3.62853% cost is watch-only; do not reopen pre-1.0 performance diagnosis. After all packets, run one final pair/profile and hand off to R8. Keep probe, calibration, scenarios, references, canon, active-strength, dissolution, enclave targeting, hostile breakout, and speculative mechanics outside RE.
4. **[2026-08-23] Phantom brigades require their military substrate; the synthetic JNA command is the sole exception**
   Do instead: never let temporary JNA/HV content manufacture an OOB. Require at least one non-phantom formation and the phantom's authored host-corps formation before spawn. Preserve `jna_herzegovina_command` as the single explicit exception because corps initialization synthesizes it after its subordinates exist. The 188w/52w artifacts stayed byte-identical; only the four premature HV rows left each synthetic 4w fixture.
5. **[2026-08-15] Retain collapse v3 selection plus reversible D-shape**
   Do instead: preserve the default-OFF two-turn selector and 4.0/0.5 shock/recovery union pass. Do not revive struck breadth tuning; any RBiH/RS Tier-0 opening or neighbour topology requires fresh Section 6 and paired 188w evidence.
6. **[2026-08-15] D-shape proved a live writer, not protected-boundary campaign reach**
   Do instead: cite the `70d5e04c6f49e041` pair as one live non-enclave HRHB write with full protected absence. Keep the discriminating G1 fixture as protected-input proof, and rerun if faction gates/topology change.
7. **[2026-08-15] Publication remains separately authorized**
   Do instead: transient validation packages are allowed, but do not sign, upload, create a public release, or tag `1.0` without an explicit `Publish 1.0` instruction.
8. **[2026-08-15] R7 Phase 1.2 provenance is a zero-queue contract**
   Do instead: preserve 3,642 documented claims plus 12 explicitly non-player-facing deposits, with zero unresolved player-facing rows. Keep essay metadata mirrored into `essay_index.json`; use leading provenance headers for inventoried TS/TSX/Markdown read models; narrow or omit unsupported specificity rather than clearing it with vague citations.

## Execution & Validation
0z. **[2026-08-26] YOU LEARNED THAT FIELD'S MEANING FROM ONE ROW — count the distribution before gating on it. RE-VIOLATION.**
   Do instead: **one `filter(has-tag).length` before you design.** Saw `placement:fixed_home_osid` on `arbih_115th_mountain` (a Stari Grad garrison, same OSID t0→t188, morale 100, cohesion 100, 2 battles in 188 weeks) and built a probe-pool exclusion on it, writing "fixed-home garrisons" into the scope.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0z)
0y. **[2026-08-26] A COUNTER THAT RUNS AWAY — ask what its INPUT is keyed on, not why the counter is wrong.**
   Do instead: `consecutive_probes` hit **38 against a cap of 2** and read as a broken counter; four mechanism hypotheses failed. The cause was two layers down: `sector_intel` is keyed on `sector_id`, and sector ids are **positional indices re-minted every turn** (`corps_front_sectors.ts:1643`), so one edge change orphans the record and confidence resets to the initial floor. **Median `turns_in_contact` 1-2 across three 188w runs, against a threshold needing ~18 uninterrupted turns — unreachable by construction.** ⇒ **Any state keyed on a per-turn-regenerated id has this defect.** Fix by deriving identity from CONTENT (smallest edge id under `strictCompare`, never iteration order), persisting it on the record, keeping the positional lookup as a legacy fallback. ⇒ **Related shape:** a fitness ranking can select for the unit LEAST able to do the job — `fitness = personnel × cohesion × fatigue` makes a brigade that never fights permanently the fittest, so it is picked, fails, stays perfect, and is picked again.
1. **[2026-08-22] A probe that cannot fail is indistinguishable from a probe that works**
   Do instead: give every monitoring/verification check a positive control before quoting its output. Five failures in one session came from a check answering a narrower question than the claim it carried — grep scoped to `src/` with an unscoped conclusion; `attacker_brigade` (first attacker only) read as non-participation; and **two "0 failures" reports on a gating suite produced by grepping `×` when vitest marks a failing FILE with `❯`**. Also: **Windows caches a file's size/mtime while a writer holds the handle** — a healthy 73-min run looked frozen for 33 minutes. File size is not a liveness signal here; process CPU time is. **[2026-09-09] UI proof:** wait for fonts/entry animation, measure text against its own clipping box, and inspect scroll fades at maximum scroll; fitting the outer card is not sufficient.
2. **[2026-08-12] ANY territory-moving change needs 188w — the "catalog-only" carve-out is WITHDRAWN**
   Do instead: treat 40w/43w as a DEVELOPMENT loop only. A one-line objective addition measured +3 with zero regressions at 43w and −26 with two anchor flips at 188w. 43w faithfully reproduces turn-43 state (~4 min vs ~20) so it is useful for iterating — never for adopting. Only provable byte-identity earns a short-horizon-only GO.
0o. **[2026-08-16] A DISPATCHED AGENT'S PLAIN OUTPUT IS INVISIBLE TO THE ORCHESTRATOR — only `SendMessage` lands. Say so IN THE BRIEF.**
   Do instead: every dispatch brief must state "report via SendMessage; plain output does not reach me", and every idle-without-report must be chased immediately rather than waited on.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0o)
0p. **[2026-08-17] A DIFFERENTIAL GUARD CANNOT CERTIFY HISTORICITY — it can only certify "no change". And an artifact-reading test cannot be attributed to source by re-running it.**
   Do instead: ask what a guard's predicate is keyed to. `collapse_s6_criteria_4_7`'s 7a says *"no OFF-baseline RBiH-held rim cell is newly lost in ON"* — which **makes the collapse-OFF baseline the definition of correct**, so where OFF is wrong ON is forbidden from correcting it, and the guard fires on corrections.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0p)
0q. **[2026-08-23] THE HEALTH GATE'S `dead_ops` COUNTS *INVALID* OPS, NOT *INERT* ONES — a green gate is NOT evidence operations ran. And `matched_osids` is NON-INJECTIVE.**
   Do instead: read `engine_health_gate.cjs:260` — `dead_ops: cc.invalid_operation_count`. Measured on the clean 637 baseline: gate reports `dead_ops: 0` while **13 of 42 operations recorded ZERO attacks and 21 captured ZERO objectives**.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0q)
3. **[2026-09-10] The local executor drafts; the planner judges — and prompt speed, not generation speed, decides which model**
   Do instead: run `npm run local:check`, then `npm run local:delegate -- --spec <task> --read <exact files>`, review the proposal, apply what is right, and prove it with `npm run gate:local -- --tests <files>`. The gate REFUSES (exit 2) when no tests are declared, because a gate with nothing to prove is not a passing gate. Measured on this box: a 9B that fits entirely in VRAM does 352 tok/s prompt; a 30B MoE spilling 6.3 GB to DDR4-2400 does 8 tok/s — ~50 minutes to read one 25k-token file, so the better model loses badly. `think:false` is separately a 30x effect. Never hand it a repo to explore: `App.tsx` alone is ~24,350 tokens. Full detail in `tools/local_executor/README.md`.

## Diagnostic Reasoning

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
0h. **[2026-08-14, merged 2026-08-16 with 0i/0k] VACUOUS GUARDS — a guard can be GREEN WHILE ASSERTING NOTHING. Three shapes, all shipped here.**
   Do instead: never accept "mutation-verified" as a fact; treat it as a claim to TEST. Ask three separate questions, because each shape survives the other two's checks.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0h)
0n. **[2026-08-16] A DERIVED ARTIFACT'S FRESHNESS IS A CONTENT QUESTION, NOT A CLOCK QUESTION — and a bare `ls` time is not a timestamp**
   Do instead: prove a rebuild by reading the value you changed OUT of the baked artifact, then by the contract suite that pins it (`startup_snapshot_contract` 18/18 — "baked April 1992 startup artifact matches canonical builder truth after checkout normalization" + "validator reports the committed artifact as current").
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0n)
0m. **[2026-08-16, generalised 2026-08-26] A LOOKUP THAT COULD NOT HAVE FOUND X IS NOT EVIDENCE THAT X IS ABSENT — this is a rule about ALL lookups, not just historical ones**
   Do instead: before recording an absence, name WHICH lookup you ran and what it could not have seen. **⇒ CODE SEARCH IS THE SAME RULE, and it was missed on 2026-08-26 precisely BECAUSE every example below is a historical-source lookup: a grep for the literal `readiness = 'active'` returned 2 hits and produced "nothing in the war pipeline restores readiness".**
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0m)
## Evidence & Tooling Discipline

0l. **[2026-08-16] A defect can arrive WITH A TEST DEFENDING IT — when a fix turns a test red, ask which one is wrong**
   Do instead: treat a red test on a correct fix as a hypothesis about the TEST, not proof the fix is wrong. R7 Phase 2 deleted two `war_crimes_record` entries (incl.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0l)
0j. **[2026-08-14] NEVER `git checkout --` in a tree another agent is working in — copy the file aside and restore from the copy**
   Do instead: `cp file file.bak` before mutating, restore with `cp`, delete the backup. A reviewer reverting its own mutation with `git checkout -- tests/collapse_phase1_g2_section6_invariant.test.ts` **silently discarded another agent's UNCOMMITTED seam pin** in the same file, then measured and reported a degraded 39/40 (true count 40/40). The implementer had written it, verified it, reported honestly, and been rolled back after its measurement — so BOTH agents reported truthfully and the tree disagreed with both. Same hazard class as committing in a running agent's worktree. Corollary: **a report is only true as of its last measurement, and in a shared tree that window is short** — re-verify immediately before reporting, and treat a count that disagrees with your own file list as the tell.
0r. **[2026-09-03] A documented derive script is not automatically a no-op — diff its output against the committed file BEFORE adopting it**
   Do instead: run the generator to a temp path and diff record-by-record against the tracked artifact; adopt only the records your change is about.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0r)
1. **[2026-07-06] Output-changing branches need baseline reconciliation**
   Do instead: run npm.cmd run test:baselines; if intentional, refresh with the documented strict rerun path and ledger note.
2. **[2026-07-07] Engine-health refloors use the gate path**
   Do instead: reproduce with engine_health_gate.cjs, update through the gate command, rerun strict JSON, and record evidence.
3. **[2026-07-12] Electron replay proof is an exact-turn hard gate**
   Do instead: bind the actual Electron log and autosave; validate scenario/faction/full control timeline, tour all required surfaces, enforce 12px unclipped essential text and clean runtime/network output, and retain Records/Chronicle screenshot evidence.
4. **[2026-09-03] Capture at the resolution you publish, read every frame, and verify the FILES not the run**
   Do instead: set the harness viewport to the delivery size (1920x1080) BEFORE a capture run, not after — a 1440x900 set had to be re-shot wholesale.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#8)
5. **[2026-07-17, twice re-violated 2026-09-03] CI tests cannot depend on local evidence roots — and the half that goes missing is usually the EVIDENCE, not the test**
   Do instead: keep executable QA harnesses under tracked `tools/`; write generated screenshots, saves, and logs under excluded `tmp-*` roots, and prove harness contracts from a clean-checkout path.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#9)
6. **[2026-08-15] Name actors at the claim boundary**
   Do instead: resolve generic-symmetry findings (`both sides`/`all sides`) by reading the full
   claim, naming the actors its evidence supports, and preserving asymmetric responsibility.
   Recast spatial collisions (`surrounded on all sides`) without changing meaning. Keep the
   player-facing actor-specificity queue at zero and mirror every essay edit into the runtime index.
7. **[2026-08-15] A prose source note is not a machine-readable citation**
   Do instead: give historical event metadata both roles — `historical_source` identifies the cited
   instrument, `source_note` explains which claims it supports and where the counterfactual
   boundary begins. Three HRHB decisions had exact pages, judgment sections and a resolved tier in
   `source_note`, yet all 63 owned claims read as uncited because no recognized citation key was
   present. When repairing older rows, promote only citations already present in the note.

## Domain Behavior Guardrails
1. **[2026-08-12] Painted control has FOUR snapshots — a source comment citing one is a trap**
   Do instead: check `jan1993`/`apr1994`/`apr1995`/`oct1995` before acting on any "painted = X" comment. Objective removals justified as "painted RBiH" were true only at oct1995 and made the other three wrong. Objective STRIPPING keys on LIVE control (`buildAxesFromDef` → `getPoliticalControllerOSID`, at INJECTION), never on painted — that confusion sent a 4-specialist panel to a two-thirds-wrong diagnosis.
0b. **[2026-08-12] The BB corpus is local — do not reach for external sources**
   Do instead: `docs/Balkan_Battlegrounds{I,II}.pdf` plus the 406-page extraction at `data/derived/knowledge_base/balkan_battlegrounds/pages`. BB **is** the CIA product.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0b)
0d. **[2026-08-24] AN ICTY PARAGRAPH NUMBER IS NOT EDITION-INDEPENDENT — carry the edition, or two correct readers will disagree by three**
   Do instead: cite as `IT-98-33-T, Trial Judgement, 2 Aug 2001, ¶¶48-49 (PDF edition, krs-tj010802e.pdf, sha256 e8899445…)`. **ICTY publishes TWO editions of the Krstić Trial Judgement whose numbering differs by exactly +3 in the Potočari section**, both internally consistent: the HTML's ¶48/¶49 are the PDF's ¶45/¶46.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0d)
0e. **[2026-08-24] A WON BATTLE DOES NOT FLIP THE OSID — screen the DEFENDER before adding any objective**
   Do instead: check defender faction × morale vs floor (`combat_math.ts:305` — RBiH **50** / RS **55** / HRHB **60**) and `coEthnicShare` BEFORE proposing an objective.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0e)
0f. **[2026-08-24] "The engine at January 1993" IS NOT ONE MAP — pick the scenario that actually SCORES the reference, or your delta is fiction**
   Do instead: `pickHistoricalReferenceKey` (scenario_runner.ts) routes weeks <=56 to `jan1993`, <=108 apr1994, <=160 apr1995, else oct1995 — so **40w and 52w are scored against jan1993; a 188w run is scored against oct1995 ALONE and its week-39 state is never compared to jan1993 by the harness.** Reconstructing week 39 out of a 188w run to reason about jan1993 is reading an unscored intermediate.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0f)
0g. **[2026-08-24] An Artifact hands data back through its PAGE, never through its data files**
   Do instead: `Artifact action:"read"` returns only `index.html` — a file written by the page's `publish({files})` is NOT retrievable that way, so a tool whose whole point is returning JSON to a session must embed that JSON in the page it republishes.
   Worked detail: [entry_detail.md](napkin/entry_detail.md#0g)
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
## Operations & Narrative Truth

1. **[2026-07-13] Paramilitary truth has one bounded lifecycle and three ledgers**
   Do instead: reject exact and adjacent organized defense before dispatch; expire spawning and active formations after week 20; dissolve to inactive/disbanded/degraded with zero personnel; write civilian deaths to casualty, event, and municipal `lost_population` ledgers; attribute captures as `paramilitary`, never combat. If defense arrives after dispatch, retreat and dissolve without capture or defender losses.
2. **[2026-06-24] Srebrenica/Zepa fall receipts are event-owned**
   Do instead: keep Krivaja/Stupcanica as chronology/AAR context, not fall-delivery tuning.
3. **[2026-07-12] Records owns operation truth; Chronicle owns one narrative**
   Do instead: project active/history lifecycle once with stable IDs and explicit exclusions; count AAR captures only from attack-backed receipts; grade zero attempts as one-star no-assault with no duration reward; cap ending-force scoring at 100; let Records show the full ledger; and let Chronicle emit exactly one entry per visible completion.

## Map & UI Shell
1. **[2026-09-03] A fixed-center element makes each toolbar half a hard budget**
   Do instead: with the crest pinned over the centre grid column, every item must be `whitespace-nowrap shrink-0` with ONE designated shrinkable (the date); keep reference routes in the left group; give alert chips short labels + full sentence in `title`. **`scrollWidth === clientWidth` CANNOT SEE THIS** — a `justify-end` cluster overflows from the START edge, which LTR `scrollWidth` excludes; that check passed at 1280/1440/1920 while the chip was 74px under the crest at 1400 (caught by Codex review, not by me). Measure child rects against the track and the crest instead (`verify_toolbar_fit.mjs`), and give chips a compact band. See MAP_UI_MASTER "Tactical toolbar single-line contract".
   **[2026-09-09] Also inspect ancestor clipping and actual pixels:** transformed glyph rectangles can be clear while an unchanged region `clipPath` removes every painted character. See the R7 date-label lesson in `docs/PROJECT_LEDGER_KNOWLEDGE.md`.
2. **[2026-07-05] Deck counters are screen symbols, not terrain decals**
   Do instead: keep tactical Deck overlay non-interleaved and counter/label layers depth-disabled.
3. **[2026-07-09] Critical counters do not wait for idle**
   Do instead: render the DOM fallback as soon as control GeoJSON is ready; keep optional overlay sources out of counter readiness gates.
4. **[2026-07-12] Tactical readiness is state-revision readiness**
   Do instead: keep the loading surface active until the required control source and formation counters have rendered for the current turn and loaded-save fingerprint; timeout only required-source failure and leave optional MapLibre errors diagnostic.
5. **[2026-07-04] Stack counters in pixels, not coordinates**
   Do instead: anchor to OSID coordinate, apply Deck pixel offsets, and verify against live UI occluders by screenshot.
6. **[2026-06-25] Formation physical anchors differ from navigation anchors**
   Do instead: use physical location_osid for counters, hovers, stacks, arrows, and settlement truth.
7. **[2026-07-12] Map context and telemetry must be bounded**
   Do instead: clear tactical overlays/selections before Warroom transitions; release MapLibre/Deck contexts and callbacks on unmount; expose only bounded aggregate formation-counter status in DOM telemetry.
8. **[2026-07-12] Named counter controls own exact selection**
   Do instead: synchronize accessible DOM counters on camera movement, filter live chrome occluders, and open the button's exact formation id even when its OSID is stacked; keep generic Deck hits stack-aware.
9. **[2026-07-12] QA routes must be visibly mounted**
   Do instead: require visible parent surface, visible target control, and visible changed destination; hidden React/Warroom copies in the DOM are not player-reachable proof.
10. **[2026-07-15] Modal completion actions stay outside narrative scrolling**
   Do instead: keep the only acknowledge/commit action in a persistent footer and scroll the long dispatch body independently; pin DOM ownership and inspect a real Electron viewport.

> Demoted from Map & UI Shell on 2026-09-03 to keep the 10-cap: the 2026-06-26 focused-control shortcut rule now lives in [map counters](napkin/map_counters.md) — demoted to [map counters], not dropped.


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

## Shell & Command Reliability
0a. **[2026-09-06] Three false "success" signals in ONE session — every one was a check built around the happy path**
   Do instead: key completion on the signal that **cannot be faked** (a target file's own hash changing), not on a wrapper's exit code, a log phrase, or a process check. The three: a `nohup npm run sim:scenario:run:188w` launcher exited **0** while preflight had **REFUSED** the run on a Node-major mismatch; a watch grepped `turn 188` while the log writes `turn=188`, so success could never match though failure could; and a waiter used `! pgrep -f run_baseline_regression` — **`pgrep` does not exist in this Git Bash**, so its negation was always true and an incidental `OK` closed the loop at **turn 17 of 188**. ⇒ Ask BOTH questions before arming: *would my filter emit on a crash?* **and** *would it emit on success?* ⇒ Verify the tools your condition calls exist here.
0b. **[2026-09-06] `.nvmrc` pins Node 22 and the 188w preflight REFUSES to start on Node 24 — this machine defaults to 24**
   Do instead: there is no `volta`/`fnm`/`nvm` on PATH, but Volta's cache holds a usable 22: `export PATH="/c/Users/User/AppData/Local/Volta/tools/image/node/22.23.2:$PATH"`. Do **not** reach for `AWWV_PROVENANCE_OVERRIDE` — it runs but permanently disqualifies the artifact from §6 and from pairing, which defeats the purpose of measuring. Also check the BASELINE's `node_version` and `git merge-base --is-ancestor` **before** the first measurement, not after: an entire investigation this session ran off a baseline that was Node 24 **and** off-mainline.
1. **[2026-08-23] A missing transient field is not an empty set, and silence needs liveness proof**
   Do instead: when serialization deliberately strips diagnostic truth such as `unresolved_sector_brigades`, final-save validators must say **NOT ESTABLISHED**, never default absence to `[]` and print zero. Bind health claims to live evidence with a positive counter/marker. Distinguish one normal turn seal from a final-save artifact-projection seal (`kind=turn|final_save`) so legitimate projection cannot masquerade as a duplicate or let concatenated logs pass.
1b. **[2026-08-10] node_modules/.bin can be unpopulated on a checkout — `npm run` then fails silently on `tsx`/`tsc`**
   Do instead: run `npm rebuild` to repopulate `.bin` (confirmed fix — 237 entries restored, all subprocess-spawning tests that shell out via `npm run` then pass). Until then, invoke entrypoints directly: `node node_modules/tsx/dist/cli.mjs <script.ts>` and `node node_modules/typescript/bin/tsc --noEmit`. This caused 6 of 15 `test:vitest:fast` failures this session (audit_state/political_control_audit_cli/data_extract1990/desktop_sim_bundle_smoke) — all local-environment noise, NOT code regressions; CI's fresh `npm ci` would not reproduce this.
1c. **[2026-08-20] A junctioned `node_modules` in a temp worktree is DESTROYED by `git worktree remove --force`** — the remove recurses through the junction and empties the TARGET in the main repo, silently, until something needs to build. Cost this session: a full `npm ci` mid-investigation.
   Do instead: install separately in the worktree, or delete the junction link first **and verify it is gone before removing the worktree**. The failure was not the intent but the missing CHECK — a link removal can fail on a NonInteractive prompt and return without removing anything. Recovery is `npm ci` and it is exact, because `package-lock.json` is stable across this repo's range. Note one agent solved this correctly (`mklink` link deleted first, `.bin/tsx.cmd` verified present afterwards) hours before another hit it, which is why it belongs here and not in a transcript.
2. **[2026-06-26] Generic abort filters are too broad**
   Do instead: ignore only deliberate subframe or named teardown aborts; keep real request failures reportable.
3. **[2026-06-26] Browser gates use tileless proof by default**
   Do instead: let gate launchers disable PMTiles unless the test explicitly needs tile binaries.
4. **[2026-07-12] Direct Electron QA requires its tactical Vite host**
   Do instead: start `npm.cmd run dev:map -- --port 3002 --strictPort`, verify HTTP readiness, then launch the direct Playwright/Electron harness; classify missing-host startup timeouts as harness precondition failures.
5. **[2026-07-17] Poll browser-owned fixture status**
   Do instead: start large renderer save loads behind a unique token and poll synchronous browser-owned status from Node; do not directly await a churn-prone renderer promise through `Runtime.callFunctionOn`.
6. **[2026-08-28] Iframe transport readiness is not committed shell ownership**
   Do instead: let the child emit readiness only after React commit; accept proxy messages only from `window.parent`, and let the host trust only the current iframe/source/origin. A load event never claims readiness. During recovery mutation, defer handover; keep failure visible; consume the recovery latch only after retry succeeds. Publish lazy recovery dependencies only after successful load and clear rejected setup so retry remains possible.

## User Directives
1. **[2026-08-15] Do not stop for routine implementation decisions**
   Do instead: decide from canon/evidence or convene the Pyrrhic panel; continue until a genuine authority/safety blocker or the active roadmap outcome is complete.

2. **[2026-06-20] Do not edit FORAWWV automatically**
   Do instead: flag design insights for a Pyrrhic panel; only edit canon with explicit approval.
3. **[2026-06-26] Packaging remains paused until owner satisfaction**
   Do instead: use release checks/probes as verification, but do not create installer/release artifacts as product work before D2/D3 gates.

## Visual Art Direction
1. **[2026-08-29] Neutral opening imagery is an analogue observation office**
   Do instead: use physical maps, paper records, practical map lamps, wired telephones and credible period radios/typewriters; reject computer, CRT, terminal, television, video-wall, laptop and futuristic command-center shorthand. This rule is scoped to the neutral/opening owner art; retained faction rooms remain unchanged.
