# AWWV Game State Rating — vs. AAA+++ (Paradox-tier) Bar

**Purpose:** Single living "where is the game today, honestly" master. Per-system rating against an AAA+++ / Paradox-tier reference bar, with the exact remaining gap and what work would close it. **Observation-only — no code changes.**

**Updated:** 2026-05-18

**Studio:** Pyrrhic Games · **Project:** A War Without Victory (AWWV) · **Version:** v0.9.6-alpha.1 · **Last baselines:** 40w n1740 hash `86ebf26ae0271465` (26/27 anchors, 6/6 benchmarks); 188w n1741 hash `a4bf8b8095050881`.

---

## 0. Reading guide

### Prior art — read first, this file builds on them

This file does **not replace** the existing audit chain. It **updates** it to current state (2026-05-16) and **extends coverage** to systems that prior audits did not formally grade (UI shell, content depth, audio/localization/accessibility, narrative, telemetry, build/CI, soundscape, store readiness).

- **[`2026-04-10 v0.8-to-v0.9 A+++ System Scorecard Plan`](../plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md)** — the canonical engine/systems scorecard. Five weeks old. Most engine grades here build on its grades and either confirm or upgrade based on the 2026-04 through 2026-05 hardening waves.
- **[`audits/20260330_REPO_HEALTH_CONSOLIDATED.md`](audits/20260330_REPO_HEALTH_CONSOLIDATED.md)** — repo health, overlapping-ownership diagnosis. Still load-bearing.
- **[`audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`](audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md)** — blindspot heuristics + Lane A correctness triage. Most Lane A items have shipped; heuristics remain canonical.
- **[`audits/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md`](audits/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md)** — Paradox-style genre mirror. Still the most honest critique of "UI implies clarity the war did not have." Many findings still open.
- **[`audits/20260222_CANON_VS_INDUSTRY_STRUCTURE_AUDIT.md`](audits/20260222_CANON_VS_INDUSTRY_STRUCTURE_AUDIT.md)** — docs structure vs industry GDD/TDD norms.
- **[`audits/20260501_PRESIDENTIAL_PRODUCT_SPINE_C0_AUDIT.md`](audits/20260501_PRESIDENTIAL_PRODUCT_SPINE_C0_AUDIT.md)** — product loop audit. Largely closed by Turn Aftermath + Decision Room + Chronicle waves; remaining gaps surface below.
- **[`audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md`](audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md)** — v0.9.4 shell audit.
- **[`GUI_POLISH_MASTER.md`](GUI_POLISH_MASTER.md)** — 2026-05-16 UI/UX punch-list (this session, 36 findings).

### Grade rubric (extended from the v0.8-to-v0.9 scorecard)

| Grade | Meaning | Paradox-tier mapping |
|------|---------|----------------------|
| `S` / `A+++` | **Genre-defining.** Industry would copy this; players quote it as the reason they bought the game. | Stellaris pop system at launch; CK3 character system; HOI4 division designer. |
| `A++` | **AAA shippable, signature feature.** Owner clear, contracts honest, scenario-proven, UI explains it, players notice the depth. | Most flagship Paradox systems at v1.0. |
| `A+` | **Strong, trustworthy, one polish step from signature.** | Solid Paradox 1.x systems. |
| `A` / `A-` | **Strong but with one or two bounded seams or under-proven product behavior.** | Working Paradox-DLC-era systems. |
| `B+` / `B` / `B-` | **Valuable and playable** but mixes truth with drift, partial ownership, or thin product. | Paradox systems at launch that earned mediocre reviews. |
| `C` | **Structurally present but too partial or fragile to trust broadly.** | Common at indie 1.0 — visible cracks. |
| `D` | **Missing canonical owner/contract; blocked.** | Pre-alpha placeholder. |
| `F` | **Effectively absent.** | Feature listed in roadmap, not in shipped product. |

### Project context (one-paragraph identity)

AWWV is a **deterministic strategic-level simulation of the 1992–1995 Bosnian War**. Three factions (RBiH/RS/HRHB), week-long turns, ~712 settlements (OSIDs), brigade-level OOB, corps/army command chain. Genre: **negative-sum operational wargame** — closer to AGEOD / Combat Mission / Hearts of Iron's grimdark cousin than to Civ. Player commands at army → corps → sector level; brigades never attack independently. Tech: TypeScript + Vite + React + MapLibre + Electron, ~700 source files, ~3500 vitest tests, 156 combat files, 91 state files, ~700+ docs (canon + engineering + reports).

---

## 1. Headline assessment

**One sentence:** AWWV is currently a **B+ simulation core wrapped in a B- product shell**, ~6–9 months of disciplined polish work away from being a credible AAA+++ release on the Paradox shelf — but the gap is **not** in simulation depth (which is already approaching A-tier in several areas); it is in **(a) UI palette/density/onboarding polish, (b) presentation of friction, (c) content reactivity, (d) audio/localization/accessibility, and (e) production-side packaging/store readiness.**

**Strengths that are already at or near AAA+++:**
- Determinism scaffolding + replay + golden-seed regression. Genuinely **better than most Paradox titles** at this — Paradox tolerates non-deterministic hotfixes; AWWV does not.
- Documentation density and self-awareness about technical debt — `docs/PROJECT_LEDGER.md`, `napkin`, `life_lessons`, `MEMORY.md`, master files, prior audit chain. **Better than most studios of comparable team size.**
- Historical research depth (Balkan Battlegrounds knowledge base ingestion, ICTY anchoring, 83 essay corpus, Cost Ledger / Consequences system, Dynamic Codex).
- Sector / front-line truth post-2026-04 hardening — at `A` per prior scorecard, confirmed.

**Weaknesses that are genre-blocking right now:**

