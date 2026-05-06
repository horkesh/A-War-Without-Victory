# AI Officers + Army COs — Design Decisions Record

**Lane:** `LANE-NIGHTSHIFT-AI-OFFICERS-ARMY-COS-DDR`
**Date:** 2026-05-06
**Status:** **DECISIONS LOCKED** — binding for all P1-P5 (AI-officers) + A1-A5 (Army COs) implementation lanes.
**Authorization:** User trip-mode 2026-05-06: "Panel recommendations are confirmed. As for questions, research and implement best solutions for them. Aim for balance between fun and historicity."
**Predecessor proposals:**
- AI-officers P1-P5 framework (parent orchestrator analysis 2026-05-06)
- Army COs A1-A5 framework (parent orchestrator analysis 2026-05-06)

This DDR is the canonical reference for design choices that the implementation lanes must honor. Cite this document by file path in lane prompts; bind agent decisions to these clauses.

---

## Cross-cutting principle: balance fun with historicity

The Bosnian War's chain-of-command was historically dysfunctional in specific, named ways: Mladić exceeded Karadžić, Halilović overrode by Izetbegović, Praljak rotated by Boban. Capturing this is the entire point of the AI-officer + Army-CO architecture. **But** the player must always retain meaningful agency: blind insubordination "for realism" feels like input lag.

The balance pattern adopted across all decisions below: **deviation is bounded, predictable, and visible-before-action**, AND the player always has a deterministic override path with a legible cost.

---

## Q1 — Player's role at army level

**Decision:** Player issues **POLITICAL directives** by default; Army CO autonomously translates them into corps directives. Player can DIRECTLY override at the corps level (set corps stance, launch operation) at a `political_capital` cost.

**Political directive vocabulary (the player UI):**
- "Hold the Drina at all costs" (DEFENSIVE-WEIGHT)
- "Press for Sarajevo encirclement" (OFFENSIVE-WEIGHT in named theater)
- "Maintain the Posavina corridor" (CONTINGENT-DEFENSE)
- "Prepare to absorb a counteroffensive" (RESERVE-WEIGHT)
- "Honor the truce / freeze the front" (NEGOTIATION-WEIGHT)
- (~6-10 directive verbs total; exact list in A2/A3 implementation lane)

**Corps-level override path (escape hatch):**
The existing player UI (`src/ui/map/components/PresidentialToolbar.tsx` + decision-room corps stance controls) already lets the player set corps stance directly. A1-A5 keep that surface but layer a **`political_capital` cost** when the player's directly-set value contradicts the army CO's interpretation. Default cost: 2 political_capital per override per turn. Override is always allowed; the cost is the friction.

**Rationale:**
- **Historicity:** Real political leaders gave political-strategic directives, not corps-level operational commands. Karadžić told Mladić "secure Sarajevo" not "1KK shift offensive Posavina." The current player-corps-direct chain is ahistorically tight.
- **Fun:** Player gets a richer political-leader vocabulary. Override path means they can still micromanage when they want to, but the system fights them when they go against their general's reading. That friction creates legible choices.
- **§8.3 (a) discipline:** Override cost is faction-symmetric; the same cost mechanism applies across all 3 factions; data drives any asymmetry (Karadžić-bot has higher tolerance than Izetbegović-bot, but at the data layer not the code layer).

---

## Q2 — Army CO authority shape

**Decision:** **ADVISORY**, matching the v0.8.3 corps-level Phase 1 plan.

The Army CO **interprets** the political directive into corps directives, **objects** via `PendingOfficerEvent` if there's friction (low compliance score), and **defers** to the political leader's accept/override/relieve choice. The Army CO does NOT autonomously change political directives.

(EXCEPTION: Q3 below permits opportunity-operation auto-launch within strict bounds.)

**Compliance-score thresholds (mirroring corps Phase 1 Order Interpretation):**
- ≥0.80: full compliance, no notification
- 0.50-0.79: modified interpretation (within deviation budget); notification issued
- 0.25-0.49: partial compliance; notification with explicit pushback
- <0.25: refusal; notification asking for override or relief

**Rationale:**
- **Historicity:** Real generals normally complied with civilian leadership but pushed back when they thought the order was wrong (Mladić routinely, Halilović pre-sacking, Praljak occasionally). This pattern matches advisory.
- **Fun:** Player retains decision authority on the political→army handoff. Friction is legible, never blocking.
- **Architectural symmetry:** Same shape as corps-level Order Interpretation Phase 1 (already shipped). Less to invent.

---

## Q3 — Mladić-class insubordination

**Decision:** **YES**, aggressive army COs (with new `stubbornness` trait ≥4 on a 1-5 scale) MAY autonomously launch "opportunity operations" the political leader did NOT explicitly order, **but only:**
1. The operation is in the existing `operation_opportunity_catalog_*` (canonical opportunity layer; no scripted railroads)
2. The army CO has issued **advance notification** at least 1 turn before launch (`PendingOfficerEvent` of new type `army_co_proposes_op`)
3. The political leader has **1 turn to override or relieve** before the op starts preparation
4. After 1 turn without override, the op enters preparation; the political leader can still relieve the army CO mid-prep at full transition penalty

