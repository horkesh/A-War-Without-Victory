# Free War Model — Design

**Date:** 2026-06-01
**Status:** DESIGN (Pyrrhic panel synthesis) — for owner review/redirection. Nothing built yet.
**Origin:** Owner directive — *"Determinism only goes so far. That goes for both these ops and AI-as-bot. We need more freedom of choice, not railroads."*
**Panel:** Game Designer + Tech Architect + AI/Bot-Behavior + Historian (convened 2026-06-01).
**Supersedes the framing of:** the heavily determinism-gated scoping of Phase 2 Option B (author-new-op), which is folded in here as Phase 4.

---

## Owner decisions (locked 2026-06-01)

1. **There is ONE game — the free, emergent war.** No player-facing mode toggle. The player always fights a free war where both sides make real choices.
2. **"Historical" is NOT a player mode — it is an internal calibration test.** `decision_mode` survives only as dev/test plumbing: the calibration *scenarios* pin a historical-lock so CI can keep verifying "fed the real 1992–95 choices, does the engine still reproduce the real 1992–95 outcome?"
3. **Keep calibration — it is the health indicator of the simulation.** The historical-reproduction regression (40w/52w/188w byte-identical under historical-lock) stays as the objective check that the engine remains realistic as we make it free. It does not constrain the free game (the lock forces the historical default and bypasses scoring) and players never see it.
4. **Start with Phase 0 (the keystone):** add the `decision_mode` plumbing, activate the emergent scorer for the game, and prove the historical-locked path still reproduces the baselines byte-identical — i.e. prove we made the AI free without breaking the engine's grip on reality.
5. **Mode exposure (global vs per-faction) is moot** — there is no player-facing mode. `decision_mode` defaults to `historical` for migration safety (existing saves/baselines unchanged); new campaigns explicitly set `emergent`; calibration scenarios explicitly declare `historical`.

---

## 0. The reframe — determinism is not the railroad

Two things had been conflated:

- **Determinism / reproducibility — SACRED, keep.** `runTurn(state)` is pure: no `Math.random`, no `Date.now`, sorted iteration via `strictCompare`. Same inputs (including player choices) → same outputs. **Freedom ≠ randomness:** an emergent bot is a *deterministic `argmax` over a scored option set* with a `strictCompare` tie-break. Nothing about free choice requires dice.
- **"Bots pick the historical option[0]" + baseline byte-identity + human-only feature-gating — a CALIBRATION TOOL, not a gameplay law.** *This* is the railroad. Protecting a calibration number by forbidding consequence, and scripting the AI to replay 1992–95, is scaffolding masquerading as design.

**Resolution:** "follow history" becomes a **selectable mode**. The historical scenario stays byte-identical *in historical mode* (the engine-correctness anchor / calibration regression); **emergent mode is the game.**

---

## 1. Two modes

`state.meta.decision_mode: 'historical' | 'emergent'` (default `'historical'`).

- **historical** — bots resolve to historical defaults; 40w/52w/188w regression byte-identical. The documentary / calibration path.
- **emergent** — bots choose from battlefield + political signals; play diverges into a *bounded counterfactual*.

**Guardrail against silent drift (Tech Architect):** baseline scenarios must **explicitly declare** `decision_mode: 'historical'` — never rely on the default. Add a save-migration that stamps it, and a CI assertion that baseline scenarios declare it. Mode is always an explicit, audited field.

---

## 2. KEYSTONE — unify the decision scorer (de-railroad event decisions)

**The architectural finding:** an emergent decision engine *already exists* — `pickPoliticalResponse` (personality + `PoliticalAssessment` + a `divergence_threshold`) and `pickBotResponseV1` (capital/personality-weighted `argmax`). It is **bypassed** today: when `AWWV_TWO_LEVEL_NOTIFICATIONS=true` (the active baseline), `evaluate_events.ts:~607-628` routes to `applyAIDefaultResponse` — the pure railroad (`historical_default_response_id ?? options[0]`, *zero signals consumed*). A whole built brain sits dark.

**The trap to avoid (AI specialist):** if calibration stays on `applyAIDefaultResponse` while the game ships `pickPoliticalResponse`, *the thing you regression-test is no longer the thing you ship* — calibration becomes theater.

