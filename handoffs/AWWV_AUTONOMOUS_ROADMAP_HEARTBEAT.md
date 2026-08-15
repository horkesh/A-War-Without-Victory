# AWWV Autonomous Roadmap Heartbeat

**Synchronized:** 2026-08-15

- Current branch/worktree: `codex/master-roadmap-execution` at `F:\A-War-Without-Victory`.
- Current implementation base: `ced78d3eb` (`feat(collapse): measure combat-incidence D-selection`).
- Current lane: RC pressure/exhaustion/COLLAPSE pipeline.
- Completed RC stages: Stage 0 guard/evidence repair, Stage 2 retained 188-week ON/OFF baseline, and the bounded default-OFF D-selection measurement implementation.
- Current baseline: 629 matched OSIDs, 31/31 anchors, byte-identical control output. This establishes a deterministic baseline, not Section 6 clearance, because no live collapse damage reached G1.
- D-selection measurement: v1 direct incidence was deterministic but tied the pre-registered Sipovo/Drvar main-town targets 1/1. The owner-approved v2 same-turn municipality-support experiment was also deterministic but tied 1/1 because the peer battles occurred on different turns; it was retired and reverted. Both peaked at exposure 33 / strain 4.95 with zero threshold crossings or damage.
- Next lane: explicit owner/design decision on a temporal aggregation contract, followed by two fresh measurements and live Section 6 evidence. Scaling is not next because it cannot repair a tied selector. D-shape does not start yet. Eligibility-breadth tuning and lane C are struck; D-topology is reserved for an explicit later decision.
- Downstream sequence: finish the reduced pre-1.0 R7 content/history/audio/accessibility/opening scope, then R8 packaged full-campaign validation, then R9 release-candidate readiness. Localization Phase 3 is post-1.0.
- Publication boundary: signing, upload, public release creation, and a public `1.0` tag require a separate explicit `Publish 1.0` instruction.

## Workstream Status

| Lane | Status | Next action |
|---|---|---|
| R1 | Complete | None |
| R2 | Complete | None |
| R3 | Complete | None |
| R4 | Complete | None |
| R5 | Complete | None; accepted performance floor is approximately 1.09 seconds/turn |
| R6 | Pre-1.0 scope complete | Post-1.0 debt remains recorded unless explicitly reactivated |
| RC | Active; v1 measurement retained, v2 fail-reverted | Design temporal aggregation, remeasure, obtain live Section 6 evidence, then D-shape |
| R7 | In progress, waiting behind RC | Finish content/history/audio/accessibility/opening packet; localization Phase 3 is post-1.0 |
| R8 | Waiting | Start after RC and R1-R7 are green |
| R9 | Waiting | Start after two clean 5/5 R8 diaries |

## Working Tree

- Current packet: documentation-only record of the v2 failed experiment; the v1 D-selection adapter, Phase 3C/War wiring, and focused tests remain at `ced78d3eb`.
- Pre-existing unrelated modification: `.claude/scheduled_tasks.lock`; preserve and do not include in the docs sync.
- Canon changes: none. No v2 runtime or test change survives; the existing default-OFF v1 gate, persisted schema, constants, Phase 3D behavior, control behavior, and baseline output are unchanged.

## Verification

- Relative Markdown links: 145 targets checked across the seven synchronized entrypoint documents; all targets exist.
- Targeted stale-status and localization-gate scan: no obsolete R2/R5/Stage-2-next/WP-9-current phrases remain, and unfinished multilingual work is consistently post-1.0 rather than an R7/R8/R9/1.0 blocker.
- `git diff --check`: passed.
- `npm.cmd run canon:check`: determinism static scan passed 1/1 and all four baseline scenarios matched without refresh after the seven stale `apr1992_52w` hashes were causally reconciled to the owner-kept multi-axis veto behavior from `b9da847f1`. The manifest update changed exactly those seven hashes; the 188-week fingerprint, both four-week scenarios, and `watched_operations.json` remained unchanged.
- Combined focused D-selection/collapse/Section 6/lifecycle gate: 87/87 passed; typecheck passed. This includes the empty-live-OSID-front regression proving no settlement-frontage fallback.
- Measurement determinism: 15/16 files byte-identical across separate output directories; only `run_meta.json` differed because it records `out_dir`. Both final-state hashes were `525866bf25a49d33` and both structural fingerprints were `22cf3c5d8884bfb8`.
- V2 failed-experiment determinism: 15/16 files byte-identical; only `run_meta.json` differed. Both final-state hashes were `b3d60834a7aa5cf1`, both fingerprints were `22cf3c5d8884bfb8`, all seven engine-health gates and 31/31 anchors passed, and the exact Sipovo/Drvar main-town result remained 1/1. Source and tests were then restored to v1.
- Post-revert proof: the retained v1 focused suite passed 7/7; source, tests, data, and canon have no packet diff; `git diff --check` passed.
- Closeout gates: `canon:check` passed its static determinism scan and all baseline scenarios without refresh. The repository-wide Vitest run was not green: it reproduced an unrelated `sana_95` catalog assertion (isolated result 43 pass / 1 fail at `tests/operation_opportunities_catalog.test.ts:1064`) and was terminated after a later worker emitted nothing for 30 CPU-minutes. This limitation is outside the D-selection packet and remains explicit.
