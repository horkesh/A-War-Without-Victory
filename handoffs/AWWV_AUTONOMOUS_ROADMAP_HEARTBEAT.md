# AWWV Autonomous Roadmap Heartbeat

**Synchronized:** 2026-08-15

- Current branch/worktree: `codex/master-roadmap-execution` at `F:\A-War-Without-Victory`.
- Current implementation base: accepted v3 two-turn D-selection plus reversible D-shape (`4.0` shock / `0.5` weekly recovery), retained behind the default-OFF collapse gate.
- Current lane: R7 content, historical attribution, audio, English accessibility/readability, and opening experience.
- Completed RC stages: Stage 0 guard/evidence repair, Stage 2 retained 188-week ON/OFF baseline, and the bounded default-OFF D-selection measurement implementation.
- Current accepted RC evidence: 629 matched OSIDs, 31/31 anchors, byte-identical control output, one live non-enclave HRHB damage/capacity write, and complete Section 6 protected absence. No protected OSID reached Tier-1 in the campaign; the discriminating G1 fixture remains the protected-input proof.
- D-selection measurement: v1 direct incidence and v2 same-turn municipality support both tied Sipovo/Drvar 1/1. The retained v3 symmetric two-turn window measured the exact pre-registered 3/2 split in two deterministic 188-week runs. It peaked at exposure 33 / strain 4.95, with zero threshold crossings or damage.
- D-shape result: paired deterministic 188-week runs produced final hash `70d5e04c6f49e041`, fingerprint `22cf3c5d8884bfb8`, 31/31 anchors, 6/6 benchmarks, 7/7 health gates, and one live non-enclave HRHB write at Bucovaca. Its strain peaked 62 and recovered to 37; Sipovo/Drvar peaks stayed 11/7.5. Section 6 passed with one live global write and no protected writes.
- Next lane: R7 Phase 1.2 retained Ring-2 content closeout. D-topology neighbour cascade and multilingual localization are post-1.0.
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
| RC | Pre-1.0 narrow scope complete | None; D-topology is post-1.0/reserved |
| R7 | Active | Execute Phase 1.2, then officer/OOB, audio, English accessibility/readability, opening screens, and packaged proof |
| R8 | Waiting | Start after RC and R1-R7 are green |
| R9 | Waiting | Start after two clean 5/5 R8 diaries |

## Working Tree

- Current packet: retained D-shape implementation, paired evidence, narrow RC closeout, and R7 activation documents.
- Pre-existing unrelated modification: `.claude/scheduled_tasks.lock`; preserve and do not include in the docs sync.
- Canon changes: none. V3's optional queue and D-shape's 4.0/0.5 arithmetic run only on the enabled OSID path; the default-OFF gate, schema version, thresholds, Phase 3D damage semantics, control writers, and baseline output remain unchanged.

## Verification

- Relative Markdown links: 145 targets checked across the seven synchronized entrypoint documents; all targets exist.
- Targeted stale-status and localization-gate scan: no obsolete R2/R5/Stage-2-next/WP-9-current phrases remain, and unfinished multilingual work is consistently post-1.0 rather than an R7/R8/R9/1.0 blocker.
- `git diff --check`: passed.
- `npm.cmd run canon:check`: determinism static scan passed 1/1 and all four baseline scenarios matched without refresh after the seven stale `apr1992_52w` hashes were causally reconciled to the owner-kept multi-axis veto behavior from `b9da847f1`. The manifest update changed exactly those seven hashes; the 188-week fingerprint, both four-week scenarios, and `watched_operations.json` remained unchanged.
- Combined D-shape/collapse/Section 6/save/pipeline gate: 11 files / 104 tests passed; focused D-shape 16/16 and typecheck passed. This includes quiet recovery, every-turn persistence, threshold reset, and empty-live-OSID-front coverage.
- Measurement determinism: 15/16 files byte-identical across separate output directories; only `run_meta.json` differed because it records `out_dir`. Both final-state hashes were `525866bf25a49d33` and both structural fingerprints were `22cf3c5d8884bfb8`.
- V2 failed-experiment determinism: 15/16 files byte-identical; only `run_meta.json` differed. Both final-state hashes were `b3d60834a7aa5cf1`, both fingerprints were `22cf3c5d8884bfb8`, all seven engine-health gates and 31/31 anchors passed, and the exact Sipovo/Drvar main-town result remained 1/1. Source and tests were then restored to v1.
- V3 acceptance proof: 15/16 files byte-identical; only `run_meta.json` differed. Both final-state hashes were `2cfb52c1e7811915`, both fingerprints were `22cf3c5d8884bfb8`, all seven engine-health gates, six bot benchmarks, and 31/31 anchors passed, and exact Sipovo/Drvar main-town exposure was 3/2. Maximum strain remained 4.95; zero entities crossed 40/55 and no damage/capacity write occurred.
- Scale-only failed-experiment proof: 15/16 files byte-identical; only `run_meta.json` differed. Both final-state hashes were `625ffd6b24154674`, both fingerprints were `22cf3c5d8884bfb8`, all seven health gates, six bot benchmarks, and 31/31 anchors passed. Sipovo/Drvar strain was 9/6, HRHB maximum 60, and global maximum 99, but Tier-1 and damage/capacity writes stayed empty; 3.0 was reverted.
- D-shape acceptance proof: 15/16 files byte-identical; only `run_meta.json` differed. Both final-state hashes were `70d5e04c6f49e041`; fingerprint `22cf3c5d8884bfb8`, 31/31 anchors, six benchmarks, seven health gates, and Section 6 all passed. Bucovaca wrote the sole live non-enclave HRHB damage/capacity entry, then recovered from peak strain 62 to terminal 37 with Tier-1 off.
- Closeout gates: `canon:check` passed its static determinism scan and all baseline scenarios without refresh. The repository-wide Vitest run was not green: it reproduced an unrelated `sana_95` catalog assertion (isolated result 43 pass / 1 fail at `tests/operation_opportunities_catalog.test.ts:1064`) and was terminated after a later worker emitted nothing for 30 CPU-minutes. This limitation is outside the D-selection packet and remains explicit.
