# AWWV Master Roadmap â€” Pyrrhic Games

**Last Updated:** 2026-05-04 (post trip session 3 nightshift — 8 lanes shipped on `5a94199b`)
**Current Version:** early v0.9.x development band (formal package semver still 0.8.1 until a deliberate milestone bump)
**Studio:** Pyrrhic Games
**Motto:** "Another such victory and we are undone."

---

## Supersedes

This document is the **single source of truth** for AWWV's development roadmap. The following files are superseded:

- `docs/plans/2026-03-22-v06x-master-roadmap.md` â€” v0.6.x detailed roadmap (Track A/B structure, nightshift execution model)
- `docs/30_planning/_legacy/ROADMAP_TO_1_0.md` â€” original v0.1-v1.0 roadmap with AI commander design and open design questions
- `docs/20_engineering/VERSIONING.md` â€” retains version scheme and protocol only; roadmap content now here

Individual dated roadmap plan files in `docs/plans/` remain active as implementation specs referenced from this roadmap.

---

## Version Scheme

```
MAJOR.MINOR.PATCH[-tag]
```

- **MAJOR** â€” Game era (0 = development, 1 = release/gold)
- **MINOR** â€” Milestone within the era
- **PATCH** â€” Individual builds within a milestone
- **tag** â€” Optional pre-release qualifier (`-alpha`, `-beta`, `-rc1`)

**1.0.0 = Gold.** Everything before is development. Everything after is live product. Calibration n-numbers are internal session IDs, not version numbers.

---

## Completed (v0.1-v0.7)

### v0.1.0 â€” Proof of Concept (2026-02)
Core simulation loop, turn pipeline, faction definitions, map rendering. Established that a deterministic Bosnian War simulation was feasible in TypeScript/Electron.

### v0.2.0 â€” Core Engine (2026-03-15)
War phase combat resolution, 3-tier bot AI (army/corps/brigade), corps sector system, operations with preparation/execution/AAR, named officers with succession, supply reserves, OOB with 247 brigades, headless scenario runner, calibration pipeline (40w/52w area-weighted comparison). 627 tests.

### v0.3.0 â€” Playable Alpha (2026-03-15)
Full war phase playable with player orders and operations. Complete turn cycle through endgame. Save/load functional. Basic victory/defeat conditions. All three factions selectable. Desktop app stable. Dayton negotiation system with UI and dimension merge.

### v0.4.x â€” Content Alpha (2026-03-18)
AI Commander infrastructure (14 modules, multi-model routing). Operation preparation 5-phase state machine. Officer succession with player-choice. Equipment pipeline (scavenging, capture, barracks events). Commander override layer (Phase A strategic criteria + Phase B army HQ overrides). Corps-level operations replacing per-sector. HRHB-RBiH war transition (alliance breakdown, mobilization, 6 events). Settlement timeline (12 event types). 1100+ tests.

### v0.5.x â€” Feature Complete Beta (2026-03-22)
Emergent event system (pressure-based triggers, 14 condition types, recurrence). Strategic dimensions (6 per faction, hybrid base_value + event_modifier). 19 events migrated for 1992, 3 ICTY-sourced foundational decisions. Presidential Toolbar with army crest. Army HQ 4-tab command center (Briefing/Summary/Records/Personnel). Chief of Staff briefing (personality-driven). Event decision IPC. Deck.gl settlement labels and formation counters. 93.1% area-weighted calibration (n1026). 1410 tests, 116 suites.

### v0.6.x â€” Political Wargame (2026-03-23)
Transformed AWWV from military simulation into political wargame. Calibration framework with automated regression and baseline freeze. 1993-1994 events (42 total), Game Chronicle, AI Commander + Events integration, HQ deep drill-down. 1995 endgame events (20), Dayton dimension merge, Chronicle Wrapped, Staff/Situation Map. 96 historical essays (500 words each, /historian-generated, 5-round QA certified + deep audit). All delivered across v0.6.1-v0.6.4.

### v0.7.0 â€” Dynamic Codex (2026-03-28, core complete)
Event flag wiring (25 flags), exhaustion overhaul, Codex QA (30 essay corrections across 3-pass QA). 7 FIXED-to-CONDITIONAL endgame chain. Pool decay system. Contact graph shared_segments enrichment (48 phantom adjacencies filtered). SpatialContext shared spatial layer. 712 OSIDs (32 micro-OSIDs merged). n1211 = 90.2% true baseline with enriched contact graph.

**v0.7 sub-milestones reslotted (2026-03-30):** The following items were open when v0.8 started. They have been moved to their logical homes rather than left as floating "can parallel" debt:

- v0.7.0.1 (13 missing 1992 essays) â†’ **v0.8.0.x parallel track** â€” pure content, no engine risk
- v0.7.1 essay template engine â†’ **v0.9.1** â€” still required for dynamic Codex divergence and ghost entries
- v0.7.1 Letter Home â†’ **IMPLEMENTED 2026-04-04 in v0.8.0.x** â€” no longer a future milestone driver
- v0.7.2 Warroom React migration â†’ **IMPLEMENTED 2026-04-16 in the pre-0.9 closure wave** â€” no longer a future milestone driver
- v0.7.2 Ops Modal UX Overhaul â†’ **v0.9.1** â€” UI refinement after ops authority is real
- v0.7.2 Ghost Map + Exhaustion Clock â†’ **IMPLEMENTED** â€” no longer future roadmap deliverables
- v0.7.3 (canon audit) â†’ **early v0.9.x repo-truth maintenance** â€” remaining doc/code sync is no longer a pre-0.9 blocker lane

---

## Active: v0.8 â€” Command Chain

**Theme:** The player commands through a hierarchy of AI personalities that can be delegated to or overridden. Corps commanders make emergent decisions based on zone posture, force balance, and personality. The gap between intent and execution is where the Bosnian War lived.

**Player role reminder (do not let future work drift):** The player is the faction president. The default loop is presidential: strategic guidance, reserve allocation, approval or denial of plans, and selective intervention through Army HQ and corps. Direct brigade-level control remains an exceptional override, not the baseline fantasy.

**Architecture:** `docs/plans/2026-03-25-command-chain-architecture.md`

**Sequencing principles (non-negotiable):**
1. Operations are the first command object that must become singular and authoritative. Do not accept split operation state as "good enough."
2. Commander maturity (belief state, competing options, decision traces) happens before political-bot and LLM expansion. Building political personality on top of a threshold machine produces sophisticated illusion, not real command.
3. Cleanup work is feature-enabling, not optional polish. Overlapping ownership directly blocks believable commander behavior, future political bots, and any LLM layer.
4. UI refinement follows backend authority. A richer ops panel does not prove the underlying operation object is coherent.

### Studio Health / Repo Truth (Permanent Side Lane)

This is not optional admin overhead. It is the studio discipline that keeps roadmap truth, board truth, report truth, and repo truth aligned as the command-chain stack grows.

- Every lane or milestone close must leave one coherent story across code, roadmap, architect board, report, and ledger.
- Build warnings, generated artifacts, and calibration claims must have explicit disposition or retention rules.
- Reports are evidence, not competing planning authorities.
- Chat-memory-only decisions are not durable decisions; they must be promoted into roadmap, architect board, ledger knowledge, or governed engineering docs.

Plan: `docs/plans/2026-04-06-studio-health-repo-truth-plan.md`

### v0.8.0 â€” Corps Commander Intelligence (ON MAIN)

PERCEIVE-DECIDE-EXECUTE per-corps loop. 10 files in `src/sim/combat/commander/` (~3,800 lines). Zone detection, garrison allocation (Grigsby two-pass), multi-turn planning, intel-reactive stance, force fitness scoring. Replaces `generateCorpsDirectives` behind `USE_COMMANDER_LOOP` flag. Concurrent corps operations (multi-slot). Serializer Map/Set support.

**Status (updated 2026-04-14):** n1570 = 93.5% area-weighted, 27/27 anchors, 6/6 benchmarks. Commander now reads faction war exhaustion. 0 invalid operations, 0 ZEA operations. Consistency validator PASS.

