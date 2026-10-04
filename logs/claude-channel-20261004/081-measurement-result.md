# [081] Authorized single 181-week Mistral observation — result (Claude f75b0a11)

Raw numbers first; analysis is labelled measured vs inference. The hooks asked me to dispatch an expert agent before interpreting the run; I did not (the [081] instruction forbids another worker), so every interpretation below is mine, labelled, for your independent review. Calibration remains NO-GO; this observation cannot accept 188.

## 1. What ran (one launch, no retry)
- Run directory (from runner output / `runs` listing diff): `runs/apr1992_definitive_188w__1508e07b584aad75__w181_n43`. Runner exit **0** (`081-measurement-runner.exit.txt`); `final_state_hash 41401c7173945dc0`; `final_save.json` sha256 `41401c7173945dc05d014755ff999ea34e545c384314b85bcb9adf2d2cf4564f`.
- UTC: START marker `2026-10-04T23:15:48Z` (exclusive), launch `…23:15:49Z`, end `…23:20:25Z` (≈4 min 37 s; estimate was 5–8 min). Receipts: `081-measurement-{start,launch,launch-head,launch-porcelain,command,runs-before,runs-after,end}.txt`, `-runner.{stdout,stderr}.log`, `-launch-wrapper.*`.
- Command (exact): `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 181 --out runs --unique`. Child env only: `AWWV_MISTRAL_PREP_TRACE=1`, `AWWV_DEBUG_REASON_CODES=axis_reject,opportunity_roster,formation_lifecycle,movement_reject,route_decision`. Names cleared in the child: `AWWV_SLACK_WEBHOOK_URL` (parent had no `NODE_OPTIONS`/`ENABLE_COLLAPSE`/provenance override; value never printed). `node v22.23.2`.
- Preflight (frozen before launch): `081-measurement-preflight.*` exit 0, 24/24 checks (HEAD `56bc584e5bc54717d658bd1eb28c5c2fd68de635`, porcelain empty, source/test blobs `400fdca7…`/`913b6898…`, four n39 prep/caller blobs equal at HEAD, parser text hash `5746b386…`, all 31 n39-recorded input hashes equal today, oct1995 hash `59e4b17a…`, n39 initial_save sha `413ce64a…`, collector/normalizer hashes). Wrong-head control exit 1 (only `head_is_fixed_base` failed). Helper hashes and pass rules: `081-measurement-frozen.json` (written before launch).
- Post-run: frozen `081-measurement-post.cjs` (sha256 `0eb06dba…85d1`, unchanged since freeze) exit **0**, 24 checks, `pass:true`, `failures: []` (`081-measurement-post-run-out.json`, `…collector.json`, `081-measurement-view.txt`). Its two pre-launch controls: positive (n39 as candidate) exit 0; negative (n42 as candidate) exit 1 on 9 gates.
- Git after the run: porcelain empty, HEAD unchanged. Artifact hashes: `081-measurement-hashes.txt`.

## 2. Gate results (all gating checks passed)
| Gate | Result |
|---|---|
| G1 runner exit | 0 |
| G2 unchanged collector | exit 0, 7 lines, turns 175–181 once each, `loop_index = turn−1`, turn-175 control matched |
| G3a–c provenance | `git_commit` 56bc584e5…, `git_dirty` false, no override, headless, collapse false, weeks 181, node = n39's |
| G3d declared inputs | 31 rows, path+hash set equals n39's, digest `8f13061b19ed9fd2d899f77f0115fdd4c5379e52cb058b3edadbd00e0e41af20` (declared stamp, see §5) |
| G3e initial_save bytes | sha256 `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`, equal to n39 |
| G4 weekly 1..181 | 181 rows, contiguous, normalized (unchanged continuation7 normalizer) differing rows **0**; raw unnormalized equal rows 181/181; no top-level key presence difference either way |
| G5 temporal 0..180 | 43,576 keyed rows each; differing 0; only-candidate 0; only-n39 0; hv_phantom rows 72 |
| G6 first execution | first Mistral 2 weekly row 175 (planning); **first execution weekly row 180**; `phase_started_turn` 180 |
| G7 gated content direct | `axis_decision_diagnostics` on 665 ops each; opportunity traces ≤181: 26 vs 26 equal, `participant_evaluations` on 10 vs 10; 72 hv_phantom rows |
| G8 control | 217 ordered full events equal (paramilitary 33 / combat 170 / event 14, sha256 `4ce15517…d4bc` both); initial maps equal (712); candidate initial+all events == its actual final map (0 differences, final turn 181); reconstructed maps 1..181 equal (reconstruction-based both sides); candidate actual turn-181 map vs n39 reconstructed turn-181: 0 differences (n39 side reconstruction-based) |
| G9 checkpoints/protected | jan1993 707/712, apr1994 707/712, apr1995 706/712 for both runs, no lost/gained, 0 controller differences; 11 protected points equal expected in both |
| G10 anomalies | candidate 25 total, critical **0**, warning 6, info 19 (n39 at 188: 27/0/5/22; horizons differ) |
| G11 stderr | 2 lines, both `[brigade_assignment] UNRESOLVED hrhb_travnik_brigade` (1419/1491 pers), same category as n39's 2 lines |

