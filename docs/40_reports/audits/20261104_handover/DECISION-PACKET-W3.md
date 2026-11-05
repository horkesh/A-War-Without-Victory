# Decision packet — keep, park or reject W3 (empty-sector no-teleport fix)

FROZEN 2026-11-04 22:05 +01:00. Do not edit. Panel members read-only.

## Context (plain)
Codex handed AWWV over to Claude. Claude integrated Codex's isolated fixes onto branch
`claude/handover-integration-20261104` in worktree `F:/AWWV-worktrees/handover-integration`
(local only, not pushed):

| commit | content |
|---|---|
| `90156c1e0` | A — handover snapshot (Codex's April work, all uncommitted changes included) |
| `00c7c35ab` | B — W1: three narrow engine fixes (inactive formations not backfilled onto map; coverage-only defeat keeps retreat history; TG selection ignores inactive). 8/15 tests RED before, 15/15 after. |
| `054da07e7` | W3: `ensureMinimumSectorCoverage` in `src/sim/combat/brigade_assignment.ts` no longer borrows (instant `moveBrigadeToFrontTarget`) another sector's rear/reserve/line brigade into a zero-assigned sector; the sector's own reserve/rear promotion is kept, otherwise the sector stays unstaffed for T1 `sector_reassignment_order` -> T2 column -> T3 movement. 10 tests RED before, 121/121 after. |
| `4e2bda1fc` | C — regenerated `data/derived/startup/apr_1992_initial_save.json` (W3 made the baked startup drift; check now passes). |

Canon cited by W3: Engine Invariants v0.9.0 §14.9 (worktree `docs/10_canon/Engine_Invariants_v0_9_0.md` line 447): "An empty, reachable, same-corps front sector is resolved through movement authority rather than a direct location rewrite ... When no legal donor can reach the sector, the derived sector must carry `unstaffed_front: true`; legal isolation is advisory truth, not a teleport exception." Canon precedence: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible.

## Measured (188-week canonical scenario, one run each, deterministic; `tools/verify_checkpoints.cjs`, `tools/engine_health_gate.cjs --strict`)

| | A snapshot | B +W1 | C +W1+W3 |
|---|---|---|---|
| jan1993 /712 | 709 | 709 | 702 |
| apr1994 | 701 | 708 | 704 |
| apr1995 | 701 | 710 | 701 |
| oct1995 | 686 | 694 | 689 |
| strict health (stranded, ghosts, zero-eligible ops, consistency) | PASS (0 stranded) | PASS (0) | PASS (0) |
| enclave guard (9 cells) | holds/falls on schedule | same | same |
| Farz P1 Ozren cells RBiH by w188 (Vozuća, Maglaj donja/gornja bočinja, Spreča/north Ozren) | 4/4 | 4/4 | **1/4** — scorer: "NOT TAKEN — 2nd/3rd Corps suppressed; a fix that breaks this is the WRONG fix" |
| Farz authored-AAR receipts guard | FAIL (0 of 4) | FAIL | FAIL — inherited, pre-existing in all three |
| W. Bosnia cascade matched (oct1995) | 40 | 40 | 43 |

B reproduces Codex's independent W1 measurement exactly (709/708/710/694). Codex's own earlier W3 39-week screens: 702/712 with regenerated startup (strict health then failed on two stranded formations, Kamenica and 831st Drina; here at 188w stranded is 0), 705 with old startup.

Run dirs (worktree `runs/`): A `apr1992_definitive_188w__6deb5845c150c196__w188_n0`, B `..._n1`, C `..._n2` (each has run_summary.json, final_save.json, initial_save.json, operation_aars.json, weekly_report.jsonl, brigade_temporal_log.jsonl, control_delta.json). Scorer/health outputs: `runs/claude-measure-20261104/{A-snapshot,B-w1,C-w3}.{checkpoints,health}.txt`. Diffs: `git -C F:/AWWV-worktrees/handover-integration show 054da07e7`.

## The question
Which should the integration branch do with W3?

1. **KEEP** W3 now: canon §14.9 compliance outranks calibration; accept 702/704/701/689 and the Ozren loss, then repair the downstream relief/operations behaviour as follow-up.
2. **PARK** W3: integration branch proceeds with A+W1 only (709/708/710/694); W3 + regenerated startup move to their own branch until the T1/T2/T3 relief path is shown to staff the sectors Farz needs (Ozren back to 4/4) — the known canon violation stays documented as open in the meantime.
3. **REJECT** W3: the teleport is acceptable/the canon text should change instead.

## Owner directives that bind the panel
- Engine soundness over calibration percentage; never buy score with a broken mechanic; no railroads/teleports/forced ownership writes; calibration changes are one change per measured run.
- Never override initial control, never `avoided_osids_by_faction`; brigades attack only through CorpsOperation.
- Owner is non-technical and has delegated the decision to this panel's vote.
