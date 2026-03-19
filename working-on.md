# Working On: Ops Planning Modal Polish + Arrow Bug

## Session Summary (2026-03-19)

### Ops Planning Modal — Core Implementation COMPLETE (Tasks 1-12)
16 files in `src/ui/map/components/ops_modal/`, replacing 1,415-line monolith.
4-phase corps-level flow: Commander → Plan → G2 Assessment → Authorize.
Report: `docs/40_reports/implemented/20260319_OPS_PLANNING_MODAL_REDESIGN.md`

### Post-Implementation Fixes
1. **Hooks violation** — `useMemo` after early return moved before it
2. **Op name double prefix** — "Operation Operacija" → just use name (already includes "Operacija")
3. **Corps AO highlight** — white territory overlay + gold front line glow
4. **Parameter boxes** — each group in distinct bordered box with header label
5. **Advance button** — added to ObjectiveList panel + floating right-side button
6. **Click-to-remove** — single map-level click handler (was double-firing from overlapping layers)
7. **Map not rendering** — init effect needed `!!loadedGameState` in deps
8. **Arrow scaling** — fixed constants → distance-scaled (matches main map arrows)
9. **Arrow staging fallback** — nearest friendly OSID when no staging set
10. **Arrow setData bug** — replaceArrowSource (remove+re-add) pattern for modal MapLibre
11. **Target contiguity** — only front-adjacent enemy OSIDs clickable, red tint highlight

### OPEN: Arrows Still Not Updating on Staging Change
**Status:** Arrow renders on initial objective click but vanishes when staging changes.
**Investigated:**
- `setData` confirmed broken for dynamic sources in modal MapLibre (life lesson written)
- Switched to `replaceArrowSource` (remove layers + source, re-add with new data)
- Distance scaling with min floors applied
- Nearest-friendly fallback for missing staging
- Effect fires (deps include stagingOsid, mapReady)
**Likely remaining cause:** `replaceArrowSource` re-adds layers at bottom of z-stack (behind territory fills), OR the effect deps don't actually trigger when staging changes on the axis. Need to add console.log inside the overlay effect to verify it fires AND produces >0 features.

## Next Steps
1. Debug arrow update with console logging — verify overlay effect fires on staging change
2. If effect fires but arrows invisible → z-ordering issue (add layers with `beforeId`)
3. If effect doesn't fire → staging prop not changing (trace from click handler through plan state)
4. Polish: brigade auto-propose integration with live map
5. Test full flow end-to-end in Electron (IPC submission)

## Files Modified This Session
- `src/ui/map/components/ops_modal/` — all 16 files
- `src/ui/map/store/gameStore.ts` — ops planning context
- `src/ui/map/components/CorpsDetail.tsx` — launch handler
- `src/ui/map/components/CorpsFrontPanel.tsx` — launch handler
- `src/ui/map/App.tsx` — import path
- `src/ui/map/utils/formatters.ts` — new helpers
- `vitest.config.ts` — test include
- `docs/40_reports/GUI_MASTER.md` — updated
- `docs/20_engineering/REPO_MAP.md` — updated
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` — updated
- `docs/PROJECT_LEDGER.md` — updated
- `docs/life_lessons.md` — 2 new lessons
- `.claude/napkin.md` — updated