**Open P0:** ~~gradacac_2~~ â€” **RESOLVED**: anchor PASS in n1570 (RBiH â†' RBiH).

**Open P1s (updated 2026-04-14):** ~~vrs_east_bosnian zero-attack ops~~ (0 ZEA in n1568+), ~~estimateTurnsActive suspend counter~~ (not reproducible), HRHB patron directive scope (design-gated), ~~jajce turn_min~~ (fixed 40â†'28), ~~3 stale ssid refs~~ (safety net added, brigades legitimately assigned). **Remaining live:** HRHB patron directive scope (design-gated). Deferred: P5 NATO air, P6 breakthrough.

**Next steps (in order):**
1. HRHB patron directive scope â€” needs design decision on per-corps vs faction-wide ceiling
2. Exhaustion visibility in player-facing briefing surfaces
3. v0.9 planning

**Parallel content track (v0.8.0.x, no engine risk):**
- v0.7.0.1: Author 13 missing 1992 foundation essays (barracks seizures, Sarajevo siege, JNA withdrawal, Drina cleansing, etc.). Spec: `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md`. Assign to `/historian` + `/narrative-designer` â€” completely independent of engine work.

**Execution plan:** `docs/plans/2026-03-31-v080x-1992-foundation-essays-plan.md`
**Immediate engine-health lane:** Sector/frontline truth hardening, truthful reachability, and reporting alignment. Plan: `docs/plans/2026-04-03-v080x-sector-frontline-truth-plan.md`
- **COMPLETE 2026-04-04 (Waves 1â€“4).** All 6 plan phases landed. Phase 1.5 front-adjacency guard, assertBrigadeReachability actionable return, assigned_sub_segment_id cleared on demotion, adapter canonical-first sub-segment derivation, displacement trigger proxy-fork observable (console.warn), activity zero-fill, activity summary fidelity. 29 regression tests across 4 wave files lock all invariants. Lane: CLOSED.
- **Hardening campaign update 2026-04-09.** Subsequent bounded lanes on `main` closed the remaining false-owner seams around shared-front routing, assignment-validator alignment, operation readiness, military review shell ownership, operation roster foreign-sector truth, and strict non-elite cross-corps field-brigade ownership. Current next substrate lane: brigade drift / far-from-home truth, now that foreign-corps sector laundering is blocked and residual drift is visible honestly in scenario output.
- **Hardening campaign update 2026-04-09 (deployment truth).** `placement:fixed_home_osid` is now demoted to descriptive metadata in harness/anomaly surfaces. The old blended `brigade_far_from_home` warning is split into `brigade_far_from_home_redeployed` (live sector/loan owner) and `brigade_far_from_home_unassigned` (no live owner), and the same 40-week save hash in `n1400`/`n1401` proved the lane changed reporting truth without changing sim behavior. `n1409` then removed a final false HVO/RS dead-front warning by making `zero_combat_corps` respect canonical Graz cold-front truth for `hvo_tomislavgrad`, and `n1410` collapsed territorial false positives by making `undefended_painted_mismatch` / `adjacent_uncontested_territory` consume sector coverage truth before calling empty tiles undefended. Current board: no live invalid-operation seams remain; territorial residuals are now mostly genuine uncovered walk-ins. The next bounded anomaly-contract candidate is `brigade_stacking`, while Podrinje strandedness and the 444th Konjic salient remain redesign/doctrine rather than hardening.
- **Hardening campaign update 2026-04-12 (shared-front density truth).** The final-save sector geometry and live-owner checks now distinguish active front failures from paper-empty shared-front sectors. `frontline_density_imbalance` consumes physical same-corps sibling coverage before accusing low-density sectors, removing the false `sector:vrs_1st_krajina:4` Maglaj/Jablanica warning on `n1541`. Remaining density warnings are force-distribution/doctrine signals, not sector-contiguity or assignment-truth failures. Cold-front unstaffed sectors such as the Vares HRHB-RS pair remain Graz/truce-owned and should not be treated as active-front coverage bugs.
- **Hardening campaign update 2026-04-10 (player-truth shell pass).** The active UI/read-model hardening batch now also demotes player-facing operation force-ratio precision to one shared staff-balance abstraction. Normal operation shells no longer print exact decimal ratios or commander-threshold math; those exact numerics remain canonical in engine/read-model truth and stay visible only in explicit debug-only raw-intel surfaces. Current board after the shell pass: the next likely bounded candidate rotates back to Gorazde uncovered-edge content/runtime audit unless a stronger cross-domain truth seam emerges.
- **Hardening campaign update 2026-04-10 (reserve identity pass).** The reserve-system action boundary now honors canonical request identity end-to-end: approval, decline, and history all consume `ArmyReserveRequest.request_id`, and the desktop/read-model path no longer collapses approvals to `corps_id`. After this lane, the remaining top board is mostly Gorazde content/runtime audit, Podrinje redesign, and 444th realism unless another bounded cross-domain seam is proven.
- **Hardening campaign update 2026-04-10 (shell/bootstrap truth).** The 2026-04-10 branch batch tightened player-facing shell ownership without changing sim truth. Packaged startup now proves every local Electron main-process helper and the baked `apr_1992` startup snapshot through package-probe coverage, while UI shell/bootstrap surfaces now consume canonical player-faction resolvers instead of inventing `'RBiH'`, `'RS'`, or `factions[0]`. The later force-ratio/force-balance demotion lane has also landed, so the startup/shell board is no longer the active bounded candidate. Global residual board remains: Gorazde = content/runtime audit, Podrinje = redesign-blocked, 444th Konjic = doctrine realism.
- **Hardening campaign update 2026-04-09 (unresolved owner alignment).** `unassigned_frontline_brigades` now reads the final sim-owned `unresolved_sector_brigades` list instead of reconstructing an older heuristic. The same 40-week save hash in `n1401`/`n1402` proved the lane removed six HVO Central Bosnia false positives without hiding the real remaining ownerless drift (`rs_1st_podrinje`, `rs_5th_podrinje`). Current next substrate lane: Drina ownerless-drift / recall truth.
- **Hardening campaign update 2026-04-09 (battle ownership causality).** `attack_resolution_osid` now stamps canonical `operation_id` / `operation_name` onto raw battle records, and scenario combat-causality now prefers that owner over post-trim roster inference. The same 40-week final hash in `n1407`/`n1408` proved the lane removed the last false `operation_attack_orders_without_battles` invalidation without changing sim behavior. Current next substrate lane: stranded same-faction brigade lifecycle ownership (`rs_1st_podrinje`, `rs_5th_podrinje`).
- **Hardening campaign update 2026-04-10 (autonomy player-truth).** `AutonomyPanel` no longer hardcodes `RBiH` when filtering `pending_proposal_reviews`; it now consumes the live `player_faction` passed from `App.tsx`, so RS and HRHB campaigns can see their own pending autonomy work. This was a UI/player-truth lane only: targeted regressions plus `test:vitest`, `tsc`, `build`, and `recovery:check` all passed, and no scenario rerun was needed because the sim contract did not change.
- **Hardening campaign update 2026-04-10 (commander zone-label humanization).** Reserve and autonomy surfaces no longer leak raw internal ids like `zone:arbih_1st_corps:gorazde_2` into player-facing text. A shared downstream formatter now humanizes canonical zone ids for Army Reserve provenance copy and commander op-proposal descriptions while leaving the underlying sim-owned ids unchanged. This was also a UI/player-truth lane only: targeted regressions plus `test:vitest`, `tsc`, `build`, and `recovery:check` all passed without a scenario rerun because no sim contract changed. Current next bounded lane: global board reassessment after the UI truth batch, with Gorazde still content/runtime audit, Podrinje still redesign-blocked, and 444th still doctrine realism.
- **Hardening campaign update 2026-04-10 (desktop autonomy boundary truth).** The autonomy renderer fix is now backed by the desktop IPC contract: `get-autonomy-state` scopes `pending_proposal_reviews` to the active `player_faction`, and `accept-proposal` / `reject-proposal` reject cross-faction ids instead of trusting any matching proposal id. This was a desktop/read-model hardening lane only: targeted regressions plus `test:vitest`, `tsc`, `build`, and `recovery:check` all passed, and no scenario rerun was needed for lane proof because the sim contract did not change. Fresh board evidence from `n5` keeps final hash `bde31c0aab141f42` and leaves Gorazde as content/runtime audit, Podrinje as redesign-blocked, and 444th as doctrine realism. Current next bounded lane: packaged/runtime startup-snapshot truth, unless a tighter non-packaged substrate seam emerges in the next reassessment pass.
- **Hardening campaign update 2026-04-10 (desktop packaged startup contract).** The packaged desktop startup path is now explicitly owned and proved: `package.json` ships every local main-process `.cjs` helper that `electron-main.cjs` requires, `tests/desktop_packaging_contract.test.ts` proves that helper set from source, and the baked `apr_1992` startup artifact was refreshed to current canonical builder truth. This lane’s runtime proof is the packaged executable itself, not scenario output: `desktop:startup-snapshot:check` passed, `desktop:package:probe` now reaches a full success manifest, and the full bar (`test:vitest`, `tsc`, `build`, `recovery:check`) stayed green. The startup-snapshot interference residue is now closed: `desktop_startup_snapshot_guardrails.test.ts` uses a temp override path instead of mutating the committed artifact in place, and checkout line endings are normalized before comparison. Current next bounded candidates should come from live player-knowledge, harness, or command-shell evidence rather than the exhausted startup board.
- **Hardening campaign update 2026-04-10 (front sector player visibility).** Front-edge interaction payloads no longer route enemy `sector_id` values into player shells. `buildFrontEdgesHoverGeoJSON(...)` now strips enemy `sector_id` / `corps_id` in player mode, and both `MapContainer.tsx` and `CorpsFrontPanel.tsx` revalidate sector selection through `findPlayerFacingSectorById(...)` before opening a sector shell. This was a UI/player-truth lane only: targeted visibility regressions plus `recovery:check`, `test:vitest`, `tsc`, and `build` all passed, and no scenario rerun was needed because sim truth did not change. Current next bounded lane: demote player-facing operation force-ratio precision to staff abstractions, with Gorazde still content/runtime audit, Podrinje still redesign-blocked, and 444th still doctrine realism.
- **Hardening campaign update 2026-04-11 (final sector geometry + Foča border truth).** The next map seam was no longer just renderer ownership. `corps_front_sectors.ts` could still serialize post-merge sectors above the hard edge cap, and the operational contact graph could miss real shared borders when adjacent polygons differed only by floating-point precision. The hardened rule now has two owners: late sector splits must re-run per-faction territory Voronoi before final sealing so split sectors remain one truthful line with owned rear/depth space, and shared-border derivation must use epsilon-based segment matching so true Foča borders survive derivation. Fresh 40-week proof on `n1427` passed consistency validation with `0` unresolved brigades, `0` over-cap sectors, and a real `op:foca:donje_zesce__op:foca:mazlina` front edge in the final save. Current follow-up: live Electron confirmation for any remaining white-line visual breaks, then sort leftovers into renderer stitching vs genuine content/runtime fronts.
- **Hardening campaign update 2026-04-11 (Podrinje / Sarajevo / Posavina story recovery).** The three live story-breakers proved to have different owners, so they were closed as one coordinated but non-monolithic lane. Podrinje required recruitment identity preservation for already-existing OOB brigades plus per-axis readiness truth for multi-axis operations; Sarajevo required `sarajevo_state` to follow the besieged RBiH city-core pocket instead of whole-city majority supply; Posavina required the same per-axis readiness fix plus a live Koridor contract and validated `must_hold_osids_by_corps` anchors. Fresh 40-week proof on `n1437` (`e146406ca031ebf2`) shows `rs_1st_podrinje` back on the Drina front, `sarajevo_state.siege_status = BESIEGED`, and an RS-controlled path from Banja Luka to Modrica through Doboj/Derventa. This lane's older follow-up board is now retired: the later southeast-Herzegovina unresolved-frontline residue no longer reproduces (`unresolved_sector_brigades = 0` and anomaly alignment holds), `op:brcko:brka_2` is back under the current hard anchor suite, and the Foča/Kalinovik front-edge ownership regressions were closed by dedicated real-save ownership/display proofs. The remaining follow-up from that cluster is renderer-side white-line/Electron visual confirmation, which is presentation polish rather than frontline truth.
**Presidential Command / Friction / Review (v0.8.0.x UX lane):**
- Command authority system: CA resource, force-launch costs, recovery mechanics, CA recovery penalty from friction/intervention
- Command friction waves 1-5: strain visibility â†’ friction resolution â†’ stabilization action â†’ standing indicator â†’ CA recovery consequence
- Order interpretation preview loop: pre-launch context (deriveOrderInterpretation), stance-change preview (deriveStanceInterpretation), operation outcome category (ordinary/reluctant/direct intervention)
- Command review consolidation: outcome badge on live + history ops, trend summary with three-tier display
- Player knowledge integrity: adapter wave (omniscient leak removal), intel fog (uncertainty-qualified language, bucketed confidence)
- Presidential between-ops events: Strategic Posture Review, Visit to the Front (3 factions, JSON content)
- Command chain truth: sector frontline hardening (4 waves, 29 regression tests, canonical sub-segment derivation)
- Warroom React migration: 4 waves + final canvas deletion (483 lines removed). `src/ui/map/components/warroom/` sole owner.
- Runtime asset canonicalization: webp migration, 11 dead PNG twins deleted.
- **Status: COMPLETE 2026-04-04.** All shipped as v0.8.0.x UX/truth work.

- **Presidential decision events (Phase C):** 3 recurring event types (Strategic Posture Review, Visit to the Front, Humanitarian Crisis Response) â€” pure JSON content, zero engine changes. Fills 29-turn and 20-turn decision gaps in 1993-1994. Design: `docs/40_reports/implemented/20260403_PRESIDENTIAL_DECISIONS_BETWEEN_OPS.md`. Assign to `/narrative-designer` + `/game-designer`.

### v0.8.1 â€” Commander Maturity â€” CLOSED 2026-04-05

**Status:** All 6 maturity conditions met. 6 phases shipped. tsc clean, 2484/2484 vitest. `package.json` â†’ v0.8.1. Report: `docs/40_reports/implemented/20260405_V081_PHASE6_TRACE_QA.md`.

**Theme:** Make the commander think structurally before adding personality. No LLM flavor, no political theater â€” real deterministic reasoning depth.

**Why this milestone exists before political-bot work:** If authority is still split and the commander is still a threshold machine, adding political personality, refusal logic, or LLM flavor builds better-organized illusion rather than better command. This milestone makes the commander genuinely mind-like first.

**Army-command note:** Army commanders are not getting a separate named maturity milestone inside early `v0.8.x`. During `v0.8.0` through `v0.8.2`, the existing army layer remains serviceable while corps command is made real first. Any further army-commander maturity work now belongs in ordinary early-`v0.9.x` development after the closed pre-0.9 authority/simplification band, before any full corps/army LLM play.

Completed maturity conditions:
- belief state exists separately from raw world state â€” Phase 2
- candidate intents compete against each other â€” Phase 3
- memory from prior turns affects future scoring â€” Phase 4
- constraints and preferences are structurally distinct from execution mechanics â€” Phase 5
- reasoning traces exist (for debugging + later UI surface) â€” Phase 3 + 5 + 6
- relationship model exists: commanders track trust/familiarity with the player, sibling corps, and patrons â€” Phase 1 + 5

Primary targets: `src/sim/combat/commander/assess.ts`, `src/sim/combat/commander/allocate.ts`, `src/sim/combat/commander/plan.ts`, `src/sim/combat/commander/decide.ts`, `src/sim/combat/commander/briefing.ts`, `src/sim/combat/commander/emit.ts`

Plans: `docs/plans/2026-03-25-command-chain-architecture.md`, `docs/plans/2026-03-31-v081-commander-maturity-plan.md`, `docs/plans/2026-03-31-v081-intelligence-assurance-harness-plan.md`

### v0.8.2 â€” Political Leader Bot + Patron Phone Call

**Gate:** Requires v0.8.1 Commander Maturity to be complete. Political behavior built on a stable military command truth.

Political leader bot for non-player factions: event responses, alliance posture, war crimes policy, patron interaction. Replaces flat `pickBotResponseV1` with faction-specific political personality (Karadzic=expansionist-nationalist, Izetbegovic=survival-internationalist, Boban=opportunist-patron-dependent). Dual-track evaluator blending military situation and strategic dimensions.

**Patron Phone Call:** 8-12 dramatic patron pressure events with ICTY-sourced dialogue and player decisions. Milosevic calling Karadzic about the corridor. Tudjman ordering Boban to ceasefire. Holbrooke pressuring Izetbegovic. Events use existing event system with enhanced presentation (full-screen modal, dialogue, urgency timer).

**Presidential presence hooks (lightweight, not a travel simulator):** This milestone is also the natural home for small, high-impact presidential decision rituals between operations, such as a "visit to the front" event/card. These should be implemented as event-driven political/military choices that temporarily change morale, urgency, commander compliance, and visibility at a selected corps/sector â€” not as a separate movement or map-mode subsystem. Note: lightweight versions of Visit to the Front and Strategic Posture Review ship earlier as v0.8.0.x JSON content (see parallel content track above). This milestone adds bot personality depth to Patron Pressure Response and Commander Confidence Crisis event types. Design: `docs/40_reports/implemented/20260403_PRESIDENTIAL_DECISIONS_BETWEEN_OPS.md`.

Plans: `docs/plans/2026-03-24-v080-political-leader-bot-plan.md`, `docs/plans/2026-03-25-command-chain-architecture.md` section 1 and 3.

**Estimated scope:** ~1,660 new lines, ~105 new tests, 7 phases.

**Phase status (2026-04-06):**
- Phase 1 â€” Political Personality Framework: CLOSED 2026-04-05. Report: `docs/40_reports/implemented/20260405_V082_PHASE1_POLITICAL_PERSONALITY.md`
- Phase 2 â€” Political Event Decision Engine: CLOSED 2026-04-05. Report: `docs/40_reports/implemented/20260405_V082_PHASE2_POLITICAL_EVENT_DECISION.md`
- Phase 3 â€” Peace Plan & Negotiation Intelligence: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V082_PHASE3_PEACE_PLAN_INTELLIGENCE.md`
- Phase 4 â€” Patron Phone Calls & Territory Trend: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V082_PHASE4_PATRON_PHONE_CALLS.md`
- Phase 5 â€” Holbrooke Pressure, RBiH Tactical Acceptance, RS Floor Calibration: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V082_PHASE5_HOLBROOKE_TACTICAL_ACCEPTANCE.md`
- Phase 6 â€” Per-Plan Threshold Specialization and Contact Group Branches: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V082_PHASE6_PER_PLAN_FLOORS.md`
- Phase 7 â€” Dayton Plan & CG RBiH Bonus: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V082_PHASE7_DAYTON_BRANCHES.md`

**Status: v0.8.2 CLOSED 2026-04-06 â€” all 7 phases complete. Total: 23 new tests (phase7), tsc clean, 2684/2684 vitest.**

### v0.8.3 â€” Order Interpretation + Warlord Problem

**Gate:** Requires v0.8.2. Corps and army systems must be explicit enough that order interpretation is not hiding ownership confusion. The player must have a minimum viable command review surface for preview / understand / accept / override before â€œdisobedienceâ€ is treated as a feature rather than backend ambiguity.

Order interpretation system: when the player issues a corps stance change, launches an operation, or force-launches an attack, the order passes through the assigned corps commander's personality filter. The commander may comply, creatively interpret, delay, or refuse. Political capital resource for overriding refusals.

**The Warlord Problem** as sub-feature: early-war militia commanders (low political_reliability) who refuse subordination. Political capital to integrate. Connects existing `warlord_friction.ts` stochastic triggers to the deterministic override pathway.

**Minimum viable command review surface owned here:** before finalizing this milestone, the player can inspect what order was issued, how the corps/army chain interpreted it, what was accepted or modified, why friction occurred, and what override cost is being proposed. This is the minimum truthful UX layer for command friction.

**Partial advance (2026-04-04):** Command review surfaces, friction visibility, order interpretation preview, and outcome categorization now landed as v0.8.0.x UX work. v0.8.3 still owns the full order interpretation *system* (commander personality filter, delay/refusal logic, political capital for overrides) but the minimum viable review UX is no longer a v0.8.3 blocker.

Plans: `docs/plans/2026-03-24-v081-order-interpretation-plan.md`, `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md`, `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md`, `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`, architecture section 2.

**Phase status (2026-04-06):**
- Phase 1 â€” Order Interpretation Engine (Stance): CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V083_PHASE1_ORDER_INTERPRETATION.md`
- Phase 2 â€” IPC Wiring and Operation Interpretation: CLOSED 2026-04-06. Commit: bc88eed3. Report: `docs/40_reports/implemented/20260406_V083_PHASE2_IPC_OPERATION_INTERPRETATION.md`
- Phase 3 â€” Reliability Modifier, Decay Pipeline, Warlord Supersession: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V083_PHASE3_RELIABILITY_DECAY.md`
- Phase 4 â€” Order Interpretation UI Panels: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V083_PHASE4_ORDER_INTERPRETATION_UI.md`
- Phase 5 â€” Interpretation UX Completion: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V083_PHASE5_INTERPRETATION_UX.md`

**Status: v0.8.3 CLOSED 2026-04-06 â€” all 5 phases complete. Order interpretation is now live in engine and legible in UI.**

### v0.8.4 â€” Autonomy Depth + Claude API at Political Level

**Gate:** Requires v0.8.3 âœ“

**Phase status (2026-04-06):**
- Phase 1 â€” Autonomy State and Review Foundation: CLOSED 2026-04-06. Report: `docs/40_reports/implemented/20260406_V084_PHASE1_AUTONOMY_STATE_FOUNDATION.md`
- Phase B â€” IPC Wiring, Review Surface, and Fallback Discipline: CLOSED 2026-04-06. Delivered: `autonomy_overrides.ts` (pure deterministic helpers), `PendingProposalReview` schema on `StateMeta`, Level 3 `requires_player_response` gate, 3 IPC handlers (`get-autonomy-state`, `set-autonomy-level`, `override-ai-decision`), 3 preload bridge entries, Level 2+ feature gate. Report: `docs/40_reports/implemented/20260406_V084_PHASEB_IPC_REVIEW_SURFACE.md`
- Phase C â€” Level 1 Proposals, Review UI, and Level 2+ Unlock: CLOSED 2026-04-06. Delivered: `generateLevel1StanceProposals()` in `proposal_generation.ts` (new), `ai_recommended_stance` on `CorpsCommandState`, `accept-proposal`/`reject-proposal` IPC handlers, `AutonomyPanel.tsx` (new React component â€” slider 0â€“3 + per-proposal accept/reject cards), Level 2+ feature gate removed, war phase step count 151â†’153. 32 new tests, 2813/2813 vitest. Report: `docs/40_reports/implemented/20260406_V084_PHASEC_LEVEL1_PROPOSALS.md`

- Phase D â€” Op Proposals, High-Stakes Event Gate, Roadmap Truth: CLOSED 2026-04-06. `generateLevel1OpProposals()` in `proposal_generation.ts` (domain `'ops'`, `APPROVE_OP:<corpsId>:<planId>` action). Plan-launch guard in `applyCommanderOutput` (Level 1: no response â†’ hold at ready, rejected â†’ abandon). `player_op_response` field on `CorpsCommandState`, cleared by `apply-autonomy-transition`. `APPROVE_OP:` branches in accept/reject IPC. Step 154 `generate-level1-op-proposals`. `nato_ultimatum_sarajevo_1994` upgraded with `requires_player_response:true` + `response_options`. Turn-advance block for `pending_event_decisions` confirmed absent (Phase E). 33 new tests, 2846/2846 vitest. Report: `docs/40_reports/implemented/20260406_V084_PHASED_OPPROPOSALS_HIGHSTAKES.md`

- Phase E â€” Turn-Advance Block, Ops Card UI, Description Enrichment: CLOSED 2026-04-06. Turn-advance block in `advance-turn` IPC (`electron-main.cjs` lines 617â€“632): blocks when `pending_event_decisions` contains any entry with `requires_player_response:true` unresolved; `requires_player_response?` added to `PendingEventDecision` in `event_types.ts`; stamped at push time in `evaluate_events.ts`. `AutonomyPanel.tsx` extended: `'ops'` domain union, `APPROVE_OP:` card parsing, "Op Order" header, "OP ORDER" badge, "Authorize"/"Abort" buttons. `buildOpProposalDescription()` in `proposal_generation.ts`: zone name from `staging_zone`, force count from `assigned_brigades.length`, threat label from `overall_pressure`, fallback to corps name. 31 new tests in `autonomy_phase_e_block.test.ts` + `autonomy_phase_e_enrichment.test.ts`, 2877/2877 vitest (198 files). tsc clean, build clean. **v0.8.4 Phases Aâ€“E CLOSED.**

- Phase F â€” Warlord Guard, DRINA Investigation, and v0.8.x Final Repo-Truth Pass: CLOSED 2026-04-07. Enclave-lock guard added to `checkWarlordFriction` (`warlord_friction.ts`): `refused_release` suppressed when `enclave_lock` active, 4 tests. DRINA investigation complete (n1358, 93.6%, 27/27 anchors, hash `0ba9f29f00f9d423`): root cause proven (absent ARBiH Podrinje defensive ops); fixes applied â€” Op Drina bratunac_vlasenica axis trimmed (cerska_2/pobudje_2 removed, ~10 months premature), 4 initial controllers corrected RSâ†’RBiH (jezestica_2/donje_zesce/obadi/sebiocina), 2 painted targets corrected RSâ†’RBiH (radovcici/sulice_2); remaining 11 DRINA mismatches accepted with evidence (all 5 formal DRINA anchors PASS). Repo-truth surfaces corrected. Reports: `docs/40_reports/implemented/20260406_V084_PHASEF_WARLORD_GUARD_REPO_TRUTH.md`, `docs/40_reports/implemented/20260407_DRINA_CALIBRATION_INVESTIGATION.md`.

LLM integration sits on top of cleaned command ownership, not underneath it. Replay/log determinism, decision auditability, fallback behavior, and player review surfaces must be explicit before any API-assisted autonomy is treated as roadmap-ready.

Player political posture IPC (set war-crimes-policy, set alliance-posture, set political priorities). Optional LLM-assisted political leader decisions extending existing AI Commander architecture. Personality drift: leader personality changes based on war outcome.

**Determinism and review requirement:** every API-assisted action must be reviewable as a structured decision with deterministic replay semantics, fallback behavior if the API is unavailable, and a player-facing surface for understanding or rejecting the result.

Plans: `docs/plans/2026-03-24-v082-autonomy-api-plan.md`, `docs/plans/2026-03-31-v084-autonomy-determinism-and-review-plan.md`, `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`.

**Status: v0.8.4 CLOSED 2026-04-07 â€” all phases complete (1, B, C, D, E, F). DRINA investigation resolved with evidence; remaining variance accepted. Next: v0.8.x-final command authority cleanup or v0.9 per roadmap.**

## Active Side Lanes (Non-Milestone)

These lanes matter to product truth or engine health, but they are not the current milestone driver. Keep them visible so they do not vanish into chat memory.

- ~~**Operation execution-quality follow-up**~~ â€” **RESOLVED 2026-04-14:** n1570 shows 0 invalid operations, 0 ZEA operations. The `n1397` issues are no longer reproducible on current mainline.
- ~~**Harness assignment-completeness validator drift**~~ â€” **RESOLVED 2026-04-14:** `validate_run_consistency.cjs` passes completely clean on n1570 (RESULT: PASS, 0 failures across all checks). Validator now aligned with sim doctrine.
- ~~**Desktop New Game Start Snapshot**~~ — **RESOLVED 2026-04-16:** desktop `startNewCampaign(...)` and the Warroom/browser fallback now use the baked `apr_1992` startup snapshot as the primary start-state source; the old mock-state path survives only as an emergency browser/dev fallback if the baked artifact is unavailable.
- ~~**Warroom React Shell Recovery / Feature Parity**~~ — **RESOLVED 2026-04-16 as a pre-0.9 truth lane:** the remaining host-side ambiguity is closed, loaded-game Warroom entry now stays on the React shell path, and the shell/test ownership story is consistent. Remaining work is no longer a blocking recovery lane; it is ordinary parity/polish backlog (modal behavior, shell cohesion, interactive room/map affordance).

### v0.8.x-final â€” Command Authority Cleanup + Old Code Removal

**What this milestone is about:** Making ownership singular. This is where the repo stops lying to itself about who is in charge.

**Primary gate inside this milestone: Operations Singularity.** Treat this as the first real proof that command authority is becoming honest. It is not background cleanup. It is the prerequisite object-level cleanup that later commander maturity and ops UX work depend on.

**Gate requirement â€” every cleanup task must answer all five before it is considered done:**
1. What is the canonical owner after this change?
2. What competing path is being removed or demoted?
3. What test or observable behavior proves the change is real?
4. What UI or report surface now reflects the new truth?
5. What future milestone does this unblock?

If the implementer cannot answer all five, the task is not ready to start.

**Operations are the proof of concept.** Before this milestone closes, operations must answer yes to all of:
1. Is there one canonical operation object?
2. Is there one canonical lifecycle?
3. Is there one canonical creation / launch / update path?
4. Does the UI reflect that same truth?

**Implementation plan:** `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`
**Launch-model subplan:** `docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md`
**Overarching cleanup plan:** `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md`

**Cleanup targets:**

- Remove `generateCorpsDirectives`, make `USE_COMMANDER_LOOP` permanent
- Clean up hardcoded rails cataloged in `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`: doctrine phase constants that override commander judgment, corps name-checks, blitz phase exemptions
- Operations ownership: one canonical operation object with one lifecycle âœ… (2026-04-01 â€” `sector_offensive.ts` owns all op-type lifecycle; `corps_operation_helpers.ts` owns creation factories; `bot_corps_operations.ts` demoted to permitted activation entry points only; `OperationView` + `GameStateAdapter` declared canonical UI path; `AuthorizePhase.tsx` commander identity fixed)
- Operation launch contract: sector-anchored, corps-authorized, reinforcement-bounded â€” NOT YET IMPLEMENTED. Plan: `docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md` (needs amendment before execution â€” sector_id naming, writer inventory, attachment thresholds, calibration gate)
- Player knowledge integrity: renderer must stop receiving omniscient "full state plus fog" truth. Plan: `docs/plans/2026-04-01-v08x-player-knowledge-integrity-plan.md`. **Wave 2 landed (2026-04-04):** RawIntelTab removed, threat assessment uses uncertainty-qualified language + bucketed confidence. Remaining: own-sector force-balance precision in CorpsFrontPanel.
- Studio governance contracts for product truth: `docs/20_engineering/PLAYER_VISIBLE_STATE.md`, `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`, `docs/20_engineering/DEBUG_SURFACE_POLICY.md`, `docs/20_engineering/FEATURE_DONE_MEANS.md` â€” **All four docs landed and actively enforced (2026-04-03).**
- Command authority / delegation substrate: **Complete.** CA resource with force-launch costs, friction visibility, stabilization action, strain-gated stance, CA recovery penalty. Full delegation visibility and order interpretation shipped (v0.8.3 CLOSED 2026-04-06).
- Movement ownership: reduce movement writers from ~7 competing sources to one intent owner + small execution stack
- Boundary comments in all hotspot files naming what is canonical vs transitional

Done means: `generateCorpsDirectives` is deleted âœ… (2026-04-01). `apply_brigade_reposition.ts` is **NOT dead ballast** â€” it is live player infrastructure wired at `war_phases.ts:1147`; roadmap label was wrong, do not delete. Every hotspot file has an ownership comment at its top.

**Status: COMPLETE 2026-04-07.** Phases 2â€“5 complete. 28 files annotated with T1-T6 movement authority tiers and canonical/transitional ownership blocks. `docs/20_engineering/MOVEMENT_AUTHORITY.md` created. RS blitz data-driven (`probe_exempt`). `RS_BLITZ_PHASE_END_WEEK` deleted. Comms override scenario-driven. 3 new test suites (15 tests). 6 UI surfaces clean. tsc/vitest/build clean. Calibration: n1359 27/27 anchors held. Follow-up items once deferred into the transition band were later closed through the 2026-04-15/16 simplification and explanation-surface packets. Report: `docs/40_reports/implemented/20260407_V08X_FINAL_COMMAND_AUTHORITY_CLEANUP.md`.

---

## Closed Transition: v0.8-to-v0.9 â€” Repo-Wide Simplification + Studio Health / Repo Truth

No version bump by itself â€” this was the engineering closure band between feature milestones. Its blocker-grade work is now closed; remaining open work has been promoted into ordinary v0.9.x milestone lanes.

**Gate requirement â€” same 5-question rule as v0.8.x-final applies to every task here:** canonical owner after change / old path removed or demoted / done-means proof / UI or doc surface that reflects the new truth / future milestone unblocked.

**Repo-truth governance inside this band is mandatory, not trailing cleanup:**

- roadmap, architect board, and reports must agree on what is live, what is partial, and what is accepted debt
- every recurring build warning must be classified as fix now / accepted debt until milestone / tool noise
- generated artifacts must be explicitly retained or explicitly disposable
- calibration claims are not accepted without a recoverable evidence trail
- stale "next lane" language must be removed when repo evidence changes

**A+++ system promotion scorecard (2026-04-10):**

- The now-closed `v0.8-to-v0.9` hardening work was governed by a cross-system promotion scorecard rather than freeform “keep hardening” chat memory.
- Canonical plan: `docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`
- Use the scorecard to choose the next bounded lane by asking:
  - which major system is below its target grade
  - what exact work would promote it one rung
  - whether that work is bounded hardening, content/runtime audit, realism, or redesign
- The scorecard is now explicitly normalized against the external Pyrrhic full-system review:
  - already-landed fixes like probe no-flip are treated as closed, not re-added as fake queue items
  - historically useful but stale metrics like old ZEA rates must be re-benchmarked on current `main` before reuse
  - structural concerns that remain true, especially god files, are promoted into their own bounded maintainability track
- Promotion queue used during the band:
  1. god-file decomposition tranche 1
  2. exhaustion activation / negative-sum identity audit
  3. save/load + replay + adapter integrity
  4. political / peace / review ownership and proof
  5. autonomy replay / fallback / queue truth
  6. residual harness audits where runtime truth may still be misclassified
  7. planner/doctrine realism only after the remaining owner-truth lanes are exhausted
  8. thin player-experience layer after the identity and core-truth P0s
- Active roadmap call on 2026-04-13: start with maintainability tranche 1, because the engine is now strong enough that oversized merge-magnet files are the main drag on safe hardening velocity. Exhaustion/identity remained the next substantive product-truth audit immediately after that tranche.
- **Closure update 2026-04-16:** the transition-band queue has been substantively exhausted. God-file decomposition landed, commander-explanation surfaces were tightened, shell/ownership and event-decision execution splits were closed, save/load truth now has direct round-trip + continue-from-save proof, the test suite now runs entirely through Vitest discovery with zero `node:test` entrypoints, and CI/package guardrails were normalized for cross-platform truth. Honest residuals from this band are now promoted into v0.9.x milestone lanes instead of kept as fake pre-0.9 blockers: replay playback/consumer, broader consequence authoring and victory closure, dynamic essay authoring/comparison polish, tutorial/onboarding, and later performance/visual work.
- Explicit redesign gates from the scorecard:
  - stranded same-faction unreachable brigade lifecycle owner
  - any deeper packet/detail contract that the current canonical request or operation packet does not already own

**Hit list** (from Railroad Hunter Report):

| Area | Current State | Target |
|------|--------------|--------|
| Movement systems | 6 competing systems (column march, regular, interior, sector march, strategic reserve, pocket evacuation) | 1-2 unified systems with commander-owned priority |
| Pathfinding | 3 separate engines (settlement BFS, OSID Dijkstra, graph BFS), no shared cache | 1 engine with caching, unified tie-breaking |
| String hardcoding | Postures, classifications, faction IDs as string literals | TypeScript enums throughout |
| Dead branches | ZoC/AoR era code, old bot_corps_directives paths | Removed |
| Test suite unification | **Audited 2026-04-14, corrected and advanced repeatedly on 2026-04-15, and closed hard on 2026-04-16.** The desktop contract/startup/packaging guardrails moved out of `node:test` into the canonical Vitest lane; Vitest discovery now splits into explicit `fast` vs `scenario` slices driven by real runner calls and only classifies `*.test.ts` entrypoints; the oversized `command_authority.test.ts` suite has been decomposed into domain files without losing proof coverage; a long band of pure engine, serializer/GameState, pipeline/state, Phase D combat, early-war, emergence, front-posture, displacement, treaty/victory, bot-management, supply, treaty-helper, formation, recruitment/militia, institutional, officer, political/helper, UI-map-boundary, combat-support, scenario-startup, scenario-reporting, migration, operation-anomaly, sector/movement, narrative, fatigue/siege, JNA phantom, knowledge-helper, decoration, enclave-integrity, bounded prereq, campaign-unlock, bootstrap/data-init, deterministic scan, OOB loader, phase5-check, in-memory scenario-summary, and ordinary scenario-run calibration/diagnostic contracts now run in Vitest; the week-1 recruited-formation `equipment_state` / `doctrine_state` gap exposed by `systems_2_3_4_7_9_10_acceptance_gates.test.ts` was fixed at the recruitment owner seam; and the final residue (`audit_state_of_game_determinism`, `scenario_golden_baselines_h2_3`, `scenario_harness_smoke_h1_4`, `sector_drina_frontline_integrity`) also moved onto explicit Vitest fast/scenario lanes with time-budgeted proof. Discovery now reports **zero `node:test` entrypoints**. | Keep the fast/scenario Vitest split honest through the discovery contract, and resist reintroducing a second runner unless a future test proves a real toolchain need instead of simple historical inertia. Audit: `docs/40_reports/implemented/20260414_TEST_SUITE_AUDIT.md` |
| Execution entrypoints | `src/turn/pipeline.ts` + `src/sim/run_combat_browser.ts` are live variants adding cognitive overhead alongside canonical `src/sim/turn_pipeline.ts` | Consolidate or explicitly mark non-authoritative with ownership comment |
| Magic numbers | bot_constants.ts scattered thresholds | Domain-grouped constant files |
| Canon docs | Systems Manual and Game Bible reference pre-v0.8 architecture | Updated for v0.8 command chain |
| Save/load + replay hardening | **Grade A for current save/load truth (2026-04-15).** Real-save round-trip byte-identity proven, adapter-after-deserialize contract proven, desktop/manual load truth hardened, and continue-from-save final-save/hash equivalence is now directly proven through the scenario harness. Replay playback/consumer work is still absent, but that is now a future lane rather than a current save/load truth gap. | Keep replay playback/consumer work as a future lane. Plan: `docs/plans/2026-03-31-v08to09-save-load-and-replay-hardening-plan.md` |
| UI surface ownership | Army HQ, Warroom, map panels, ops modal, and future command-review surfaces can drift into duplicate half-owners. **Warroom React migration complete (2026-04-04); Army HQ command-review ownership clarified.** | One clear ownership matrix for command, ops, review, and explanation surfaces. Plan: `docs/plans/2026-03-31-v08to09-ui-surface-ownership-plan.md` |
| UI density + shell cohesion | **Pre-0.9 shell-boundary work is closed.** Tactical navigation now routes through shared shell helpers and Warroom-local overlays no longer masquerade as shared handoffs. Residual spacing/density polish is a later UI refinement task, not a repo-truth blocker. | Keep shell boundaries explicit and treat any broader density sweep as v0.9.4 polish, not transition-band debt. Plan: `docs/plans/2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md` |
| Player knowledge integrity | Desktop / tactical map still trends toward omniscient renderer payloads plus fog visuals | Player-facing state boundary, leak classifications, display-name discipline, and desktop knowledge integrity contract. Primary plan: `docs/plans/2026-04-01-v08x-player-knowledge-integrity-plan.md` |
| Studio Health / Repo Truth governance | **Contracts landed; operating lane now explicit.** Cross-cutting product rules live in repo docs, but recurring sync, warning disposition, artifact policy, and evidence retention must stay active as a permanent lane. | `PLAYER_VISIBLE_STATE.md`, `UI_OWNERSHIP_MATRIX.md`, `DEBUG_SURFACE_POLICY.md`, `FEATURE_DONE_MEANS.md`, and `docs/plans/2026-04-06-studio-health-repo-truth-plan.md` |
| Product architecture simplification | **Pre-0.9 closure achieved.** Canonical war/peace entrypoints are named consistently, non-authoritative variants are explicitly demoted, and adapter/read-model seams were reduced or documented honestly. | Keep remaining simplification work bounded and local; do not reopen this as a general blocker band. Plan: `docs/plans/2026-04-03-v08to09-product-architecture-simplification-plan.md` |
| Army-command maturity | **Serviceable and no longer a pre-0.9 blocker.** Remaining maturation is product-depth work inside v0.9.x, not repo-truth debt. | Revisit only when a concrete army-level behavior or player-facing contract needs expansion. Plan: `docs/plans/2026-03-31-v08to09-army-command-maturity-plan.md` |
| Army â†” corps command coherence | **Named enough for the current product.** Event-review routing, Army HQ ownership, and command/execution splits are now explicit. Remaining army/corps sophistication is future design depth, not a transition-band blocker. | Extend only with a bounded owner/proof packet when a new command family demands it. Plan: `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md` |
| Commander explanation surfaces | **Pre-0.9 explanation-truth closure achieved.** Briefing, SITREP, campaign drag, and handoff surfaces now consume owned upstream packets instead of recomputing rival stories. | Treat any further explanation work as v0.9.x product enrichment, not repo-truth closure. Plan: `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md` |
| Player command review UX | **Complete.** Command review surfaces landed (v0.8.0.x). Full order interpretation system shipped (v0.8.3 CLOSED 2026-04-06, all 5 phases). | Done. |
| Autonomy determinism and review | API-assisted autonomy can still be mistaken for readiness without hardened replay/fallback/review gates | Explicit determinism, fallback, and player-review contract. Plan: `docs/plans/2026-03-31-v084-autonomy-determinism-and-review-plan.md` |
| Connectivity checks | Column march validates destination but not path; no enclave boundary check during transit | Full path validation |
| **Essay template engine + dynamic Codex divergence** | Partially advanced. Letter Home is shipped; dynamic sections / divergence notes / ghost entries are still open. | Build `dynamic_sections`, divergence notes, ghost entries, historical ghost entries, and endgame comparison glue. Plans: `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`, `docs/plans/2026-03-23-essay-template-engine-plan.md`, `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` |
| **Warroom React migration** | **COMPLETE 2026-04-04.** React migration landed (4 waves + final canvas deletion). `src/ui/map/components/warroom/` is sole owner. `warroom.ts` retains launch/picker/iframe/bridge only. | Done. |
| **Canon audit (v0.7.3)** | Residual doc/code sync remains a maintenance concern, but it is no longer carrying pre-0.9 blocker status. | Sweep remaining stale references as ordinary repo-truth maintenance when touched. Plan: `docs/plans/2026-03-23-canon-audit-checklist.md` |

**Status update 2026-04-07:** bounded hardening sub-lane complete for command briefing / SITREP truth unification. `state.military.last_briefing` is now the canonical player-facing command briefing source across Army HQ, Warroom command modal, and the adapter-owned command strip. Report: `docs/40_reports/implemented/20260407_V08TO09_COMMAND_BRIEFING_TRUTH_UNIFICATION.md`.

**Status update 2026-04-07:** diagnostics / SITREP Phase 2 and commander explanation narrowing are complete in the truthful final sense. `extractWarData(...)` is the canonical operational snapshot owner; `getOperationalSitrepView(...)` in `src/ui/shared/operational_sitrep_views.ts` is the canonical mapped packet; `GameStateAdapter`, Army HQ SUMMARY, `SituationTab`, Warroom reports, and the Warroom `FactionOverviewPanel` warning band now consume that same packet instead of rebuilding overlapping operational status stories. `FactionOverviewPanel` keeps only shell-summary / Army HQ handoff responsibilities, and `MagazineModal` no longer bypasses the player-safe layer during Phase 0: war phase remains a flavor wrapper over `extractWarData(...)`, while pre-war phase is a no-data stub rather than a raw political-state reader. Reports: `docs/40_reports/implemented/20260407_V08TO09_OPERATIONAL_SITREP_TRUTH_UNIFICATION.md`, `docs/40_reports/implemented/20260407_V08TO09_STAFF_ADVISORY_REPORTING_UNIFICATION.md`, `docs/40_reports/implemented/20260407_V08TO09_WARROOM_NARRATIVE_SURFACE_NARROWING.md`, `docs/40_reports/implemented/20260407_V08TO09_MAGAZINE_MODAL_NARRATIVE_NARROWING.md`.

**Status update 2026-04-07:** the remaining Warroom diplomacy shell seam is now closed in the truthful bounded sense. `DiplomacyModal` no longer computes RS territory share from a raw `political_controllers` loop; it consumes the new `observedEnemyTerritoryPct` fact from `extractWarData(...)`. The only accepted direct read left in that modal is the documented HRHB own-faction `capability_profile` exception, guarded inline as a narrow boundary carve-out rather than an unowned bypass. Report: `docs/40_reports/implemented/20260407_V08TO09_DIPLOMACY_MODAL_BOUNDARY_AUDIT.md`.

**Status update 2026-04-07:** the IVP boundary seam is now closed in the truthful bounded sense. `extractWarData(...)` owns `ivpState`, `ClickableRegionManager` no longer reads `political.international_visibility_pressure` / `ivp_consequences_active` directly for shell handoff decisions, `IvpBreakdownModal` is snapshot-first, and `CommandBriefingModal` now documents its narrow `military.last_briefing` exception instead of leaving it implicit. Report: `docs/40_reports/implemented/20260407_V08TO09_IVP_BOUNDARY_SEAM.md`.

**Status update 2026-04-07:** the turn-advance preview boundary seam is now closed in the truthful bounded sense. `ClickableRegionManager.generateThisWeekPreview()` no longer re-derives WIA-returning formations from raw `state.military.formations`; `extractWarData(...).ownForces.wiaFormationCount` now owns that display fact, and `ClickableRegionManager.ts` carries an explicit `DATA BOUNDARY:` contract for war-phase shell display reads. Report: `docs/40_reports/implemented/20260407_V08TO09_WARROOM_TURN_PREVIEW_BOUNDARY.md`.

**Status update 2026-04-07:** desktop campaign-birth save contract is now hardened. `runScenario(...)` canonicalizes freshly built startup state before writing `initial_save.json` or continuing into week execution, and desktop `startNewCampaign(...)` canonicalizes its post-overlay state before returning it to the UI. This closes the birth-vs-first-load mismatch without claiming that a baked April 1992 snapshot already exists. Report: `docs/40_reports/implemented/20260407_V08TO09_DESKTOP_CAMPAIGN_START_CONTRACT_CLEANUP.md`.

**Status update 2026-04-07:** desktop startup no longer depends on harness artifact generation. `createStateFromScenario(...)` now uses the shared in-memory startup builder in `src/scenario/scenario_runner.ts`, while `runScenario(...)` remains the harness-only owner of `run_meta.json`, `initial_save.json`, and run-directory artifacts. This makes the desktop startup story materially cleaner without overclaiming that a baked static April 1992 snapshot already exists. Report: `docs/40_reports/implemented/20260407_V08TO09_STARTUP_ARTIFACT_DECOUPLING.md`.

**Status update 2026-04-07:** packaged desktop is now a real bounded product contract instead of a hypothetical future path. `desktop:package:dir` is the canonical packaged-desktop command, it inherits `desktop:release:check`, and `package.json` now owns the `electron-builder` resource layout that `src/desktop/electron-main.cjs` already expects. Scope remains truthful: unsigned Windows `dir` target only; installer/publish flow is still deferred. Report: `docs/40_reports/implemented/20260407_V08TO09_DESKTOP_PACKAGING_CONTRACT_PRODUCTIZATION.md`.

**Status update 2026-04-07:** packaged desktop now has a real runtime smoke on top of the packaging contract. `desktop:package:probe` launches the unpacked packaged executable itself in packaged mode, verifies packaged resource resolution, confirms baked `apr_1992` startup loading through `startNewCampaign(...)`, and checks tactical-map server routing against packaged resources. Scope remains truthful: headless unpacked Windows probe only; installer/publish flow and full packaged UI interaction automation are still deferred. Report: `docs/40_reports/implemented/20260407_V08TO09_PACKAGED_DESKTOP_RUNTIME_SMOKE.md`.

**Status update 2026-04-07:** packaged desktop runtime smoke now includes the real initial packaged window-load contract. `desktop:package:probe` still uses the same canonical packaged-runtime path, but success now requires the initial packaged `BrowserWindow` to reach `did-finish-load` on `awwv://warroom/index.html`. Scope remains truthful: headless initial-window proof only; deeper packaged UI interaction automation and installer/publish flow are still deferred. Report: `docs/40_reports/implemented/20260407_V08TO09_PACKAGED_DESKTOP_UI_WINDOW_LOAD_CONTRACT.md`.

**Status update 2026-04-08:** packaged desktop runtime smoke now proves a real secondary window path too. `desktop:package:probe` still owns the canonical packaged-runtime contract, but success now also requires the packaged tactical-map secondary window to reach `did-finish-load` on the deterministic operational route `/?desktop_window=operational`. Scope remains truthful: multi-window load smoke only; tactical sandbox route coverage, deeper UI interaction automation, and installer/publish flow are still deferred. Report: `docs/40_reports/implemented/20260407_V08TO09_PACKAGED_DESKTOP_MULTI_WINDOW_SECONDARY_ROUTE_SMOKE.md`.

**Status update 2026-04-08:** packaged desktop runtime smoke now proves the real tactical sandbox route too. `desktop:package:probe` remains the same canonical packaged-runtime path, but success now also requires the packaged tactical sandbox window to reach `did-finish-load` on `/tactical_sandbox.html?desktop_window=sandbox`. Scope remains truthful: route-load proof only; packaged tactical-map interaction automation and installer/publish flow are still deferred. Report: `docs/40_reports/implemented/20260408_V08TO09_PACKAGED_DESKTOP_TACTICAL_SANDBOX_ROUTE_SMOKE.md`.

**Status update 2026-04-08:** packaged desktop runtime smoke now proves minimal tactical-map interaction too. `desktop:package:probe` remains the single canonical packaged-runtime path, but success now also requires the packaged operational and sandbox tactical-map windows to resolve `getMapServerUrl()` and `getCurrentGameState()` through the real desktop preload bridge with deterministic route-mode and startup-state assertions. Scope remains truthful: preload interaction proof only; broader packaged UI automation and installer/publish flow are still deferred. Report: `docs/40_reports/implemented/20260408_V08TO09_PACKAGED_DESKTOP_TACTICAL_MAP_INTERACTION_CONTRACT.md`.

**Status update 2026-04-08:** packaged desktop runtime smoke now proves the real tactical-map pushed state channel too. `desktop:package:probe` remains the same canonical packaged-runtime path, but success now also requires the packaged operational and sandbox tactical-map windows to receive a deterministic `game-state-updated` push through the real desktop subscription bridge. Scope remains truthful: pushed-state delivery proof only; renderer reaction semantics, broader packaged UI automation, and installer/publish flow are still deferred. Report: `docs/40_reports/implemented/20260408_V08TO09_PACKAGED_DESKTOP_TACTICAL_MAP_STATE_PUSH_CONTRACT.md`.

**Status update 2026-04-08:** packaged desktop runtime smoke now proves the real turn-report push channel too. `desktop:package:probe` remains the same canonical packaged-runtime path, but success now also requires the packaged operational and sandbox tactical-map windows to receive a deterministic `turn-report-updated` push through the real desktop subscription bridge. Scope remains truthful: pushed turn-report delivery proof only; renderer reaction semantics, broader packaged UI automation, and installer/publish flow are still deferred. Report: `docs/40_reports/implemented/20260408_V08TO09_PACKAGED_DESKTOP_TURN_REPORT_PUSH_CONTRACT.md`.

**Status update 2026-04-08:** completed-operation history now distinguishes `held at end` from `logged during operation`. The AAR/export layer persists `objectives_logged_captured`, `objectives_held_without_logged_capture`, and `capture_provenance`, and the player-facing operation history surface now says `Held at end` and shows provenance notes for ambiguous zero-attack / held-without-logged-capture outcomes instead of implying direct capture truth. Scope remains truthful: completed-operation honesty only; no new combat-causality proof is claimed. Report: `docs/40_reports/implemented/20260408_V08TO09_OPERATION_AAR_PROVENANCE_FINAL_CONTROL_HONESTY.md`.

**Status update 2026-04-08:** Army HQ BRIEFING now cleanly distinguishes live military review ownership from situational context. `LoadedGameState.presidentialReviewQueue` is the canonical summary for pending military review, `PresidentialToolbar` advertises one `REVIEW` / `REVIEWS` urgency signal instead of split owners, and `PresidentialAttentionPanel` now owns the sustained Army HQ review queue while continuing to route actions through the existing event-decision, order-interpretation, and personnel-directive paths. Scope remains truthful: military review queue coherence only; reserve-request and peace/dayton review unification are still deferred. Report: `docs/40_reports/implemented/20260408_V08TO09_ARMY_HQ_PRESIDENTIAL_REVIEW_QUEUE_COHERENCE.md`.

**Status update 2026-04-07:** the last named war-phase Warroom modal seam is now closed in the truthful bounded sense. `NewspaperModal.getOfficerSuccessionLines()` no longer reads raw `military.named_officer_data` or `military.formations`; `extractWarData(...).officerNamesById` now owns officer name lookup and the modal resolves corps names through snapshot formation details instead of direct military-state reads. Report: `docs/40_reports/implemented/20260407_V08TO09_NEWSPAPER_MODAL_OFFICER_BOUNDARY.md`.

---

## Planned: v0.9 â€” Consequences + Polish

**Theme:** Ahistorical choices produce realistic consequences. Ship preparation begins.

**v0.9 closure frame (added 2026-04-30):** The next work should close one coherent presidential campaign loop, not scatter into unrelated feature expansion. The loop is: Warroom / Army HQ briefing -> map inspection -> order or review choice -> turn result -> consequence / cost / historical judgment. This is a cross-milestone product objective that consumes existing plans rather than creating a new milestone: shell cohesion (`docs/plans/2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md`), product architecture simplification (`docs/plans/2026-04-03-v08to09-product-architecture-simplification-plan.md`), command review UX (`docs/plans/2026-03-31-v083-player-command-review-ux-plan.md`), consequence refresh (`docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`), and dynamic essay / endgame comparison (`docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`). Done means a player can complete a campaign arc and understand what happened, why it happened, what they influenced, what it cost, and how history judges the result.

**Full-war proof requirement (added 2026-04-30):** Before closing `v0.9.0` or `v0.9.1`, validate beyond the healthy 40-week slice with 188w/200w evidence. The 40w run `n1579` on current `main` is strong (93.7% area-weighted, 27/27 anchors, 6/6 benchmarks, 0 invalid ops, consistency PASS), but `v0.9` depends on later-war behavior: Washington timing, HRHB/RBiH rupture, Orasje, consequence chains, negotiated peace, verdict, and Cost Ledger surfaces.

**Force-quality trajectory calibration issue (added 2026-05-01):** Open a separate calibration/design lane for the core full-war premise that VRS should deteriorate from professional army to degraded-but-dangerous force while ARBiH should mature from 1992 rabble into 1995 corps-level professionals. Recent late-war target and operation evidence shows that missing scripted operations are not the whole problem: the engine must produce asymmetric force-quality change through officer learning/brain drain, cohesion/morale, equipment maintenance, exhaustion, operation-readiness gates, corps coordination, and commander doctrine. Plan: `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`; tracked in `docs/40_reports/CALIBRATION_MASTER.md`.

**Autonomous parallel workstream model (added 2026-05-01):** Active work should now be organized as large, phase-coherent lanes rather than 10-minute packets. Claude owns implementation lanes with internal phase commits; Codex owns architecture, roadmap truth, review, and non-overlapping product/design lanes while Claude runs. Stop only for canon, sensitive-history, determinism, active file-ownership conflict, or unresolved player-facing design meaning. Plan: `docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md`.

**Mega-lane execution board (added 2026-05-01):** The active v0.9 work board is now organized around substantial mega-lanes: Full-War Trajectory Foundation, Operation Opportunity Families, Presidential Product Spine, and Full-War Proof Platform. Future Claude prompts should normally dispatch parallel agents up front and continue through internal phases/commits rather than stopping after a single seam. Plan: `docs/plans/2026-05-01-v09-product-spine-megalane-plan.md`.

**Presidential Product Spine C0 audit (added 2026-05-01):** C0 confirms the shell ingredients are live but the product loop is not closed: Brief / Inspect / Decide / Execute are live, while Report / Cost / Judge / Next are partial. The missing owner is a Turn Aftermath packet linking `TurnSummary` + `lastTurnReport` to cost, records, and next reviews. Audit: `docs/40_reports/audits/20260501_PRESIDENTIAL_PRODUCT_SPINE_C0_AUDIT.md`.

**Trip session 2 evidence + lanes (added 2026-05-03, on top of `8dec8f58`):** A 2-commit trip session 2 shipped two large multi-lane batches on top of session 1's evidence. (1) **N4 morale-collapse override (LANE-NIGHTSHIFT-N4-CANON-AMENDMENT, `58624617`):** canon amendment **Engine Invariants v0.7.0 §6.2.4 + Systems Manual v0.7.0 §6.4** authored; `morale_low_streak?: number` field on `FormationState` (additive); counter increment/reset loop in `morale_drift.ts` (≤15 increments, >20 resets, 16-20 hysteresis preserves); shadow-flag dissolution path in `brigade_dissolution.ts` gated on `MORALE_OVERRIDE_ENABLED` env flag default-false; with flag ON and streak ≥ 8, personnel cap (>=800) AND 2-of-3 criteria bypassed. **Verification:** 10/10 lane tests; 49/49 focused regression; 40w smoke n1624 hash `3b0426b1ca73a547` vs A2-only baseline n1625 `8c33da5b1f2ba80b` — STATE-SHAPE-ONLY DRIFT (313/313 formations match; only 4 records differ exclusively by the new field; orders 134=134, anchors 26/27, benchmarks 6/6 byte-identical). Behavioral-zero with flag OFF — foundational claim of user "B" approval honored. (2) **R2 six-lane parallel ship (LANE-NIGHTSHIFT-ROUND2, `e4c661d5`):** user directive ("push to 0.9.5 in one round") drove ambitious six-lane parallel autonomous dispatch. **R2-1** must_hold variable multiplier — flat 1.5× → `max(2.0, min(5.0, 0.75 × commitment_ratio))` per /game-designer verdict-D, pressure-responsive, faction-agnostic, 22/22 lane tests; **R2-2** 6/7 Ring 1 / no-§6 divergence events authored (`csq_alliance_holds_past_w35`, `csq_paramilitary_authorization_refused`, `csq_enclave_held_alt_intervention` audit-only on rupture, `csq_patron_pressure_resisted_streak`, `csq_early_peace_acceptance_w120`, `csq_force_quality_inversion`) + 4 new condition kinds + `cost_ledger_annotation` effect family + `MilitaryState.cost_ledger_annotations` field; 7th HELD per STOP rule (no per-corps `historical_axis_munis` plumbing); **R2-3** tutorial onboarding skeleton **opens v0.9.2** — `StateMeta.tutorial_state` + `OnboardingOverlay/Step/steps` + `tutorial:dismiss`/`tutorial:advance-step` IPC; **R2-4** perf baseline audit **opens v0.9.3** — 40w n1626 mean 3,094 ms/turn (30.9× over <100ms target); supply-osid 18.2%, bot orders 562ms combined, 5.6MB/turn growth; instrumentation reverted, audit shipped; **R2-5** OSID damage seed **opens v0.9.4** — `tools/build_osid_damage_seed.cjs` + `data/derived/osid_damage_seed.json` 445 OSIDs scored from n1624 with battles+casualties+flips+spikes; **R2-6** Srebrenica rupture diagnostic **§6-BLOCKED** for fix — parametric trace tool + audit + 5 binding §6 sign-off questions; top question Q-CANON-RUPT-4 (Ring-2 emergent vs heuristic). **Verification:** 45/45 R2 lane tests GREEN; 40w smoke n1627 hash `a2a51d4a9994a7f5` vs N4 baseline n1624 `3b0426b1ca73a547`; /scenario-tester verdict NARROW BEHAVIORAL DRIFT (calibration-flat) — orders 134→131 (RS −2 / RBiH −1 / HRHB 0 — faction-symmetric), flips_applied 43=43, control_alignment BYTE-IDENTICAL, anchors 26/27, benchmarks 6/6; /war-or-game: SHIP. **Hash drift class:** Lane 1 BEHAVIORAL global narrow-scope; Lane 2 STATE-SHAPE additive + BEHAVIORAL inert in 40w; Lanes 3-6 NONE. **Sensitive-history compliance:** all Ring 1, faction-agnostic, no rupture/enclave/OOB/FORAWWV touch; R2-6 explicitly preserves §6 boundary. **Successor handoffs:** R2-2 needs per-corps `historical_axis_munis` config; R2-4 next perf lane targets supply-osid/bot-orders/sector-reconciliation; R2-5 v0.9.4 visual rendering consumer; R2-6 §6 sign-off process for Q-CANON-RUPT-4 before any fix can ship; N4 188w sensitive-history regression mandatory before flag promotion. Reports: `docs/40_reports/audits/20260503_PERF_BASELINE_ROUND2.md`, `docs/40_reports/audits/20260503_SREBRENICA_RUPTURE_NON_FIRING_DIAGNOSTIC.md`. **v0.9 progression:** v0.9.0 substrate now includes must_hold engine block fix (was named refutation in 2026-04-28 update); v0.9.2 / v0.9.3 / v0.9.4 promoted from "groundwork only" / "not started" to **"opened with skeletons + audits + canonical data"** state. v0.9.5 platform packaging untouched; remains the binding distance to gold.

**Mid-trip evidence + lanes (added 2026-05-03):** A 10-commit autonomous trip session shipped the following on top of `f4b8f530`, all Ring 1 / no § 6 / faction-agnostic, with focused regression GREEN at every commit. (1) **TRIGGERED_OP_TEMPORAL_TRACE** (`1e68d8dc`): structural test over `warPhases` step ordering retires the queued-order predicate hypothesis that the prior IN-TRANSIT-COMBAT-POWER-CONTEXT closeout had named — Codex P2 was correct, predicate is structurally impossible. (2) **KRIVAJA_BRIGADE_LIFECYCLE** (`173dd94d`): four-investigator audit + read-only diagnostic + 4 named successor handoffs (per-turn snapshot, reconstitution policy, OOB Skelani re-seeding [§ 6 BLOCKED], bot-AI roster awareness [Ring 3 BLOCKED]). (3) **A1 PER_TURN_BRIGADE_SNAPSHOT** (`fb847504`): observability emit `<run_dir>/brigade_temporal_log.jsonl`; closes the artifact gap that previously blocked classifying "active throughout but absent from late-game ops" brigades; mirrors `weekly_report.jsonl` pattern; 4.3 MB / 8,539 lines for 40w; null-result hash byte-identical confirms no engine behavior change. (4) **B-2 dissolved_no_combat enum** (`76651e0a`): classifier mis-tag fix in `tools/diagnostics/krivaja_brigade_lifecycle.cjs` distinguishes pure-attrition from combat-destroyed cases. (5) **B-1 PLANNING_INVALIDATED_COOLDOWN** (`4ed59457`): engine mechanic; removed the `sector_offensive.ts:322` skip so `planning_invalidated` recoveries feed the existing `failed_offensive_objectives` cooldown; bounds the 6× re-emission loop observed at vrs_1st_krajina/Doboj corridor; faction-balanced delta verified at 40w; **registered behavioral consequence: brcko anchor flip RBiH→RS, explicitly anticipated by /game-designer pre-merge gate** (golden baseline manifest refreshed in `018cacd3`); Systems Manual §6.4 patched. (6) **B-3 ANOMALY_SECTOR_SUBTYPE** (`45d39ad7`): `subtype?: string;` added to `AnomalyReport`; `empty_contested_sector` and `undefended_front_subsegments` checks now emit one report per `pool_exhausted` vs `misallocated` subtype, routing distinct root causes to different specialists. (7) **D#1 WAR_ENDED_EARLY_PRODUCER** (`a1a5dc44`): defense-in-depth flag wire — `resolvePeacePlan` now writes `event_flags.war_ended_early` + `early_peace_implemented` alongside `meta.game_over=true` when all factions accept; converts the previously phantom `war_termination.ts:62` branch into a real producer.

These lanes touch v0.9 themes (Formation-life believability, Force-quality trajectory, Operation Opportunity Families, Full-War Proof Platform, Consequence System substrate) but do NOT close any milestone — they are substrate, observability, and mechanic-honesty work that future v0.9 lanes consume. Maintenance commits also shipped: `0e166272` apr_1992 startup snapshot refresh; `018cacd3` golden baseline manifest refresh + `scenario_init_formations` parallel-load timeout bump. Full vitest baseline now **5669/5679 (99.946%)** with 2 known remaining failures (Codex UI test handoff + brcko anchor needing /scenario-tester verdict on the registered B-1 consequence). 188w n1621 hash `4ba56cfd4fae9824` byte-identical to predecessor n1619 (observability-only). Reports: `docs/40_reports/implemented/20260502_TRIGGERED_OP_TEMPORAL_TRACE.md`, `..._KRIVAJA_BRIGADE_LIFECYCLE.md`, `..._PER_TURN_BRIGADE_SNAPSHOT.md`, `..._PLANNING_INVALIDATED_COOLDOWN.md`, `..._ANOMALY_SECTOR_SUBTYPE.md`. Sensitive-history `OPEN_P0` carries unchanged from n1619 (Srebrenica genocide rupture still NOT firing despite enclave fall events; named successor lanes are § 6-blocked or design-blocked, not autonomous).

**Formation-life believability lane (added 2026-04-30):** Treat brigade drift, far-from-home live ownership, "active but never fights" formations, HRHB/HVO offensive emergence, and out-of-area corps behavior as a `v0.9` simulation-believability lane. This is not a new broad mechanics milestone; it draws from the scorecard/backlog (`docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`, `docs/plans/2026-04-14-roadmap-execution-packet-backlog.md`) and prior drift investigations. Done means remaining drift/never-fights warnings are either fixed by a canonical lifecycle owner or explicitly classified as accepted scenario variance with run evidence.

**Roadmap truth cadence (added 2026-04-30):** After major scenario evidence, milestone closure, or remote branch integration, run a roadmap sync pass under `docs/plans/2026-04-06-studio-health-repo-truth-plan.md`. Current example: the roadmap's 2026-04-28 calibration paragraph must be refreshed after Claude's current scenario setup/run work settles, because local `n1579` already supersedes the older `n21` 40w status.

### v0.9.0 â€” Consequence System

Divergence events: ahistorical player decisions trigger realistic consequence chains. No cleansing leads to partisan resistance. Alliance holds eliminates Washington Agreement chain. Srebrenica defended changes NATO intervention calculus.

**Gate:** ~~This milestone does not close until the project has explicit victory conditions / Pyrrhic scoring and a resolved sensitive-history design gate for atrocity / genocide representation.~~ **RESOLVED 2026-04-16:** both gates are now canonical:
- Victory conditions / Pyrrhic scoring — `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`
- Sensitive-history design gate — `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`

The remaining `v0.9.0` work is the broader divergence-event matrix and consequence authoring, which are ordinary milestone work rather than gold-blocker philosophy.

Plans: `docs/plans/2026-03-24-v090-consequence-system-plan.md`, ~~`docs/plans/2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md`~~ (closed 2026-04-16), ~~`docs/plans/2026-03-31-v090-sensitive-history-design-gate-plan.md`~~ (closed 2026-04-16).

**Status (2026-04-16): PARTIAL, gold-blocker gates closed.** Core `v0.9.0` substrate is live: consequence-substrate owner cleanup, stranded-brigade lifecycle, verdict packet truth (`outcome_class`, `condemnation_flags`), the locked Srebrenica rupture-consequence path, `CostLedger` / historical comparison builders feeding the endgame surface, and now the authoritative canon for victory conditions and sensitive-history boundaries. This milestone remains open because the broader divergence-event matrix and remaining consequence authoring from the full plan are not all complete yet.

**Status update 2026-04-28 (calibration + post-WA correctness):** Two PRs landed on top of `v0.9.0` substrate as bug-fix work, not new milestone scope:
- **PR #36 (`91f62dd5`) — WA timing recalibration** (#29 sub-issue 5 partial). `CEASEFIRE_MIN_WAR_DURATION 20→45` + `war_exhaustion` clamped at 100. WA now fires at t85 in 188w runs (was t60); closes 25 of the 41-week gap to historical March 1994. Empirical journey n17→n18→n19 validated the threshold change as the actual binding gate; speculative MAX_DELTA reduction reverted as inert per Roso falsification.
- **PR #37 (`e588c23d`) — Centralized RBiH↔HRHB combat gate.** New `isRbihHrhbCombatBlocked` helper applied at `battle_resolution`, `attack_resolution_osid`, and `paramilitary_sweep` (narrowed to post-ceasefire/post-WA only after PR #37 v1 CI exposed a latent sector-splitting bug in 40w). Closes the Orasje pocket post-WA regression flagged in PR #36 audit: all three `op:orasje:*` OSIDs now hold HRHB through w188 (vs RBiH at t130-132 pre-fix). 188w n22 cascade slightly closer to jan1993 reference than n19 on every faction count.
- **Phase 2a (Vozuća consolidation gate) — REFUTED, REVERTED.** The Pyrrhic-team-recommended scenario-data fix (port 40w `must_hold_osids_by_corps` to 188w + add `vozuca_2`) was empirically refuted: petrovo_2 still flipped RBiH at w42 (n20 candidate hash `1723acf0fe5dd9be`). Game-designer audit confirmed `must_hold` provides only a 1.5× garrison-budget multiplier (`commander/allocate.ts:234`), insufficient against ARBiH 3rd Corps' 5–9× attacker power ratios at Ozren-pocket targets. **Phase 2 reframed as needing engine-level work** (multiplier increase, true holdout terrain, or stronger garrison directive), not scenario-data alone. Phase 2b (Brčko axis expansion) and Phases 3–7 (JNA-handover sub-snapshot, Federation triggered-ops, Roso brigade-creation events, Zvornik OOB rebalance, HV teleportation diagnostic) all deferred pending that engine work. They remain on the calibration backlog as concrete, scoped issues for a future session.

**+ Cost Ledger** (Legendary Feature): ICTY-style prosecutorial endgame narrative. Every decision â€” ethnic cleansing tolerated, enclaves abandoned, paramilitary sweeps authorized â€” silently recorded. After Dayton, the player receives a prosecutorial narrative adapted from real ICTY case structures. Not a score. An indictment. Template-driven, reads event flags + casualties + displacement.

Spec: `docs/plans/2026-03-26-cost-ledger-template-format.md`.

### v0.9.1 â€” Dynamic Essay Content + Endgame Comparison

The Codex becomes reactive to the player's war. This milestone now focuses only on the still-open work: dynamic essay sections, divergence notes, ghost entries for paths not taken, and endgame comparison. Already-shipped features such as Ghost Map, Exhaustion Clock, and Letter Home are inputs, not milestone deliverables.

**+ Endgame Comparison** (Legendary Feature): Split-screen your-war-vs-real-war at milestone weeks. Territory, casualties, displacement side by side. "Could I have done better? Could anyone?"

Plan: `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`
Supporting inputs: `docs/plans/2026-03-23-essay-template-engine-plan.md`, `docs/plans/2026-03-26-endgame-comparison-data-requirements.md`, `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md`

**Gate:** Requires dynamic essay engine and historical baseline comparison data to be implemented. Ghost Map, Exhaustion Clock, and Letter Home are already available for integration and polish if needed.

**Status (2026-04-15): PARTIAL via pulled-forward implementation.** Endgame comparison is no longer untouched: historical comparison data is already rendered in `VerdictScreen`, propagated into Chronicle and Wrapped, and consumed by the first dynamic Codex slice (`ghost_when`, `dynamic_sections`, ghost essays / entries for paths not taken). This milestone stays open because broader dynamic-essay authoring, richer milestone-week comparison UX, and remaining narrative polish are still unfinished.

**Already live (not core scope):**
- Ghost Map â€” implemented on tactical map
- Exhaustion Clock â€” implemented in Army HQ
- Letter Home â€” implemented in Chief of Staff briefing

**Adjacent carry-in item:** Ops Modal UX Overhaul still belongs after `v0.8.x-final` authority cleanup, but it is not part of the core dynamic-Codex/endgame-comparison work.

### v0.9.2 â€” External Playtesting + Balance

Closed alpha: 10-20 testers from strategy game community. Structured feedback collection: clarity, pacing, difficulty, bugs, UX confusion points. Balance pass incorporating playtest feedback.

**Onboarding is owned here, not left floating:** tutorial, first-session guidance, and command-review literacy all need real player feedback. Do not leave tutorial/onboarding as a vague pre-gold chore.

Plan: `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md`.

### v0.9.3 â€” Performance + Accessibility

**Performance:** Profiling pass on hot paths (sector building, BFS, combat resolution). Target: <100ms per turn on mid-range hardware. Map rendering optimization. Memory audit for 208-turn games. Startup < 3 seconds.

**Accessibility:** Colorblind modes (deuteranopia/protanopia/tritanopia). Keyboard navigation (full game playable without mouse). Screen reader support (ARIA labels). Rebindable keys. Text scaling.

Plan: `docs/plans/2026-04-06-v093-performance-accessibility-plan.md`
Supporting inputs: `docs/plans/2026-03-16-v0.7.0-performance.md`, `docs/plans/2026-03-16-v0.7.1-accessibility.md`

**Status (2026-04-15): groundwork only.** This milestone is still mostly ahead, but two bounded slices are already live: Warroom hotspot keyboard accessibility and tactical-map render-churn guards. Do not mistake that for closure; profiling, broader keyboard coverage, colorblind / rebind / text-scaling work, and explicit startup / memory proofs are still open.

### v0.9.4 â€” Visual Polish + Legendary Map Features

Loading screens, transitions, shell polish, warroom art finalization, icon polish, and the remaining late visual systems that are not already live.

**+ Map That Scars** (Legendary Feature): The tactical map visually degrades as the war progresses. Fought-over settlements show damage. Depopulated settlements fade. Corridors under pressure pulse. Week 1: clean and colorful. Week 120: a wound. Visual degradation keyed to per-OSID population, displacement, control flips, combat events.

**+ Refugee Column** (Legendary Feature): When a settlement is ethnically cleansed or a front collapses, displaced population appears on the map as a moving column of dots flowing along roads toward safe territory. Not a number. A visible thing you caused. Deck.gl TripsLayer, threshold-triggered.

**+ Corridor Heartbeat** (Legendary Feature): Supply corridors (Posavina, Brcko) visually pulse with flow rate. Faster = healthy, slowing = interdicted, flatline = severed. Makes logistics visceral.

**+ Front Line Terrain Tinting:** Friction data rendered on front edges.

**+ Elevation Profile on Ops Axes:** SVG chart along axis of advance.

Plan: `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md`
Supporting inputs: `docs/plans/2026-03-16-v0.7.3-visual-polish.md`, `docs/plans/2026-03-25-ghost-map-exhaustion-clock-spec.md`

### v0.9.5 â€” Platform Packaging + Store

Windows installer (Electron-builder, auto-update). Mac build (notarized, universal binary). Linux build (AppImage or Flatpak). Steam integration (Steamworks SDK, achievements, cloud saves). Store page, press kit, community setup.

Plan: `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md`
Supporting input: `docs/plans/2026-03-16-v0.8.2-platform-packaging.md`

---

## Planned: v1.0.0 â€” Gold

**Ship it.** Full campaign from April 1992. Dynamic Codex. Command hierarchy. Consequence system. Tutorial. Ship it.

**Integration plan:** `docs/plans/2026-04-30-v1-gold-readiness-integration-plan.md`. The older `docs/plans/2026-03-16-v1.0.0-gold.md` remains a launch-day checklist, but its post-1.0 table is superseded by this Master Roadmap.

### What ships in v1.0:
- Complete 1992-1995 campaign (all phases, all factions playable)
- Corps Commander Intelligence (PERCEIVE-DECIDE-EXECUTE)
- Political Leader Bot (all 3 factions, personality-driven)
- Order Interpretation (comply/creative/delay/refuse + political capital override)
- 94+ events with emergent triggering, 96+ certified historical essays
- Dynamic Codex (template engine, divergence notes, ghost entries)
- Consequence system (ahistorical branching with realistic consequences)
- Cost Ledger (ICTY-style endgame narrative)
- Ghost Map, Map That Scars, Refugee Column, Corridor Heartbeat
- Letter Home (procedural casualty vignettes)
- Endgame Comparison (your war vs real war)
- Army HQ command center + Warroom (React, unified)
- Game Chronicle + Chronicle Wrapped
- Tutorial / onboarding
- Patron Phone Calls
- Full UI polish, accessibility, performance optimization
- Platform packaging (Win/Mac/Linux/Steam)

### NOT in v1.0:
- Localization (v1.1 â€” B/C/S + English polish)
- Historical scenarios April 1993/1994/1995 (v1.2)
- Sound/audio system (v1.3 â€” "The Silence")
- AI Commander via Claude API at corps level (v2.0)
- Multiplayer
- Modding tools

---

## Post-1.0 Content Plan

**Execution coverage:** `docs/plans/2026-04-30-post-1-0-content-execution-plan.md`. Each post-1.0 update must receive a scoped child plan before implementation starts; the table below defines order and ownership intent, not permission to implement directly.

| Update | Codename | Content |
|--------|----------|---------|
| **1.0.x** | â€” | Day-one patch, critical bugfixes. No new features. |
| **1.1.0** | "Mother Tongue" | Localization: Bosnian/Croatian/Serbian (Latin script) + English polish. Faction-specific B/C/S dialect flavor optional. |
| **1.2.0** | "Autumn Leaves" | Historical scenarios: April 1993, April 1994, January 1995 start dates. Each with scenario-specific event sets and calibrated starting positions. |
| **1.3.0** | "The Silence" | Full audio degradation design. No background music. Ambient environmental audio that degrades as the war progresses. Birds in spring 1992. Wind and distant thuds by winter 1993. Near-silence by 1995. When the Dayton ceasefire fires, you hear a human voice for the first time. |
| **1.4.0** | "The Other Side's Briefing" | After major battles, optionally view the enemy's CoS briefing about the same engagement. Their casualties, their assessment, their morale. Humanizes the enemy and reveals information asymmetry. Requires v0.8.2+ AI Commander maturity. |
| **1.5.0** | "Operation Corridor" | Posavina expansion: expanded Brcko/Orasje scenarios, VRS 1KK operations deep content. |
| **1.6.0** | "Deliberate Force" | NATO intervention mechanics, 1995 endgame expansion, Operation Storm. |
| **1.7.0** | "The War Room" | AI Scenario Editor Assistant (help build what-if scenarios) + Streaming Narrator (AI commentary for streamers). |
| **2.0.0** | TBD | Claude API at corps level â€” AI IS the opposing general. Major engine overhaul for full LLM-driven command chain. Save-breaking changes acceptable. |

Each 1.x.0 can have its own hotfix patches (1.1.1, 1.1.2, etc.).

---

## Open Design Questions

**Resolution plan:** `docs/plans/2026-04-30-roadmap-open-design-questions-resolution-plan.md`. Questions remain blocked until that process produces a decision, deferral, or child-plan trigger.

These need design sessions before implementation. Preserved from the original roadmap â€” each represents a genuine unsolved problem.

1. **Negotiation counter-offers** â€” How much agency does the player have at Dayton? Can they propose territorial splits on the map? Or choose from pre-defined packages? Current system uses dimension-derived capital + flag-driven packages, but player agency in the negotiation itself is limited.


2. **International intervention** — Is NATO bombing a single event or a multi-turn campaign the player can influence? Current: single event with conditions. Design question: should the player be able to affect the timing, intensity, or targeting of Deliberate Force?
3. **Multiplayer** â€” Hot-seat only or network? Asymmetric information? Each player commands one faction; Claude fills others. Deferred to post-1.0 but needs architectural consideration (save format, turn structure, information hiding).

4. **Modding** â€” Event definitions are JSON. Scenario manifests are JSON. The modding surface exists implicitly. Do we formalize it? Expose a scenario editor? Lua bindings exist but are not surfaced. Workshop integration with Steam?

5. **Endgame scoring / victory conditions** — ~~What does "winning" mean in a negative-sum game?~~ **RESOLVED 2026-04-16** — canonicalized in `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`. Seven outcome classes, per-faction grade anchors, Pyrrhic score as supporting context (not sovereign), termination vs judgment split. Scenario `victory_conditions` remain optional and by default undefined — the canonical `apr_1992` campaign is condition-free by design.

6. **Play length** â€” Target session length per scenario? April 1992 full campaign: 3-5 hours target. Are there "quick battle" modes? Speed controls?

7. **Srebrenica** — ~~How do we handle the genocide mechanically and narratively?~~ **RESOLVED 2026-04-16** — canonicalized in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`. Three-ring boundary: modeled mechanically (enclave, rupture, condemnation flag), represented narratively (ICTY-cited events and essays), and explicitly refused (no "commit genocide" lever, no concentration-camp subsystem, no negotiable condemnation, no body-count optimization). Rupture expansion rule requires all four criteria met (mass scale, international legal finding, specific trigger, non-reversible); Srebrenica remains the only rupture by design.

8. **War economy depth** â€” How detailed? Current: abstract capacity numbers, smuggling routes, equipment lifecycle. Paradox-style production queues would add complexity without clear benefit for the negative-sum thesis. Probably stays abstract.

---

## Current Status Assessment

| System | Status |
|--------|--------|
| Core simulation | Complete |
| War phase combat | Complete |
| Bot AI (3-tier: army/corps/brigade) | Complete |
| Corps Commander Intelligence (v0.8) | Complete through v0.8.4; pre-0.9 cleanup band closed |
| Corps sectors | Complete |
| Operations + preparation | Functional; v0.8 authority cleanup landed, with further UX/consequence follow-up now living in v0.9.x work |
| Named officers + succession | Complete |
| Supply reserves | Complete |
| Equipment pipeline | Complete |
| OOB (247 brigades, 166 active) | Complete |
| Scenario runner | Complete |
| Calibration pipeline | Complete (92.2% area-weighted, n21 on `a91ccc66`, 27/27 anchors, 6/6 benchmarks, 712 OSIDs, 0 critical anomalies — fresh baseline post-Phase-1 + Orasje fix; pre-fix baseline was n1358 @ 93.6%) |
| Desktop app (Electron v41) | Functional |
| Tactical map (React + MapLibre + Deck.gl) | Functional |
| Warroom (React) | Complete â€” React migration landed 2026-04-04. `warroom.ts` retains launch/picker/iframe/bridge. |
| Army HQ (4-tab command center) | Functional |
| Presidential campaign loop | Partial - the pieces exist, but v0.9 closure must make Warroom / Army HQ / map / review / turn result / endgame judgment feel like one coherent player loop. Covered by shell cohesion, product architecture simplification, command-review UX, v0.9.0 consequence refresh, and v0.9.1 endgame comparison plans. |
| Events/decisions | Functional (94 events, pressure system, 14 condition types) |
| Historical essays (Codex) | Partial (96 certified; 13 missing 1992 foundation essays still tracked) |
| Strategic dimensions | Functional (6 dimensions, Dayton merge) |
| Scenarios (40w/52w/56w) | Complete |
| Formation-life believability | Partial - sector ownership is now strong, but drift, far-from-home live ownership, active-never-fights formations, and HRHB/HVO offensive emergence remain `v0.9` believability work. Covered by the A+++ scorecard, roadmap packet backlog, and prior brigade-drift investigations; needs packetization after current scenario proof settles. |
| AI Commander infrastructure | Functional (14 modules, multi-model routing) |
| Commander Maturity (belief state, motive stack, traces) | Complete (v0.8.1, closed 2026-04-05) |
| Political Leader Bot | Complete (v0.8.2 closed 2026-04-06) |
| Order Interpretation | Complete (v0.8.3 closed 2026-04-06) |
| Autonomy Depth + Claude API | Complete (v0.8.4 closed 2026-04-07 â€” all 6 phases closed; DRINA variance accepted with evidence) |
| Consequence system | Partial (`v0.9.0` substrate live: consequence owner cleanup, stranded lifecycle, verdict contract, locked rupture path; broader divergence chains still open) |
| Cost Ledger | Partial (`CostLedger` / historical comparison builders and War Cost surface live; full prosecutorial authoring still open) |
| Ghost Map | Implemented (live on tactical map; roadmap-owned cleanup/polish only if needed) |
| Map That Scars | Not started (v0.9.4) |
| Letter Home | Implemented (Chief of Staff briefing) |
| Refugee Column | Not started (v0.9.4) |
| Corridor Heartbeat | Not started (v0.9.4) |
| Endgame Comparison | Partial (`VerdictScreen`, Chronicle, Wrapped, and first dynamic Codex comparison slices live; richer milestone-week UX still open) |
| Tutorial | Not started (roadmap-owned in v0.9.2) |
| Sound/audio | Not started (post-1.0) |
| Localization | Not started (post-1.0) |
| Peace phase | CUT â€” game starts April 1992 |
| Save/load | Current live product truth is strong: headless + desktop save/load truth are proven, and continue-from-save equivalence is direct. Replay playback/consumer remains a separate future lane. |
| Victory conditions | **Canonical 2026-04-16** — `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`. `outcome_class`, `condemnation_flags`, Pyrrhic score, verdict display, termination-vs-judgment split, scenario fallback all settled. Remaining `v0.9.0` work is divergence-event matrix authoring, not the gate. |
| Sensitive-history handling | **Canonical 2026-04-16** — `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`. Three-ring boundary, rupture expansion rule, Cost Ledger wording constraints, and sign-off structure all settled. |
| Diplomacy layer | Partial (patron pressure, alliance, IVP) |
| Roadmap / repo-truth cadence | Active permanent lane - Studio Health owns roadmap sync after major runs, milestone closures, and remote branch integration. The next sync should record the post-2026-04-30 scenario evidence once Claude's current setup/run work settles. |

**Current:** formal package semver is still `v0.8.1`, but roadmap state is now safely inside early `v0.9.x` development rather than the old transition band. Calibration status has two layers: the last recorded roadmap baseline as of 2026-04-28 was `n21` on `main` `a91ccc66` at 92.2% area-weighted, 27/27 anchors, 6/6 benchmarks, 712 OSIDs, 0 critical anomalies; local 2026-04-30 evidence on current `main` (`n1579`, 40w) is stronger at 93.7% area-weighted, 27/27 anchors, 6/6 benchmarks, 0 invalid ops, and consistency validation PASS. Treat `n1579` as fresh evidence pending Claude's current scenario setup/run closeout and the next Studio Health roadmap sync. Political bot (`v0.8.2`), order interpretation (`v0.8.3`), autonomy (`v0.8.4`), `v0.8.x-final` command-authority cleanup, and the pre-0.9 simplification/repo-truth closure band are all closed. Substantial `v0.9.0` / `v0.9.1` slices are already live, including consequence-substrate cleanup, stranded-brigade lifecycle, verdict packet truth, locked rupture consequences, `CostLedger` / historical comparison, canonical `VerdictScreen` endgame presentation, and comparison propagation into Chronicle / Wrapped / Codex. Honest residuals remain: the project has **not** taken a formal semver bump, `v0.9.0` / `v0.9.1` remain open milestones, 188w/200w proof is required before those milestones close, live replay playback/consumer is still absent from the product shell, tutorial/onboarding is still untouched, formation-life believability remains a visible simulation gap, and the broader performance / accessibility / visual-polish milestones remain largely ahead.

---

## Legendary Features Summary

Features that make AWWV 10x more powerful, assigned to specific versions. Source: `docs/30_planning/design/LEGENDARY_FEATURES_BRAINSTORM.md`.

| Feature | Version | Effort | Description |
|---------|---------|--------|-------------|
| **Ghost Map** | Implemented | Low | 1991 census demographics overlay beneath current military situation |
| **Exhaustion Clock** | Implemented | Low | Visual depletion indicator (candle metaphor) in Army HQ |
| **Letter Home** | Implemented | Low | Procedural casualty vignettes in CoS briefing |
| **Patron Phone Call** | v0.8.2 | Medium | 8-12 dramatic patron pressure events with ICTY-sourced dialogue |
| **Command Chain That Disobeys** | v0.8.3 | High | Officers interpret, delay, refuse orders |
| **Cost Ledger** | v0.9.0 | Medium | ICTY-style prosecutorial endgame narrative |
| **Endgame Comparison** | v0.9.1 | Medium | Your war vs real war side-by-side |
| **Map That Scars** | v0.9.4 | Low-Med | Visual degradation over time |
| **Refugee Column** | v0.9.4 | Medium | Displacement as visible map entity |
| **Corridor Heartbeat** | v0.9.4 | Low | Supply corridor pulse visualization |
| **The Silence** | v1.3.0 | Medium | Audio degradation design |
| **The Other Side's Briefing** | v1.4.0 | Medium | Enemy CoS briefing after major battles |

---

## Version Bump Protocol

1. Decide which milestone the work completes
2. Update `package.json` version field
3. Create git tag: `git tag -a v0.X.0 -m "Milestone: description"`
4. Update `docs/PROJECT_LEDGER.md` with version note
5. Push tag: `git push origin v0.X.0`

Patch bumps (0.X.1, 0.X.2) are for significant fixes within a milestone â€” not every commit. Post-1.0: patches are 1.0.x (bugfixes), feature updates are 1.x.0, major overhauls are 2.0.0.

---

## Key Plan Documents

| Document | Scope |
|----------|-------|
| `docs/plans/2026-03-30-v080-corps-commander-intelligence-architecture.md` | v0.8.0 commander system architecture |
| `docs/plans/2026-03-30-p0-combat-drought-fix.md` | v0.8.0 P0 fix plan |
| `docs/plans/2026-03-31-v080x-1992-foundation-essays-plan.md` | v0.8.0.x missing 1992 essays execution plan |
| `docs/plans/2026-04-03-v080x-sector-frontline-truth-plan.md` | v0.8.0.x sector/frontline truth hardening |
| `docs/plans/2026-03-25-command-chain-architecture.md` | v0.8 full architecture |
| `docs/plans/2026-03-31-v081-commander-maturity-plan.md` | v0.8.1 commander maturity implementation plan |
| `docs/plans/2026-03-31-v081-intelligence-assurance-harness-plan.md` | v0.8.1 anti-theater proof harness |
| `docs/plans/2026-03-31-v08x-operations-singularity-plan.md` | v0.8.x operations singularity implementation plan |
| `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md` | v0.8.x-final overarching command authority cleanup plan |
| `docs/plans/2026-04-06-studio-health-repo-truth-plan.md` | Permanent side lane for repo-truth gates, roadmap/board sync, warning disposition, artifact policy, and calibration evidence retention |
| `docs/plans/2026-04-30-roadmap-plan-coverage-and-system-integration-audit.md` | Architect audit of roadmap plan coverage and cross-plan dependencies |
| `docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md` | Cross-system gradecard that closed the v0.8-to-v0.9 hardening band and promoted residual work into v0.9.x |
| `docs/plans/2026-03-31-v08to09-save-load-and-replay-hardening-plan.md` | v0.8-to-v0.9 save/load, replay, and migration hardening |
| `docs/plans/2026-03-31-v08to09-ui-surface-ownership-plan.md` | v0.8-to-v0.9 UI surface ownership matrix |
| `docs/plans/2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md` | v0.8-to-v0.9 UI density and shell cohesion |
| `docs/plans/2026-04-03-v08to09-product-architecture-simplification-plan.md` | v0.8-to-v0.9 product architecture simplification |
| `docs/plans/2026-03-31-v08to09-army-command-maturity-plan.md` | v0.8-to-v0.9 army-command maturity |
| `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md` | v0.8-to-v0.9 army/corps handshake and authority coherence |
| `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md` | v0.8-to-v0.9 truthful explanation surfaces |
| `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md` | v0.8.3 player command review UX |
| `docs/plans/2026-03-31-v084-autonomy-determinism-and-review-plan.md` | v0.8.4 determinism, fallback, and review gates |
| `docs/plans/2026-03-24-v080-political-leader-bot-plan.md` | v0.8.2 political bot (38 tasks) |
| `docs/plans/2026-03-24-v081-order-interpretation-plan.md` | v0.8.3 order interpretation |
| `docs/plans/2026-03-24-v082-autonomy-api-plan.md` | v0.8.4 autonomy + Claude API |
| `docs/20_engineering/PLAYER_VISIBLE_STATE.md` | Canonical player-visible truth boundary and knowledge-integrity contract |
| `docs/20_engineering/UI_OWNERSHIP_MATRIX.md` | Surface ownership matrix for Warroom, Army HQ, map panels, ops, review, and future shells |
| `docs/20_engineering/DEBUG_SURFACE_POLICY.md` | Debug-vs-player surface contract and leak-prevention rules |
| `docs/20_engineering/FEATURE_DONE_MEANS.md` | Studio closeout contract for truth, verification, and visible ownership |
| `docs/plans/2026-03-24-v090-consequence-system-plan.md` | v0.9.0 consequence system |
| `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md` | v0.9.0 consequence-system refresh against current repo truth |
| `docs/plans/2026-04-30-v09-presidential-campaign-loop-closure-plan.md` | v0.9 cross-system presidential campaign-loop closure |
| `docs/plans/2026-05-01-v09-product-spine-megalane-plan.md` | Active v0.9 mega-lane board for large autonomous work: trajectory foundation, opportunity families, product spine, proof platform |
| `docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md` | Operating discipline for Claude/Codex parallel autonomous mega-lanes and stop gates |
| `docs/plans/2026-04-30-v09-formation-life-believability-plan.md` | v0.9 formation-life believability and warning-family ownership |
| `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md` | v0.9.1 dynamic Codex divergence + endgame comparison |
| `docs/plans/2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md` | v0.9.0 victory conditions and Pyrrhic score |
| `docs/plans/2026-03-31-v090-sensitive-history-design-gate-plan.md` | v0.9.0 sensitive-history / atrocity representation gate |
| `docs/plans/2026-04-06-v093-performance-accessibility-plan.md` | v0.9.3 performance + accessibility |
| `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md` | v0.9.4 visual polish + legendary map features |
| `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md` | v0.9.5 platform packaging + store |
| `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md` | v0.9.2 tutorial and onboarding |
| `docs/plans/2026-04-30-v1-gold-readiness-integration-plan.md` | v1.0 gold readiness integration gate |
| `docs/plans/2026-04-30-post-1-0-content-execution-plan.md` | post-1.0 content update coverage and child-plan triggers |
| `docs/plans/2026-04-30-roadmap-open-design-questions-resolution-plan.md` | open roadmap design-question resolution process |
| `docs/plans/2026-03-29-concurrent-corps-operations.md` | v0.8.0 concurrent corps ops design |
| `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md` | Simplification hit list |
| `docs/plans/2026-03-21-tech-debt-backlog.md` | Technical debt backlog (simplification phase) |
| `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md` | v0.8.x multi-brigade operation design |
| `docs/30_planning/OPERATION_REEVALUATION_DESIGN_SPEC.md` | v0.8.x operation reevaluation on brigade loss |
| `docs/30_planning/design/CLAUDE_AI_COMMANDER_DESIGN.md` | AI Commander full design |
| `docs/30_planning/design/LEGENDARY_FEATURES_BRAINSTORM.md` | Legendary features catalog |
| `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` | Endgame, negotiation and scoring design |

---

## 2026-04-09 hardening board note

- Closed this wave:
  - `zero_combat_corps` now respects Graz cold-front truth (`n1409`)
  - territorial warnings now respect canonical sector coverage (`n1410`)
  - `brigade_stacking` now respects same-sector frontline coverage truth (`n1412`)
  - `frontline_density_imbalance` now excludes Graz cold-front sectors before computing faction density outliers (`n0`)
  - `brigade_never_fights` now gates on live non-cold sector/loan ownership and demotes from warning to info (`n4`)
- Still active:
  - the residual Gorazde territorial pair still needs exact seam classification before another hardening claim
- Demoted / redesign-blocked:
  - same-faction ownerless unreachable brigades (`rs_1st_podrinje`, `rs_5th_podrinje`)
- Investigated and demoted to realism/doctrine:
  - `arbih_444th_mountain` salient overextension near Konjic is not a cutoff/ownership bug; it belongs in doctrine / target-selection work
  - remaining non-cold `frontline_density_imbalance` sectors now look like live force-distribution extremes, not detector owner drift

## 2026-04-10 hardening board note

- Closed this wave:
  - packaged startup snapshot proof no longer mutates the committed April 1992 artifact during guardrail tests
  - baked startup snapshot contract now normalizes checkout line endings before comparing against canonical builder truth
  - own-sector force-balance precision is now demoted to qualitative staff-abstraction labels across CorpsFrontPanel, Army HQ sectors, Situation-tab OPSEC, and the player-safe front tooltip
- Still active:
  - rotate back to the global board after the player-knowledge threat-precision closure; next bounded candidates should come from live player-knowledge, harness, or command-shell evidence rather than the exhausted startup board
- Demoted / redesign-blocked:
  - same-faction ownerless unreachable brigades (`rs_1st_podrinje`, `rs_5th_podrinje`)
- Investigated and demoted to realism/doctrine:
  - `arbih_444th_mountain` salient overextension near Konjic remains planner/doctrine work, not startup/package or anomaly-owner hardening


## 2026-04-11 hardening board note

- Closed this wave:
  - front-edge hover/click/glow ownership now has one display-only completion owner shared by the map renderers
  - real-save map payload proof now guards against visible front-edge faction-sides with missing `sector_id`
  - East Bosnia `donje_zesce__mazlina` front-edge ownership now stays selectable from both sector sides
  - final sector packets now run through a post-merge geometry invariant pass so late merges cannot serialize sectors above `MAX_SECTOR_EDGES`
  - contact graph `shared_segments` derivation now uses tolerance-aware segment matching, so real shared polygon borders are not downgraded to point-only contacts by coordinate drift
- Still active:
  - remaining map complaints must be rechecked against refreshed Electron data and then sorted into renderer styling, stale loaded save, geometry data, or planner/doctrine seams instead of treated as one blended sector-continuity bucket
- Closed afterward:
  - shared-front same-corps brigade assignment no longer starves small sibling sectors on the Herzegovina Foca/Kalinovik rim
  - final sector reconciliation now recomputes end-of-turn spatial truth instead of trusting cached mid-turn context
  - fresh real-save proof now requires every current Herzegovina-rim war edge to keep a `sector:vrs_herzegovina:*` owner
- Demoted / redesign-blocked:
  - same-faction ownerless unreachable brigades (`rs_1st_podrinje`, `rs_5th_podrinje`)
- Investigated and rejected:
  - sim-side front-edge backfill inside `corps_front_sectors.ts` was rejected for this lane because it broke `scenario_vrs_operation_proof`