**The fix:** unify on **one** scorer. Historical mode = the political scorer with `divergence_threshold → ∞` (history-locked: always returns the historical default). Emergent mode = thresholds bite. The **same function** produces the frozen calibration hash *and* the emergent game.

**KEYSTONE MIGRATION TEST (gates everything):** prove `pickPoliticalResponse(threshold=∞)` reproduces `applyAIDefaultResponse`'s output for the baseline scenarios → 40w/52w/188w **byte-identical**. Until that equivalence is green, do not flip modes. (There is real risk the two paths differ today and need reconciliation — that reconciliation *is* Phase 0.)

Chokepoint file: `src/sim/events/evaluate_events.ts:~609-611`.

---

## 3. Emergent military behaviour — signals, not the calendar

`bot_strategy.ts` doctrine/priorities are **calendar-driven**: `getActiveDoctrinePhase` keys purely on `turn`, so RS goes offensive w0–12 because the *clock* says 1992, not because it is winning. `VRS_ARMY_PRIORITIES` hardcodes Drina/Posavina/Sarajevo by week-window.

**Fix:** make priorities **live multipliers** — `weight × f(threat_ratio, force_ratio, supply, recent_territory_change)`. Drina priority *decays* if the Drina is quiet while a real crisis opens elsewhere; `argmax` over the scaled weights. `commander/decide.ts` is *already* signal-driven (the template) — the railroad is upstream (priorities/stance/events), and the commander only modulates within the scripted envelope.

**Prerequisite signal gaps (Engine Health Audit, confirmed):**
- `recent_territory_change` — **absent** in `assess.ts`; corps theater assessment is blind to ground-loss trend.
- `supply_by_osid` — reaches the briefing but is **not consumed** in force-eval (hardcoded 0.8).
- `CampaignPlan` — exists in `campaign_plans` but is **structurally disconnected** from corps decisions.

Good emergent military AI depends on wiring these first.

---

## 4. Strategic goals as PRIORS, not scripts

The RS "Six Strategic Goals", the Karadžić–Mladić split, the genocide trajectory are **ICTY-documented intent** (Karadžić, Mladić, Krstić judgements). In a free war they become **high-prior doctrine**: a standing `dimension_weights` skew (territorial_legitimacy / corridor-contiguity heavily weighted) + persistent `bot_priority_shift` adds for Drina/Posavina/corridor. They **bias** the score so RS *usually* pursues them; a strong enough battlefield signal can override at a modeled political/cohesion **cost**. Weighting ≠ forcing. *RS not chasing its goals would be a weight bug, not freedom.*

