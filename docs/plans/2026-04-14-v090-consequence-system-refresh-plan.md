# v0.9.0 Consequence System Refresh

**Date:** 2026-04-14  
**Status:** PLAN - REFRESHED FOR CURRENT REPO TRUTH  
**Roadmap slot:** v0.9.0  
**Supersedes for sequencing purposes:** `2026-03-24-v090-consequence-system-plan.md`  
**Purpose:** Re-scope the older consequence-system draft into smaller programs that fit current repo truth and current design decisions.

---

## 0. Why this refresh exists

The older `v0.9.0` consequence-system plan is valuable, but it is too broad to hand directly to Claude now.

Since it was written:

- several substrate truths have already moved
- some “blocking” bugs and dead wires may already be partially or fully resolved
- the scorecard now classifies some related work as redesign-gated instead of ordinary hardening
- `2026-04-14-four-design-decisions.md` narrowed the immediate live decisions

This refresh does **not** replace the consequence-system ambition.
It turns that ambition into a realistic sequence.

---

## 1. Repo-truth baseline

### Already materially advanced

- exhaustion is no longer a dead wire in commander scoring
- negotiation pressure is no longer purely theoretical; at least one pressure consequence path now exists in political logic
- civilian-casualty attribution and related political truth have moved closer to live gameplay

### Still not ready for a giant consequence sprint

- the old seven-chain implementation concept is too large for one milestone-open packet
- some prerequisite bugs from the older plan must be re-verified instead of blindly inherited as blockers
- victory/Pyrrhic scoring remains a separate contract problem
- sensitive-history constraints remain a real gate on what should and should not become a manipulable system

---

## 2. New sequencing rule

Do not start with “implement the seven consequence chains.”

Start with consequence work in this order:

1. **consequence substrate audit**
2. **bounded pressure / exhaustion / peace-response consequences**
3. **early-peace and endgame-bridge consequences**
4. **one historical divergence chain at a time**
5. **Codex / narrative integration after the mechanic is real**

This keeps the system explainable, auditable, and less likely to collapse under over-wide speculative design.

---

## 3. Program map

### Program A. Consequence Substrate Audit

**Goal:** Identify which consequence substrates are already real, which are partially real, and which still need true engine support.

**Questions this program must answer:**
- which pressure/exhaustion/capital/state fields already influence gameplay
- which old “dead wire” claims are still true vs stale
- which new effect kinds are genuinely needed vs already expressible with existing effect machinery
- which consequence ideas require new state and which only require better event wiring

**Deliverable:** one consequence substrate inventory and owner matrix

**Status 2026-05-10:** COMPLETE. `tools/diagnostics/consequence_substrate_inventory.cjs` now emits a deterministic owner matrix over the authored event catalog. Current scan: 238 events, 796 effect instances, 18 effect kinds, 18 live substrates, no partial-reader substrates, and zero unknown substrates. `guerrilla_threat` and `recruitment_modifier` are confirmed live through `applyGuerrillaAttrition(...)` and `ongoing_mobilization`. Report: `docs/40_reports/audits/20260510_CONSEQUENCE_SUBSTRATE_INVENTORY.md`.

### Program B. Pressure And Exhaustion Consequences

**Goal:** Finish the most immediate negative-sum identity loop before broader alt-history chains.

**Bounded targets:**
- per-faction negotiation-pressure consequences where still missing
- pressure/exhaustion effects that can be expressed without a new giant subsystem
- truthful player-facing surfacing of those consequences where appropriate

**Why this goes first:** it builds on already-moving truth instead of inventing a parallel branch engine.

### Program C. Early Peace / War-Shortening Consequences

**Goal:** Build the first consequence path that shortens the war rather than only mutating mid-war pressure.

**Bounded targets:**
- peace-plan acceptance consequences
- ceasefire / freeze-line transition consequences
- handoff substrate into victory / Pyrrhic scoring and endgame comparison

**Why this goes before big divergence chains:** it depends more on existing negotiation/endgame substrate than on large new historical chain authoring.

### Program D. Historical Divergence Chains

**Goal:** Implement major branch consequences one chain at a time after substrate work is proven.

**Candidate chain order:**
1. alliance-holds / no Croat-Bosniak war
2. RS aggression / international response timing
3. Drina / rear-hostility consequence chain
4. identity / recruitment / legitimacy consequence chain
5. enclave and delayed-endgame chains only after the sensitive-history gate and endgame substrate are ready

**Rule:** one chain per packet, never multiple giant chains in one lane.

### Program E. Consequence Narrative Integration

**Goal:** Connect real consequence mechanics to dynamic essays, ghost entries, and endgame explanation after the gameplay substrate exists.

**Rule:** no narrative patching over missing mechanical truth.

---

## 4. Immediate packet-ready candidates

### Packet C1. Consequence Substrate Audit

**Goal:** Produce a current owner map for pressure, exhaustion, political response, consequence-capable effect types, and known dead/stale wires.

**Done means:** a reviewer can tell exactly what the current consequence substrate already owns.

**Status 2026-05-10:** DONE. The owner matrix is executable, fixture-tested, and run against the real catalog.

### Packet C2. Pressure Consequence Completion

**Goal:** Extend already-started negotiation-pressure consequences where the repo clearly wants symmetry but does not yet have it.

**Likely examples:** per-faction acceptance-floor consequences, pressure-to-response hooks already implied by current political logic.

**Done means:** pressure is no longer “active for one path, decorative for the rest” in the chosen owned seam.

### Packet C3. Early Peace Consequence Bridge

**Goal:** Define and implement the first bounded consequence path for accepted peace plans / shortened-war outcomes.

**Done means:** an accepted early peace path has a real state-transition and endgame handoff contract instead of just being a future idea.

---

## 5. Blocked or deferred work

### Blocked: genocide / Srebrenica consequence chains

These are inseparable from the sensitive-history design gate.
Do not hand them to Claude as ordinary event implementation work first.

### Deferred: the full seven-chain mega-sprint

This should only happen after:

- the substrate audit exists
- pressure and early-peace programs are grounded
- the scoring/endgame contract exists
- sensitive-history boundaries are explicit

### Deferred: broad new effect-type expansion

The older plan proposed multiple new effect kinds up front.
Do not add all of them pre-emptively.
Add only the effect kinds justified by the first real packets.

---

## 6. Coordination with other plans

This refresh must stay aligned with:

- `2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md`
- `2026-03-31-v090-sensitive-history-design-gate-plan.md`
- `2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`
- `2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`
- `2026-04-14-four-design-decisions.md`

---

## 7. Feature Done Means

Canonical owner:
- the refreshed consequence program order and its packet contracts own `v0.9.0` consequence sequencing.

Demoted path:
- the older all-at-once consequence mega-sprint is demoted from immediate implementation guidance.

Player-visible truth:
- consequence work should first deepen already-real negative-sum pressure and peace-response truths before promising giant alt-history branch spectacle.

Canonical UI surface:
- consequence effects should flow into the existing political/review/endgame surfaces that already own those concepts, not invent a parallel shell.

Done means:
- the repo can hand Claude bounded consequence packets tied to current truth, and reviewers can tell which large branch ideas are still intentionally blocked.
