# Path to A — Per-System Remediation Plan

**Date:** 2026-06-09
**Status:** PLAN / observation-only — no code changes. Companion to `docs/40_reports/GAME_STATE_RATING_MASTER.md` (2026-06-09 re-grade).
**Purpose:** For every system **not yet at A**, the concrete work to bring it to **A**, with effort, owner, dependencies, and honest caveats where "A" is the wrong target.

> **Reconcile with the other agent's in-flight work:** `docs/plans/2026-06-08-v1.0-definition-of-done.md` and `docs/plans/2026-06-09-combat-realism-lane3-SCOPING.md` were being authored concurrently. The combat-realism rows here defer to those drafts; merge before executing.

**Ownership legend:** `ENG` engineering · `CAL` calibration (one-change-per-run, 188w-gated) · `ART` artist · `COMP` composer/audio · `NAT` native-speaker (BCS) · `OPR` operator/go-to-market · `DSN` design/canon gate.

---

## Already at A or above — protect, don't re-open

Determinism (A+), Corps commander AI (A), Sector/front-line (A), Endgame/Verdict (A), Warroom hero art (A), Inbox+Decision Room (A), Turn Aftermath (A), Presidential Command Model+Surface (A), Historical fidelity (A), Dynamic Codex (A), Sensitive-history handling (A), Architecture docs (A+). These are the regression-watch list from §5 of the rating master.

---

## Simulation core

