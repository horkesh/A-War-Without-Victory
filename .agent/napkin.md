# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|-----------------|-------------------|
| 2026-02-07 | self | Voronoi boolean ops failures despite normalization | Add post-merge coverage/overlap validation per mun1990; drive fixes from diagnostics |
| 2026-02-07 | self | Import errors: martinez default (ESM), jsts package root | Use `* as martinez`; import from `jsts/org/locationtech/jts/io/*.js` |
| 2026-02-11 | self | Removed legacy type export → downstream breaks | Preserve `export type { ... }` when refactoring shared types |
| 2026-02-11 | self | add/add conflict: deleted markers only → duplicated content | For whole-file conflicts, pick one side or fully dedupe before staging |
| 2026-02-13 | self | Left handoff ambiguity open after roadmap | Close with run evidence + publish decision memo, cross-link |
| 2026-02-13 | self | Stale paths (`.cursor/agents/*`) | Validate with glob; skills live at `.claude/skills/*` |
| 2026-02-13 | self | `ApplyPatch` reported success but content unchanged | Verify with `ReadFile` + `git diff`; use scripted replacement if mismatch |
| 2026-02-13 | self | Began edits in resumed session without re-reading | Re-read napkin and docs/ASSISTANT_MISTAKES.log before implementation |
| 2026-02-20 | user | Left failing tests unfixed (seemed unrelated) | Fix all failing tests; record practice in napkin |

## User Preferences
- Prefer absolute paths for tool calls.
- Load napkin on request if not auto-loaded.
- Update napkin after significant changes; do not wait until end of session.
- Fix failing tests (CI or local) even if unrelated to current change.

## Patterns That Work
- **Refactor:** Single source of truth (e.g. `cloneGameState`, `getGraphAndEdges`, `phase_ii_adjacency.ts`) to avoid duplicate load/logic; inline single-use trivial helpers; keep shared logic as methods.
- **CLI/scripts:** Parse args before filesystem-heavy discovery; `--help` short-circuit; hoist invariant checks outside per-step functions. Windows: use `;` not `&&`; use `node_modules/tsx`, not npx for Node.
- **Imports:** martinez `* as martinez`; jsts from `jsts/org/locationtech/jts/io/*.js`; browser build: extract Node imports to `*_utils.ts`, redirect browser-reachable imports.
- **Voronoi/Map:** Stable order, subtract prior masks; area-based coverage diagnostics. Fallback: `data/_deprecated/derived/legacy_substrate/settlements_substrate.geojson`. Split-muni: run `npm run map:audit:split-muni-duplicates` before rebuild. Map/WGS84: A1_BASE_MAP, `getPoliticalControlKey()` for S-prefixed sid.
- **War Planning Map:** #warroom-scene and #map-scene; double rAF before resize when opening; retry next frame if getBoundingClientRect 0×0. War Map open/close: defer DOM work with setTimeout(0); only call hideAllOverlays when not viewing tactical/map scene.
- **Brigade AoR:** Phase II start: init `brigade_aor` explicitly (no transition hook). Personnel-based cap 1–4; hard operational cap; overflow gets militia/TO-risk. Same-HQ/Missing-HQ: findAlternativeSeed, rebalanceZeroAoRSharedHq; deterministic fallback seeds. Municipality layer: `brigade_municipality_assignment` → derive `brigade_aor`; process `brigade_mun_orders` before pressure/attack. MAX_MUNICIPALITIES_PER_BRIGADE (8); ensure step only for muns with formation tags `mun:*`. AoR contiguity: initializeCorpsCommand before initializeBrigadeAoR; rebalance only when receiver stays contiguous; surrounded-brigade-reform. Shared: `getGraphAndEdges`, `phase_ii_adjacency.ts` (buildAdjacencyFromEdges, getFactionBrigades, isSettlementSetContiguous).
- **Tactical map:** One validator `getSettlementSelectionError` for hover/click/overlay; click-to-remove in selection modes. Ethnic 1991 = top-toolbar button; settlement features need mun1990_id/mun1990_name. FACTION_DISPLAY_ORDER in constants. Read TACTICAL_MAP_SYSTEM before src/ui/map edits. Dataset failure: reset lookups + clearGameState; clear status bar on success.
- **RBiH–HRHB:** Both Phase I and Phase II must gate flip/casualties by rbih_hrhb_war_earliest_turn and areRbihHrhbAllied; Phase II init needs ensureRbihHrhbState. Front edges skip RBiH–HRHB when allied. RBiH-aligned muns: single source `rbih_aligned_municipalities.ts`.
- **Phase 0:** INVEST hidden by default; shown when phase_0. Prep map: separate component, municipalities_1990_boundaries.geojson for borders (normalize mun IDs: hanpijesak vs han_pijesak). buildPhase0TurnOptions for runOneTurn; deadlineTurns from schedule if referendum later than default. War-start control: apply April 1992 mun control on phase_0→phase_i.
- **Desktop/Electron:** EPIPE guard on init logging. Electron first-paint: warroom-scene-hidden for menu; warroom-desk-hidden for maps. Preload + getDataBaseUrl for iframe/Electron data fetches.
- **Reports/Propagation:** IMPLEMENTED_WORK_CONSOLIDATED; CONSOLIDATED_IMPLEMENTED; canon propagation: Phase I/II, Systems Manual, context, TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT. See reports-custodian skill.
- **Testing:** node:test (npm test) vs Vitest (test:vitest, 7 suites). Fix all failures. Smoke: tsc --noEmit, vitest run, desktop:map:build. Scenario: apr1992_definitive_52w, --unique --map. Use 20w/30w checkpoints; 52w for acceptance. Unique run folder: monotonic .run_counter (not Date.now) for determinism.
- **3D/Sandbox:** Friendly-only pathing canonical; column = weighted cost, baseline 12; combat = 3. Slice determinism: canonicalizeSliceData; sort SID/edges. 3D init: container visible first; preload at module load; getDataBaseUrl for fetches. Standalone: map_operational_3d.html. See TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION, ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP.
- **3D counters:** Keep counter data-mode UI read-only and deterministic. Use a fixed mode cycle array, deterministic corps tint derived from faction+corps id hash, and avoid duplicating movement/counter logic between `map_operational_3d.ts` and `FormationSpriteLayer.ts`.
- **Refactor-pass:** Extract duplicated IPC handlers into action-parameterized helper; one staging helper in UI. Remove dead code after DOM changes (e.g. datasetEl).
- **Desktop IPC queries:** Add movement/combat preview handlers as read-only (`query-*`) and compute from deserialized state without mutating or broadcasting state updates.
- **Attack odds UI:** For hover-based preview, cache by `brigadeId:targetSid` and move tooltip without refetching unless the key changes.
- **Fog layer (3D):** Apply fog filtering after LOD visibility each frame, then render recon ghost counters from sorted SID keys for deterministic visuals.
- **Map modes:** Keep F-key mode switching deterministic with explicit mode enum (`F1..F4`) and cache read-only IPC query payloads per loaded state to avoid jitter/refetch loops.
- **Battle replay markers:** Normalize events at query boundary, replay current-turn events in stable order, and provide explicit skip hotkey to avoid blocking interaction.
- **Command mode:** Keep hierarchy navigation deterministic (sorted army/corps/brigade IDs) and surface OOB parity warnings directly in the command panel.
- **PostFX/audio toggles:** Keep them strictly optional and renderer-local (quality preset + ambient/UI sound only), with no game-state mutation or IPC writes.
- **Phase-12 extraction:** Pull state-shape parsing (`toViewerSave`) out of giant renderer files into data adapter modules to reduce coupling before final polish.
- **Fixture/schema:** Proactively add null/dummy for new required fields in test fixtures during refactor.

