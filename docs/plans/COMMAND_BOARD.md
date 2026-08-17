# AWWV Command Board

**Status:** Derived dispatch view, synchronized 2026-08-17.

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole authority for unfinished work and wins if this board differs.

## Activation

The owner activated full roadmap execution on 2026-07-31. Local implementation, tests, evidence, commits, approved remote pushes, final merge to `main`, documentation propagation, and repository cleanup are authorized within the roadmap.

Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority and require a separate explicit `Publish 1.0` instruction.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE -- CLOSED 2026-08-01** | None. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | **COMPLETE -- CLOSED 2026-08-03** | None; v14 is the accepted clean RS campaign proof. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | None. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | **COMPLETE** | None; Phase 6 and its packaging follow-up are closed. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | **COMPLETE -- CLOSED 2026-08-05** | None. The accepted performance floor is approximately 1.09 seconds per turn; the 100 ms target and incremental-reuse Task 6 are retired from 1.0 scope. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | **PRE-1.0 SCOPE COMPLETE -- CLOSED 2026-08-09** | None in the pre-1.0 R6 packet. Named Brcko, exhaustion re-pacing, casualty-grade, cohesion, and institutional-veto work remains post-1.0 debt unless explicitly reactivated. | [Historical gameplay/calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) |
| 6.5 | RC | **PRE-1.0 NARROW SCOPE COMPLETE -- CLOSED 2026-08-15** | None. V3 selection plus reversible D-shape is retained; D-topology is reserved post-1.0. | [Collapse build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) / [D-shape result](2026-08-15-collapse-d-shape-design.md) |
| 7 | R7 | **ACTIVE -- PHASE 2 REOPENED 2026-08-17** | Phase 2 was declared complete on 2026-08-15; that claim was falsified. Restorations, one measured 188w, a partial revert and two known-divergence suites are committed. **Blocked on run-provenance stamping** (see critical path) before the closing measurement can be trusted. Then audio/licensing, English accessibility/readability, opening screens, packaged proof. Localization Phase 3 is post-1.0. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 8 | R8 | **WAITING ON RC AND R1-R7 GREEN** | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until the final two diaries score 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | **WAITING ON R8** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`R7 content/history/audio/accessibility/opening -> R8 -> R9`

**MEASUREMENT IS THE CURRENT BLOCKER, ahead of any content lane.** Stage 2's "marker-verified 188-week collapse ON/OFF pair" at 629 matched OSIDs and 31/31 anchors was a deterministic baseline and **not Section 6 clearance** — no `collapse_damage` entry was written, so the live enclave guard was never reached. It is now known to be worse than that: **the pair was not comparable.** `selectS6RunDirs` paired `…w188_n222` (collapse-ON, pre-R7-Phase-2 OOB) against `…w188_n223` (collapse-OFF, post-R7-Phase-2 OOB), so it differed by the flag **and** an entire OOB change set, and 33 differing OSIDs were attributed wholly to the flag by a Section 6 test and wholly to the OOB change by the project ledger. Nothing in the artifacts could catch it: `run_meta.json` carried no commit, no data hash and no flag state, and the run-directory hash is taken over the scenario *definition* file, which an OOB edit never touches — **so two runs on different armies carried the same hash.**

Run-provenance stamping plus a hard-failing pair selector is built and under independent review. Its cost is explicit and should not be re-litigated later as a regression: **all existing 188-week runs are permanently unusable for Section 6 differentials, so the next Section 6 verdict needs two fresh runs, not one.** Until that lands, no Section 6 verdict on criteria 4 and 7 is admissible in either direction, and any change that opens RBiH or RS Tier-0 eligibility still requires fresh criteria 4 and 7 evidence on a controlled pair.

**Canon landed 2026-08-17:** `SENSITIVE_HISTORY_DESIGN_GATE.md` §10, "Provenance and the Integrity of the Historical Record", ratified by unanimous Pyrrhic panel. `FORAWWV.md` §XIII temporal scope is drafted but **HELD** behind the provenance channel-separation and determinism-scan packets, and is not canon.

RC's narrow pre-1.0 scope is complete. Frontage-days and same-turn selection were retired; the retained v3 two-turn selector preserves the registered Sipovo/Drvar distinction. Reversible D-shape then fixed the event-only persistence clock and produced one bounded live HRHB write at Bucovaca while preserving all anchors, health gates, deterministic artifacts, and Section 6 exclusions. Neighbour-cascade D-topology is reserved post-1.0 and must not be replaced by struck breadth tuning. R7 is now the live lane.

## Fixed Decisions

- Five presidential levers; Decision Room owns action.
- Quiet historical intervals use positive-hold briefings, never fabricated decisions.
- TG constants: 12-turn maximum, 4 cohesion drain, dissolve at 15, four-turn Army-HQ cap tail.
- ADR-0007 Phase C remains retired; narrower live Standing-OG behavior is documented.
- Unknown historical identities/content are omitted.
- English is the sole required 1.0 language. The settled `bs`/`bs-BA` and legacy-`bcs` migration contract is retained for post-1.0 localization.
- First-party, CC0, or approved CC BY audio only.
- Steam primary; signed Windows, notarized macOS, Linux AppImage.
- Publication is separately authorized; credentials are injected inputs.

See [Master Roadmap Section 6](MASTER_ROADMAP.md#6-locked-product-and-historical-decisions) for the complete decision record and sources.

## Backlog (Non-Blocking)

Optional improvements outside the 1.0 outcome live in [Master Roadmap Section 10](MASTER_ROADMAP.md#10-finding-routing), not as dispatch rows. Current entries include post-1.0 multilingual localization, faction-wide equipment totals visibility, Local Support commitment redesign, and player-facing Sector-to-Operational-Group naming.

## Workstream Update Protocol

When a workstream changes state:

1. Update its plan checklist and evidence.
2. Update the authoritative master-roadmap snapshot and workstream row.
3. Mirror the state and next action here in the same change.
4. Append the ledger entry required by the plan.
5. Verify links, diff hygiene, and applicable tests.
6. Commit only when active execution authority permits it.

Do not add a competing active queue. Route new findings through [Master Roadmap Section 10](MASTER_ROADMAP.md#10-finding-routing).

## Execution Hygiene

- Inspect status, branch, and worktrees before every packet.
- Never reset, clean, delete, stash, or overwrite unrelated user work.
- One workstream owns a shared file at a time.
- Failed experiments close as evidence-backed no-go results.
- Unexplained drift, determinism failure, unsupported history, or failing package diagnostics blocks the faulty change, not the rest of the queue.
- Do not edit `docs/10_canon/FORAWWV.md`.

## Completion

This board becomes all green only when R1-R9 and RC satisfy the [master definition of program completion](MASTER_ROADMAP.md#12-definition-of-program-completion). Prepared for publication and published are separate states.