**Bounds:**
- Stubbornness ≥4 + matching opportunity-catalog entry + sufficient theater readiness → autonomous proposal
- Stubbornness <4 → still proposes via notification but waits for explicit player approval (advisory shape)
- Maximum 1 autonomous launch per army CO per 12-turn rolling window (prevents runaway insubordination)

**Per-officer stubbornness initial values (1-5):**
- VRS: Mladić = **5** (Srebrenica 1995, Vukovar 1991 echo)
- ARBiH (1992-mid-1993): Halilović = **4** (Neretva '93)
- ARBiH (mid-1993+): Delić = **2**
- HVO (1992-late-1993): Petković = **2**
- HVO (1994-1995): Praljak = **3**, Roso = **2**

**Rationale:**
- **Historicity:** Mladić/Halilović insubordination is one of the war's defining features. Without this, the chain-of-command system is too tight to feel like the Bosnian War.
- **Fun:** Player still has full agency — every autonomous proposal is announced 1 turn ahead and can be vetoed. The 1-turn warning + 12-turn cooldown means the player NEVER gets surprised by an irreversible op. Mladić feels real but doesn't override player wishes.
- **§6 considerations:** Krivaja-95 / Stupčanica-95 are existing canonical triggered ops in the catalog. Mladić-bot would propose them via this autonomous-launch path with the political leader having an override option. **This adds player AGENCY to genocide-adjacent operations**, which is the right design (the player should bear the weight of NOT relieving Mladić).

---

## Q4 — Cross-army coordination conflict

**Decision:** Same advisory pattern at political bot level. When bot political and bot army CO disagree:
- Army CO objects via `PendingOfficerEvent` (same shape as player faction).
- Political bot personality determines tolerance (encoded in faction profile at A4 lane).
- Political bot decides: accept (low political_capital cost) / override (high cost) / relieve (highest cost + transition penalty).

**Auto-relief threshold:** If political bot overrides the same army CO **≥3 times in a 12-turn rolling window**, an automatic relief event fires (the political bot loses patience). This prevents stale stalemates and produces emergent commander-rotation events that match historical reality.

**Per-political-bot tolerance (`override_tolerance`, 1-5):**
- Karadžić-bot: tolerance = **4** (high; tolerated Mladić's insubordination because Mladić won)
- Izetbegović-bot: tolerance = **3** (mid; sacked Halilović mid-war)
- Boban-bot: tolerance = **2** (low; rotated HVO commanders frequently)

**Rationale:**
- **Historicity:** This pattern matches BB I/II's account of each faction's chain-of-command stability.
- **Fun:** Bot factions feel coherent + asymmetric. Player observing bot factions sees Karadžić tolerating Mladić's chaos vs Izetbegović's tighter grip on his commanders.
- **Calibration:** Override-tolerance values will need 188w validation (same overshoot risk as MORALE_OVERRIDE retune), but the 3-overrides-in-12-turns threshold is a hard contract that prevents extreme drift.

---

## Q5 — Turnover data source

**Decision:** **HYBRID** — hand-authored canonical historical roster as the default timeline, with emergent state allowed to DEFER or EARLY-TRIGGER replacement.

**Hand-authored roster (canonical defaults; data file at `data/scenarios/army_co_roster.json` to be authored in A4):**

| Faction | Army CO | Default tenure | Replacement trigger | Replaces with |
|---|---|---|---|---|
| VRS | Mladić | t0 (Apr 1992) → war end | combat death OR political-leader relief OR scheduled v1995 (Karadžić under pressure post-Srebrenica) | Krstić (mid-1995+) or political-bot pick |
| ARBiH | Halilović | t0 → ~t65 (Jul 1993, Neretva '93 sacking) | political-leader relief OR scheduled at Neretva '93 outcome | Delić |
| ARBiH | Delić | post-Halilović → war end | combat death OR very-high-tolerance political relief | political-bot pick |
| HVO | Petković | t0 → ~t85 (1993 reorganization) | political-leader relief OR scheduled at HVO reorganization event | Praljak |
| HVO | Praljak | post-Petković → ~t130 (1994) | political-leader relief OR scheduled at Washington Agreement | Roso |
| HVO | Roso | post-Praljak → war end | combat death | political-bot pick |

**Emergent variation rules:**
- If player **keeps** Halilović past his "scheduled" relief turn 65 → Halilović stays; his competence DEGRADES faster (war exhaustion: -0.05 per 12-turn window past schedule); his stubbornness INCREASES to 5 (becomes Mladić-class); his autonomous-launch cooldown HALVES (more frequent insubordination).
- If player **early-relieves** Halilović before turn 65 (e.g., turn 30 after a single failed op) → Delić arrives early; political-capital cost is 4 (player paid for civilian-military trust damage); HALILOVIC moves to subordinate role with morale penalty.
- Same pattern applies to Petković/Praljak/Roso transitions.

**Rationale:**
- **Historicity:** Halilović→Delić, Petković→Praljak→Roso are historically specific events with specific dates and reasons; embedding them as defaults preserves canonical truth.
- **Fun:** Player decisions to keep or sack their army CO have real, asymmetric consequences. "Keep Halilović past Neretva '93" is a meaningful and replayable choice with degraded outcomes vs the Delić path.
- **§8.3 (a) discipline:** Replacement trigger logic is mechanism-level; the historical defaults are data; faction-symmetric (any faction's army CO can be relieved by the same code path); §8.3 (b) lane-tuning to specific outcomes avoided.

---

## Implementation gating per A1-A5 lane

| Lane | DDR-bound clauses | Notes |
|---|---|---|
| A1 (CampaignPlan wiring) | none — pure plumbing | Closes audit P0 ARMY-GAP-1 |
| A2 (Army CO loop) | Q1 directive vocabulary list; Q2 advisory shape | Mirrors corps loop scaffolding |
| A3 (Army-level Order Interpretation) | Q2 advisory thresholds; Q3 stubbornness mechanic + 12-turn cooldown; Q1 override cost = 2 political_capital | Extends shipped corps Phase 1 framework |
| A4 (Army CO bot personalities) | Q3 stubbornness initial values (5 historical officers); Q4 tolerance values (3 political bots); Q5 hand-authored roster + emergent variation | Calibration-heavy; needs 188w validation; mini-panel before SHIP |
| A5 (Army HQ pushback UI) | Q3 advance notification UX (1-turn warning); Q1 political-directive vocabulary surfaced | Extends Pre-Advance Review shell |

## AI-officers P1-P5 — confirmed panel defaults

| Constant | DDR-locked value | Source |
|---|---|---|
| `MAX_BONUS_OBJECTIVES` (operation expansion) | 2 | v0.8.3 Order Interpretation plan §1.2 |
| `CAUTIOUS_EXTRA_PREP_TURNS` (by aggressiveness 0-5) | `[0, 3, 2, 0, 0, 0]` | v0.8.3 plan §1.2 |
| `AGGRESSIVE_HALT_DELAY` (turns) | 2 | v0.8.3 plan §1.2 |
| Player override cost in political_capital | 2 (set here as Q1 default) | This DDR Q1 |
| Auto-relief override threshold | 3 overrides per 12-turn window | This DDR Q4 |
| Autonomous-launch cooldown | 12 turns per army CO | This DDR Q3 |
| Stubbornness threshold for autonomous launch | ≥4 (1-5 scale) | This DDR Q3 |

Unset constants flagged for **mini-panel** before A4 SHIP:
- Stubbornness degradation rate when player keeps officer past schedule (-0.05/12-turn proposed; needs 188w A/B)
- Per-faction override-tolerance values 4/3/2 (proposed; needs 188w A/B)
- Auto-relief political-capital cost (transition penalty; existing officer_system.ts has 4-turn acting-commander pattern; reuse vs new value)

## Sensitive-history compliance

- **Ring 1 mechanism, faction-asymmetric data via existing `lookupStepCurve` pattern** — same shape as MORALE_OVERRIDE Phase 0 panel (`9b9650e4`) + reconstitution policy review (`e9584dd3`).
- **No §6 sign-off chain required for the framework**; A4 calibration may need §6 if it changes Krivaja/Stupčanica/Srebrenica trigger semantics. **A4 mini-panel must classify §6 surface in advance per durable lesson "panel governs the SHIP DECISION."**
- **No FORAWWV / paint anchor / `political_controllers` / OOB / rupture-wiring / `enclave_resilience.ts` touch.** A3 Order Interpretation extends the shipped Phase 1 framework; same clean Ring 1 boundary.
- **Faction-symmetric mechanism in CODE** — every per-faction value (stubbornness, override-tolerance, replacement schedule) is data, not branched code.

## Cross-references

- AI-officers P1-P5 framework: parent orchestrator analysis 2026-05-06 (this conversation)
- Army COs A1-A5 framework: parent orchestrator analysis 2026-05-06 (this conversation)
- v0.8.1 Commander Maturity plan: `docs/plans/2026-03-31-v081-commander-maturity-plan.md`
- v0.8.2 Political Leader Bot plan: `docs/plans/2026-03-24-v080-political-leader-bot-plan.md`
- v0.8.3 Order Interpretation plan: `docs/plans/2026-03-24-v081-order-interpretation-plan.md`
- ARMY-GAP-1 audit: `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`
- Order Interpretation Phase 1 (shipped): `src/sim/combat/order_interpretation.ts` 949 LOC
- KNOWLEDGE: parallel-lane git-index sweep risk + sibling-file-ownership collision (2026-05-06; honor pathspec form throughout this lane sequence)
