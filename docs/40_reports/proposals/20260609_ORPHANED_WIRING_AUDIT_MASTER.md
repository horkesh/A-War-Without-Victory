# Orphaned-Wiring / Dead-Scaffold Audit — Master Punch-List (2026-06-09)

Owner question: the art event-illustration pipeline was "planned then never wired in and forgotten" — are there similar things we missed? **Yes.** Three read-only domain sweeps (engine/state, UI/desktop, content/events/codex) against a shared rubric. Sources: `20260609_ORPHANED_WIRING_AUDIT_{engine,ui,content}.md`.

**Headline:** No hard 1.0 *blockers* of the crash class — but **three whole features are "built but dark"** (a core thesis pillar, a campaign-end surface, and an LLM feature), plus a cluster of player-visible cheap defects, plus dead-code cleanup. Notably, **half the originally-seeded suspects were already fixed** (supply briefing, territory-trend, recruitment channel, the 13 camp essays, the dynsec entry) — the wiring discipline has improved; these are the residue.

---

## TIER 1 — "built but dark" whole features (OWNER scope decision)

| # | Finding | Where | Impact | 1.0 question |
|---|---------|-------|--------|--------------|
| **T1-A** | **Phase 3A→3D pressure→exhaustion→COLLAPSE pipeline is INERT** — 4 war-phase steps run every turn but `getEnablePhase3X()` returns false in all runtime; the enable-setters are only called from CLI audit harnesses. | engine N1 | The **"political collapse" half of the negative-sum thesis** does not run in the shipped sim. | Is collapse **in 1.0 scope**? If yes → a real wiring lane. If no → the 4 no-op steps are a perf/clarity wart to document or strip. |
| **T1-B** | **Replay sequence is never produced during live play** — the VerdictScreen Replay scrubber is fully wired + subscribed, but `advance-turn` never emits the replay channels; the sidecar is only written on file-load. | ui #6 | A campaign played **start→Dayton inside the app gets no Replay tab.** Directly adjacent to the **D2 "play a full campaign" gate.** | Required for 1.0? (Likely yes if D2 = play→verdict→replay.) |
| **T1-C** | **AI Advisor feature wholly unreachable** — `AiAdvisorPanel` is mounted but `setAiAdvisorOpen(true)` is never called; the `getAdvisorRecommendation` IPC (which actually wires the `player_advisor.js` LLM backend) is invoked by no component. | ui #1 | A complete panel + LLM backend with **no entry point** — built, costs nothing, reaches no player. | **Ship** (wire an entry point) or **cut/defer** (document as post-1.0)? |

---

## TIER 2 — player-visible defects, cheap fixes (dispatch-ready, non-§6)

| # | Finding | Where | Fix |
|---|---------|-------|-----|
| **T2-A** | **Ghost codex entries display the raw repo FILE PATH** instead of the authored narrative (e.g. literally `data/codex/ghost_entries/winter_held.md`). 20 EN + 20 BCS prose bodies read by zero runtime. | content C2 / `VerdictScreen.tsx:514` | Wire the resolver to load the `.md` EN/BCS body. Prose already exists. Visible-ugly. |
| **T2-B** | **`refugees_received` always 0** — no append site sets `dest_osid`, so the receive-side attribution never fires. | engine S6 / N6 | One engine fix (populate `dest_osid` at the routing append sites) unblocks BOTH the Dayton verdict "refugees received" stat AND the map refugee-column overlay. |
| **T2-C** | **`independence_referendum_1992` essay can never unlock** — indexed + content-complete but no backing event / ghost / requires, and the resolver has no tier-0 always-on path. | content C1 / `codexEssayResolver.ts:688` | Add a trigger or a tier-0 path. (Low-risk, non-§6.) |
| **T2-D** | **AAR casualty split hardcodes 0.30/0.55** vs canon KIA/WIA 0.22/0.74 — visible in op debriefs. | engine S5 / `operation_casualty_attribution.ts` (#73) | Align to the canonical fractions. Verify calibration-inert (AAR is a read/report layer). |

---

## TIER 3 — dead code / cosmetic cleanup (no player impact; batch or defer)

- **rear_zone_detection.ts** wholly dead module + its only callers `deriveAoRMembership` / `isSettlementFrontActive` (engine N3/N4).
- **`minority_flight_state`** orphan state field (module removed #360; field survives in game_state/serialize/migration/validate) (engine N5).
- **`redirectReserveLoan`** (ui #3) + **`overrideAiDecision`** (ui #2) — full IPC chains incl. a real sim function, no caller (parked Observer-level levers).
- Cosmetic dead exported `LoadedGameState` fields: `rbih_hrhb_war_earliest_turn` (#4), `brigadeSectorOverride` top-level export (#5).
- **~9/20 ghost entries dormant** — gating flags have zero writer, or the writer is `ENABLE_OBSERVER_THRESHOLD_FLAGS=false` (intentional-future "observer lane"; comments document it).
- **6 non-camp deposit essays** still unindexed (Cutileiro, Goražde consolidation, Kupres, Milošević warning, JNA column, Vase Miskina) — lack `localizations.bcs`.
- event `image` field: populated by 0/293 events (capability-ahead-of-content — expected, just wired in #362).

---

## §6-GATED — owner sign-off required (do NOT auto-build)
- **T1-A-adjacent / content C1:** `bijeljina_massacre_1992` essay never unlocks — its trigger framing is §6 (named 1992 atrocity).
- **BCS + trigger** for the 2 atrocity-adjacent unindexed deposit essays (Vase Miskina breadline, Sarajevo JNA column).
- Surfacing the §6-adjacent ghost bodies (`cleansing_refused`, `enclave_defended`) if the ghost-prose display (T2-A) is wired.
- Srebrenica `srebrenica_genocide_1995` is WIRED; the narrative codex-receipt is the lone intentional §6-deferred gap (`TODO(§6-sensitive-history)` `dynamic_section_builder.ts:752`).

---

## Pattern verdict
The "substrate built, wiring forgotten" pattern is REAL but **bounded and mostly already being closed.** The dangerous residue is the three Tier-1 features (especially the collapse pipeline — it's the game's *thesis*, dark) and the Replay-in-live-play gap (D2-adjacent). Tier-2 are cheap player-facing wins. Tier-3 is hygiene. The event loader's fail-closed design structurally prevents the worst class (orphan events), and the displacement/codex/art layers were repaired this session.
