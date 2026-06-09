# AWWV × Anthropic — Developer-Relations / Partnership Pitch (consolidated)

**Date:** 2026-06-09
**Status:** ACTIVE — single source of truth for the Anthropic outreach. Consolidates the original 2026-03-16 strategy with the v0.9.6 reality (the AI command chain is now real, not a prototype).
**Consolidates / supersedes for this topic:**
- `docs/30_planning/design/PRICING_AND_BUSINESS_MODEL.md` § "Anthropic Partnership Strategy" (2026-03-16) — original strategy
- `docs/plans/2026-03-22-v06x-master-roadmap.md` § "Anthropic Developer Relations Pitch (after v0.6.3)"
- `docs/plans/2026-03-22-integration-audit-findings.md` — "Anthropic pitch video" deliverable row
- `docs/30_planning/design/CLAUDE_AI_COMMANDER_DESIGN.md` §§ credits / Pyrrhic-Credits paths (business-model home)

> The March plan assumed a *v0.4.5 prototype* and an *audience yet to exist*. As of v0.9.6-alpha.1 the technical premise is delivered and far deeper. This doc updates the pitch to match, and gives an honest readiness verdict.

---

## 1. The pitch (one sentence)

> "We built a deterministic, historically calibrated simulation of the 1992–1995 Bosnian War — a negative-sum wargame about exhaustion and political collapse, not conquest — where Claude can command the opposing armies through a three-layer chain of historically grounded personalities (president → army commander → corps commander). It is the first strategy game where your enemy genuinely thinks, built ICTY-grounded and safety-first."

Two-line variant for a public post: *"A 1992–95 Bosnian War sim where Claude commands the enemy as Mladić, Halilović, Petković — president to corps. Negative-sum, ICTY-grounded, no victory, only cost."*

---

## 2. What is actually built now (the evidence — this is the change since March)

| Claim | March (planned) | Now (v0.9.6-alpha.1) |
|---|---|---|
| AI command layer | a `v0.4.5` prototype | **shipped**: `src/sim/ai_commander/` (~2,400 LOC) — `anthropic_client`, `army_commander_ai`, `corps_commander_ai`, `personality_profiles`, `prompt_builder`, `response_parser`, `decision_log`, `decision_validator`, `player_advisor` |
| Persona depth | "Claude-as-Mladić" (one actor) | **three-layer persona chain**: president (Karadžić / Izetbegović / Boban) → army CO (Mladić; Halilović→Delić; Petković→Praljak→Roso) → corps CO — per-layer × per-faction × per-corps opt-in flags |
| Model tiering | proposed (Opus army / Haiku corps) | implemented + multi-model routing; opt-in in-game **Commander tier** (BYOK Anthropic key) |
| Cost (empirical) | "$5–15 / campaign" (estimate) | **measured** at Haiku 4.5: presidents-only 40w ≈ $0.46; army-CO 40w ≈ $0.45; full stack 40w ≈ $1.30; full-stack 188w ≈ $5–9 |
| Simulation depth | calibrating | **188-week historical run at 634/712 OSID (89%), anchors 29/30, 6/6 benchmarks**; 247 brigades; historical OOB + officer rosters; deterministic engine |
| Test scale | 879 tests | **3,513 tests / 298 suites** |
| Safety / sensitive-history | flagged as a risk | **engineered**: ICTY-grounded content gate (`SENSITIVE_HISTORY_DESIGN_GATE`), atrocity "bright line" tested as a verdict invariant, §6 sign-off chain, persona suppressors with ICTY citation guidance, negative-sum design (no conquest victory) |

Determinism note (for honesty): the **simulation pipeline is fully deterministic**; the LLM is an **opt-in sidecar** — an in-game AI opponent/advisor tier (BYOK) and a QA persona harness — never on the deterministic turn pipeline. The shipped default is a calibrated formula bot. "Your enemy genuinely thinks" is true of the opt-in **Commander tier**, and that framing must stay precise.

---

## 3. What to ask for (NOT money)

Unchanged from the March strategy, and now backed by a real artifact:
- **API credits** for development + early-access players (~$500–1,000 covers months; per-campaign cost is now proven low).
- **A case study** — they write it, we get exposure, they get a novel showcase. We can hand them a *reproducible* harness and real telemetry, not a mockup.
- **Technical guidance** — prompt caching + structured output for the multi-layer persona chain.
- **Early model access** for interesting projects.

---

## 4. Why Anthropic might care (strengthened since March)

