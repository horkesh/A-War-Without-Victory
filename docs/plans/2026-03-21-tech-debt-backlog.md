# Technical Debt Backlog

**Created:** 2026-03-21
**Source:** Professional codebase audit (3 parallel research agents + manual verification)
**Current state:** 93.1% area-weighted (ATH), 1261 tests, 106 suites

---

## 1. Pre-commit Hooks (P4, ~30 min)

**Problem:** No automated gate prevents committing broken code. The smoke-test triad (`tsc --noEmit` + `vitest run` + `desktop:map:build`) is manual discipline only. A single `git commit` with a type error or broken import goes through unchecked.

**Scope:**
- Install `husky` + `lint-staged`
- Pre-commit hook: `npx tsc --noEmit` (catches type errors, ~5s)
- Optional: `vitest run` (catches test failures, +7s per commit)
- Configure in `package.json` or `.husky/pre-commit`

**Approach:**
```bash
npm install --save-dev husky lint-staged
npx husky init
# .husky/pre-commit: npx tsc --noEmit
```

**Risk:** None — additive. Can be bypassed with `--no-verify` for emergencies (life lesson says don't).

**Files:** `package.json`, `.husky/pre-commit`

---

## 2. 217 `any` Types in sim/state (P3, ~2 sessions)

**Problem:** 217 uses of `: any` or `as any` in `src/sim/` and `src/state/`. Each is a hole in type safety — TypeScript can't catch bugs at these boundaries. Concentrated in `GameStateAdapter.ts` (~80%), which parses raw save file JSON without typed access.

**Scope:**
- `src/ui/map/data/GameStateAdapter.ts` — ~170 `any` casts. Define `RawSaveFile` interface matching the save JSON structure. Replace `(state as any).displacement.foo` with typed access paths.
- `src/sim/` — ~30 `any` casts. Mostly GameState sub-object access. Add proper index signatures or type narrowing guards.
- `src/state/` — ~17 `any` casts. Type assertion cleanup.

**Approach:**
1. Define `RawSaveFile` interface in `src/ui/map/data/types.ts` — mirror the actual save file structure
2. Type the `state` parameter in `adaptGameState()` as `RawSaveFile` instead of `any`
3. Work file-by-file, run tsc after each batch
4. Track progress: `grep -c "as any\|: any" src/sim/ src/state/`

**Risk:** Low — type-only changes, zero runtime impact. Large but mechanical.

**Files:** `src/ui/map/data/GameStateAdapter.ts` (primary), ~20 files in `src/sim/` and `src/state/`

---

## 3. 8 Circular Dependencies (P3, ~1 session)

**Problem:** `game_state.ts` has circular imports with 8 type files:
- `brigade_history.ts`
- `casualty_ledger.ts`
- `combat_summary.ts`
- `decoration_types.ts`
- `negotiation_types.ts`
- `officer_types.ts`
- `recruitment_types.ts`
- `turn_summary.ts`

All are type-only circulars (not runtime), so they work but make the dependency graph messy and can cause issues with tree-shaking and build tools.

**Scope:**
- Extract shared primitive types (`FactionId`, `FormationId`, `SettlementId`, `MunicipalityId`, `CombatOutcome`, etc.) from `game_state.ts` into `src/state/core_types.ts`
- Both `game_state.ts` and the satellite files import from `core_types.ts` instead of from each other
- Update all downstream imports that re-export these types

**Approach:**
1. Run `npx madge --circular src/state/game_state.ts` to baseline (currently 8)
2. Create `src/state/core_types.ts` with shared type exports
3. Update `game_state.ts` to import from `core_types.ts` instead of defining inline
4. Update 8 satellite files to import from `core_types.ts` instead of `game_state.ts`
5. Run `npx madge --circular` — target: 0 cycles
6. Run tsc + vitest to verify nothing broke

**Risk:** Low — import path changes only. Some downstream files may need updated import paths.

**Files:** `src/state/core_types.ts` (new), `src/state/game_state.ts`, 8 satellite type files, ~50 downstream imports

---

## 4. Engine Per-OSID Displacement Cap (P4, ~1 session)

**Problem:** Displacement timers can emit more displacement events than population exists at an OSID. For Derventa OSID, the event log accumulated 25,202 total removals from a 21,706 pre-war population. The UI now caps proportionally (fixed 2026-03-21), but the engine should prevent over-displacement at source.

**Root cause:** The initial maturation wave (`INITIAL_DISPLACEMENT_FRACTION = 0.70`) computes displacement from `osidPop * hostileShare * initFraction`, capped at municipality-level `remainingPop` — but multiple OSIDs in the same municipality can each fire their full initial wave. The sustained displacement correctly tracks `cumulative_displaced` per timer, but the initial wave doesn't.

**Scope:**
- `src/state/displacement_takeover.ts` — add per-OSID cumulative tracking to the initial maturation wave (Branch A, line 670)
- Track `cumulative_displaced` on the timer BEFORE the initial wave fires, not just after
- Cap `displacementAmount` at `initialMinority - timer.cumulative_displaced`
- Verify with a 40w calibration run — displacement numbers should decrease slightly

**Approach:**
1. In Branch A (initial maturation, line 670): set `timer.cumulative_displaced = displacementAmount` after computing
2. In the `displacementAmount` computation: add `Math.min(..., initialMinority)` guard
3. Run 40w calibration, compare Derventa OSID numbers
4. Check aggregate calibration % doesn't regress

**Risk:** Low-medium — displacement changes cascade through population → mobilization → combat. Run 40w comparison. One-change-per-run protocol.

**Files:** `src/state/displacement_takeover.ts`

---

## 5. Electron 33 → 41 Upgrade (P4, ~1-2 sessions)

**Problem:** Electron is 8 major versions behind (33.0.0 → 41.0.3). Security vulnerabilities, missing V8 features, deprecated APIs. `electron-builder` also behind (25.1.8 → 26.8.1).

**Scope:**
- Read breaking changes for Electron 34, 35, 36, 37, 38, 39, 40, 41
- Update `electron` + `electron-builder` in package.json
- Known risk areas:
  - Context isolation changes (may affect `preload.cjs` ↔ renderer communication)
  - `BrowserWindow` constructor options (deprecated fields)
  - `ipcMain`/`ipcRenderer` API changes
  - Node integration changes
  - V8 version bumps (may affect ESM behavior)

**Approach:**
1. Read Electron release notes for each major version (34-41)
2. Create a feature branch
3. `npm install electron@latest electron-builder@latest`
4. Fix compilation errors
5. Test: app launch, save/load, map rendering, IPC (all panel interactions), tooltip hover, formation click, operation planning modal
6. Run `npm run desktop` — full manual test pass
7. If stable, merge

**Risk:** Medium-high — Electron majors often break IPC patterns and renderer process behavior. The `preload.cjs` file and `window.awwv` bridge are sensitive to context isolation changes. Full manual testing required.

**Files:** `package.json`, `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`, possibly `src/ui/map/desktop/useIPC.ts`

---

## Recommended Execution Order

| Priority | Item | Effort | Risk | Dependency |
|----------|------|--------|------|------------|
| 1st | Pre-commit hooks | 30 min | None | None |
| 2nd | `any` types | 2 sessions | Low | None |
| 3rd | Circular deps | 1 session | Low | None |
| 4th | Displacement cap | 1 session | Low-med | Calibration run |
| 5th | Electron upgrade | 1-2 sessions | Medium-high | Manual test pass |

Items 1-3 can be done in any order. Item 4 requires a calibration run. Item 5 should be done last (highest risk, lowest urgency).

---

## Tracking

Run these commands to measure progress:

```bash
# any types
grep -c "as any\|: any" src/sim/**/*.ts src/state/**/*.ts

# circular deps
npx madge --circular src/state/game_state.ts

# console.log pollution
grep -rn "console\.log\b" src/sim/ src/state/ --include="*.ts" | grep -v "\.test\." | wc -l

# Electron version
node -e "console.log(require('./package.json').devDependencies.electron)"
```
