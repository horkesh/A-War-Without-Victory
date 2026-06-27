# Player-Experience Direction — "Authorship of the Tragedy"

**Date:** 2026-05-31
**Status:** DIRECTION (panel-ratified) + phased plan. Phase 1 SHIPPED (PR #68); Phase 2 slice 1 SHIPPED (PR #70); game-start intro SHIPPED (PR #71); AI-as-player president prototype + determinism harness SHIPPED (PR #72, `tools/ai_play/`); Phase 3 Thread 1 (RESPONSE: atom) SHIPPED (PR #80); **Phase 3 Thread 2 (dilemma spine — "The Choices That Made This War" Codex section, 7 keystone-tagged events, `dilemmaSpine` read-model) SHIPPED (PR #82 + faced-fix PR #83).** Remaining: Phase 2 deepening (override-without-proposal, officer dossiers — scoped); sensitive-essay branch annotations (owner/historian-gated); patron-dependence dilemma DEFERRED (dimension, not a keystone event).
**Author:** Pyrrhic specialist panel (Game Designer + UX/Event-Decision + Tech Architect + Historian), convened 2026-05-31.
**Scope:** Records the player-experience vision, binding guardrails, and the three-phase delivery plan so future sessions inherit the intent — not just the code.

---

## 0. Vision — "Authorship of the Tragedy"

The panel's direction for the player experience is **authorship of the tragedy.**

- **Player fantasy:** the dignity of hard triage under constraint — *hold what you can, name what it cost.* This is explicitly **not** a fantasy of conquest, territorial growth, or "winning" the war.
- **Mastery:** reading the constraints and choosing *which* catastrophe — never avoiding catastrophe. The arc is one of **escalating powerlessness**, not an accreting power fantasy. A skilled player loses *better*, on terms they chose and can defend, not less.
- **Core finding (the reason this is tractable):** the engine, the six richest historical dilemmas, and the decision surfaces **already exist** in the repo. This is a **wiring + framing problem**, not a request for new systems. The work is to make existing state legible as authored tragedy.

This direction is consistent with the long-standing project framing (negative-sum wargame: exhaustion, political collapse, constrained agency) and with the earlier `docs/plans/2026-03-24-v090-consequence-system-plan.md` "delay is the point" thesis — this doc supplies the *player-facing framing* that plan left implicit.

---

## 1. Guardrails (binding)

These are hard constraints on every phase below. Violating them breaks either the design intent or determinism.

1. **Atrocity must COST, never reward.** Realized atrocity surfaces through a Cost Ledger feeding an ICTY-style **Verdict**. There is **NO** gamified atrocity lever, no meter that ticks up as a reward, no efficiency framing. Hard stop: if a mechanic makes atrocity instrumentally attractive, it is wrong.
2. **Surface REALIZED consequences + the commander's ESTIMATE — never a what-if.** The UI shows what actually happened plus the in-fiction commander's prediction at decision time. There is **NO** UI-side re-simulation / "what-if" preview (it is both a determinism hazard and expensive). Consequences are **monotonic, delayed, and negative-sum** — the framing must not fake tight, immediate causality the engine does not actually model.
3. **Determinism is preserved.** Player orders are **staged into state**, resolved **in-pipeline at a fixed phase order**, and **cleared each turn**. **Headless scenarios never set player orders**, so calibration baselines stay untouched. **Ops-only attacks** remain inviolate — player intent routes through the existing CorpsOperation / proposal path, never as direct brigade attacks.

---

## 2. Phase 1 — Consequence loop (SHIPPED, PR #68)

**Problem.** The event database already carried future-consequence metadata, but the player never received a post-choice **receipt** showing whether predicted downstream events actually came to pass. P17 (2026-06-27) retired the pre-choice `FutureConsequencePreview` modal surface, so this lane is now receipt/aftermath-owned rather than pre-choice preview-owned.

**What shipped.** `buildConsequenceReceipts(state, catalog)` (`src/ui/map/data/consequenceReceipts.ts:125`) classifies each player decision's predicted `opens_events` as **confirmed / pending / contradicted** (status union at `consequenceReceipts.ts:42`). The realized result is surfaced three ways:
- a **"Consequences Realized" callback** in `src/ui/map/components/TurnAftermathModal.tsx`;
- a **Chronicle card** (`src/ui/map/components/chronicle/generateChronicleEntries.ts` + `src/ui/map/components/chronicle/ChronicleCard.tsx`);
- **titled prose** in `src/ui/map/components/DecisionHistoryOverlay.tsx`.

**Temporal guard.** A predicted event is marked *confirmed* **only when `event_last_fired_turn[P] >= decision turn`** (`consequenceReceipts.ts:135`, `:184`), so a later decision can never be credited with causing an earlier event. Pending/contradicted (null fired turn) sort last (`:216`).

**Why this was verified-cheap.** The promise→receipt linkage was **already persisted** in the engine; Phase 1 only *read* it:
- `EventFutureConsequence.opens_events` (`src/sim/events/event_types.ts`) names real downstream event ids;
- `event_causality_log` carries `enables` edges with `source_response_id` (`src/state/game_state.ts:2458`, `:2172`; the `CausalityLogEntry` shape at `:2163`);
- `event_decision_log` records the player's decisions (`src/state/game_state.ts:2439`);
- `causality_query.ts` traverses these `enables` edges (`src/sim/events/causality_query.ts:61`, `:70`).

**Dependencies landed first.** PR #66 (`f54e7ba1`) event-system fix (silent-drop cap + backwards JNA-withdrawal modeling) and PR #67 (`cd5433a0`) desktop wiring (thread event definitions into `advanceTurn` so Codex events fire in the packaged app) were prerequisites; PR #69 (`8a629651`) added Codex review follow-ups (packaged-desktop events + Drina save backfill).

---

## 3. Phase 2 — "Back the officer" (SHIPPED — PR #70, slice 1)

**Goal.** Make the weekly signature decision a **commit / withhold / override** of a *named* commander's proposed operation, decided at **intent altitude** (back this officer's plan, hold them back, or override their judgement) — not at the altitude of brigade micromanagement.