**2026-05-18 correction:** The former hidden-decision blocker is closed for engineering scope. `docs/40_reports/audits/20260516_PRESIDENTIAL_INBOX_DECISION_SURFACE_AUDIT.md`, `docs/40_reports/implemented/20260516_GUI_PHASE0_DECISION_SURFACE_AND_POLISH.md`, `docs/40_reports/implemented/20260517_PARAMILITARY_INBOX_AND_REVIEW.md`, and `docs/40_reports/implemented/20260518_INTEL_FRICTION_AAR_ANNOTATION_BATCH12.md` document the surfacing chain from engine-routed paramilitary requests through Inbox / Decision Room / AAR context. Remaining sensitive-history work is richer branching depth, public-safe framing, and authored downstream consequence arcs.
- **Sensitive-history consequence depth.** The engine now asks visible player-facing questions for paramilitary deployment and related decision families; the AAA+++ gap is that those decisions still need deeper downstream arcs, Codex framing, and post-resolution context. This is now a content-reactivity and narrative-framing gap, not an invisible decision queue.
- **UI presents control / front lines / supply / authority with more crispness than the historical war actually had** (Strategic Design Council audit P0; still mostly unaddressed at the visualization layer).
- **First-session player experience.** Tutorial onboarding is present but spread across 4–5 sequential overlays; opening brief is a paragraph block; no in-context glossary; the player cannot tell what the game is for inside the first 10 minutes.
- **No audio system.** Zero ambience, zero stingers, zero UI feedback sounds, no music. For a sober historical wargame this is survivable; for AAA+++ it is not.
- **Localization remains early.** Settings and Pause Menu now use the English/BCS substrate, but broad BCS coverage, terminology review, and native-speaker validation remain a credibility requirement for a Bosnian War game.
- **Accessibility:** v1.0 P0 blockers are closed and statically guarded: clickable-div elimination, WCAG AA contrast tokens, OS + in-game reduced motion, and programmatic form labels were implemented in `07163a48` and re-verified in Batch 18.
- **No marketing / store presence / soundscape / trailer.** Per roadmap "v0.9.1 store marketing" was absorbed into v0.9.5; outreach is operator-owned, not roadmap debt — but for AAA+++ release, the gap is large.

**Verdict against the AAA+++ bar:** **A- as a simulation engine. C+ as a product. B- average overall, weighted by the product gap.** A solid Paradox-tier flagship needs both halves at A+ minimum.

---

## 2. System-by-system rating

**2026-05-16 Phase 0 rating correction:** Rows #12 and #32 below originally record a same-day downgrade caused by the hidden RS paramilitary decision queue. Phase 0 implementation closed that blocker and audited the broader Inbox decision surface. Treat #12 Event / decision system and #32 Sensitive history handling as restored to **A-** for current engineering truth. Their remaining AAA+++ gaps are outcome-arc depth, Codex framing, and future audit discipline, not hidden sensitive-history decisions.

