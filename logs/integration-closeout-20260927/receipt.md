# Doljani integration closeout receipt — 2026-09-27

This receipt preserves the measured candidate and integration results. Raw suite logs remain local in this directory. The candidate is not an adopted baseline.

## Simulation and acceptance

- Source checkout before closeout commits: `37432d896a6aacf192a0f7c2f6950e5572c053ea` plus recorded working-tree edits. Retained run: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n13`; final-state SHA-256 begins `ee5dbfb8f42e7d14`; 188 turns completed, final seal unresolved 0.
- At t57 the RBiH 449th Eastern Herzegovina Mountain Brigade captured `op:jablanica:doljani_2` from HRHB through an ordinary `mechanism=combat` event in `Operacija Zamah` (power ratio 3.32). At w104 Doljani and its unchanged painted reference are RBiH; Ljubunci, Lug and Paroš remain HRHB. Maglaj and other April mismatches remain parked. Four checkpoint scores: 707/712, 707/712, 701/712, 664/712. Detailed machine-readable evidence: `logs/doljani-042-20260927/acceptance_extract.json`.
- The owner provisionally approved the scenario-inference `Prozor–Rama Line Counterattack.available_from` 41→71 and its measured week-105 Central Bosnia trade. No historical source dates that inferred timing. Same-tree 105-week comparison: `logs/doljani-040-20260927/control_comparison.json`.

## Required gates and bounded checks

| Check | Command or source | Result |
| --- | --- | --- |
| Full suite with Git Bash first on PATH | `npm run test:vitest`; raw `full-vitest-gitbash.log`, `full-vitest-gitbash.exit` here | exit 1; 14,127 passed, 8 real failed, 31 skipped. One expected failing child fixture was correctly detected by its passing parent. |
| Focused operations | prior `tests/pre_planned_operations.test.ts` and related focused run | 87/87 passed. |
| Event, terminal, and desktop behavior | prior `npx vitest run` on 15 affected files: event evaluation, owed follow-ups, operation halt, R7 content, timeline integrity, peace plans, desktop persistence, sensitive claim inventory, phase 5A, turn pipeline, decisions, event loader, runtime substrate, response ownership, and B3 event evaluation | 360 passed / 5 skipped, exit 0; retained coordination report [025] cites `scratchpad/vitest_025b.log`. The later corrected full suite also ran these files and its eight real failures were in other categories. |
| Fresh closeout event, terminal, desktop and governance check | `npm run test:vitest -- tests/events_evaluate.test.ts tests/events_owed_followups_termination.test.ts tests/desktop_persistence_contract.test.ts tests/event_timeline_integrity.test.ts tests/docs_desktop_v09_truth.test.ts tests/open_gates_register.test.ts` | 128/128 passed, exit 0. These tests establish current candidate behavior, not the correctness of the two open Grabovica/Uzdol effects. |
| Windows package path and research-byte corrections | focused `tests/runtime_dependency_resolution.test.ts tests/release_research_exclusion.test.ts` | 13/13 passed, exit 0 after test-only corrections; `npx tsc --noEmit -p tsconfig.json` exit 0. |
| Five affected suite files after all bounded corrections | `npm run test:vitest -- tests/codex_sensitive_history_source_notes.test.ts tests/plan_index.test.ts tests/receipt_citations.test.ts tests/runtime_dependency_resolution.test.ts tests/release_research_exclusion.test.ts` | 74/74 passed, exit 0. `node tools/derive_plan_index.cjs --check` and `node tools/validate_open_gates.cjs` both exit 0. |
| Farz P-A checkpoint | `node tools/calibration/verify_checkpoints.cjs` on retained n13 run; raw `logs/doljani-042-20260927/verify_checkpoints.log` | exit 1: t169 capture by 3rd Corps, guard requires 2nd Corps capture at t160 or later. |
| Combat-health detector | retained n13 run | one critical `combat_ineffective_concentration`: HVO Central Bosnia 7/11 brigades under 400 at t188. |

The eight full-suite failures were two plan-index assertions, one stale uniform Neretva/Grabovica/Uzdol window assertion, one citation to an untracked map receipt, three worktree junction/physical package-path assertions, and one CRLF-expanded checkout-byte assertion. The index was regenerated, the history assertion now checks authored t76/t77 windows, the map receipt is tracked, and the two environment-sensitive tests were corrected to compare physical package roots and Git blob sizes. These corrections have targeted checks; the full suite has **not** been rerun. No additional campaign was launched.

## Separate sensitive-history defects found in independent closeout review

The Grabovica/Uzdol event row currently has `war_crimes_delta: 2` in both singular `effect` and `effects[0]`. The generic event collector applies both, so the event writes **+4**, not +2. Its `negotiation_capital` effect names `international_credibility`, which is absent from the negotiation capital shape and is silently skipped; the separate `dimension_shifts` entry for `international_standing: -10` still applies. These defects were recorded before this closeout in the Claude coordination report [025] and remain **open**. The new t77/terminal path can now fire and persist that existing row reliably; the focused tests only assert positive impact. A separate §6-approved correction with exact-effect tests and calibration proof is required before merge/adoption. This closeout does not silently repair or waive either defect.

## Retained n8 comparison limits

The older `w188_n8` run is not a one-field control for the n13 retiming. Initial-save SHA-256 differs: n8 `679f0321b5c1e686a1ba0754636b6254c2c8820d7c6166a2d1deacc176c56fb0`, n13 `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`. N8 lacks the local Jablanica–Doljani queued operation and combines Lug/Paroš in one Prozor axis; n13 queues the local operation and splits those axes. N8 scores 700/712 in April 1995 and 666/712 in October 1995; n13 scores 701/712 and 664/712. The October net −2 cannot be attributed to the timing change alone.

- April 1995 n8-only mismatches: Doljani, Paklarevo. N13-only mismatch: Donja Mahala.
- October 1995 n8-only mismatches: Doljani, Budimlić Japra, Jelašinovci, Lušci Palanka, Škućani Vakuf. N13-only mismatches: Kršlje, Maleševci, Pribrača, Prusac, Torlakovac, Majdan, Donja Mahala.
- HVO Central Bosnia under-400 count at t188: n8 6/11 (no critical), n13 7/11 (critical). No same-tree 188-week turn-41 control exists.

The external control timeline is published for inspection at https://horkesh.github.io/A-War-Without-Victory/?run=doljani-20260927 ; its tracked publication receipt is `logs/external-map-doljani-20260927/receipt.md`. The live map and this receipt do not waive the full-suite, Farz, Central Bosnia, or final adoption gates.
