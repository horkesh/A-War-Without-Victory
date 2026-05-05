# LANE-V095-PLATFORM-TEST-MATRIX-DOC — manual platform test matrix doc

**Date:** 2026-05-05
**Status:** SHIPPED
**Lane:** `LANE-V095-PLATFORM-TEST-MATRIX-DOC`
**Audit reference:** `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` (LANE 7; gaps **P2-G4** + **P2-G5**)
**Predecessor groundwork:** `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`

---

## 1. Summary

This lane authors `docs/40_reports/PLATFORM_TEST_MATRIX.md` — a manual
clean-VM test plan executed before each `v*` release tag push. It closes
the two doc-only platform-coverage gaps the audit named in §3 of
`20260505_V095_PLATFORM_PACKAGING_AUDIT.md`:

- **P2-G4** — post-install / post-uninstall manual test plan missing.
- **P2-G5** — Linux distro coverage matrix undefined.

The matrix is doc-only. No source / test / scenario / canon / config /
build / CI / packaging file is touched by this lane.

---

## 2. Files committed

| File | Status | Purpose |
|---|---|---|
| `docs/40_reports/PLATFORM_TEST_MATRIX.md` | NEW | Manual clean-VM platform test plan (Linux AppImage + Windows NSIS) |
| `docs/40_reports/implemented/20260505_V095_PLATFORM_TEST_MATRIX_DOC.md` | NEW | This lane report |

No other file is in this commit.

---

## 3. Implementation

### 3.1 Doc structure

`PLATFORM_TEST_MATRIX.md` follows the existing master-doc style of
`docs/40_reports/CALIBRATION_MASTER.md` and similar `*_MASTER.md` docs in
the same folder (heading conventions, table-driven content, Updated
metadata in header, cross-reference block at bottom). Eight numbered
sections:

1. **When to run this matrix** — trigger (pre-tag), operator (release
   driver), output (filled-out execution log appended to Release body),
   hard gate (no `v*` tag pushed without recorded PASS).
2. **Supported platforms — declared floors** — Linux (Ubuntu 22.04+,
   Fedora 38+, Debian 12+; FUSE2 required; glibc ≥ 2.31), Windows
   (Win10 1809+ / Win11), and an explicit list of out-of-v0.9.5-scope
   platforms (macOS, Steam, MS Store, ARM64, .deb / .rpm / Flatpak /
   Snap). Closes **P2-G5**.
3. **Per-platform install / launch / save / load / advance / uninstall
   checklist** — 12 numbered Linux steps (L-1 through L-12), 20
   numbered Windows steps (W-1 through W-20). Closes **P2-G4** core.
4. **Save round-trip verification** — pre-war / mid-war / late-war save
   capture; reload and verify byte-stability per save.
5. **Determinism smoke (packaged build)** — declared as a current GAP
   (no packaged determinism harness yet); §5.2 captures it as a known
   limitation with a non-blocking classification consistent with audit
   P2 severity.
6. **First-time-install UX** — §6.1 Linux AppImage chmod +x note;
   §6.2 Windows SmartScreen "Windows protected your PC" cliff with
   bypass steps + screenshot description for player docs.
7. **Test execution log template** — header block + Linux exec log table
   + Windows exec log table + save round-trip table + determinism smoke
   table + sign-off block. Each row has PASS / FAIL / N/A columns +
   tester initial.
8. **Cross-references + revision history**.

### 3.2 Cross-references inside the matrix

