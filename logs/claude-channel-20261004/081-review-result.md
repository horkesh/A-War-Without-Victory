# [081] Independent n43 evidence review

**Verdict: GO_BOUNDED_OBSERVATION_ONLY.** The authorized n43 181-week run is valid evidence that Operation Mistral 2 reached preparation `ready` on turn 176, remained in planning through turn 179, and entered execution on turn 180 while ordinary compared outputs through the measured horizon matched clean n39. It supports an outer-caller hold during turns 176-179. It does not identify the exact outer gate or release trigger, prove literal-31 actual-use coverage, prove whole-state/all-writers equality, reach turn 188, or change calibration NO-GO.

One nonblocking evidence-label correction is required in later synthesis: raw runner stderr contains **14** nonempty physical lines. The frozen G11 helper excludes six repeated two-line Node `NO_COLOR`/`trace-warnings` warning pairs and reports the remaining **2 classified simulation lines**, both `brigade_assignment`. The existing `081-measurement-result.md` phrase “stderr: 2 lines” is only correct after those declared exclusions.

## Scenario and launch boundary

- Scenario: `data/scenarios/apr1992_definitive_188w.json`, headless, explicitly shortened to 181 weeks; run directory `runs/apr1992_definitive_188w__1508e07b584aad75__w181_n43`.
- Exactly one authorized launch ran at clean `HEAD 56bc584e5bc54717d658bd1eb28c5c2fd68de635` with Node `v22.23.2`, collapse false, no provenance override, and the reviewed observer source/test blobs from [080].
- Exact command: `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 181 --out runs --unique`.
- Child-only instrumentation: `AWWV_MISTRAL_PREP_TRACE=1` and the five recorded reason-code topics. Launch wrapper exit 0; runner exit 0. Start/end receipts are `2026-10-04T23:15:48Z` / `2026-10-04T23:20:25Z`.
- Run provenance reports the same clean commit, 181 weeks, headless harness, Node version, and `git_dirty:false`. `initial_save.json` SHA256 `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1` equals n39. Candidate `final_save.json` is turn 181, SHA256 `41401c7173945dc05d014755ff999ea34e545c384314b85bcb9adf2d2cf4564f`.
- Historical plausibility was not re-researched or accepted in this review. The three reached checkpoint comparisons and 11 protected controls match n39 under the stated reconstruction method; calibration remains NO-GO.

## Frozen comparator coverage and receipts

`081-measurement-frozen.json` was written before launch and binds the preflight, post helper, launch script, unchanged collector, unchanged normalizer, authorization, and passing preflight output. Its SHA256 is `02bf1293652edcb2fe63f968bb3ba8af17366cfebf61ca7b71c2d10ad0e55eef`. The frozen post helper still hashes to `0eb06dbab6b9daa438c5c06bacb918d4c7b7d3fe7fb09aa9457d530e6d8c85d1`.

Exact retained exits:

- freeze 0;
- preflight 0 across 24 checks;
- wrong-head preflight control 1, failing only `head_is_fixed_base`;
- positive post control 0;
- negative n42 post control 1 with nine named failed gates;
- launch wrapper 0;
- scenario runner 0;
- post-run comparator 0, `pass:true`, no failures;
- unchanged collector invoked by the post helper 0, seven rows.

Coverage is adequate for the bounded comparison:

- G4 compares all 181 weekly rows to n39 through turn 181. All 181 raw, unnormalized rows are equal, so weekly gated content is byte-semantically covered even where an individual presence gate is weaker.
- G5 compares all keyed temporal rows for loop indices 0-180. Both sides have 43,576 rows, zero differences, and zero only-on-one-side keys. An independent read found 43,576 unique `(week_index, brigade_id)` keys on each side, so the helper's `Map` construction hid no duplicate rows.
- G7a itself compares only the count of operation diagnostics carrying `axis_decision_diagnostics` (665 each), not their values. This is not a result gap because G4's full raw-row equality independently includes that content. G7c's 72-row HV phantom count is likewise backed by G5's full temporal equality. G7b directly compares all opportunity traces through 181.
- G8 proves identical initial maps and 217 identical ordered control events through 181; the candidate reconstruction matches its actual turn-181 map. Per-turn maps on both sides and n39 turn 181 remain reconstructed, so this is not captured all-writers or whole-state proof.
- G9 compares reached checkpoint match sets at turns 39, 104, and 156 plus 11 protected points. It does not establish the four other mismatches as accepted, any later checkpoint, or town-level acceptance.
- G10 reports candidate anomalies 25 total / 0 critical / 6 warning / 19 info. Horizon-different n39 counts are contextual only.
- G11's implementation filters lines matching `NO_COLOR|trace-warnings` and gates only on candidate category names being a subset of n39 categories (`081-measurement-post.cjs:136-139`), not count equality. Independent raw review establishes the candidate has 14 nonempty lines: 12 excluded Node-warning lines plus exactly the same two Travnik `brigade_assignment` diagnostics as n39 (1419 and 1491 personnel). This independently closes the count/content question for this run while preserving the helper's narrower claim.
- G12 correctly remains non-gating and OPEN. The 31-row consumed-input stamp and digest equal n39, but neither the run directory nor the comparator contains an actual-used-file receipt.