### 2.1 Simulation core (engine)

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 1 | **Determinism + turn pipeline** | **A** | Sacred rules enforced; deterministic RNG; sorted iteration via `strictCompare`; golden-seed regression; 151-step war pipeline; 40w hash byte-stable across baseline reruns; CI Baseline Regression gate green at `750e1c14`. | Save/load/replay equivalence test, full V8 packaging-build determinism cross-platform proof, save-continue hash-chain. | The 2026-04-14 round-trip work proved real-save byte-identity. Remaining: continue-from-save hash chain (next-turn determinism off a loaded save). Tooling + 1 test = ~3 days. |
| 2 | **Combat resolution** | **A-** | 156 files in `src/sim/combat/`. Lanchester concentration, urban/forest/elevation modifiers, defensive fire (P1 1.8× cap), graduated morale curve, sub-segment ID fix, sector-anchored launch contract. Hot path profiled and cut aggressively in 2026-05-15 lanes. | Defensive friction (artillery/terrain/entrenchment) is now considered in launch feasibility, but **predictor confidence** during planning is still under-proven; combat outcomes can surprise a tutorial-grade player. | A "Why did this happen?" mini-AAR per battle (already partially via Chronicle COST cards) + tuned predictor confidence band. The math is solid; the explanation surface is thin. |
| 3 | **Bot AI — Corps commander (intelligent)** | **A-** | `src/sim/combat/commander/` (10 files). Real authority, real memory, competing options, explainable choices — meets Priority 3 from 2026-03-30 consolidated audit. Subordinate index + enemy-equipment context + must-hold queue all profiled and committed 2026-05-15. Batch 41 (UI-2, 2026-05-18) added a Decision Room pushback signal card (`pushback:player-army-co`) that promotes existing `order_refused` / `order_pushback` / `order_modified` events plus PARTIAL/REFUSED `armyCoDecisionTraces` rationale into the Decision Room and routes back to the Army HQ briefing tab (existing OrderInterpretationPanel + ArmyCoPushbackPanel owners). | Decision Room now flags refused/pushed-back/modified directives ahead of advance-turn; per-corps stance rationale outside the briefing tab is still thin. Pushback panel still also renders on the advance modal (canonical). | Continue surfacing per-corps stance rationale inside the corps briefing dossier; the Decision Room ledger entry is now data-driven. ~5 days. |
| 4 | **Bot AI — Army HQ / political layer** | **B+** | Functional. President bot + persona scaffolding for Claude-as-faction QA infrastructure landed. RBiH/RS/HRHB officer growth / degradation visible in 188w runs. | Army-HQ → corps directive bridge is real but **decisions still feel mechanical** — bot picks a stance, not a campaign theme. Mladić-class autonomous-launch warnings shipped; richer "personality" beyond override-tolerance still pending. | Add 1 narrative trait + 1 doctrinal trait per army commander, surfaced in Personnel tab. Already designed in `architect` agent prompts. ~7 days content + 3 days wiring. |
| 5 | **Bot AI — Brigade level / tactical** | **A-** | 15 `bot_*.ts` files. Sector-anchored brigade assignment, depletion guards, slot-cap recovery, sub-segment ID prefix fix, return-to-corps + sectorMarch + sectorAttack + pocketEvacuation + homeDefense + uncontestedOccupation all profiled and cached. Front-density indexed. | "Brigade never fights" still classifies ~78 cases per 40w run (split per 2026-05-15 into `loan`/`operation_participant`/`sector_front`/`sector_reserve`/`sector_rear`); `sector_front` live-inert is the live target lane. | Close the `sector_front` inert subset (~61 cases per 40w). ~5 days. |
| 6 | **Operations system** | **A-** | 22 files. Operations Singularity plan executed; `corps_operation_helpers.ts` is canonical factory; `sector_offensive.ts` is canonical lifecycle owner. Operation opportunity dossier surface + force-quality + footprint + redirect DTO all shipped. Batch 14 adds an Army HQ Records -> Operation History completed-operation deep review from existing AAR fields. Batch 15 files player-scoped completed-operation AAR cards in Chronicle and routes them back to the Records owner. Batch 16 preserves the completed-operation id from Chronicle and auto-opens the matching History row. Batch 17 adds per-axis objective status chips from existing `axis_summaries`. | Reinforcement-bounded launch truth is in place, Records has a compact post-mortem that now covers overall objective/provenance review plus per-axis outcome labels, and Chronicle gives completed operations a narrative time-placement route that lands on the exact AAR row. The compact Records/Chronicle handoff now exhausts the current completed-operation AAR fields for player-facing review. | A larger Paradox-tier operation overlay now needs a new presentation mandate or richer authored/simulation fields; do not invent new schema solely to decorate the existing compact Records owner. |
| 7 | **Sector / front-line system** | **A** | Strong post-2026-04 (triple-junction connectivity, isolated pocket consolidation, sector-anchored launch). Sector demarcation overlay removed 2026-05-16 (cleaner map). | Sector visibility on the map is now lean (no demarcation lines); promotion to **A+** needs the residual ambiguous territorial classification audit from the prior scorecard. | Bounded content audit per prior scorecard (~5 days). |
| 8 | **Supply / logistics / corridor** | **B** | Supply pressure modeling lives; ethnic supply constraints exist. The presidential Decision Room surfaces player-scoped supply risk from `supplySummaryByFaction[playerFaction]` and `supplyStateByOsid`; the tactical map has a supply-reach overlay; and 2026-05-23 closes `BRIEF-GAP-1` by adding player-faction supply/corridor risk to the sim-side command briefing from canonical `supply_state_by_osid` / `supply_corridors_osid` reports. | Supply is now visible in the briefing/Decision Room/map stack, but still lacks richer operational affordances: why a corridor is brittle, what action can relieve it, and how logistics priority changes expected endurance. | Polish supply affordances: corridor drill-down, relief-path hints, and clearer logistics-priority effect explanation. Mechanics already exist; the next lift is player interpretation. ~5-7 days. |
| 9 | **Early war / militia / formation emergence** | **A-** | 18 files; militia pools, JNA dissolution, authority degradation, control flip. Recent OOB-data lane (Lane 2 `be7e0715`) closed BUG-01. Army HQ Personnel now shows selected-faction mobilization pool health from existing `mobilizationSummary`: available, committed, exhausted, strategic reserve, exhaustion percentage, and largest available pools. | Basic pool visibility is now live, but players still need recent-emergence trends, pool-decay explanation, and JNA equipment-transfer visibility. | Extend the Personnel mobilization surface with recent emergence rows / decay trend and JNA transfer context when canonical state exposes those signals. ~4-6 days. |
| 10 | **Officer / personnel system** | **B+** | Three-tier officers (army/corps/operation), succession, accolades, command friction multiplier. v0.8 Command Chain CLOSED. Persona-grounded LLM commanders side-channel landed (default OFF). Mini-bios are surfaced in Army HQ/OOB; 2026-05-23 adds Chronicle `personnel` "Officer of the Week" cards for completed-operation commanders and Personnel trait chips from existing `command_style` / `known_for` fields. | Officers now have visible identity beats, but the first-pass authored content is still concentrated on opening commanders and lacks portraits/deeper relationship arcs. CK3 character depth is out of scope; HOI4-style broad trait readability remains the achievable next lift. | Expand historically reviewed mini-bio/trait coverage beyond first-pass opening commanders and consider portrait/asset treatment. Do not wire traits into behavior without a separate design/canon lane. ~7-10 days content + UI polish. |
| 11 | **Diplomacy / international system** | **B** | Bilateral ceasefire, patron events, bot negotiation responses. UN Resolutions and arms embargo authored as essays. Dayton system + dimension merge shipped. The Warroom diplomatic telephone now opens a dedicated read-only Diplomacy panel with active proposals, negotiation timeline, international pressure, what-moves-the-needle hints, external actor bands, and per-actor stance prose derived from existing support/constraint/isolation/sanctions signals. | Diplomacy is no longer panel-absent, but it is still mostly a read-model over event/proposal state rather than a deep per-turn geopolitical system. No diplomatic map view, no rich per-power history, and no treaty/actor relationship drill-down. | Extend canonical state/read-models for per-power stance causes, treaty history, and diplomatic map context. Avoid adding mechanics until the existing panel has richer historical/player-facing explanation. ~7-10 days. |
| 12 | **Event / decision system** | **A-** | 10 files in `src/sim/events/`. ~244 consequence events live (per 2026-05-10 closure). Catalog +24 events in 2026-05-05 Wave 13–16. EU4-style decision events with `event_types.ts` predicates correctly using `>=`. The 2026-05-16 paramilitary inbox blocker is now closed for engineering scope: paramilitary requests are adapter-visible, inbox-routed, Decision Room-visible, and regression-covered by `tests/ui/paramilitary_inbox_items.test.ts`, `tests/ui/paramilitary_review_modal.test.ts`, `tests/ui/inbox_items.test.ts`, and `tests/ui_presidential_decision_room_wiring.test.ts`. | Volume is good; remaining AAA+++ gap is branching depth and consequence arcs, not invisible decision queues. | Each P0 decision family (Srebrenica, Markale, Dayton, Storm, paramilitary) needs richer downstream arcs and Codex framing. Cost Ledger ties exist; arc authoring is the gap. |
| 13 | **Cost Ledger + Consequences** | **A-** | v0.9.0 CLOSED-FOR-AGENT-SCOPE. Inventory: 244 events / 827 effects / 18 live substrates / 0 partial-reader / 0 unknown. Reader annotations + tokens (`ANNOTATION:<tag>`, `{cost_annotations}`) shipped Wave 19. | The system is **structurally complete**. The promotion to A+ is consumer-side: how many essays / Chronicle cards / Codex sections actually surface the consequence tokens. v0.9.1 dynamic Codex is partial. | Author 20+ more dynamic Codex sections that consume real ledger annotations. Per Memory: 60 v0.9.1 sections already authored, growing. ~14 days for the next wave. |
| 14 | **Economy / wartime industrial** | **C+** | Reserves tracked; supply pressure tracked; manpower implicit via brigades. No explicit war-economy game. | Per Game Bible the project is intentionally **not** a Vic3-style economy game — but at AAA+++ players still expect an economic surface (recruitment cost, equipment scarcity, mobilization waves). Currently abstract. | Decision: either (a) explicitly disown economy as out of scope and lean in to scarcity instead, with UI to match, or (b) add a thin economy layer (manpower pool, equipment delivery, scarcity events). The current half-state is the gap. ~3 days for (a), ~20 days for (b). |
| 15 | **Endgame / Verdict / Pyrrhic scoring** | **A-** | VerdictScreen exists; v0.9.0 Pyrrhic scoring contract shipped per `2026-04-14-v090-victory-pyrrhic-scoring-contract-plan`. Compare-to-historical baseline + divergence note system shipped. Six historical scenarios. 2026-05-18 adds a cinematic verdict band, deterministic share summary, and mobile lower-flow controls for Report/Reckoning/Codex/Replay over existing scoring truth. Batch 44 (UI-5, 2026-05-18) subdivides the long FactionReport into stable named sections (`faction-report-score`, `faction-report-dimensions`, `faction-report-statistics`, `faction-report-dayton`) and wraps the lower-priority three in `<details open>` with a `sm:hidden` summary toggle — desktop renders dense and unchanged, mobile gains tap-to-collapse without removing any score/Cost Ledger field. | Cinematic verdict band, mobile lower-flow, and faction-report mobile subdivision are in. Remaining lifts are content-side (more authored verdict prose tied to Cost Ledger tokens) and visual polish. | Next: authored verdict prose layer + Playwright mobile capture. ~3-5 days. |

