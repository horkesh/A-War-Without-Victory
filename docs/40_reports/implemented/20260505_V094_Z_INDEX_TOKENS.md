# LANE-V094-Z-INDEX-TOKENS — implementation report

**Lane:** `LANE-V094-Z-INDEX-TOKENS` (second-priority backlog item per
`docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md` §4 LANE-2 /
§3.1 P1-A).
**Date:** 2026-05-05
**Parent SHA at lane start:** `cdb2d30f` (audit reference); branch tip walked
forward to current `main`.
**Status:** IMPLEMENTED (two commits, verify-before-exit at each).

---

## 1. Objective

Per the v0.9.4 Phase-1+Phase-2 UI Shell Audit (§2.6, §3.1 P1-A): 17+ z-index
literal numbers ranging `60..99999` were scattered across 24+ files with no
central token registry. Risk: a future modal lands at the wrong layer; modals
at the same tier (Army HQ vs Chronicle vs Ops Planning vs StackExpansion all
at `z-[1000]`) rely on ad-hoc render order. Action: introduce
`src/ui/shared/zIndex.ts` with named semantic tier constants, migrate all
literal callsites.

---

## 2. Inventory — z-index literals identified

The audit listed 17+ literals across 24 files. During implementation a full
sweep across `src/ui/map/components/**/*.tsx`, `panelRail.ts`, and shared
`GlassPanel.tsx` defaults found **41 literal callsites across 41 source files**
(lower-numbered intra-component literals — Minimap, OrderQueue, CorpsCard —
were also folded into the canonical taxonomy as low-tier intra-component
slots).

CSS-side literals (`src/ui/warroom/styles/*.css`, `src/ui/map/styles/globals.css`,
`src/ui/warroom/index.html`, `src/ui/warroom/map_viewer_standalone.html`,
`src/ui/warroom/map_viewer_app.ts`) were **explicitly DEFERRED** (out of the
audit's named React-shell footprint; legacy warroom debug viewer / standalone
HTML — not React shell tier code).

