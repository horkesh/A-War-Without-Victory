# LANE-V094-FACTION-PALETTE-CANONICALIZATION — implementation report

**Lane:** `LANE-V094-FACTION-PALETTE-CANONICALIZATION` (top backlog item per
`docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md` §4 LANE-1).
**Date:** 2026-05-05
**Parent SHA at lane start:** `cdb2d30f` (audit reference); branch tip walked
forward to current `main`.
**Status:** IMPLEMENTED (two commits, verify-before-exit at each).

---

## 1. Objective

Per the v0.9.4 Phase-1+Phase-2 UI Shell Audit (§2.5, §4), five separate
faction-palette forks live in the codebase. The audit recommends promoting
`FACTION_GLOW_RGB` (Wave 8 Lane D, in
`src/ui/map/layers/buildForceQualityOverlay.ts`) to the project-wide
source-of-truth and migrating the other forks to derive from it. The
SettingsModal.ts ad-hoc inversion (RS=blue, HRHB=red — opposite of every
other surface) is fixed as part of the same sweep.

---

## 2. Inventory — palette forks identified

The audit identified five forks. During implementation, an additional sixth
fork (`opsConstants.ts`) was found and included in the sweep. CSS-side and
standalone-debug-viewer forks were noted but explicitly DEFERRED (out of the
audit's named scope; non-blocking for the player-visible cohesion goal).

| # | Path | Pre-fix shape | Pre-fix values | Status |
|---|---|---|---|---|
| 1 | `src/ui/map/layers/buildForceQualityOverlay.ts` | `FACTION_GLOW_RGB` (canonical) | `RS=[200,70,70]`, `RBiH=[70,165,90]`, `HRHB=[70,130,200]` | **byte-stable; preserved unchanged** |
| 2 | `src/ui/map/utils/theme.ts` | `FACTION_HEX_COLORS` literal map | `RS='#c04040'`, `RBiH='#4a9a55'`, `HRHB='#4080b8'` | **migrated** → derives from `factionHex(...)` |
| 3 | `src/ui/warroom/components/warroom_utils.ts` | `FACTION_COLORS` literal triple map | `rgb(55,140,75)` / `rgb(180,50,50)` / `rgb(50,110,170)` | **migrated** → derives from `factionAccentTriple(...)` |
| 4 | `src/ui/warroom/components/InvestmentPanel.ts` | private `FACTION_COLORS` literal map | `rgb(27,94,32)` / `rgb(226,74,74)` / `rgb(74,144,226)` | **deleted** + uses `factionRgbString(...)` |
| 5 | `src/ui/warroom/components/SettingsModal.ts` | inline conditional ternary | RS=`#14316d` (blue! — INVERTED), HRHB=`#922026` (red! — INVERTED), RBiH=`#2b5042` | **fixed** + uses `factionHex(...)` |
| 6 | `src/ui/map/components/plan_ui/opsConstants.ts` | `FACTION_HEX_COLORS` literal map (audit-undocumented 6th fork) | `RS='#c24040'`, `RBiH='#4a9a55'`, `HRHB='#4080b8'` | **migrated** → derives from `factionHex(...)` |

Deferred (scoped out — not in the 5 forks the audit named, but flagged here
for a future tighter-cleanup lane):

- `src/ui/warroom/components/SettlementInfoPanel.ts` — same `rgb(27,94,32)`-family literals as InvestmentPanel
- `src/ui/warroom/components/WarPlanningMap.ts` — three inline conditional palettes (lines 184-186, 864, 909, 947)
- `src/ui/warroom/map_viewer_app.ts` + `map_viewer_standalone.html` — debug viewer literals
- `src/ui/warroom/styles/modals.css` — CSS class-scoped color rules (`.faction-rs .magazine-section-header { color: rgb(180,50,50); }`)
- `src/ui/map/tailwind.config.ts` — `faction-rs / faction-rbih / faction-hrhb` Tailwind theme tokens (drive class strings; would require a Tailwind plugin or generation step to derive from RGB tuples)

---

## 3. Canonical source pattern

Created `src/ui/shared/factionPalette.ts` (103 LOC, ADD-ONLY in commit 1):

- Re-exports `FACTION_GLOW_RGB` and `factionGlowRgb(...)` from
  `src/ui/map/layers/buildForceQualityOverlay.ts` (no value modification).
- Adds derived projections — `factionHex(...)`, `factionRgbString(...)`,
  `factionRgbaString(faction, alpha)`, `factionAccentTriple(...)`. Every
  projection enters the same code path (single palette lookup); no
  `if (faction === 'X')` branching. The accent-triple derives 30%-opacity
  `dim` and 8%-opacity `bg` from the canonical RGB, matching the pre-fix
  warroom_utils values' alpha layering.

Faction-symmetric mechanism (palette is data, not logic) is enshrined in
the file header and pinned by the new test file.

---

## 4. Two-commit pattern

### Commit 1 — source-first (SHA `14d4d0f8`)

```
feat(ui): add canonical faction palette source (src/ui/shared/factionPalette.ts)
```

ADD-ONLY: `src/ui/shared/factionPalette.ts` (+103 LOC). No callsite modified;
no Phase-3 layer touched; `FACTION_GLOW_RGB` byte-identical.

Verification at commit boundary:
- `npx tsc --noEmit` clean.
- 4 Phase-3 layer tests (Map-That-Scars, Force-Quality, Refugee Column,
  Corridor Heartbeat): 32/32 GREEN.

### Commit 2 — sweep (SHA TBD — will be filled after commit lands)

```
refactor(ui): migrate 5 faction-palette forks to canonical factionPalette.ts (+ SettingsModal RS/HRHB color-inversion fix)
```

Files touched (six): theme.ts, warroom_utils.ts, InvestmentPanel.ts,
SettingsModal.ts, opsConstants.ts, plus the new test file
tests/faction_palette_canonical.test.ts.

Verification at commit boundary:
- `npx tsc --noEmit` clean.
- Focused regression set (5 tests): 39/39 GREEN
  - `force_quality_overlay_builder.test.ts` — 8/8
  - `refugee_column_overlay_builder.test.ts` — 8/8
  - `osid_damage_overlay_builder.test.ts` — 8/8
  - `corridor_heartbeat_overlay_builder.test.ts` — 8/8
  - `faction_palette_canonical.test.ts` (new) — 7/7

---

## 5. Visual-value drift summary (intentional, audit-expected)

The migration intentionally drifts the slightly-different fork values onto
the single canonical RGB tuples. Pre-fix vs post-fix hex/rgb summaries:

| Surface | RS | RBiH | HRHB |
|---|---|---|---|
| theme.ts (pre) | #c04040 | #4a9a55 | #4080b8 |
| theme.ts (post) | #c84646 | #46a55a | #4682c8 |
| opsConstants.ts (pre) | #c24040 | #4a9a55 | #4080b8 |
| opsConstants.ts (post) | #c84646 | #46a55a | #4682c8 |
| warroom_utils.ts primary (pre) | rgb(180,50,50) | rgb(55,140,75) | rgb(50,110,170) |
| warroom_utils.ts primary (post) | rgb(200,70,70) | rgb(70,165,90) | rgb(70,130,200) |
| InvestmentPanel (pre) | rgb(226,74,74) | rgb(27,94,32) | rgb(74,144,226) |
| InvestmentPanel (post) | rgb(200,70,70) | rgb(70,165,90) | rgb(70,130,200) |
| SettingsModal (pre) | #14316d (BLUE — INVERTED) | #2b5042 | #922026 (RED — INVERTED) |
| SettingsModal (post) | #c84646 | #46a55a | #4682c8 |

The SettingsModal change is the player-visible correction: RS now renders
red (canonical) and HRHB now renders blue (canonical). The other surfaces
shift slightly (typically <10/255 per channel) onto the single canonical
tuple — within audit §2.5's "subtly different greens/reds/blues but
readable per surface" tolerance.

`FACTION_GLOW_RGB` itself: byte-identical (Phase-3 features remain
unaffected).

---

## 6. Tutorial onboarding compliance

`data-tutorial-step` anchors are NOT on any of the migrated files (all
edits are scoped to color-derivation code paths and a single inline ternary
in SettingsModal). No DOM/component structure was migrated; no anchor was
removed, renamed, or repositioned.

`grep -rn 'data-tutorial-step' src/ui/` results unchanged across both
commits (verified pre/post).

---

## 7. Sensitive-history compliance

- Ring 1 / faction-agnostic mechanism / no §6 surface.
- No engine plumbing modified (`src/sim/` untouched).
- No scenario data modified (`data/scenarios/` untouched).
- No canon document modified (`docs/10_canon/` untouched).
- No `political_controllers`, `OOB`, paint anchor, rupture wiring, or
  enclave-resilience surface touched.
- Faction symbology corrected (SettingsModal RS=blue → RS=red etc.), not
  introduced — restoring the existing canonical convention.

**Sensitive-history compliance: GREEN.**

---

## 8. Output summary

- 5 audit-named forks + 1 audit-missed fork (opsConstants.ts) migrated to
  derive from `src/ui/shared/factionPalette.ts`.
- SettingsModal RS=blue/HRHB=red color inversion: **fixed**.
- New canonical-palette test file: 7/7 GREEN.
- 4 Phase-3 visual-layer test files: 32/32 still GREEN — `FACTION_GLOW_RGB`
  byte-identical.
- `npx tsc --noEmit`: clean at each commit.
- Two-commit pattern: source-first (SHA `14d4d0f8`) + sweep (SHA TBD).
- Verify-before-exit confirmed at each commit.

End of report.