- **Novel, reproducible showcase.** Claude reasoning *as Mladić* about the Brčko corridor vs. Sarajevo reinforcement — persona consistency, structured reasoning, moral complexity — now a runnable three-layer chain, not a single prompt.
- **Validates model tiering** with real numbers (Opus army / Haiku corps; $0.46–$9 per campaign by tier).
- **A safety story they can stand behind** (this is the biggest upgrade): the build *engineers* responsible handling of atrocity history — ICTY grounding, an atrocity bright line that is net-negative at verdict by construction, a sensitive-history authoring gate, persona suppressors that cite ICTY. It is the rare "AI plays a historical war criminal" framed as historical education + safety-conscious design.
- **An honest research finding worth publishing:** persona-grounding shifts the *shape* of LLM output (commander-flavored reasoning) without improving raw QA signal quality (~10–15% genuine signal regardless of persona depth, v0.9.6 D3.3). That candor + the persona-vs-quality result is itself an interesting dev-rel / applied-research story.
- **Wargames are a respectable AI-evaluation domain** (military strategy as an AI testbed since the 1950s).

---

## 5. Why they might hesitate — and how the current build answers it

| Hesitation (March) | Current answer |
|---|---|
| "AI roleplays a war criminal" headline risk | The whole design is built to *not* glorify: negative-sum, no conquest victory, atrocity costs are never rewards (tested invariant), ICTY-sourced, sensitive-history gate. Lead with this. |
| API revenue is negligible (~$50K/yr) | We're not pitching revenue — we're pitching a showcase + case study. Reframed correctly. |
| Framing matters | Position as historical simulation + educational tool + AI-safety-conscious design, never glorification. The repo already enforces this. |

---

## 6. Who / how to contact

- **Developer Relations**, not partnerships — they seek interesting use cases, run case studies, give credits.
- **Twitter/X is the best door** — post the demo video, tag **@AnthropicAI** and **@alexalbert** (head of dev rel). A compelling public demo beats a cold email.
- **Anthropic Discord** developer channel for additional visibility.
- Fallback: dev-rel email after a public post gets traction.
- **Apply for the Anthropic Accelerate / startup program** if available.

---

## 7. Readiness checklist

| Gate | Status | Notes |
|---|---|---|
| Working prototype of Claude making real decisions | ✅ **Exceeded** | three-layer chain, all 3 factions, real cost data, reproducible harness (`tools/claude_plays_vrs/`, `npm run sim:qa:commanders:api`) |
| Compelling 2-minute demo video | ❌ **Missing** | the single biggest gap; dev-rel responds to public demos |
| Audience signal (≈ few hundred Steam wishlists) | ❌ **Not yet** | Steam integration is v0.9.6+/v1.0 scope; playtest package ready (`docs/playtesting/v092/`) but outreach is operator-owned |
| Safety / framing posture | ✅ **Strong** | ICTY grounding + bright line + sensitive-history gate already shipped |
| Public-facing one-pager | ◐ **Partial** | `docs/50_launch/marketing/high_concept.md` exists; needs a pitch-specific cut |

**Verdict: technically ready (over-ready); go-to-market not yet.** We are ~one artifact (the demo video) away from a high-conversion approach.

---

## 8. Action items (in order)

1. **Record the 2-minute demo video** — owner/operator. Suggested beat: Claude-as-Mladić, given the live game state, reasoning aloud about Brčko corridor vs. Sarajevo, issuing the directive, and the deterministic engine resolving it — captioned with the negative-sum framing. (Optionally show the president→army→corps chain disagreeing.)
2. **Draft the public X post** around the video, safety-first framing, tags @AnthropicAI / @alexalbert.
3. **Cut a one-page pitch** from `high_concept.md` + §1–§5 of this doc.
4. **(Optional, parallel)** stand up a Steam "Coming Soon" page to start accumulating wishlists — strengthens the audience gate but is not blocking.
5. **Reach out** (X post first; dev-rel email follow-up; Accelerate application).

A written-only approach (email dev-rel now with the running harness + cost data + this doc) is possible today, but conversion is materially higher with the video — recommend not cold-contacting without it.

---

## 9. Honest caveats to keep in the pitch

- Claude-as-commander is **opt-in (BYOK)**, not the shipped default; the default is a deterministic calibrated bot. Don't imply every player faces a live Claude opponent unless they enable it.
- Persona depth improves *flavor/reasoning legibility*, not raw strategic win-rate or QA-signal quality (v0.9.6 D3.3). Pitch the **persona/narrative/moral-reasoning** value, not "the AI plays better."
- Keep all atrocity/sensitive-history content behind the existing gate; the pitch materials themselves must follow the same framing discipline.

---

## 10. Evidence pointers

- AI command source: `src/sim/ai_commander/` · QA harness: `tools/claude_plays_vrs/` · `docs/20_engineering/AI_COMMANDER_QA_SYSTEM.md`
- v0.9.6 "AI Officers (real)" closure + cost data: `docs/plans/MASTER_ROADMAP.md` § v0.9.6
- Safety substrate: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`, FORAWWV §X–§XVI
- Calibration baseline: `docs/40_reports/CALIBRATION_MASTER.md`
- Business-model detail (credits/BYOK/revenue-share): `docs/30_planning/design/CLAUDE_AI_COMMANDER_DESIGN.md`, `PRICING_AND_BUSINESS_MODEL.md`
- Public framing draft: `docs/50_launch/marketing/high_concept.md`