| # | Path | Pre-fix literal | Post-fix tier |
|---|---|---|---|
| 1 | `src/ui/map/components/AttackConfirmation.tsx` | `z-[100]` | `Z.ATTACK_CONFIRMATION` |
| 2 | `src/ui/map/components/CodexPanel.tsx` | `z-[900]` | `Z.CODEX` |
| 3 | `src/ui/map/components/CommanderSelectionModal.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 4 | `src/ui/map/components/CorpsCard.tsx` | `zIndex: 30` | `Z.CORPS_CARD_LABEL` |
| 5 | `src/ui/map/components/CreditsScreen.tsx` | `z-[8500]` | `Z.MODAL_HARD` |
| 6 | `src/ui/map/components/DaytonNegotiationModal.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 7 | `src/ui/map/components/EventDecisionModal.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 8 | `src/ui/map/components/EventLogPanel.tsx` | `zIndex={42}` | `Z.GLASS_PANEL_EVENT_LOG` |
| 9 | `src/ui/map/components/EventModal.tsx` | `zIndex={55}` | `Z.GLASS_PANEL_EVENT_MODAL` |
| 10 | `src/ui/map/components/FirstTurnOrientationCard.tsx` | `z-[8500]` | `Z.MODAL_HARD` |
| 11 | `src/ui/map/components/GameOverModal.tsx` | `z-[99999]` | `Z.GAME_OVER` |
| 12 | `src/ui/map/components/GlassPanel.tsx` | `zIndex = 40` | `Z.GLASS_PANEL_DEFAULT` |
| 13 | `src/ui/map/components/LoadErrorToast.tsx` | `z-[8500]` | `Z.MODAL_HARD` |
| 14 | `src/ui/map/components/LoadingSkeleton.tsx` | `z-[50]` | `Z.LOADING_SKELETON` |
| 15 | `src/ui/map/components/MainMenu.tsx` | `z-[9000]` | `Z.HARD_MODAL` |
| 16 | `src/ui/map/components/Minimap.tsx` | `zIndex: 10` | `Z.MAP_OVERLAY` |
| 17 | `src/ui/map/components/OfficerEventBadge.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 18 | `src/ui/map/components/OperationBriefingModal.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 19 | `src/ui/map/components/OrderQueue.tsx` (×3) | `zIndex: 15` | `Z.ORDER_QUEUE` |
| 20 | `src/ui/map/components/PauseMenu.tsx` | `z-[8000]` | `Z.PAUSE_MENU` |
| 21 | `src/ui/map/components/PeacePlanModal.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 22 | `src/ui/map/components/PeaceWarTransition.tsx` | `zIndex={60}` | `Z.GLASS_PANEL_PEACE_WAR` |
| 23 | `src/ui/map/components/PresidentialToolbar.tsx` (×2) | `z-[100]`, `z-[200]` | `Z.TOOLBAR`, `Z.SHELL_FLOATING` |
| 24 | `src/ui/map/components/RadialMenu.tsx` | `z-[200]` | `Z.SHELL_FLOATING` |
| 25 | `src/ui/map/components/RecruitmentModal.tsx` | `z-[120]` | `Z.OVERLAY_LIGHT` |
| 26 | `src/ui/map/components/SettingsScreen.tsx` | `z-[8500]` | `Z.MODAL_HARD` |
| 27 | `src/ui/map/components/SidePickerOverlay.tsx` | `z-[120]` | `Z.OVERLAY_LIGHT` |
| 28 | `src/ui/map/components/StackExpansionOverlay.tsx` | `z-[1000]` | `Z.MODAL` |
| 29 | `src/ui/map/components/StrategicDashboard.tsx` | `z-[500]` | `Z.PANEL` |
| 30 | `src/ui/map/components/Tooltip.tsx` | `zIndex: 9999` | `Z.TOOLTIP` |
| 31 | `src/ui/map/components/TurnAftermathModal.tsx` | `z-[10000]` | `Z.TURN_AFTERMATH` |
| 32 | `src/ui/map/components/VerdictScreen.tsx` (×2) | `z-[99999]` | `Z.GAME_OVER` |
| 33 | `src/ui/map/components/WarSummaryModal.tsx` | `zIndex: 1200` | `Z.MODAL_RAISED_2` |
| 34 | `src/ui/map/components/army_hq/ArmyHQModal.tsx` | `z-[1000]` | `Z.MODAL` |
| 35 | `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | `z-[1000]` | `Z.MODAL` |
| 36 | `src/ui/map/components/chronicle/WrappedOverlay.tsx` | `z-[1100]` | `Z.MODAL_RAISED` |
| 37 | `src/ui/map/components/onboarding/OnboardingOverlay.tsx` | `zIndex: 9000` | `Z.HARD_MODAL` |
| 38 | `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` | `z-[1000]` | `Z.MODAL` |
| 39 | `src/ui/map/components/panelRail.ts` (×5) | `zIndex: 100/100/90/90/50` | `Z.PANEL_RAIL_PRIMARY` (×2), `Z.PANEL_RAIL_SECONDARY` (×2), `Z.PANEL_RAIL_TERTIARY` |
| 40 | `src/ui/map/components/warroom/AdvanceTurnModal.tsx` | `z-[9999]` | `Z.CRITICAL_MODAL` |
| 41 | `src/ui/map/components/warroom/WarroomStatusBar.tsx` | `z-[60]` | `Z.PRIORITY_DOCKET` |

**Total literal occurrences migrated:** 49 callsite literals across 41 files.

Deferred (scoped out — out of audit's named React-shell footprint):

- `src/ui/warroom/styles/war-planning-map.css` (legacy warroom CSS file; 13 z-index lines)
- `src/ui/warroom/styles/ticker.css` (legacy warroom CSS; 3 z-index lines)
- `src/ui/warroom/styles/modals.css` (legacy warroom CSS; 5 z-index lines)
- `src/ui/warroom/index.html` (legacy warroom HTML; 2 z-index lines)
- `src/ui/warroom/map_viewer_standalone.html` (debug viewer; 3 z-index lines)
- `src/ui/warroom/map_viewer_app.ts` (debug viewer TS; 1 inline `zIndex` literal)
- `src/ui/map/styles/globals.css` (3 z-index lines — base-level intra-canvas, not shell tier)
- `src/ui/map/painter.html` (developer painter tool; 1 line)

These are flagged for a future tighter-cleanup lane.

---

## 3. Canonical source pattern

Created `src/ui/shared/zIndex.ts` (172 LOC, ADD-ONLY in commit 1):

- Exports a single frozen `Z` constant with 28 named semantic tiers.
- Numeric values preserved byte-for-byte from the audit inventory; the
  migration only changes the literal-to-token mapping. Stacking order is
  unaffected.
- Faction-symmetric mechanism: z-index is data, not logic. No
  `if (faction === 'X')` branching anywhere in the module.
- File header documents migration policy: prefer inline `style={{ zIndex: Z.X }}`
  (or `el.style.zIndex = String(Z.X)` for vanilla DOM) over Tailwind
  `z-[${Z.X}]` template-literal arbitrary classes — Tailwind JIT scans for
  static class strings; template substitutions are not always resolved at
  scan time. The migration replaces every Tailwind `z-[N]` arbitrary class
  with inline `style={{ zIndex: Z.X }}` on the same element; the resulting
  browser z-index is identical to the prior literal class.
- File path mirrors the established `src/ui/shared/factionPalette.ts`
  precedent (LANE-V094-FACTION-PALETTE-CANONICALIZATION).

---

## 4. Two-commit pattern

### Commit 1 — source-first (SHA `51cb4b66`)

```
feat(ui): add canonical z-index token source (src/ui/shared/zIndex.ts)
```

ADD-ONLY: `src/ui/shared/zIndex.ts` (+172 LOC). No callsite modified;
no Phase-3 layer touched; `FACTION_GLOW_RGB` byte-identical.

Verification at commit boundary:
- `npx tsc --noEmit` clean.
- 4 regression tests (LoadingSkeleton, LoadErrorToast, EmptyState,
  faction palette canonical): 30/30 GREEN.

### Commit 2 — sweep (SHA TBD — will be filled after commit lands)

```
refactor(ui): migrate 41 source files to canonical zIndex.ts (+ canonical test pin)
```

Files touched:
- 41 source files migrated (see §2 inventory table)
- `src/ui/shared/zIndex.ts` — migration policy comment refined (Tailwind JIT note)
- `tests/z_index_canonical.test.ts` (NEW) — 7 tests, 28 tier assertions
- `tests/load_error_toast.test.ts` — T8 updated from `z-[8500]` Tailwind class
  assertion to inline `z-index:8500` style assertion (post-migration shape)

Verification at commit boundary:
- `npx tsc --noEmit` clean.
- Focused regression set (5 tests): 37/37 GREEN
  - `z_index_canonical.test.ts` (new) — 7/7
  - `loading_skeleton.test.ts` — 6/6
  - `load_error_toast.test.ts` — 8/8
  - `empty_state.test.ts` — 9/9
  - `faction_palette_canonical.test.ts` — 7/7
- Wider UI regression (`tests/ui/`): 359/359 GREEN across 27 files.
- 4 Phase-3 visual-layer tests still GREEN (Map-That-Scars / Force-Quality /
  Refugee Column / Corridor Heartbeat): 32/32 — `FACTION_GLOW_RGB`
  byte-identical, no visual stacking regression.

---

## 5. Stacking order preserved (Y)

Every numeric literal value is preserved byte-for-byte through its named
tier. The relative ordering of every shell-level layer is unchanged:

```
MAP_OVERLAY (10) <
  ORDER_QUEUE (15) <
  CORPS_CARD_LABEL (30) <
  GLASS_PANEL_DEFAULT (40) <
  GLASS_PANEL_EVENT_LOG (42) <
  LOADING_SKELETON (50) = PANEL_RAIL_TERTIARY (50) <
  GLASS_PANEL_EVENT_MODAL (55) <
  GLASS_PANEL_PEACE_WAR (60) = PRIORITY_DOCKET (60) <
  PANEL_RAIL_SECONDARY (90) <
  PANEL_RAIL_PRIMARY (100) = TOOLBAR (100) = ATTACK_CONFIRMATION (100) <
  OVERLAY_LIGHT (120) <
  SHELL_FLOATING (200) <
  PANEL (500) <
  CODEX (900) <
  MODAL (1000) <
  MODAL_RAISED (1100) <
  MODAL_RAISED_2 (1200) <
  PAUSE_MENU (8000) <
  MODAL_HARD (8500) <
  HARD_MODAL (9000) <
  CRITICAL_MODAL (9999) = TOOLTIP (9999) <
  TURN_AFTERMATH (10000) <
  GAME_OVER (99999)