### 2.2 Frontend / shell

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 16 | **Tactical map (rendering)** | **B+** | MapLibre + Deck.gl counters default-on; PMTiles; 27 settlement labels; map mode legend; 30° pitched BiH-bounded camera; sector demarcation removed; click picking with screen-space fallback. | Map is **functional** but does not yet **look** AAA+++. No weather, no day/night, no season, no terrain shading depth, no animated front-line tension. HOI4 / Stellaris move when nothing's happening; AWWV is static. | (a) Subtle terrain hillshade as a permanent base layer; (b) animated front-line "breathing" pulse when stance changes; (c) seasonal map tint per week (winter snow, summer green); (d) battle-flash markers for the current turn. ~15 days. |
| 17 | **Tactical map (information design)** | **B+** | Track C C1-C4 implemented: contested/disputed bands, front stability classification, supply reach/isolation overlay, and separate Authority/Legitimacy map modes. | Major Strategic Design Council map findings are addressed in the tactical map by `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`. Remaining risk is visual validation and richer command-friction/exhaustion presentation outside this map layer. | Add browser/Playwright captures for the four map surfaces, then continue non-map friction/exhaustion presentation work. |
| 18 | **Warroom (React shell)** | **B-** | Hotspot contract restored; dynamic board overlays restored; paper map + date overlays render; priority docket. | Per GUI_POLISH_MASTER 2026-05-16: hotspot label affordance is thin (title-attribute only); date font uses Comic Sans fallback; placeholder dead-ends; advance-turn affordance weaker than tactical equivalent. | Close GUI_POLISH P0-20 / P1-15 / P1-16 / P1-19. ~3 days; already scoped. |
| 19 | **Warroom (hero art)** | **A-** | 15 room images planned (`prewar/year1-4` × 3 factions); flag baked into art; desk map projected as overlay; clean-room art direction shipped. | Art direction is **the strongest single visual asset** in the project. Lifting to AAA+++ needs a tiny additional layer: subtle ambient animation (window light shift, paper flutter, candle flicker per faction's exhaustion state). | Animation pass on the room art (sprite-anim, ~3 frames per element). ~10 days; needs artist. |
| 20 | **Army HQ modal** | **B+** | 4 tabs (BRIEFING / SUMMARY / RECORDS / PERSONNEL). CoS briefing + Decision Room synthesis. Force quality dossier + opportunity surface live. Batch 43 (UI-4, 2026-05-18) wraps the redundant SituationBriefing block (same `commandBriefing.items` already surfaced by Decision Room `briefing:` cards) in a `<details>` collapsible — open by default when any item is critical, collapsed otherwise. Items stay in the DOM regardless of toggle state (no ownership change). Decision Room "View Advanced" toggle already gates Advanced Desk + lenses + Inspect Next + Source Handoffs. | Decision Room first-paint density still has CoS + Decision Room overlap (per GUI_POLISH P1-22 / P1-23 / P1-12); emergency-posture select still bulk-applies without confirm; three exit buttons in header. Briefing tab top section grid (CoS / Commander / Crest / Exhaustion / Strategic Position) still always-open. | Continue progressive disclosure: wrap the top section grid + emergency posture confirm dialog. ~3 days remaining. |
| 21 | **Presidential Inbox + Decision Room loop** | **A-** | Command-loop lanes + product-loop heartbeat + source handoffs + active dossier + pre-advance review + priority docket all wired. "View Advanced" toggle already hides Advanced Desk, lens row, Inspect Next, and Source Handoffs on first paint. Closes the C0 product spine audit. Batch 43 (UI-4, 2026-05-18) adds a sibling SituationBriefing collapsible (see #20) so the BRIEFING tab no longer double-renders the same briefing items above the fold. | Decision Room first-paint cards (4 visible, 7 when advanced) are still dense for new players; presentation gains would help further. | Continue with header polish + top-section collapse from row #20. |
| 22 | **Chronicle / Codex / narrative UI** | **B+** | Chronicle review filters (all/headlines/cost/combat/politics/humanitarian/military/diplomacy/narrative); COST cards for severe turns; Codex dynamic sections authored against Cost Ledger tokens. Turn-record deep linking. | Reads like a **historian's filter view**; lacks the **cinematic Chronicle** an AAA+++ player expects (CK3's "previously on your dynasty" style narrative card). | Author a "Chapter" view that stitches Chronicle entries into prose paragraphs (LLM-assisted at session boundary, deterministic at run-time). ~14 days. |
| 23 | **Turn Aftermath modal** | **A** | Judgment / Memory packet shipped (cost / signal / action / territory / quiet). Routes to Inbox / War Summary / Records / Chronicle / Codex. 2026-05-23 adds one deterministic authored line per aftermath tone and renders it in both the immediate modal and Army HQ Records. | The immediate report now has a stronger narrative beat. Remaining lift is broader Chronicle chapter recap and endgame prose depth, not the per-turn aftermath line. | Keep Turn Aftermath stable; route future narrative work to Chronicle chapter recap / endgame prose. |
| 24 | **Onboarding / tutorial** | **B+** | OnboardingOverlay is the single mounted first-run tutorial owner; PeaceWarTransition is armed only by a live peace-to-war loaded-state transition. OpeningBrief is a 3-bullet scan card with Begin / Read later. CoachmarkLayer covers Decision Room, Operation Opportunity, Chronicle filters, and Codex on first hover. Batch 45 (UI-6, 2026-05-18) retired the legacy `FirstTurnOrientationCard.tsx` + `firstTurnOrientation.ts` + their two legacy tests after migrating persistence coverage forward — see `tests/ui/onboarding_persistence_replacement.test.ts` (asserts OnboardingOverlay dismissal flows through the IPC bridge and never writes to localStorage). | Live browser/Playwright first-session capture is still needed for polish evidence. | Track D D1-D4 implemented 2026-05-16; see `implemented/20260516_FIRST_SESSION_PRODUCT_PROOF.md`. Next lift is visual/playtest validation, not missing onboarding substrate. |
| 25 | **Side picker / first-run** | **B** | 3-faction picker; load save; continue last run; AWWV version label. Current source and `tests/ui_shell_frame_contract.test.ts` prove the old GUI_POLISH P0-2 emoji issue is closed: `SidePickerOverlay.tsx` uses the project icon system and the rendered button copy is emoji-free. | Remaining first-run lift is visual/playtest validation and richer side-selection onboarding, not the stale emoji blocker. | Keep first-surface tone checks in shell-frame contracts; route future work to onboarding/playtest validation rather than rebuilding the picker. |
| 26 | **Pause menu / settings** | **B** | PauseMenu + SettingsScreen exist. Escape now clears map selections before opening Pause, leaves Army HQ to its own modal owner, and Settings owns Escape above the global pause shortcut. Settings already covers audio, accessibility, language, diagnostics, and tutorial restart where eligible. | Keyboard discoverability and settings breadth are better than the stale C+ row, but no key remapping and richer display/video controls remain. | Add key-remap/display controls and a compact shortcut reference when those substrates are designed. The core Escape tree is closed. ~4-6 days. |
| 27 | **Performance / framerate** | **B** | 2026-05-18 n1881 profile kept 40w hash `42607f83870e01d5` and identified sector reconstruction/reconciliation as the dominant measured target. Batch 8 Task 3 added opt-in child attribution inside `recoverDroppedFrontEdges(...)`; Batch 9 implemented build-scoped reuse of that setup and timed n1885 at `96896.459ms` / `2422.411ms per turn`. Batch 10 Task 5 proved n1881/n1885/fresh-profile artifact byte-identity and found the next measured leaders are `buildFactionSectors:RS` and `buildFactionSectors:RBiH`. Batch 11 added sidecar child attribution under `buildFactionSectors:*`; Batch 12 descended into `buildMultiSectorsForCorps(...)`; Batch 13 attributed `buildSectorFromSubSegments(...)`; Batch 14 optimized repeated active-formation scan lists inside that sector-object path; Batch 15 adds a `buildFactionSectors(...)` active-combat index and fresh profile evidence. | Performance is **acceptable at 40w**, mainline target is 188w campaign. Sector reconstruction is still the next big lever, but Batch 15 sidecar evidence still leaves `buildFactionSectors:RS/RBiH`, per-corps construction, brigade classification, and `recoverDroppedFrontEdges:*` as candidates. | Choose the next cut from Batch 15 sidecar evidence and prove it with focused sector tests plus 40w output; do not claim full-harness wins from single noisy runs. |

### 2.3 Content / lore / historical depth

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 28 | **Historical fidelity (sim)** | **A** | 712 OSIDs, 247 brigades, ICTY/BB/museum-anchored OOB, six historical scenarios (apr 1992/1993/1994/1995), 188w runs cover full war. Anomaly detector flags ahistorical drift. | Already a **research grade** above most wargames in this period. Promotion to A+ needs explicit author-attribution per OOB entry so the player can see "Sourced from: ICTY judgment X, OSID Y, page Z." | Wire existing knowledge-ingest provenance into a per-OSID / per-brigade tooltip. ~7 days. |
| 29 | **Essay / Codex corpus** | **B+** | 83 essays on disk (per Memory). 3-pass QA audit 2026-03-25 fixed 24 corrections across 18 essays. Source hierarchy ICTY > museum > BB > Wikipedia. ~13 missing 1992 events still need authoring. | At AAA+++ scale, the corpus would be 200+ essays + interactive maps per battle + voice-over narration. AWWV is at solid book-quality text without media. | Author the missing 13 essays + add inline maps per essay. ~30 days plus art/photo licensing. |
| 30 | **Dynamic Codex / reactive narrative** | **B+** | 60+ v0.9.1 sections authored; ghost-entry system; faction-scoped findings; 18+ packet types (Srebrenica, Dayton, Storm, etc.). Consumes Cost Ledger tokens. | The depth is there; the **reach** is shallow — many ledger annotations have no Codex consumer yet. | Each new consequence event should pair with an essay section addition. Continue waves. ~ongoing. |
| 31 | **Chronicle as narrative spine** | **B+** | Per-turn cards, severity filters, COST card emission, ChronicleSpine + SpiderChart visualization, deep-link to Turn Records, chapter mode, and 2026-05-23 deterministic prose chapter summaries from dominant thread / headline count / month range. | Chapter mode now reads less like a raw ledger, but still lacks a larger session-end recap that stitches chapters into a memorable campaign story. | Add deterministic session-end Chapter Recap synthesis over existing chapter inputs. ~10-14 days. |
| 32 | **Sensitive history handling (Srebrenica, Markale, camps, paramilitaries)** | **A-** | SENSITIVE_HISTORY_DESIGN_GATE in canon. §6 triple sign-off chain on shape changes. Stupčanica name-collision fix. Camps reported via Cost Ledger annotation, not gamified. The 2026-05-16 RS paramilitary UI-surfacing drift is closed for engineering scope: the engine-routed decision family is now visible in Inbox / Decision Room flows with explicit review routing and regression coverage. | Engine handling is exemplary; remaining AAA+++ gap is deeper authored framing and downstream consequence arcs, not hidden sensitive-history player choices. | Audit future sensitive-history decision families against Inbox/Decision Room as they are added, and author the Codex foreword explaining why the game treats these events as it does. |
| 33 | **Music / soundscape / VO** | **D+** | A silent, disabled-by-default tactical-map audio substrate now exists: stable cue manifest, no-op bus, local mute/master-volume settings, peace-plan and turn-review hook points, cue readiness metadata, a pure event adapter, explicit-timestamp cooldown suppression, and a root-mounted observer that suppresses initial hydration while turning later loaded-state turn summaries into silent-bus cue calls. | This is still not real shipped audio: no approved assets, no asset-backed playback service, no ambience/music/VO content, and no audible mix. AAA+++ still needs 1 main theme, 4-6 ambient pieces, UI feedback, stingers, and optional narration. | Build asset-backed opt-in service after approved packaged assets exist, then commission/integrate the score and sound design. ~45-60 days depending on composer/audio pipeline. |

### 2.4 Code / engineering

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 34 | **Code maintainability / god files** | **B** | Decomposition program CLOSED per 2026-04-14 — `attack_resolution_osid.ts` 1809→907 (-49.9%), 7 tranches extracted. `war_phases.ts` (151 steps), `sector_offensive.ts`, `electron-main.cjs` remain large but non-blocking. | God files were the documented risk; they have been bounded. Promotion to B+ would mean `war_phases.ts` step-pack extraction. | Optional bounded decomposition pass. ~10 days. |
| 35 | **Test suite** | **A-** | 3513 tests / 298 suites passing (vitest). 137 vitest suites + node:test in parallel. Determinism tests, lifecycle legacy tests, integration tests, CSS z-index gate, modal gate. Husky pre-commit `npx tsc --noEmit`. | Coverage is **broad and disciplined**. AAA+++ adds visual regression (Playwright/Percy/Chromatic) and load testing. | Playwright visual regression for the 8 hero screens. ~7 days. |
| 36 | **CI/CD** | **B+** | Baseline Regression + Desktop Release Guard green; AppImage + NSIS smoke + artifact upload; 4-job release matrix. v0.9.5 platform packaging audit closed 6/8 P1, 4/8 P2. | Missing: macOS support, code signing, auto-update, Steam integration. v0.9.5 audit §6 R7 flags these. | Per `2026-04-06-v095-platform-packaging-store-plan` — signing + macOS + auto-update is ~30 days + commercial certs. |
| 37 | **Build system** | **B+** | Vite, Electron, electron-builder. `npm run desktop:map:build` clean. Reproducible-build harness gated on P1-G3/G4 (which shipped). | Promotion needs reproducible-build proof + signed artifacts. | Per same plan. |
| 38 | **Architecture documentation** | **A+** | CANON.md hierarchy, Engine Invariants, Phase Specs, Systems Manual, Rulebook, Game Bible, ADRs, CODE_CANON, REPO_MAP, master files per system, and a traceable High Concept one-pager in `docs/50_launch/marketing/high_concept.md`. Better than most studios this size. | The core architecture/product framing gap is closed. Further promotion would require keeping public-facing launch collateral synchronized with current evidence as features move. | Keep the High Concept, claims inventory, store copy, and press kit refreshed before public release claims. |
| 39 | **Telemetry / observability** | **B-** | Anomaly detector lives; `data/derived/_debug/` for profile artifacts. Cost Ledger annotation. CI logs. Default-off local-first crash diagnostics now cover global `error` / `unhandledrejection` events, Settings export/clear/consent, and localized React error-boundary crashes with `uiSurface` zones. | No upload provider / Sentry-equivalent aggregation. No anonymized opt-in playtest telemetry stream. Post-launch triage is still manual export rather than live ops. | Add an opt-in upload adapter/provider, crash aggregation dashboard, and privacy-reviewed playtest telemetry events. ~10-14 days. |

### 2.5 Production / shipping

| # | System | Grade | What's true today | Gap to AAA+++ | What it takes |
|---|--------|------:|---|---|---|
| 40 | **Accessibility** | **B** | v0.9.3 a11y lane shipped semantic landmarks and tablist arrow keys. Commit `07163a48` closed the four v1.0 P0 blockers: clickable controls, WCAG AA contrast tokens, reduced-motion gates, and form labels. Batch 18 re-verified the static gate suite (33 tests) on current HEAD. | Browser/axe spot-check evidence and broader visual/assistive-technology QA remain useful before a release-candidate claim. | Keep static guards as the P0 gate of record; add browser/axe spot-check evidence during RC validation rather than rebuilding the closed lane. |
| 41 | **Localization** | **D+** | English remains the default, but the game is no longer English-only: a typed i18n substrate with English fallback exists, Settings has first-pass ASCII BCS copy, and the in-game Pause Menu now localizes common command actions. | Coverage is still narrow, unreviewed by native speakers, ASCII-only, and missing major surfaces such as Chronicle, Army HQ, Verdict, Decision Room, map overlays, event prose, launch copy, and terminology review. | Translation memory + broad UI extraction + native-speaker BCS review + release terminology pass. ~60 days first language; ~20 days per additional. |
| 42 | **Packaging / installer / clean-VM verification** | **B** | NSIS + AppImage smoke + dev-host approximation pass (2026-05-09). Clean-VM cosmetic items remain operator-only (SmartScreen UX, Settings→Apps, %APPDATA% persistence, uninstaller registry). | Signed installer, code-signing certs, macOS .dmg, auto-update channel. | Per v0.9.5 audit §6 R7 + commercial certs. ~14 days work + cert lead time. |
| 43 | **Store presence (Steam / GOG / itch)** | **F** | None. v0.9.1 store marketing folded into v0.9.5 and then absorbed; outreach is operator-owned. | At AAA+++, Steam page + store assets + trailer + Press Kit is part of launch. | ~30 days of marketing + asset production. **Operator-owned, not engineering.** |
| 44 | **Playtesting / community** | **C** | v0.9.2 package shipped (recruitment copy, feedback schema, runbook, tester quickstart, known-issues template, triage board, weekly digest, package manifest). Operator-owned outreach. | Closed-beta cohort + Discord / forum + bug-tracker public surface. | ~14 days infrastructure + ongoing operator work. |
| 45 | **Trailer / press kit / marketing collateral** | **F** | None observed. | AAA+++ needs: 1 announce trailer, 1 deep-dive dev video per major system, 8 press screenshots, faction reveal art set. | ~30 days video + asset production. **Operator-owned.** |

---

## 3. Aggregate score

### 3.1 Per-category averages

| Category | Systems | Average grade | Equivalent Paradox-tier |
|----------|--------:|--------------:|-------------------------|
| Simulation core | 15 | ~A- | Solid Paradox 1.x flagship system. |
| Frontend / shell | 12 | ~B+ | Above average wargame; below Paradox launch standard. |
| Content / lore | 6 | ~B+ | Strong text content, missing media. |
| Code / engineering | 6 | ~A- | **Above industry average.** Best-in-class for team size. |
| Production / shipping | 6 | ~C+ | The category dragging the overall down. |

### 3.2 Weighted overall

Weighting simulation/code at 35%, frontend at 25%, content at 20%, production at 20%:

`(0.35 × A-) + (0.25 × B+) + (0.20 × B+) + (0.20 × C+) ≈ **B+ overall**`

For **AAA+++ / Paradox-tier release**, every category needs to average **A** or better. AWWV needs **1.5–2 release cycles of disciplined polish** to clear that bar, with the work front-loaded into production/shipping and frontend visualization.

---

## 4. Top 10 leverage moves to reach AAA+++

**2026-05-16 Phase 0 update:** Leverage move #1 is now shipped for engineering scope. The remaining version of that move is no longer "make the player see the decision"; it is "deepen the consequences": author downstream arcs for P0 decision families and add Codex framing for why sensitive-history decisions are handled this way.

Ordered by **(impact / effort)**. These are the work items where one unit of investment produces the most movement toward AAA+++. They are mostly **product / presentation**, not simulation — because simulation is already close.

| # | Move | Lifts | Effort | Why it's the highest leverage |
|---|------|-------|------:|------------------------------|
| 1 | **Deepen sensitive-history consequence arcs (#12, #32)** — the paramilitary inbox truth drift is closed; remaining lift is downstream outcome depth and Codex framing | Sensitive-history credibility and replay depth | ~14d | The player can now see and resolve the war-crimes-adjacent paramilitary decision family. The next AAA+++ lift is making those choices echo through authored downstream arcs rather than stopping at surfacing. |
| 2 | **Map information-design pass (#17)** — contested bands, front stability, supply reach, authority/legitimacy/control as three layers | Tactical map now B+; next lift requires browser visual validation and friction/exhaustion presentation | Implemented 2026-05-16 | Track C C1-C4 closed by `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`; follow-on is validation/polish, not missing read-model substrate |
| 3 | **Soundscape commission (#33)** — 1 theme + 4–6 ambient + UI set + 3–5 stingers | Lifts shell category by half a grade across all subsystems | ~60d (composer) | Silence is the loudest tell that a wargame is not AAA. |
| 4 | **Onboarding + tutorial consolidation (#24)** | Lifts player-acquisition odds dramatically; cuts churn | Implemented 2026-05-16 | Track D closed the overlay stack, coachmarks, opening brief rewrite, and proof report. Remaining work is visual/playtest validation. |
| 5 | **GUI polish punch-list (this session's GUI_POLISH_MASTER.md)** — 36 items, ~7 person-days | Lifts every shell surface by visible chunk | ~7d | Highest velocity per day in the entire roadmap. Already scoped. |
| 6 | **Cinematic Verdict + Chronicle Chapter (#15, #31)** — endgame feels like CK3 dynasty close, not a stat dump | Lifts narrative + endgame; produces shareable moments | ~24d | Endgame moments drive word-of-mouth more than any other surface. |
| 7 | **Localization to BCS (#41)** | Lifts credibility ceiling; opens the actual market for the game | ~60d | The Bosnian War without Bosnian translation is a credibility cap. |
| 8 | **Diplomacy panel (#11)** | Lifts diplomacy from B- to B+; closes the biggest visible-system gap | ~10d | Per-event reactive → per-turn proactive flip. |
| 9 | **Accessibility RC spot-check (#40)** | P0 closed; release-candidate evidence polish | ~2d | Static P0 gates are closed, but browser/axe spot-check evidence is still useful before an RC claim. |
| 10 | **Officer character expansion (#10)** | Lifts personnel B+ → A-; player remembers commanders as people | ~7-10d | Mini-bios, trait chips, and Officer-of-the-Week are now live for available authored fields; broader historian-reviewed coverage/portraits are the remaining dramatic-density boost. |
| 11 | **High Concept one-pager + press kit (#38, #45)** | Required for review pipeline; current docs are dense | ~7d eng + 30d marketing | Reviewer / streamer onboarding currently impossible. |

**Estimated total of these 11:** ~265 person-days. With 1 dev + 1 composer + 1 translator + 1 artist + 1 PM in parallel, that's **~3 calendar months** of disciplined polish to take AWWV from B+ to credible A+ AAA+++ launch — **assuming #1 ships first as a 1-week unblocker**.

---

## 5. What is already AAA+++ (don't break these)

Genuine strengths to **protect and not over-engineer**:

- **Determinism discipline.** Few studios this size enforce it. Continue the "one change per calibration run" rule.
- **Historical fidelity / research depth.** ICTY anchoring, Cost Ledger, sensitive-history design gate. Best-in-class.
- **Documentation density.** CANON / Systems Manual / Phase Specs / Engine Invariants / per-system master files. Industry-grade.
- **Testing culture.** 3500 tests, 298 suites, husky pre-commit, Baseline Regression CI. Above average.
- **Self-aware audit chain.** This file is itself the 9th or 10th comprehensive audit in 4 months. Studios that audit themselves ship.
- **Pyrrhic team / skills system.** 60+ skills under `.claude/skills/` enforce role-based discipline. Force-multiplier infrastructure.
- **Sector / front-line truth.** A-tier post-2026-04 hardening. Stop touching it; let it stabilize.
- **Operations Singularity.** Canonical owner clear; lifecycle owned; reinforcement-bounded. Hard-won.

---

## 6. What is NOT covered in this rating

- **Live financial / business model assessment** — out of scope.
- **Multiplayer** — not in canon; AWWV is single-player deterministic. No grade applied.
- **Modding tools** — not in canon; deferred forever or to post-1.0.
- **Mobile / console** — not in scope.
- **VR / AR** — not in scope.

These are explicitly **out of the AAA+++ rating** because they are not the kind of game AWWV is trying to be. A grim-historical single-player wargame should not chase scope it does not need.

---

## 7. How to use this file

1. **Read the prior audits first** (§0) — they are still load-bearing. This file is the **most recent** snapshot, not the only one.
2. When a system is promoted (or demoted), update its row + the aggregate (§3) + the leverage list (§4). Don't rewrite — annotate.
3. When a grade changes, log the shift in `docs/PROJECT_LEDGER.md` so the history is preserved.
4. The leverage list (§4) is the **answer** to "what should we do next, in priority order, to reach AAA+++." Use it for sprint planning.
5. The "What is already AAA+++" list (§5) is the **don't-break** list. Use it as a regression-watch checklist.

---

## 8. Cross-references

- [GUI_MASTER.md](GUI_MASTER.md) · [GUI_POLISH_MASTER.md](GUI_POLISH_MASTER.md) · [WARROOM_MASTER.md](WARROOM_MASTER.md)
- [COMBAT_MASTER.md](COMBAT_MASTER.md) · [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md) · [SECTOR_MASTER.md](SECTOR_MASTER.md)
- [REAL_WAR_MASTER.md](REAL_WAR_MASTER.md) · [MUST_HOLD_MASTER.md](MUST_HOLD_MASTER.md) · [BOSNIAK_CROAT_CONFLICT_MASTER.md](BOSNIAK_CROAT_CONFLICT_MASTER.md)
- [MAP_GEOMETRY_MASTER.md](MAP_GEOMETRY_MASTER.md)
- [`../plans/MASTER_ROADMAP.md`](../plans/MASTER_ROADMAP.md) · [`../plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`](../plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md)
- All prior audits referenced in §0.

---

**End of rating pass — no code changes made. Recommended next step:** schedule the **GUI polish punch-list** (move #4, ~7 days) since it is the cheapest path to a half-grade lift across the whole shell category, and dispatch the **Map information-design pass** (move #1, ~30 days) in parallel since it gates the largest "Paradox feel" promotion.
