# Release Artifact Index

**Date:** 2026-05-19
**Plan:** `docs/plans/2026-05-18-autonomous-platform-packaging-bank.md` PPB-4.
**Branch:** `codex/rc-hardening-evidence-2026-05-19`.

This index is a local-only directory of where release-related evidence lives
and what each artifact proves. It does not authorize distribution. The
`distributionApproved` flag stays `false` until an operator records clean-VM
evidence against a fresh build.

## How to use this index

When preparing a release candidate:

1. Open the RC evidence bundle (latest dated file in
   `docs/40_reports/release/`) and follow its §1 gate inventory.
2. Use the columns below to locate the owner doc for each operator-pending
   gate. Fill the owner doc; do not record evidence inside this index.
3. After every gate row in the RC bundle is filled (repo-verified rows by
   CI / the gate sequence, operator-only rows by operator), the user makes
   the release decision; this index never moves to "approved" by autonomous
   action.

## Index

| Artifact / evidence row | Class | Owner doc | Last refresh | Status |
|---|---|---|---|---|
| Drift taxonomy | repo-verified, static | `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md` | 2026-05-19 | Active. |
| Generated artifact ownership matrix | repo-verified, static | `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` | 2026-05-19 | Active. |
| Pre-merge gate sequence | repo-verified, static | `docs/20_engineering/PRE_MERGE_GATE.md` | 2026-05-19 | Active. |
| Save/replay determinism proof | repo-verified | `docs/40_reports/implemented/20260519_SAVE_REPLAY_DETERMINISM_PROOF.md`, `tests/scenario_continue_from_save_equivalence.test.ts` | 2026-05-19 | Active. |
| Visual QA evidence inventory + capture matrix | repo-verified, audit | `docs/40_reports/audits/20260519_VISUAL_QA_EVIDENCE_INVENTORY.md` | 2026-05-19 | Active; 5 pending captures operator-only. |
| Branch merge evidence packet | repo-verified | `docs/40_reports/audits/20260518_BRANCH_MERGE_EVIDENCE_PACKET.md` | 2026-05-18 | Covers `codex/execute-2026-05-17-plans`. |
| Gated release & canon decision research | repo-verified | `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md` | 2026-05-18 | Static. Microsoft Store MSIX / Trusted Signing recommended over EV. |
| Accessibility P0 closeout | repo-verified, static guards | `docs/40_reports/implemented/20260518_ACCESSIBILITY_P0_BATCH18.md`, `docs/40_reports/audits/20260518_ACCESSIBILITY_P0_CLOSEOUT_VERIFY_STALE.md` | 2026-05-18 | Active. |
| A11y RC browser evidence | operator-only (browser/axe) | `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md` | 2026-05-18 | Pending operator. |
| BCS localization verification | historian/user-gated | `docs/40_reports/audits/20260518_BCS_LOCALIZATION_VERIFY_STALE.md` | 2026-05-18 | Pending native-speaker review. |
| Release evidence template (per RC) | template (operator fills) | `docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md` | 2026-05-17 | Active. Operator instantiates per build. |
| Launch artifact release-log manifest | repo-verified dry-run support | `tools/release/prepare_launch_artifacts.cjs`, `docs/40_reports/implemented/20260523_RELEASE_ARTIFACT_RELEASE_LOG_MANIFEST.md` | 2026-05-23 | Active. Emits copy-ready `launch_artifact target=... sizeBytes=... sha256=...` only for exact existing artifact paths; distribution approval remains false. |
| Clean-VM operator evidence template | template (operator fills) | `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md` | 2026-05-19 (refreshed in PPB-2) | Active. Operator instantiates per build. |
| Latest RC evidence bundle | meta-bundle (autonomous worker) | `docs/40_reports/release/20260519_RC_EVIDENCE_BUNDLE.md` | 2026-05-19 | Active for this hardening wave. |
| Sensitive-content notification review | historian-gated | `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md` | 2026-05-18 | Pending. |
| Gold gate launch day plan | operator-only roadmap | `docs/plans/2026-05-17-gold-gate-launch-day-plan.md` | 2026-05-17 | Pending. |
| External playtest readiness plan | operator-only roadmap | `docs/plans/2026-05-17-external-playtest-readiness-plan.md` | 2026-05-17 | Pending. |
| Marketing / store launch plan | operator-only / historian-gated | `docs/plans/2026-05-17-marketing-store-launch-plan.md` | 2026-05-17 | Pending. |
| Clean-VM cosmetic finalization plan | operator-only | `docs/plans/2026-05-17-clean-vm-cosmetic-finalization-plan.md` | 2026-05-17 | Pending. |

## Distribution approval

`distributionApproved: false`

This is the canonical machine-readable line. Autonomous workers MUST NOT
flip this to `true` without explicit user/operator sign-off referencing the
exact artifact SHA-256, the matching clean-VM evidence row in the RC
bundle, and the signing/store decision per gated research.

## Maintenance

- Add a new row when a new evidence class lands (e.g. macOS dmg evidence,
  store dashboard screenshots, native-speaker BCS review log).
- Update **Last refresh** when the owner doc is updated, not when this
  index is updated. The doc is truth; this index is a directory.
- Do not record artifact SHAs here; the RC bundle's §3 is the authoritative
  artifact list for any given dated bundle.

## Cross-references

- RC evidence bundle: `docs/40_reports/release/20260519_RC_EVIDENCE_BUNDLE.md`
- Gated release research: `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md`
- Pre-merge gate sequence: `docs/20_engineering/PRE_MERGE_GATE.md`
- Generated artifact ownership: `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