## Patterns That Don't Work
- Voronoi: simplify + turf fallback alone; gap-based salvage collapsing munis; Chaikin smoothing (white gaps).
- Full `npx tsx --test` can hang on Windows; run faster unit subsets first.
- Node vs Vitest: npm test = node:test; test:vitest = 7 files; vitest.config limits scope.

## Consolidation (2026-02-21)
- Merged redundant entries; promoted "fix failing tests" to User Preferences.
- Condensed 120+ Patterns That Work bullets into themed groups; archived "Implemented X" to pointers.
- Kept high-signal corrections and actionable patterns; trimmed Domain Notes to doc refs.

## Domain Notes
- **Canon:** docs/10_canon v0_5_0; context.md; PROJECT_LEDGER_KNOWLEDGE; TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT in docs/20_engineering.
- **Front assignment (HoI-style):** docs/30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md — three-tier hierarchy (army/corps/brigade fronts), Phase I non-contiguous vs Phase II contiguous, OGs as subfronts with pooling, multi-level operations, dedicated GUI per tier. Paradox team discussion included.
- **40_reports:** README entrypoint; CONSOLIDATED_IMPLEMENTED, CONSOLIDATED_BACKLOG; reports-custodian skill.
- **Scenarios:** apr1992_definitive_52w = canon. Phase 0/II start_phase; init_control_mode defaults to hybrid_1992 when omitted. GAMESTATE_TOP_LEVEL_KEYS for new state keys.
- **Phase I/II:** No-flip scenario-gated; ethnic/hybrid NO-GO default. Phase II: recruitment before reinforcement; run_summary phase_ii_attack_resolution.
- **Displacement:** 150% receiver cap; Croat Krajina→Livno/Mostar; census seeding when Phase I/II + census. See displacement_routing_data.ts, DISPLACEMENT_CENSUS_SEEDING.
- **Calibration:** POOL_SCALE_FACTOR, FACTION_POOL_SCALE; RS early-war RS_EARLY_WAR_END_WEEK 26; bot_strategy.ts knobs.
- **Repo:** Skills at .claude/skills/; Novi Grad = Bosanski Novi or Sarajevo borough (use geometry). OneDrive file locks: retry.