- `docs/RELEASE_PROCESS.md` — sibling lane (referenced as "sibling lane
  will create"; this lane does NOT create that file).
- `docs/40_reports/audits/20260505_V095_PLATFORM_PACKAGING_AUDIT.md` —
  parent audit (this lane closes its P2-G4 + P2-G5).
- `docs/40_reports/implemented/20260504_V0_9_5_PLATFORM_PACKAGING_GROUNDWORK.md`
  — predecessor groundwork.
- `tools/build/linux_appimage_smoke.cjs`, `tools/build/win_nsis_smoke.cjs`
  — CI smoke verifiers; matrix calls out that CI smoke is NOT a
  substitute for the manual VM matrix.
- `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md` —
  roadmap plan slot.

### 3.3 Faction-symmetric / faction-agnostic by construction

Platform packaging is sim-orthogonal infrastructure. The matrix mentions
no faction (RBiH, RS, HRHB), no §6 mechanic, no combat outcome, no
political-controller behavior. Save round-trip verification is described
in terms of turn / phase / state-shape — never in terms of which faction
holds which OSID.

### 3.4 What this lane explicitly does NOT do

- Does NOT touch `.github/workflows/*` (sibling lanes — LANE 3 / LANE 5).
- Does NOT create `docs/RELEASE_PROCESS.md` (sibling lane — LANE 5; this
  lane only references it).
- Does NOT touch `tools/release/*` (sibling lane — LANE 8 release-notes
  generator).
- Does NOT touch `electron-main.cjs`, `build/*`, `package.json`, or any
  test under `tests/desktop_packaging_*` (sibling lanes — LANE 1 icon,
  LANE 4 version bump, LANE 6 setAppUserModelId).
- Does NOT execute the matrix. The matrix is a checklist authored for
  the release driver to run before pushing `v*` tags. No clean VM was
  spun up by this lane.
- Does NOT touch any sim / combat / scenario / canon file.

---

## 4. Verification

### 4.1 Style match against existing master docs

Verified visually against `docs/40_reports/CALIBRATION_MASTER.md` header
+ table conventions and the existing implemented-lane report
`docs/40_reports/implemented/20260505_V094_LOADING_AND_ERROR.md` for
report-section structure.

### 4.2 Doc length

`PLATFORM_TEST_MATRIX.md` = doc-only deliverable. Line count recorded in
the parent-batch report (see "Doc length" field in §6 below).

### 4.3 No code touched

```
$ git diff --name-only HEAD <pre-commit>
docs/40_reports/PLATFORM_TEST_MATRIX.md
docs/40_reports/implemented/20260505_V095_PLATFORM_TEST_MATRIX_DOC.md
```

Two files. Both under `docs/`. No build / test / CI / source touched.

### 4.4 Typecheck / vitest

Not applicable — doc-only lane. Per audit §7 sensitive-history
classification, no regression risk to determinism / sim / scenario / OOB
/ paint / canon. No code path executed by these markdown files.

### 4.5 Conventional commit message

```
docs(platform): v0.9.5 platform test matrix doc (LANE-V095-PLATFORM-TEST-MATRIX-DOC)
```

---

## 5. Sensitive-history compliance

- **Ring N/A.** Doc-only platform-infrastructure lane. No simulation
  surface touched.
- **No determinism path touched.** No script / scenario / engine code in
  this commit; the matrix describes manual VM steps and never executes
  them.
- **No §6 / FORAWWV / paint anchor / political_controllers / OOB /
  rupture-wiring / `enclave_resilience.ts` reference.** Confirmed by
  file inventory in §2 of this report and by reading the matrix doc end
  to end.
- **Faction symmetry.** Matrix is faction-agnostic by construction —
  packaging is sim-orthogonal; no RBiH / RS / HRHB content anywhere in
  the matrix.
- **Combat-math / scenario / canon edits.** None.
- **Tutorial onboarding anchors / UI palette tokens.** Not touched (this
  lane is markdown-only; doesn't render to the app shell).

**Sensitive-history compliance verdict: GREEN. Ring N/A.**

---

## 6. Backlog status after this lane

The audit `§4 prioritized closure backlog` enumerated 10 lanes. This
lane closes **LANE 7**. Remaining audit gaps relevant to v0.9.5 closure:

| Lane ID | Gap(s) | Severity | Status after this lane |
|---|---|---|---|
| LANE-V095-PLATFORM-ICON | P1-G1 + P1-G2 | P1 | OPEN — sibling lane |
| LANE-V095-FIRST-REAL-BUILD | P1-G3 + P1-G4 | P1 | OPEN — sibling lane |
| LANE-V095-CI-PACKAGE-MATRIX | P1-G5 + P1-G6 | P1 | OPEN — sibling lane |
| LANE-V095-VERSION-BUMP | P1-G7 | P1 | OPEN — sibling lane |
| LANE-V095-RELEASE-WORKFLOW | P1-G8 | P1 | OPEN — sibling lane |
| LANE-V095-APP-USER-MODEL-ID | P2-G1 | P2 | OPEN — sibling lane |
| **LANE-V095-PLATFORM-TEST-MATRIX-DOC** | **P2-G4 + P2-G5** | **P2** | **CLOSED — this lane** |
| LANE-V095-RELEASE-NOTES-GENERATOR | P2-G3 | P2 | OPEN — sibling lane |
| LANE-V095-REPRODUCIBLE-BUILD-HARNESS | P2-G2 | P2 | OPEN — sibling lane |
| LANE-V095-AUTO-UPDATE | P2-G8 | P2 | OPEN (deferred — depends on Win signing cert + GH Releases) |

This lane is independent of all other lanes. The matrix references
`docs/RELEASE_PROCESS.md` as a forward-reference (sibling lane LANE 5 is
expected to create it); the cross-reference does not require that file
to exist before this lane lands — when LANE 5 ships, the link resolves.

---

## 7. Successor handoffs

- **Release driver** (operator role, not an agent) — runs the matrix
  before any `v*` tag push. Records the §7 execution log table in the
  GitHub Release body or as an attached `RELEASE_TEST_LOG_<tag>.md`.
- **LANE-V095-FIRST-REAL-BUILD** — when that lane ships, the matrix is
  the canonical first-time-validation checklist for whether the
  produced AppImage + NSIS artifact actually works end-to-end on a
  clean VM. The matrix should be exercised against the first real
  build.
- **LANE-V095-RELEASE-WORKFLOW** — when that lane ships
  `docs/RELEASE_PROCESS.md`, the cross-reference inside the matrix
  resolves; no edit required to the matrix unless the release process
  changes how the matrix is consumed (e.g. uploading the log as a
  release asset vs. inlining in the body).
- **Future packaged-determinism smoke harness** — §5.2 of the matrix
  declares the GAP. A follow-up lane to add a packaged determinism
  smoke would tighten §5 to remove the "if no harness exists" branch.

---

End of report.