| # | System | Now | Steps to A | Effort | Owner | Deps / notes |
|---|--------|----:|-----------|-------:|-------|--------------|
| 2 | Combat resolution | B+ | Ship casualty **Lane 1** (canonicalize + lower KIA split 0.30→~0.18) + **Lane 2** (missing/captured leak) to **recover the war-or-game realism approval**; then tune the **predictor confidence band** (COMBAT-P14: feed defender artillery/terrain/entrenchment into `checkLaunchFeasibility`). | ~6–8d | CAL+ENG | 188w-gated. Lanes 1/2 reporting-only (no territory cascade). Lane 3 (front-attrition volume) is the other agent's active scoping — coordinate. |
| 4 | Bot AI — Army HQ / political | A- | Un-gate political→military feedback on the **historical** path (currently emergent-gated → flat); activate PDP `intl_standing` + `internal_cohesion` channels as **serial faction-asymmetric calibration lanes**. | ~7d | CAL+ENG | intl_only lane already scoped; each channel one 188w run. |
| 5 | Bot AI — Brigade / tactical | A- | Land **ADR-0007 Phase C shared-attrition LIVE** (default-on once the defender-present/low-cohesion activation residual closes); close the **`sector_front` inert subset** (~61 cases/40w). | ~7–10d | ENG | Canon already accepts ADR-0007; needs activation-residual + Guardrail-1 sign-off. |
| 6 | Operations | A- | Op-level **failure-abort** (Issue #29) + repeated-objective **halt memory** + a **feasibility veto** tied to defender artillery. | ~5d | ENG | Builds on the Combat predictor work (#2). |
| 8 | Supply / logistics | B | **Two-grade lift** — per-brigade ammo scarcity + **VRS corridor-strangle** mechanic + corridor drill-down / relief-path UI. | ~12–15d | ENG+DSN | Realistically a B→B+→A arc; consider **B+ as the interim target** this cycle. |
| 9 | Early war / militia | A- | **BFS encirclement detection + enclave-bottling** (bot avoidance + supply penalty) — closes the Žepče HVO root cause. | ~10d | ENG | Design exists in `enclave_mechanics_research`. |
| 10 | Officer / personnel | B+ | Either (a) wire officer **competence into combat resolution** (gated DSN lane) or (b) broaden **historian-reviewed mini-bio/trait coverage + portraits**. (b) is safer/cheaper. | ~10d | ENG/ART/DSN | Behavior-wiring needs a design/canon gate; CK3 depth is out of scope. |
| 12 | Event / decision | A- | Breadth of **emergent (non-scripted) event triggers** from live-state pressure (not just calendar windows). | ~14d | ENG+content | Substrate ready; this is authoring + trigger plumbing. |
| 13 | Cost Ledger + Consequences | A- | Add **combat readers** of the casualty ledger so losses feed morale/cohesion (currently 9 writers / 0 combat readers). | ~7d | ENG | Pairs naturally with #2. |
| 14 | Economy / industrial | C+ | ⚠️ **A is likely the wrong target.** Recommend **descope to B** by leaning into scarcity (recruitment cost, equipment delivery, mobilization waves with UI) rather than a Vic3 economy. Full economy ~20d for a layer the Game Bible says isn't the game. | ~3d (descope) | DSN | Decision needed: own "no economy" explicitly + UI to match. |
| N1 | AI command chain / officers | A- | Corps-tier **catastrophe-memory** + **feasibility veto**; make the persona harness **influence** decisions rather than decorate them. | ~7d | ENG | Overlaps #6/#2. |

---

## Frontend / shell

| # | System | Now | Steps to A | Effort | Owner | Deps / notes |
|---|--------|----:|-----------|-------:|-------|--------------|
| 16 | Tactical map (rendering) | B+ | Terrain **hillshade** base layer + **seasonal tint** + animated front-line "breathing" on stance change + **battle-flash** markers. | ~15d | ENG+ART | The biggest "Paradox feel" gap. |
| 17 | Tactical map (info design) | A- | Per-OSID **hover dossier** parity + browser/Playwright validation of the 4 map surfaces. | ~5d | ENG | Read-model already exists. |
| 18 | Warroom (React shell) | A- | **Diegetic toolbar** (replace flat text buttons with in-scene objects); unify hotspot + toolbar nav idioms. | ~7d | ENG+ART | |
| 20 | Army HQ modal | A- | First-paint **density/hierarchy** — collapse/compress the always-open top-section grid. | ~3d | ENG | |
| 22 | Chronicle / Codex UI | A- | Cross-link **graph view** of the codex unlock web + cinematic **chapter** layout. | ~14d | ENG+content | |
| 24 | Onboarding / tutorial | B+ | **Just-in-time contextual teaching** for the new command surface + Playwright first-session capture. | ~5d | ENG | |
| 25 | Side picker / first-run | B | **Faction-fantasy framing** + asymmetric-cost preview at selection. | ~3d | ENG+DSN | |
| 26 | Pause / settings | B | **Keybind remap UI** + real audio/video controls + surface the 33 a11y guards in-panel. | ~5d | ENG | |
| 27 | Performance | B | 188w **frame/turn budget instrumentation** + next sector-reconstruction cut from existing sidecar evidence. | ~7d | ENG | |
| — | **Quick win:** convoy/patron art wiring | — | Either add `convoy`/`patron_relations` to `DIRECTIVE_LEVER_TO_ACT_ID` (give them a DirectiveCard surface) or repurpose the 6 orphan `act_*` assets. | ~0.5d | ENG | Closes the "ready but unrendered" loose end. |

---

## Content / lore / narrative

| # | System | Now | Steps to A | Effort | Owner | Deps / notes |
|---|--------|----:|-----------|-------:|-------|--------------|
| 29 | Essay / Codex corpus | A- | Index the remaining ~6 disk essays + add **inline citation rendering** to the player. | ~7d | content/historian | |
| 31 | Chronicle spine | A- | A **first-class authored campaign-narrative** layer (chapter prose threading the existing spine). | ~14d | narrative | Consume existing Cost-Ledger/Codex tokens, no new state owner. |
| 33 | Music / soundscape / VO | C- | ⚠️ **Largest single lift.** Commission **1 theme + 4–6 ambient + UI set + 3–5 stingers (+ optional VO)** and build the asset-backed playback service on the existing bus. A-grade likely needs VO. | ~45–60d | COMP+ENG | Silence is the loudest "not AAA" tell. |

---

## Code / engineering

| # | System | Now | Steps to A | Effort | Owner | Deps / notes |
|---|--------|----:|-----------|-------:|-------|--------------|
| 34 | Maintainability / god files | B | Decompose the 4 hot files (`validateGameState` 4188, `war_phases` 4105, `GameStateAdapter` 3428, `scenario_runner` 3397, `corps_front_sectors` 3318); delete `_archived/ui_legacy` dead tree (~15k LOC). | ~15–20d | ENG | Step-pack extraction; byte-identical guardrail. |
| 35 | Test suite | A- | **Playwright visual regression** for the hero screens; replace `test.skip`'d byte-hash golden baselines with structural fingerprints. | ~7d | ENG/QA | |
| 36 | CI/CD | A- | Close the **gating hole** (full + 188w suite on feature→feature PRs, not only main-targeted) + build the **release-notes generator**. | ~3d | devops | Highest-leverage eng fix; closes the documented false-green. |
| 37 | Build system | A- | **Code-signing** certs + signed artifacts + reproducible-build proof across clean hosts. | ~14d + cert lead | ENG+OPR | Cert procurement is operator. |
| 39 | Telemetry / observability | B- | Opt-in **upload adapter** + crash-aggregation dashboard + privacy-reviewed playtest telemetry. | ~10–14d | ENG | Policy already decided; implementation pending. |

---

## Production / shipping

| # | System | Now | Steps to A | Effort | Owner | Deps / notes |
|---|--------|----:|-----------|-------:|-------|--------------|
| 40 | Accessibility | B | Browser/axe spot-check evidence + formal **WCAG-AA conformance** pass + screen-reader/keyboard coverage. | ~5d + audit | ENG/QA | P0 static gates already closed. |
| 41 | Localization | C+ | **Native-speaker BCS sign-off** on flagged strings + broad UI/prose extraction + terminology pass. | native review + ~20–60d | NAT+ENG | The Bosnian War needs Bosnian; native review is the credibility gate. |
| 42 | Packaging / installer | B+ | Operator-executed **clean-VM matrix** + **signed** installer. | matrix + cert lead | OPR+ENG | Matrix is a checklist today, not executed evidence. |
| 43 | Store presence | F | Steam page + store assets + depot + SKU. | ~30d | **OPR** | Not engineering debt. |
| 44 | Playtesting / community | C | Closed-beta cohort + Discord/forum + public bug tracker. | ~14d + ongoing | **OPR** | Package already built (`docs/playtesting/v092/`). |
| 45 | Trailer / press kit | F | Announce trailer + per-system deep-dive + 8 screenshots + key art + press kit. | ~30d | **OPR+ART** | Command-card/decision art exists internally to seed it. |

---

## Fastest path to "A overall"

The overall grade is dragged by **production (operator)** and **two software anchors (audio, god-files)**. Sequence by impact/effort:

1. **Software A-band sweep (parallelizable, ~4–6 weeks, 1–2 devs):** casualty Lanes 1–2 (#2, recovers the one regression), CI gating hole (#36), convoy/patron art quick win, Army HQ density (#20), map info validation (#17), onboarding JIT (#24), Cost-Ledger combat readers (#13). These flip ~7 rows to A at low cost.
2. **Engine depth (parallel, ~3–4 weeks):** ADR-0007 Phase C live (#5), ops feasibility veto (#6), enclave-bottling (#9), PDP channel activation (#4). Flips the remaining sim rows.
3. **Commissions (long lead, start now):** audio composer (#33) and native-speaker BCS (#41) — both gate A and have weeks of external lead time, so kick them off first even though they finish last.
4. **God-file decomposition (#34) + telemetry (#39):** ~3–4 weeks eng, schedule against the above.
5. **Operator track (independent):** store (#43), trailer (#45), playtest (#44), signing/clean-VM (#37/#42) — your call on timing; none are code-blocked.

**Honest framing:** "every system at A" is a multi-month program even with the above. The *software-controllable* rows can reach A in roughly **2–3 focused dev-months**; the rest is **commission lead time (audio, native loc)** and **operator go-to-market**. One target should be re-set deliberately: **Economy → B (descope), not A.**

---

## Cross-references
- `docs/40_reports/GAME_STATE_RATING_MASTER.md` (2026-06-09 re-grade)
- `docs/40_reports/proposals/20260608_CASUALTY_MODEL_REALISM.md` (the one regression's fix)
- `docs/plans/2026-06-08-v1.0-definition-of-done.md` (other agent — reconcile scope overlap)
- Leverage list & "don't-break" list: rating master §4 / §5