`divergence_threshold` is the **anti-thrash damper** (RS=12, RBiH=18, HRHB=8 today): history is the prior; signals override only when clearly justified. High = history-sticky. **Never ∞ in emergent** (that's re-railroading).

---

## 5. The constraint model — realism vs rails

**LEGITIMATE — keep (this *is* the wargame):** adjacency, supply state, the brigades you actually have, era capability, **Command Authority as a finite resource**, ops-only attack routing.

**ILLEGITIMATE — remove (rails):** bots hardcoded to `options[0]`; player features gated solely to protect the baseline; date-gated branch closure.

**The line:** *"You can't do that **yet / here / with what you have**" = realism. "You can't do that **because history didn't**" = rail.*

**Per-faction-year ceilings (Historian) — these keep divergence a plausible counterfactual, not fantasy:**
- **Capability:** RBiH under arms embargo (UNSCR 713) until lifted *in-fiction*; VRS inherits JNA artillery/armor but a *finite* manpower/mobilization ceiling; HVO tethered to Zagreb's supply.
- **Political:** patron dependence is a hard rail; **Deliberate Force is a 1995 flag-unlock** (UNPROFOR hostage crisis, market massacres, dual-key politics), *never* a calendar unlock.
- **Internal cohesion:** multi-front overreach fractures (free HVO fighting ARBiH + VRS hard bleeds cohesion as it historically did pre-Washington).

---

## 6. The negative-sum floor — THE soul guardrail

**The "competence escape hatch" (Game Designer):** the instant a free AI plays suboptimally, a skilled player out-generals it and starts *winning* — territory growing, war shortening, exhaustion easing. That betrays the "authorship of the tragedy" soul faster than any railroad — we'd ship a conquest game by accident.

**Mitigation (binding):** the AI is free **tactically/operationally**, but the negative-sum **dimensions** (exhaustion, patron coercion, political collapse, the Verdict) remain **structurally inescapable**. *Freedom belongs to **how** you fight; the war's **cost** is not negotiable.* The free-AI lane and the dimension-pressure lane must be designed **together**. Freedom = freedom to **lose differently / author a different tragedy**, never to win easily.

---

## 7. Player agency in emergent mode

Concrete free choices (Game Designer): **triage geography** (hold/abandon pockets — the tragedy *moves*, it doesn't vanish: try to hold Srebrenica and a thinned front falls elsewhere); **sequence of accommodation** (accept/reject Vance-Owen / Owen-Stoltenberg / Contact Group on your own timing); **patron leash length**; **officer trust** (back / withhold / override, compounding into structural cost).

**author-new-op (Option B, re-framed):** becomes a **first-class state mutation** in emergent mode — a queued input drained at the *existing* fixed war-phase step (`player_op_response` drain at `war_phases.ts:~1036`, before `apply-autonomy-transition` at `:1051`), **not** a quarantined human-only bolt-on. The player **picks the brigades** (manual selection is the freedom that matters, not auto-select). Constraints = physical realism only (adjacency/supply/brigades). Cost = CA.

---

## 8. Ethics bright line — non-negotiable

- **Atrocity is NEVER rewarded / optimal / territory-positive on net.** *If any pathway exists where ordering or permitting ethnic cleansing yields a better end-state than not doing so, the design is broken.*
- Atrocity is an **emergent, cost-bearing consequence** of modeled pressure — **never a player-issued "cleanse OSID X" order.** It routes through the **Cost Ledger → ICTY-style Verdict**: monotonic, negative-sum (patron-confidence collapse, sanctions/intervention triggers, cohesion/legitimacy loss, war-crimes liability that outlives any territory).
- **Srebrenica** is modeled as the strategic *catastrophe* for RS legitimacy and the *trigger* for decisive intervention it was — never a tidy capture.
- **Sharpest risk (Historian): the "counterfactual genocide generator."** Free divergence can produce atrocities that *did not happen*, at places that *did not happen*, against named real communities — an ethical/reputational hazard distinct from depicting documented crimes. Mitigations: (a) atrocity emergent-consequence-only, never player-ordered; (b) every atrocity, historical or counterfactual, framed through the Verdict/Cost-Ledger lens — never narrated neutrally or admiringly; (c) "this is counterfactual; here is what actually happened" annotations (owner/historian-gated). **The war can diverge; the moral framing cannot.**

---

## 9. Determinism contract (emergent mode)

- Emergent decisions = deterministic `argmax` over a scored option set; `strictCompare` tie-break on a stable key; **never** random. No `Math.random`/`Date.now`.
- The **LLM event-decision path** (`event_decision_ai.ts`, `temperature`) is **non-reproducible** → must never be on a reproducible sim path. Quarantined behind an explicit human-interactive flag; **emergent *mode* uses the FORMULA scorer**, not the LLM.
- Emergent runs *will* diverge the hash (different OSIDs flip → different next-turn triggers) — fine; emergent runs are **not** baseline-pinned. Only historical-mode baselines are byte-identical-pinned.

---

## 10. Phased delivery

- **Phase 0 — KEYSTONE (gating).** Introduce `decision_mode` on `meta` (explicit on baselines + migration + CI assert). Unify event-decision resolution on the political scorer; prove `threshold=∞ === historical` **byte-identical** on 40w/52w/188w. De-railroads every event decision safely. *Highest value, lowest risk once the equivalence test is green.*
- **Phase 1 — emergent military priorities.** `bot_strategy` calendar → live-signal multipliers; wire the 3 missing signals (`recent_territory_change`, supply consumption, `CampaignPlan`→corps). Re-validate historical-mode byte-identical.
- **Phase 2 — strategic-goal priors.** Six Goals as `dimension_weights` skews + `bot_priority_shifts`.
- **Phase 3 — negative-sum floor hardening.** Dimensions structurally inescapable; co-designed with Phases 1–2.
- **Phase 4 — player author-new-op** as a first-class emergent action + **manual brigade selection** (Option B, re-framed; task #67 folds here).
- **Phase 5 — ethics machinery completeness.** Atrocity → Cost Ledger → Verdict for counterfactual events; counterfactual-framing annotations (owner/historian-gated).
- **Cross-cutting:** a **"distance from history"** read-model (history as benchmark/anchor, visible + auditable).

---

## 10b. Post-Phase-0 synthesis (panel scoping + emergent playtest, 2026-06-01)

Phase 0 shipped (PR #88 + Codex fix #89). Three parallel agents + an emergent-mode playtest reshaped the plan:

- **Phase 0 is a correct foundation but freedom is NOMINAL so far.** The emergent playtest (40w, stable + deterministic) changed **zero** event decisions: most events fall through to `pickBotResponseV1`, which still honors `historical_default_response_id`, and the genuinely-emergent `pickPoliticalResponse` only covers the narrow `POLITICAL_LOGICS` set (1 event in 40w). → **Phase 0.5** = de-railroad `pickBotResponseV1` in emergent mode + widen `POLITICAL_LOGICS` so the AI *actually* diverges.
- **Phase 1 is smaller than scoped.** The "3 missing signals" (`recent_territory_change`, supply, `CampaignPlan`) already exist in `army_hq_gathering`; they just don't modulate the **static `weight`** in `FACTION_ARMY_PRIORITIES`. Phase 1 = convert that constant into a live multiplier `weight × f(threat, force-ratio, supply, territory-trend)`, emergent-gated. Smallest slice: territory-trend → weight. Determinism: quantize the multiplier so FP near-ties don't flip the argmax (keep the existing name tie-break).
- **Phase 3 is MORE URGENT and moves first.** The game is **currently a conquest scoreboard**: the Verdict grade is ~90% `territory_controlled_pct` (`scoring.ts`), military success *eases* patron coercion (backwards), and a literal `max_exhaustion`/`max_settlements` victory condition (`war_termination.ts` / `victory_conditions.ts`) rewards staying fresh. The exhaustion accumulator is sound (monotonic), but the *outcome-deciding* dimensions are reversible + reward-positive — the "competence escape hatch" is wired in. Keystone fix (1 file, byte-identical post-termination): a monotonic `war_cost_index` (exhaustion + cumulative casualties + duration) **caps** the achievable grade independent of territory.

**OWNER DECISION (locked):** **No conquest win in emergent mode.** The free war ends only via negotiated settlement / timeout / political collapse (`war_termination.ts`) — never "hold N settlements + stay fresh ⇒ victory." There is no winning the Bosnian War. (Phase 3 disarms `victory_conditions` evaluation when `decision_mode === 'emergent'`.)

**Revised sequencing:** ✅ Phase 0 (#88) + Codex fix (#89) → **Phase 3** (verdict cost-floor + disarm conquest win — lock the soul before freedom makes winning possible) → **Phase 0.5** (make the AI actually diverge) → **Phase 1** (military priorities) → **Phase 4** author-new-op → **Phase 5** ethics machinery. Cross-cut: distance-from-history read-model.

---

## 11. Open decisions for the owner

1. **Default mode** — ship `'emergent'` as the default *game* experience, with `'historical'` an explicit calibration/documentary mode? *(Panel lean: yes.)*
2. **Sequencing** — keystone-first (event decisions, Phase 0) before player author-new-op (Phase 4)? *(Panel lean: yes — unify the scorer first; biggest railroad, de-risks everything; author-new-op then lands in a free world, not a scripted one.)*
3. **Mode exposure** — single global toggle, or per-faction (you play free, AI historical, etc.)? *(Panel lean: global first; per-faction later.)*
4. **Appetite for the keystone migration** — it requires proving the emergent scorer reproduces history byte-identical; `pickPoliticalResponse` may not equal `applyAIDefaultResponse` exactly today and need reconciliation. OK to invest there as the foundation?
