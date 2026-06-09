# Orphaned-Wiring Audit — UI + Desktop domain

**Date:** 2026-06-09
**Scope:** `src/ui/`, `src/desktop/` (read-only audit, no code changes)
**Mission:** Hunt the "planned-but-never-wired / forgotten" pattern — the `EventModal.image` family of dead presentation layers, orphaned adapter fields, no-op surfaces, unconsumed IPC, and registries pointing at missing content.

Determinism is N/A for UI; flagged where a fix would reach into sim.

---

## Seed confirmations

| Seed | Status | Evidence |
|---|---|---|
| `EventModal.image` declared-not-rendered (FIX #362) | **CONFIRMED FIXED** | `EventModal.tsx:105` resolves `resolveEventIllustration(event.image)`; `:153-169` renders `<img>` when it resolves; graceful null fallback. `eventIllustrationArt.ts` glob present, `assets/event_illustrations/` intentionally empty (README only). Pipeline inert until art ships. |
| `displacementByOsid` always empty live (FIX #360) | **CONFIRMED FIXED** | Schema v36 `displacement_flows_by_osid` substrate; adapter rebuilds `displacementByOsid`/`departedByOsid`. Consumed in `SelectionPanel.tsx:120,259-260`, `SettlementDetailContent.tsx:228`, and the new `HumanitarianLedgerPanel.tsx` (mounted `App.tsx:1521`, 'U' hotkey). |
| `rbih_state_identity` dynsec → missing prose (FIX #361) | **CONFIRMED FIXED** | `fbf2d756f` removed the entry. No `rbih_state_identity` ref remains in src. Sibling sweep: all 146 essays in `data/scenarios/essays/essay_index.json` have non-empty `content`, all carry `localizations.bcs.content`, and all 149 branch/response-conditioned dynamic_sections + 89 SHAPEABLE essays have non-empty content. **No other dynsec/registry points at missing prose.** |

---

## New findings

| # | Finding | Category | File:line | Evidence (unwired) | Player-facing impact | 1.0 assessment |
|---|---|---|---|---|---|---|
| 1 | **AI Advisor feature wholly unreachable** | SURFACE-NO-HANDLER + IPC-SENT-NOT-CONSUMED | `App.tsx:492-493,1544-1549`; IPC `useIPC.ts:477`; handler `electron-main.cjs:3175` | `AiAdvisorPanel` is mounted but gated on `aiAdvisorOpen`. `setAiAdvisorOpen(true)` is **never called anywhere**; `setAiAdvisorResponse(...)` is only ever called with `null` (the onClose at `:1548`). `ipc.getAdvisorRecommendation` is **never invoked by any component** (only declared in useIPC). The main handler is fully built — it even imports and runs `sim/ai_commander/player_advisor.js` (the LLM advisor). | Entire AI-commander advisor surface — panel + LLM backend — is dead. No hotkey, button, or toolbar entry opens it. The panel could only ever render its "Awaiting assessment" empty state. | **Polish/intentional-future.** A whole feature with no entry point. Either wire an open-trigger (toolbar/hotkey + `getAdvisorRecommendation` call) or formally shelve. Fix would call sim (`player_advisor.js`) — gate behind AI-config. |
| 2 | **`overrideAiDecision` lever — handler with no surface** | IPC handler with no UI caller | preload `:133`; `useIPC.ts:764`; handler `electron-main.cjs:3239` | Full chain main↔preload↔useIPC wired, but **no component calls `ipc.overrideAiDecision`.** This was the v0.8.4 Phase-C Observer-level per-decision override. | Player on Observer autonomy cannot override an individual AI decision through any surface. | **Polish/intentional-future.** Autonomy levels 2-3 are themselves backend-gated ("not yet unlocked", `AutonomyPanel.tsx:6`), so this lever is parked with them. Document as parked or remove the dead IPC. |
| 3 | **`redirectReserveLoan` lever — built end-to-end, no button** | IPC handler with no UI caller | preload `:105`; `useIPC.ts:646`; sim fn `desktop_sim.ts:875`; handler `electron-main.cjs:3042` | Full chain including a real sim function `redirectReserveLoan(state, brigadeId, newCorpsId)`, but **no renderer surface calls it** (recall + decline + approve are wired in `ArmyReservePanel`; redirect is not). | Player cannot redirect an in-flight elite/reserve loan to a different corps despite the capability existing in the engine. | **Polish.** Add a "Redirect" action to `ArmyReservePanel`/`FormationDetail` elite-brigade row, or remove the dead path. Fix reaches sim (already implemented, so low risk). |
| 4 | **`rbih_hrhb_war_earliest_turn` — adapter builds, nobody reads** | ADAPTER-BUILDS-NOT-CONSUMED | built `GameStateAdapter.ts:1706,2279`; decl `types.ts:1023` | Adapter reads `meta.rbih_hrhb_war_earliest_turn` and exports it on `LoadedGameState`, but **zero consumers** anywhere in `src/ui`/`src/desktop`. (Contrast: the sibling `war_alliance_rbih_hrhb` is read in 6 places.) | None today — purely a dead field on the view model. The "earliest turn the RBiH-HRHB war could start" intel never surfaces. | **Cosmetic.** Remove the unused adapter line + type field, or surface it (e.g., a Croat-war diplomacy timeline hint). No sim touch to remove. |
| 5 | **`brigadeSectorOverride` top-level field exported but unread** | ADAPTER-BUILDS-NOT-CONSUMED (partial) | exported `GameStateAdapter.ts:2345`; decl `types.ts:1204` | The override map IS used **inside** the adapter (`:765`) to color a brigade's sector, so player overrides do take effect. But the **top-level `LoadedGameState.brigadeSectorOverride` field is read by no component** — it's a redundant export. | None — the feature works via the internal use; only the exported mirror is dead. | **Cosmetic.** Drop the top-level export (keep the internal use) or wire a "manually-assigned" badge that reads it. |
| 6 | **Replay sequence never produced during live play** | ADAPTER/PRODUCER-NOT-RUN-ON-LIVE-PATH | producer `electron-main.cjs:142 readReplaySaveSequenceSidecar`, emitted only at load `:172,183` (load-state paths `:779,1624`); `advance-turn` handler `:1638` emits **only** `game-state-updated`/`turn-report-updated`, never replay channels | `VerdictScreen` Replay tab gates on `replaySaveSequence.length>0 || replaySaveManifest.frame_count>0` (`VerdictScreen.tsx:366`). That data is only populated when **loading a save file that already has a replay sidecar** — the live `advance-turn` loop never accumulates or emits one. | A campaign **played live start→game-over inside the app gets NO Replay tab** at the verdict. The turn-by-turn scrubber (built, subscribed, consumer-complete) only works for externally-produced sidecar saves. | **Polish → BLOCKER-adjacent for the "play a full campaign" DoD.** The replay consumer chain is 100% wired; the producer just never runs on the live path. If the v1.0 verdict experience expects replay, this is a gap. Fix is desktop-only (accumulate snapshots per advance-turn + emit), but persisting `GameState[]` has perf/size implications — scope before building. |

---

## Surfaces checked and found HEALTHY (no action)

- **Presidential levers / Directive cards:** all 5 levers + §10 leadership gestures (`getFrontVisitAvailability`/`initiateFrontVisit`, address-nation, decorate-unit, `acceptProposal`/`rejectProposal`, `proactiveForceLaunchOp`, `forceLaunchProposal`) are wired to real handlers via `DirectiveCard.tsx` / `FrontVisitSection.tsx` / `CommandRelationshipSection.tsx`. The DaytonNegotiationModal "Adopt counter-offer" no-op was already fixed (#297).
- **All 80 preload methods** are referenced by the renderer **except** the three flagged above (#2 `overrideAiDecision`, #3 `redirectReserveLoan`, and #1's `getAdvisorRecommendation`).
- **4 main→renderer push channels** (`game-state-updated`, `turn-report-updated`, `replay-sequence-updated`, `replay-manifest-updated`) all have subscribe→consume chains in `useDesktopSession.ts`. (The replay ones are consumed; finding #6 is that they're never *emitted* live.)
- **Codex / essay registry:** 146 essays, 0 empty content, 0 missing BCS, 0 empty dynamic_sections. Resolver handles ghost/unmatched conditions gracefully.
- **Art resolvers** (`presidentialCommandArt`, `directiveActArt`, `eventIllustrationArt`): all use eager `import.meta.glob` with null fallback → never render-broken on missing art. `presidentialDeskAssets.ts` uses static imports (build-enforced presence).
- **Consequence/receipt builders** (`buildConsequenceReceipts`, `buildForcedOpReceipts`, `buildOfficerResentmentReceipts`, `buildCommandFrictionReceipts`): all consumed via `App.tsx:1463-1465` into `TurnAftermathModal` (verified — they live behind an aggregation layer, not orphaned).
- **`StrategicDashboard`** (memory said "to be retired"): no such component exists in `src/ui` — already gone, not a dead-but-mounted surface.
- **Single-consumer view fields** spot-checked (`ivpConsequencesActive` → SituationTab, `politicalMetricsByOsid` → map metric layer, `pendingProposalReviews` → inbox/decision-room): all render.

---

## Minor / informational

- `OOBSidebar.tsx:57` — `// TODO: Fog coverage indicator — compute visibleEnemyOsids.length / totalEnemyOsids * 100`. A planned percentage readout never built. **Cosmetic.**
- `AutonomyPanel.tsx:6` — Levels 2-3 intentionally show "(not yet unlocked)" gated on backend `level_2_plus_not_yet_enabled`. **Intentional-future** (ties to findings #1/#2).

---

## Top player-facing dead surfaces (priority order)

1. **AI Advisor (finding #1)** — a complete panel + LLM backend with no way to open it.
2. **Live-play Replay tab (finding #6)** — the verdict replay scrubber is invisible for any campaign actually played in-app.
3. **Redirect-reserve-loan lever (finding #3)** — an implemented engine capability with no button.
