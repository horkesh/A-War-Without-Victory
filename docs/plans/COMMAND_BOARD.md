# AWWV Command Board

**Status:** Derived dispatch view, synchronized 2026-08-26.

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole authority for unfinished work and wins if this board differs.

## Activation

The owner activated full roadmap execution on 2026-07-31. Local implementation, tests, evidence,
local commits, transient validation builds, documentation propagation, and non-destructive
workspace maintenance are authorized within the roadmap. Remote push and final merge are not.

Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority and require a separate explicit `Publish 1.0` instruction.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE -- CLOSED 2026-08-01** | None. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | **COMPLETE -- CLOSED 2026-08-03** | None; v14 is the accepted clean RS campaign proof. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | None. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | **COMPLETE** | None; Phase 6 and its packaging follow-up are closed. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | **COMPLETE -- CLOSED 2026-08-05** | None. The accepted performance floor is approximately 1.09 seconds per turn; the 100 ms target and incremental-reuse Task 6 are retired from 1.0 scope. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | **JANUARY 1993 CHECKPOINT SLICE LANDED; FURTHER CALIBRATION PAUSED ON RE** | Preserve the landed evidence. Do not start reference, init-control, objective, axis, timing, roster, or outcome tuning until RE closes. | [Calibration authority](../40_reports/CALIBRATION_MASTER.md) |
| 6.5 | RC | **PRE-1.0 NARROW SCOPE COMPLETE -- CLOSED 2026-08-15** | None. V3 selection plus reversible D-shape is retained; D-topology is reserved post-1.0. | [Collapse build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) / [D-shape result](2026-08-15-collapse-d-shape-design.md) |
| 7 | R7 | **ACTIVE — AUDIO IMPLEMENTATION LANDED `2d106e5e0`** | Complete human listen/sensitivity acceptance, English accessibility/readability, offline browser and packaged-runtime proof, and closeout reconciliation. Pause any packet that collides with RE-0D/RE-1 desktop/UI files. Localization Phase 3 remains post-1.0. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) / [opening implementation](2026-08-23-opening-screens-implementation-plan.md) |
| 7.5 | RE | **READY FOR T0 — PROBE PREREQUISITE CLOSED AT `b711cffa9`** | Bind the post-handoff integrated HEAD, hard-check Node 22, establish S0 on a source-verified authoritative checkout, then execute the plan's two-commit packets serially. Preserve the probe disposition; DG-1/2/3 precede their conditional work; RE-5 remains evidence-only/default defer. | [Lean Engine Integrity](2026-08-26-engine-integrity-plan.md) |
| 8 | R8 | **WAITING ON RC, R1-R7, AND RE GREEN** | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until the final two diaries score 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | **WAITING ON R8** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`RE T0 -> RE-0…RE-6 + remaining R7 gates -> R8 -> R9`

**RE INSERTED 2026-08-26 BY OWNER INSTRUCTION** — *"engine health is sacrosanct; deal with these before more calibration work."* Further calibration waits on RE. R7 may overlap only after packet-level file inspection. Pause R7 during RE-0D/RE-1 or any packaged-runtime/UI collision; engine-only RE-2/3/4 may overlap only when ownership is proven disjoint.

Probe findings and acceptance belong exclusively to the closed probe scope at `b711cffa9`; they are
not RE implementation authority. RE owns confirmed non-probe authority, accounting, ordering,
locality, CI/runtime-truth, and evidence-gated decision packets.

**§6 status:** the enclave guard repair and owner ruling remain historical evidence, but no current
full-run artifact is admissible as lean RE S0. RE-0 must establish the fresh exact-parent Node-22
baseline before any RE behavior claim.

**MEASUREMENT SUBSTRATE EXISTS; RE-0 EVIDENCE IS STILL OWED.** Run provenance can stamp commit,
consumed-input evidence, and flag state, and the pair selector rejects incomparable artifacts.
RE-0 must nevertheless produce its own clean exact-parent Node-22 pair. Historical mixed-tree or
Node-24 runs cannot be reused.

**CURRENT EXECUTION:** The probe lane is closed and the owner handed the repository to RE. RE is
ready for T0 but has not captured its post-handoff execution base. R7 audio implementation has
landed; remaining R7 work is human listen/sensitivity review,
English accessibility/readability, and integrated packaged proof, subject to RE packet collisions.

**Canon landed 2026-08-17:** `SENSITIVE_HISTORY_DESIGN_GATE.md` §10, "Provenance and the Integrity of the Historical Record", ratified by unanimous Pyrrhic panel. `FORAWWV.md` §XIII temporal scope is drafted but **HELD** behind the provenance channel-separation and determinism-scan packets, and is not canon.

RC's narrow pre-1.0 scope is complete. Frontage-days and same-turn selection were retired; the retained v3 two-turn selector preserves the registered Sipovo/Drvar distinction. Reversible D-shape then fixed the event-only persistence clock and produced one bounded live HRHB write at Bucovaca while preserving all anchors, health gates, deterministic artifacts, and Section 6 exclusions. Neighbour-cascade D-topology is reserved post-1.0 and must not be replaced by struck breadth tuning. RE and the remaining R7 gates now jointly gate R8.

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

This board becomes all green only when R1-R9, RC, and RE satisfy the [master definition of program completion](MASTER_ROADMAP.md#12-definition-of-program-completion). Prepared for publication and published are separate states.