```

Evidence (Y):
- 4 Phase-3 visual-layer tests (Map-That-Scars / Force-Quality / Refugee
  Column / Corridor Heartbeat): 32/32 still GREEN — no relative ordering
  change.
- 27 UI regression test files / 359 tests GREEN.
- `t.test.ts T2` pins every numeric value byte-for-byte; `T3` pins relative
  ordering chain; both GREEN.

---

## 6. Tutorial onboarding compliance (Y)

`data-tutorial-step` anchors are preserved on the migrated files. The
two anchors actually present in the migration footprint:

- `data-tutorial-step="warroom-status-bar"` on
  `src/ui/map/components/warroom/WarroomStatusBar.tsx` — preserved (only
  className/style replaced; element identity unchanged).
- `data-tutorial-step="presidential-toolbar"` on
  `src/ui/map/components/PresidentialToolbar.tsx` — preserved (only
  className/style replaced; element identity unchanged).

Pre-/post-edit `grep -rn 'data-tutorial-step' src/ui/` results unchanged
across both commits.

---

## 7. Sensitive-history compliance (GREEN)

- Ring 1 / faction-agnostic mechanism / no §6 surface.
- No engine plumbing modified (`src/sim/` untouched).
- No scenario data modified (`data/scenarios/` untouched).
- No canon document modified (`docs/10_canon/` untouched).
- No `political_controllers`, `OOB`, paint anchor, rupture wiring, or
  `enclave_resilience.ts` surface touched.
- No FORAWWV touch.
- Faction symbology unchanged — `FACTION_GLOW_RGB` byte-identical (Phase-3
  features remain unaffected).
- `src/ui/shared/factionPalette.ts` canonical palette source: not modified.

**Sensitive-history compliance: GREEN.**

---

## 8. Output summary

- 49 z-index literal occurrences across 41 React-shell source files migrated
  to `src/ui/shared/zIndex.ts` canonical tier tokens.
- New canonical-z-index test file: `tests/z_index_canonical.test.ts` —
  7/7 tests GREEN. Pins frozen `Z` table, byte-stable numeric values,
  monotonic relative ordering, import compliance, no residual `z-[N]` /
  `zIndex: N` literal regressions, single-source path.
- 4 Phase-3 visual-layer test files: 32/32 still GREEN — `FACTION_GLOW_RGB`
  byte-identical.
- 27 UI regression test files: 359/359 GREEN.
- `npx tsc --noEmit`: clean at each commit.
- Two-commit pattern: source-first (SHA `51cb4b66`) + sweep (SHA TBD).
- Verify-before-exit confirmed at each commit.
- Stacking order preserved: Y. Tutorial `data-tutorial-step` anchors
  preserved: Y.

End of report.
