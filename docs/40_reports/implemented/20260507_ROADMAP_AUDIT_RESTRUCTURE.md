# Roadmap Audit + Restructure — May 7, 2026

**Lane:** LANE-NIGHTSHIFT-ROADMAP-AUDIT-RESTRUCTURE-MAY-7
**Date:** 2026-05-07
**Type:** Documentation-only — full audit + restructure of `docs/plans/MASTER_ROADMAP.md`
**Authorization:** User explicitly authorized milestone name + addition changes ("We only use it for tracking anyway").

## Summary

Performed an audit + restructure of the 832-line `docs/plans/MASTER_ROADMAP.md` to reflect the trip-session-6 work (~30+ commits, 2026-05-06/07) that opened a new milestone band substantively extending v0.8.3 Order Interpretation and v0.8.4 Phase E Claude API at political level. Added **v0.9.6 "AI Officers (real)"** as the milestone home for the deterministic political → army → corps substrate work. Added a new **Path to v1.0** cross-milestone synthesis section. Bumped headers. Preserved all closed-milestone history (v0.1 → v0.8.4 + v0.8.x-final + transition band + v0.9.0 → v0.9.5).

## What changed

### Sections added

1. **`v0.9.6 — AI Officers (real)` milestone block** (~110 lines, inserted between v0.9.5 closing and v1.0.0 Gold).
   - Theme + sequencing principles.
   - A-lane DDR + A1-A5 substrate (5 named commits).
   - B-lane DDR + B1-B2 producer (3 named commits).
   - C-lane DDR + C1-C2 consumer + telemetry (4 named commits including `e6afb559` revert + `c084dd86` reapply path).
   - API-Directive Bridge (`a2d564e6`).
   - Q-lanes (`6cbcaa00` → `8ccdbff8` revert → `be7e0715` proper fix; `aa30f349` → `03ef9cd4`).
   - D-lane DDR + D1-D2 + telemetry wire-fix + D3 cost calibration.
   - 5-lane batch + 3-lane backlog closure (8 named commits).
   - Krivaja-95 t168 floor compliance (`d622b762` + `39e6b7b6`).
   - Documentation propagation (6 KNOWLEDGE entries + FORAWWV §X-§XVI canon `bca414ba` + `ebac4fdf` master-doc updates).
   - Latest baselines: 40w n1728 hash `79fa407377b40083`, 188w n1729 hash `e85303890ff4b601`.
   - Status: OPENED, PARTIAL.
   - Open carry-forward items.
   - Sensitive-history compliance line (Ring 1 / no-§6 / faction-agnostic).

2. **`Path to v1.0` cross-milestone synthesis section** (~30 lines, inserted between v0.9.6 and v1.0.0 Gold).
   - Hard blockers (4): v0.9.5 P1-G3+G4 manual host builds; v0.9.6 SRK siege defender Phase 1 sign-off; v0.9.6 persona suppressor validation run; package.json bump to v0.9.6.
   - Open milestone work carried forward (v0.9.0 → v0.9.4).
   - Deferred to v0.9.6+ / v1.0 prep (per v0.9.5 audit §6 R7).
   - Maintenance items (ledger archival, canon-doc amendments, FORAWWV review cadence).
   - Bottom-line gating statement.

### Sections updated

1. **Header (lines 1-6).** Bumped Last Updated → 2026-05-07; added v0.9.6 trip-session-6 summary line. Current Version still `v0.9.5-alpha.1` with explicit note that "package.json bump for v0.9.6 is PENDING — roadmap state is ahead of semver".

2. **Current Status Assessment table.**
   - Calibration pipeline row updated to n1728/n1729 baselines.
   - Order Interpretation row reframed: "Complete at single-actor level (v0.8.3); deeper political → army → corps multi-layer realization OPENED in v0.9.6 trip session 6 (A-lane + B-lane + C-lane substrate)".
   - Autonomy Depth + Claude API row reframed: "Complete at political level (v0.8.4); three-layer Claude-API persona QA harness (presidents + army COs + corps COs) OPENED in v0.9.6 D-lane (opt-in only; default off byte-stable)".
   - Added new row: **AI Officers (real) — political → army → corps substrate** | OPENED v0.9.6.
   - Closing "Current:" paragraph rewritten: cites n1728/n1729 baselines; lists v0.9.0-v0.9.6 as variably partial; references "Path to v1.0 above" as the cross-milestone synthesis owner.

