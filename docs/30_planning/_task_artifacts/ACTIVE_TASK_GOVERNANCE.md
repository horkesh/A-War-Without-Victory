# Active Task Governance

## Task

**Name:** RE — 1.0 Engine Integrity
**Owner intent:** Engine health is sacrosanct, but RE must not become general cleanup or optimization.
The owner delegated scope ownership to Architect and Orchestrator and approved the reduced contract
on 2026-08-27.

## Current state

The old T0–T14 execution rail is superseded. RE now has seven release outcomes delivered through
eight serial packets: P1 release-path truth; P2A/P2B one player command authority; P3 threat
lineage; P4 non-starving queues; P5 APWB/Tigar deletion; P6 one formal-battle casualty owner; and
P7 no retreat teleport.

The corrected Node-22 baseline is deterministic, engine-green, and save/replay-green. Its measured
`+3.62853%` mandatory-correctness cost is watch-only, not a 1.0 gate. No further pre-1.0 performance
diagnosis or optimization is authorized. P1 and P2A are accepted. P2B is HELD before implementation
by its packaged-probe NO VERDICT; P3 waits. The owner authorized a bounded auxiliary recovery
outside the seven outcomes/eight packets. No long run is authorized until the one final RE A/B pair.

## Packet governance

- `RE_SCOPE_LOCK.json` binds one packet, exact base, and exact files. A completed packet grants no
  authority for the next.
- Each implementation allowlist contains only the packet's named code/tests plus the scope lock and
  living audit. The lock and compact audit row are bundled with the implementation; current-lane,
  active governance, roadmap, board, indexes, calibration master, and ledgers wait for final sync.
- Identify the staged implementation with the canonical payload SHA-256 defined below.
  Include named production/test paths only; exclude lock/audit/control/docs. Sort repository-relative
  paths by byte order and build UTF-8 LF rows from Git-index values, never worktree bytes:
  `<path>\t<staged-mode>\t<staged-blob-id>\n`, or `<path>\tDELETE\t-\n` for a staged deletion. Hash
  the full manifest and record the digest plus exact path list in the audit. Final docs sync may map
  the digest to a resulting commit but need not.
- Each packet has one implementer, one domain reviewer, and one independent QA reviewer, with one
  consolidated correction pass and one confirmation pass.
- Each implementation packet requires focused RED/GREEN, typecheck, balanced tests, and one compact
  audit row. No per-packet campaign or repeated whole-team review.
- Production LOC across reduced RE must be net non-positive.
- No new persisted/default/migration/IPC/pipeline/module/service/flag/artifact/cache/scan/
  compatibility/history-special-case surface.
- Deterministic declaration order or `strictCompare` only; no clock, RNG, or environment-dependent
  simulation branch.
- Scenarios, calibration data, historical references, and canon remain denied.

Auxiliary packaged-probe recovery is the sole temporary exception to final-only control sync. It
uses three exact locks, earns no RE completion credit, and cannot satisfy P2B retroactively. For
Lock 1 bootstrap, Product Manager stages all 14 synchronized documents; exact-byte/hash reviews,
hook re-pin, and working/staged checks precede the transition commit. For successor Lock 2/3,
Product Manager drafts only the exact lock at clean HEAD; Orchestrator, Architect, and Process QA
approve exact bytes/hash; the existing hook is re-pinned; working/staged checks pass; only then may
payload editing start. Platform Specialist alone implements Lock 2. Lock 3 is mandatory and its
five-file lock must be reviewed/re-pinned before any receipt edit.

## Active machine lock

The current lock is the 14-document transition `RE-PROBE-RECOVERY-TRANSITION` /
`authorize-auxiliary-packaged-probe-recovery`, based on
`c57ecffaf4774b9801d8ef6f4774463f7c0ef52e`. `long_run_policy.permitted` is false; the checker-
required maximum-pairs value `1` is inert and actual campaign runs/pairs are zero. The existing
fail-closed scope checker, staged check, and worktree-local pinned hook remain authoritative. After
this transition closes, only reviewed/re-pinned Lock 2
`RE-PROBE-RECOVERY-INSTRUMENTATION` / `one-shot-packaged-runtime-phase-localization` may open code;
Lock 3 `RE-PROBE-RECOVERY-RECEIPT` / `record-one-shot-packaged-probe-recovery-result` closes the
one-shot receipt before any fresh P2B disposition.

## Deferred and retired

Deferred beyond 1.0: active-formation patron strength pending a live artifact, dissolution salvage,
presidential enclave targeting, hostile breakout, and all speculative mechanics.

Retired: the 2% threshold as a gate on the corrected baseline, further pre-1.0 performance
diagnosis, SpatialContext optimization, the broad T2 audit, T13 essays, standalone T14, per-packet
campaigns, duplicate evidence commits, and full-team review for each packet.

## Final handoff

After all eight packets: run retained focused/Core/save-replay and desktop package proof, confirm
no growth, run one final clean Node-22 188-week A/B pair and one 40-week profile, synchronize docs
once, then hand the clean commit to R8. A new unexplained regression above 2% stops for owner
disposition only when workload and output are comparable; otherwise the delta is descriptive. Only
player-visible latency in R8 may open future bounded performance work, and no measurement authorizes
automatic diagnosis. R8 bugs receive their own bounded packet and never reopen RE wholesale.

## Canonical owner

- `docs/plans/MASTER_ROADMAP.md` owns workstream order and status.
- `docs/plans/2026-08-26-engine-integrity-plan.md` is the sole executable RE contract.
- `docs/plans/COMMAND_BOARD.md` mirrors dispatch state.
- The existing RE audit records evidence; frozen discovery and team reports are not queues.

Remote push, merge, release, tag, signing, upload, and publication remain unauthorized.
