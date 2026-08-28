# AWWV Command Board

**Status:** Derived dispatch view, synchronized 2026-08-28.

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
| 7 | R7 | **ACTIVE — AUDIO IMPLEMENTATION LANDED `2d106e5e0`** | Complete human listen/sensitivity acceptance, English accessibility/readability, offline browser and packaged-runtime proof, and closeout reconciliation. Pause only a packet whose exact files collide with active RE. Localization Phase 3 remains post-1.0. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) / [opening implementation](2026-08-23-opening-screens-implementation-plan.md) |
| 7.5 | RE | **HELD AT P2B — AUXILIARY PACKAGED-PROBE RECOVERY ACTIVE** | P1/P2A are accepted. Execute the owner-authorized three-lock recovery outside RE outcomes; P2B code remains untouched and P3 waits. Only an accepted `NONREPRODUCIBLE_GREEN` may be considered for a fresh P2B lock; all other classes keep P2B held and allow one bounded proposal after receipt closeout. | [Recovery plan](2026-08-28-packaged-probe-recovery-plan.md) / [1.0 Engine Integrity contract](2026-08-26-engine-integrity-plan.md) |
| 8 | R8 | **WAITING ON RC, R1-R7, AND RE GREEN** | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until the final two diaries score 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | **WAITING ON R8** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`auxiliary packaged-probe recovery -> fresh P2B disposition -> RE P2B–P7 + remaining R7 gates -> one RE final pair/profile -> R8 -> R9`

**RE INSERTED 2026-08-26 AND REDUCED 2026-08-27 BY OWNER APPROVAL.** Engine health remains
sacrosanct, but RE is not a general cleanup or optimization lane. Further calibration waits on the
seven release outcomes. R7 may overlap only after exact file inspection proves disjoint ownership.

The original probe channel remains closed at `b711cffa9`; its findings are not RE implementation
authority. The active packaged-probe recovery is a distinct auxiliary safety-control lane, outside
the seven outcomes/eight packets, created only to localize the P2B package gate. It grants no RE
credit or automatic P2B satisfaction.

**§6 status:** the clean lean RE baseline pair is captured at `177882fc2`. Both Node-22 runs preserve
the enclave guard, pass engine-only and direct-consistency gates, and reproduce the same artifacts/fingerprint.
The checkpoint tool's Farz timing red remains non-authorizing calibration observation.

**CORRECTED RE BASELINE EVIDENCE EXISTS.** Run provenance stamps exact commit, consumed-input evidence, and flag
state; the clean Node-22 A/B pair is byte-identical outside path-derived metadata. Historical
mixed-tree or Node-24 runs remain inadmissible and cannot replace it.

**CURRENT EXECUTION:** P1 and P2A are accepted; P2B is held before implementation by the recorded
packaged-probe NO VERDICT, and P3 waits. The owner authorized Orchestrator/Architect's bounded
three-lock recovery plan without reopening the original probe channel. Platform is sole
implementer; Build, Architect, and QA review independently. Current Lock 1 is
`RE-PROBE-RECOVERY-TRANSITION` / `authorize-auxiliary-packaged-probe-recovery` on `c57ecffaf…`;
the calibration pause is unchanged. Production LOC stays net
non-positive; forbidden engine surfaces cannot grow. The `+3.62853%` mandatory-correctness cost is
watch-only, not a 1.0 blocker, and no further pre-1.0 performance diagnosis is authorized. Active
formation strength, dissolution salvage, enclave targeting, hostile breakout, and speculative
mechanics are deferred. Broad audits/essays, standalone closeout, per-packet campaigns, and repeated
full-team review are retired. R7 may continue where exact files are disjoint.

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