3. **Key Plan Documents table.** Added 5 new entries linking to v0.9.6 reports/audits/DDRs:
   - `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (DDR `eee308e0`).
   - `docs/40_reports/implemented/20260507_NW_BOSNIA_OOB_AUDIT.md` (BUG-01 fix `be7e0715`).
   - `docs/40_reports/implemented/20260507_STUPCANICA_W27_TRIGGER_FIX.md` (`759a35cd`).
   - `docs/40_reports/audits/20260507_CANON_DOC_PROPAGATION_NOTES.md` (carry-forward maintenance).
   - `docs/40_reports/audits/20260507_SRK_SIEGE_DEFENDER_MORALE_PHASE_0.md` (`bb0e449e`).

### Sections preserved (unchanged)

- v0.1 → v0.7 completed history.
- v0.8.0 → v0.8.4 milestone records (full closure history, all hardening campaign updates retained verbatim).
- v0.8.x-final command authority cleanup.
- v0.8-to-v0.9 closed transition band (full A+++ scorecard + hit list + 30+ status updates retained verbatim).
- v0.9.0 → v0.9.5 milestone records.
- v1.0.0 Gold "What ships in v1.0" + "NOT in v1.0" lists.
- Post-1.0 Content Plan table.
- Open Design Questions section.
- Canon Documentation Status table.
- Legendary Features Summary table.
- Version Bump Protocol.
- Studio Health / Repo Truth (Permanent Side Lane) section.
- 2026-04-09/10/11 hardening board notes.

### Cross-references checked

- `Supersedes` section — unchanged; legacy roadmap pointers still valid.
- v0.9.5 P1-G3+G4 references — preserved as hard blockers in Path to v1.0.
- Cost Ledger v0.9.0 reference — preserved.
- Ghost Map / Exhaustion Clock / Letter Home "Implemented" status — preserved.
- v0.7.x reslot block (v0.7.0.1 → v0.8.0.x parallel; v0.7.1 essay engine → v0.9.1; etc.) — preserved.

### Stale references — none deleted, all retained as historical record per preservation rule

The roadmap accumulates older "next lane" language and status updates from 2026-04-07 → 2026-04-30. Per the user's preservation rule ("Preserve ALL closed-milestone history... Do NOT delete or summarize away historical milestone records — they're tracking provenance"), these were left in place. Where a status update has been superseded (e.g., n1579/n21 calibration paragraph), the new "Current:" closing paragraph cites the latest n1728/n1729 baselines so readers consult the closing section for current truth.

## STOP-AND-ASK triggers — none triggered

The brief authorized stop-and-ask if:
- Existing milestone naming conventions clash with the proposed v0.9.6 name → **No clash.** v0.9.5 was last named milestone; v0.9.6 fits the existing 0.9.x pattern. The "AI Officers (real)" subtitle echoes v0.8.x naming (Commander Maturity / Order Interpretation / Autonomy Depth + Claude API).
- A closed milestone needs to be REOPENED → **No reopens.** v0.8.3 + v0.8.4 are correctly preserved as CLOSED at their original scope; v0.9.6 is framed as "deeper realization" of those concepts, not a reopening.
- Structural changes beyond audit+restructure → **None needed.** All edits were surgical; the existing structure (Completed → Active → Closed Transition → Planned → Post-1.0 → Open Design Questions → Canon Documentation Status → Current Status Assessment → Legendary Features → Version Protocol → Key Plans → hardening notes) was preserved.

## Verification

- File grew 832 → 955 lines (+123 lines net).
- All ~30+ commit SHAs cited in the v0.9.6 milestone block match the brief verbatim.
- All five new Key Plan Document table paths verified to exist on disk.
- No source code, test, scenario, canon, or political_controllers files touched.
- Single file modified: `docs/plans/MASTER_ROADMAP.md`.
- Closeout report: this file (`docs/40_reports/implemented/20260507_ROADMAP_AUDIT_RESTRUCTURE.md`).

## Sensitive-history compliance

Documentation-only lane; no §6 surface, no FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch. Roadmap text references the v0.9.6 sensitive-history compliance line ("All trip-session-6 commits Ring 1 / no-§6 / faction-agnostic") but introduces no new sensitive-history claims.

## Roadmap delta

- v0.9.6 milestone OPENED with full ~30+ commit provenance.
- Path to v1.0 synthesis now exists as a single readable section (replaces scattered "what's next" language across milestones).
- v0.9.0 / v0.9.1 / v0.9.2 / v0.9.3 / v0.9.4 / v0.9.5 PARTIAL/OPEN status preserved with explicit acknowledgement in Path to v1.0.
- package.json semver discrepancy explicitly flagged (`v0.9.5-alpha.1` vs roadmap state at v0.9.6).

## Successor handoffs

1. **package.json bump to v0.9.6** — parent's call after roadmap reflects intent. This restructure makes that intent explicit.
2. **SRK siege defender Phase 1 sign-off** — DDR drafted at `bb0e449e`; needs user sign-off on coefficient + floor + flag default.
3. **Persona suppressor validation run** — ~$1.30 D3 re-run to confirm `cb13e605` suppressor block lifts genuine-signal rate.
4. **v0.9.5 P1-G3+G4 manual host builds** — Linux AppImage + Win unsigned NSIS; CI + smoke verifier ready.
5. **Aggressive ledger archival** — `docs/PROJECT_LEDGER.md` is 8302 lines; ~30-50% reduction potential.
6. **Manual canon-doc amendments** — per `docs/40_reports/audits/20260507_CANON_DOC_PROPAGATION_NOTES.md`.