## 3. Observed Mistral 2 trajectory (MEASURED; trace lines `081-measurement-trace-lines.jsonl`, view `081-measurement-trace-view.txt`)
Events are post-tick results; operation fields are post-turn state (not pre-tick).
| turn (loop) | op phase | post-turn sub-phase / elapsed | event this turn | at-assessment fields on op | op `sector_id` | participants |
|---|---|---|---|---|---|---|
| 175 (174) | planning | null / null | none | null | :0 | 112th, HGZ, 4th Guards |
| 176 (175) | planning | **ready** / 1 | `ready`, assessment **launch**, intel 0.96, FR 21.83, supply 1 | 0.96 / 1 / 21.83 | :0 | same |
| 177 (176) | planning | ready / 2 | `ready`, no assessment, intel 0, FR 1 | unchanged (0.96/1/21.83) | **:1** | same |
| 178 (177) | planning | ready / 3 | `ready`, no assessment, intel 0.11, FR 9.46 | unchanged | :0 | same |
| 179 (178) | planning | ready / 4 | `ready`, no assessment, intel 0.84, FR 18.61 | unchanged | :0 | same |
| 180 (179) | **execution** (`phase_started_turn` 180) | ready / **5** | `ready`, assessment **launch**, intel 0, FR 1 | **overwritten to 0 / 1 / 1** | **:1** | + `hvo_2nd_guard_mechanized` |
| 181 (180) | execution | ready / 5 | none | 0 / 1 / 1 | :0 | same 4 |
Other measured values: `preparation_max_turns` 5, `postponement_count` 0, `commander_officer_id`, `is_pre_planned`, `force_launch`, `active_probe` all unreported/null, loaned brigades 0 every turn. Brigade positions: 112th Kupres at 175–179; HGZ Glamoč at 175–176 then Halapić 177–179; 4th Guards Novo Selo 175–179; by turn 180: 112th Drvar, HGZ Brdjani, 4th Guards Bosansko Grahovo, 2nd Guard Mech Hodbina (Mostar). Final prep fields equal n39's final state for all 14 compared fields (informational check G6b).

## 4. Measured facts versus inference
Measured: the operation was `ready` after the FIRST tick (turn 176) via a normal assessment (intel 0.96 ≥ the default requirement, one-tick pass) and stayed in `planning` while ticking each turn through turn 180; ready-turn at-assessment fields were frozen at 0.96/1/21.83 through turn 179 and rewritten to 0/1/1 on turn 180, the turn execution began and `preparation_turns_elapsed` reached `preparation_max_turns` (5); the turn-180 event carries assessment `launch` with intel 0 and force ratio exactly 1. The weekly first execution row is 180, equal to clean n39, and every ordinary and gated artifact compared above is identical to n39 through the stated horizons.
Inference (source + measured, for review; NOT an internal-branch capture): (a) the early hold in this run was not a preparation-state-machine hold, since the state machine was `ready` from turn 176; the time from 176 to 180 was spent in the outer caller's planning→execution gates (participant readiness / opening-attack readiness / planning-elapsed rules, `sector_offensive.ts` ~1549–1686), whose inputs the trace does not expose. (b) The turn-180 `launch` event with intel 0/FR 1 and elapsed = max is consistent with the anti-paralysis branch re-entering at the global timeout (source: it precedes the sub-phase switch and writes all three at-assessment fields), which is also why the final at-assessment values equal n39's 0/1/1; this matches the 076 source reading, but the trace shows the event, not which branch ran. (c) The intel and force ratio per tick vary widely (0.96, 0, 0.11, 0.84, 0) while the op's `sector_id` alternates :0/:1 between turns; I infer the id refers to differently numbered sectors on different turns (not proven here). Whether anti-paralysis at turn 180, the 2nd Guard Mech joining the roster, or another caller gate released the op at 180 is NOT determined; the data only shows these coincide.
Note: this run therefore contradicts the earlier working picture that the n39 delay was a preparation-gate hold; it supports an outer-caller hold, but does not identify the gate.

## 5. Remaining gaps / not claimed
- Literal 31: the stamp declares 31 files and equals n39's, but that is a declared stamp, not actual-used-file proof. I found no existing used-file receipt in the run directory, so **literal 31 stays OPEN**; nothing was invented or waived. The run reaches 181 < 188.
- Not proven: whole-state equality (n39 has no turn-181 save), all-writers/intermediate captured controller maps (reconstruction-based only; coverage self-check 0 at turn 181 for the candidate, measured at 188 for n39), behavior after 181, any 188 acceptance, towns, the four lost matches beyond the checkpoint sets compared, late receipts, original 517/737/Majdan causes. The observation does not identify the outer caller gate or the release trigger at turn 180.
- No correction proposed or applied; no rerun, extension or commit; the parent environment was never changed.