## Trace integrity and measured trajectory

`081-measurement-trace-lines.jsonl` SHA256 is `d261acde844a821e6b01891321ef48127d57a3e773e9e79e26a4dbe8e9707f4f`. Its seven JSON rows exactly equal the seven prefix-stripped observer lines in raw runner stdout (stdout SHA256 `56c7ac237f9193578e16a23dd853a1e98db12b8e5888d9c53985e5ed7881357c`). The unchanged collector reports turns 175-181 exactly once and every `loop_index = turn - 1`.

Measured facts:

- Turn 175 / loop 174: operation exists in planning; preparation fields are null; no preparation event.
- Turn 176 / loop 175: post-tick sub-phase is `ready`, elapsed 1 of max 5; the event reports `launch`, intel `0.9600000000000001`, supply 1, force ratio `21.83327848870395`; operation remains in planning.
- Turns 177-179: every event remains `ready`; elapsed advances 2, 3, 4; the operation remains in planning. Event intel/force ratio varies while the stored turn-176 assessment fields remain unchanged.
- Turn 180 / loop 179: execution begins with `phase_started_turn:180`; elapsed reaches 5 of 5; the event again reports `launch`, now with intel 0, supply 1, force ratio 1; stored assessment fields become 0/1/1. The fourth participant appears in the post-turn roster.
- Turn 181 / loop 180: execution continues, elapsed remains 5, and there is no preparation event.
- Sector IDs alternate between positional `:0` and `:1` values. The trace observes that alternation; it does not prove stable sector identity or a causal relationship to launch.

## Measured versus inferred

The statement that preparation was already ready on turn 176 is measured. The statement that the turn-176-through-179 hold was outside the preparation state machine is a bounded source-plus-trace inference: `sector_offensive.ts:1623-1632` treats `preparation_sub_phase === 'ready'` as preparation-ready and immediately enters the outer launch checks, while the surviving planning `continue` paths are participant readiness (`:1637-1648`) or opening-attack readiness during the grace window (`:1650-1660`). The observer records neither predicate, so it cannot choose between them.

The turn-180 anti-paralysis reading is also source-derived, not a branch receipt. `tickPreparation` increments elapsed before testing `elapsed >= preparation_max_turns` (`operation_preparation.ts:892-905`, `:940-961`); the measured 5-of-5 event and rewritten 0/1/1 assessment values match its launch sub-branch. That branch still precedes the outer caller gates and does not by itself prove what released execution. The new participant, timeout event, sector renumbering, and execution transition are measured coincidences; none is established as the release cause.

## Findings and smallest follow-up

- **Blocking:** none for the bounded observational claim.
- **Nonblocking:** qualify G11 as “2 classified simulation lines after excluding 12 Node-warning lines”; do not state that raw stderr had only two lines.
- **Open limits:** literal-31 actual-use proof, captured per-turn/all-writers maps, whole-state equality, exact outer hold/release gate, turns 182-188, final towns/matches/late receipts, and calibration acceptance.

The smallest follow-up is a read-only, Mistral-scoped examination of already-retained n43 reason-code/operation diagnostics for an existing participant-readiness or opening-readiness receipt at turns 176-180. Stop if no direct receipt exists. Only then consider a separately reviewed default-off observer that records `stagedEarly`, participant readiness, and `openingReadiness.executable/blocker` at the existing caller boundary; any further scenario run would require new owner authorization. No follow-up run, replay, suite, source change, or historical research was performed here.

## Review actions

All independent review reads/checks exited 0: frozen/post JSON parsing; run-meta and artifact-hash reads; raw stderr physical/filtered count and exact message comparison; temporal raw-row/unique-key count; raw-stdout-to-trace exact-text comparison; trace index/event extraction; and relevant caller/preparation source reads. No comparator, collector, test, campaign, replay, or suite was rerun. No source, shared document, prior receipt, commit, or run artifact was changed.