**Why it is mostly wiring.** The commit/withhold proposal loop **already exists end-to-end**: `src/sim/ai_commander/proposal_generation.ts` generates proposals → `pending_proposal_reviews` holds them in state → accept/reject IPC → `player_op_response` → the in-pipeline guard consumes the response. (All four surfaces confirmed present; see `src/state/game_state.ts`, `src/sim/turn_phases/war_phases.ts`, `src/desktop/autonomy_ipc_contract.cjs`, `src/ui/map/desktop/useIPC.ts`.)

**Smallest viable slice.** Re-skin the proposal card with the **named-officer voice** (`src/ui/map/data/backTheOfficer.ts`) + a **force-ratio** read + an **Override** button that spends `command_authority`, shown to the player as an explicit *cost*. This is **zero hash risk**: it is a read-model over existing staged state, and headless scenarios never set the proposal/response flags.

---

## 3b. Also shipped this session (onboarding + AI-play foundation)

**Game-start intro (PR #71).** A two-step dramatic open at the live peace→war handoff (once-only via the existing `peaceWarTransitionSeen` gate): a fading "WAR HAS STARTED / APRIL 1992" splash (`WarHasBegunSplash.tsx`) → the `PeaceWarTransition` briefing extended with a per-faction "who you are" identity block (Identity / Situation / What-you-cannot-escape; RBiH = "President of the Presidency of the Republic of Bosnia and Herzegovina"). Orients the player in the dread from turn one — the framing front-end of "authorship of the tragedy." EN shipped; BCS deferred to the owner Bosnian pass (render path confirmed UTF-8/diacritic-clean — the stripped `messages.bcs.ts` is a fixable artifact).

**AI-as-player president prototype (PR #72, `tools/ai_play/`).** Proves the external-decision boundary: an agent plays the President via `desktop_sim` (`resolveEventDecision` injection), and the playthrough replays **byte-identically** from a recorded decision log (determinism boundary confirmed; LLM-safe). Dual value — it doubles as the sharpest playtest of the decision surfaces; its findings (empty `situation`, no `staff_recommended_response_id`, briefing buried under logs, no quantified stakes) are the to-do list in §5 for making decisions legible. Next: wire a real model; extend to Army-CO (plan-approval gate on `generateCampaignPlan`) / Corps-CO.

## 4. Phase 3 — Living codex + dilemma spine (TO SCOPE)

**Two threads.**

1. **Living codex.** Make **player decisions** — not only fired events — unlock and annotate codex essays, so the encyclopedia becomes a record of *this* war (the one the player authored), not a static reference. This extends the existing Dynamic Codex annotation substrate (the `cost_ledger_annotation` reader closure noted in the v0.9.0 consequence plan).
2. **Dilemma spine.** Foreground the already-seeded impossible choices as the backbone of the experience. All verified present in `data/scenarios/events/`:
   - **RS Six Strategic Goals** — `rs_strategic_goals` (`data/scenarios/events/war_1992.json:3`), branching to Owen-Stoltenberg and the Karadžić–Mladić split.
   - **Srebrenica demilitarization** — e.g. `civic_to_srebrenica_demilitarization` (`war_1992.json:1218`), `bosniak_national_to_srebrenica_demilitarization` (`:1493`).
   - **Accept-cantonization-vs-fight-on** across **Vance-Owen** (`croat_republic_to_vance_owen` `:2330`; `united_front_to_vance_owen` `:2601`), **Owen-Stoltenberg**, and **Contact Group**.
   - **HVO alliance-vs-separate-republic** (`croat_republic_*` branches).
   - **Patron dependence** (alliance/patron-confidence dimension paths).
   - **Karadžić–Mladić split** — `karadzic_mladic_split_1995` (`data/scenarios/events/war_1995.json:835`, with the `remove_mladic` option at `:891`).

**Bound on ahistorical branching.** Any divergence from history is framed as a **"Counterfactual staff path"** — era constraints are preserved (you cannot summon 1995 capabilities in 1992), and branches are **closed by choice / flags, not by date**. This keeps ahistorical play legible as *plausible counterfactual under the same constraints*, never as free alt-history.

---

## 5. Backlog (tracked — TG/combat Codex P2s)

Surfaced during the panel; not on the player-experience critical path, but recorded so they are not lost:

- **Empty-donor phantom TG** — a tactical group can form with no donor (`src/sim/combat/operation_preparation.ts`).
- **Cascade-before-revert** — cascade effects can apply before a revert resolves (`src/sim/combat/attack_resolution_osid.ts`).
- **AAR telemetry-after-dissolution** — AAR telemetry can be read after the operation has dissolved (`src/sim/combat/operation_aar.ts`).

---

## 6. Reference ledger (PR merge commits, verified on `main`)

| PR | Commit | Title |
|----|--------|-------|
| #66 | `f54e7ba1` | Event-system fix: silent-drop cap + backwards JNA-withdrawal modeling |
| #67 | `cd5433a0` | fix(desktop): thread event definitions into `advanceTurn` so codex events fire |
| #68 | `a60d5ce5` | feat(ui): consequence-receipt loop — realized-consequence callbacks + decision chronicle |
| #69 | `8a629651` | fix: Codex review follow-ups — packaged-desktop events + Drina save backfill |

**Ledger status:** PR #66 is recorded in `docs/PROJECT_LEDGER.md` (the `[2026-05-31]` event-system entry); PR #67, #68, and #69 were added to the ledger in the same change that committed this doc.
