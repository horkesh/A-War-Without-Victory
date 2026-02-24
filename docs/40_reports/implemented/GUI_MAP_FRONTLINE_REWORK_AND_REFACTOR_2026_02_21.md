# GUI and Map Frontline Rework + Refactor Pass (2026-02-21)

**Status:** Implemented  
**Source plan:** [ORCHESTRATOR_GUI_MAP_FRONTLINE_REWORK_AUDIT_2026_02_21.md](../convenes/ORCHESTRATOR_GUI_MAP_FRONTLINE_REWORK_AUDIT_2026_02_21.md)  
**Canon propagation:** context.md, TACTICAL_MAP_SYSTEM.md, DESKTOP_GUI_IPC_CONTRACT.md, PROJECT_LEDGER.md

---

## 1. Summary

This report covers (1) **GUI and map frontline rework** — visibility and persistence of canonical front edges, 2D/3D rendering behavior, and corps-level assignment UI; (2) **warmap UX fixes** — Load Save menu and Day/Night key behavior; (3) **refactor pass** — deduplication and simplification after the above work.

**Definition of done (from audit):** Front lines visible on 2D and 3D from canonical state when available; corps-level assignment possible from GUI (front + axis + OG subfront); contracts and docs reflect actual channels and behavior.

---

## 2. Visibility and Data (Phase A)

| Item | Change |
|------|--------|
| **GameState persistence** | `front_edges` added to canonical top-level keys in `serializeGameState.ts` and `GAMESTATE_TOP_LEVEL_KEYS`; turn pipeline updates `state.front_edges` via `computeFrontEdges()` after Phase I and after main phase loop (shared helper `getEdgesForTurn(input)`). |
| **2D tactical map** | `drawFrontLines()` in MapApp prefers `loadedGameState.frontEdges` when present (canonical mode); renders strategic front segments even when no local brigade defender; fallback remains control + defended-by-faction derivation when canonical edges absent. |
| **3D operational map** | FrontLineLayer `buildFrontLineMesh()` uses canonical `frontEdges` when available and has robust fallback when canonical edges are missing or unmatched to shared borders. |
| **RBiH–HRHB** | Front segment between RBiH and HRHB remains gated by Phase I §4.8 (war earliest turn + alliance threshold); `shouldDrawFrontSegment()` in MapApp and engine logic unchanged. |

---

## 3. Corps Front Assignment UI (Phases B–D)

| Surface | Implementation |
|---------|----------------|
| **Corps panel (2D)** | ACTIONS section extended with: **Stage Front** (derives corps front edge IDs from subordinate brigade AoR boundaries, calls `stageCorpsFrontOrder` IPC); **Stage Axis** (same derived edge set as attack axis seed, `stageCorpsAttackAxisOrder`); **Stage OG** (selected active OG from dropdown, `stageOgSubfrontOrder` with derived subfront edge set). |
| **IPC** | Existing channels used: `stage-corps-front-order`, `stage-corps-attack-axis-order`, `stage-og-subfront-order` (already documented in DESKTOP_GUI_IPC_CONTRACT.md). |
| **Derivation** | `MapApp.deriveCorpsFrontEdgeIds(corpsId, gs)` builds edge set from corps subordinates’ AoR, shared borders, and control; only edges satisfying `shouldDrawFrontSegment` and faction-opposition semantics are included; result is sorted for determinism. |

---

## 4. Warmap Fixes (Session)

| Fix | Detail |
|-----|--------|
| **Load Save menu on load** | Desktop no longer forces main-menu-overlay when `getCurrentGameState` resolves with existing state; overlay shown only when no state is loaded. |
| **Day/Night (N key)** | Operational 3D map handles N key in its own keydown handler; day mode message ("DAY MODE" / "NIGHT MODE") shown there; removed from WarMapRenderer to avoid double-toggle. |

---

## 5. Refactor Pass (Post–Implementation)

| File | Change |
|------|--------|
| **MapApp.ts** | Removed duplicate local `normalizeEdgeId` in `drawFrontLines()`; all edge-id normalization uses `this.normalizeEdgeId()`. |
| **turn_pipeline.ts** | Extracted `getEdgesForTurn(input: TurnInput): Promise<EdgeRecord[]>`; used by `refreshFrontEdgeSnapshot()` and by Phase I path (single resolution for streak, transition, and `working.front_edges = computeFrontEdges(working, edges)`). |
| **FrontLineLayer.ts** | Inlined `hasCanonicalRenderableEdge` into single `useCanonicalEdges` constant. |

**Verification:** `npx tsc --noEmit` and `npx vitest run` (142 tests) passed.

---

## 6. Files Touched (Representative)

- **State/serialization:** `src/state/game_state.ts`, `src/state/serializeGameState.ts`
- **Turn pipeline:** `src/sim/turn_pipeline.ts`
- **UI/map:** `src/ui/map/MapApp.ts`, `src/ui/map/FrontLineLayer.ts`, `src/ui/map/WarMapRenderer.ts`, `src/ui/map/map_operational_3d.ts`, `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/data/ViewerStateAdapter.ts`, `src/ui/map/types.ts`
- **Desktop:** `src/desktop/desktop_sim.ts`, `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`
- **Docs:** `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `docs/PROJECT_LEDGER.md`, `docs/10_canon/context.md`

---

## 7. Follow-Up Backlog (Unchanged from Audit)

- Manual edge-drawing workflow for corps fronts (beyond auto-derived seed).
- Operational 3D parity controls for staging corps front/axis in 3D.
- Front hierarchy panel (Army → Corps → Brigades → OG) shared between 2D and 3D.
- Additional frontline diagnostics in scenario reports.
