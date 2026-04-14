# v0.9.0 Victory And Pyrrhic Scoring Contract

**Date:** 2026-04-14  
**Status:** PLAN - REFINED CONTRACT PREP  
**Roadmap slot:** v0.9.0  
**Builds on:** `2026-03-31-v090-victory-conditions-and-pyrrhic-scoring-plan.md`  
**Purpose:** Turn the existing philosophy-first victory plan into a Claude-ready contract sequence.

---

## 0. Why this refinement exists

The existing victory/Pyrrhic plan is good roadmap philosophy.
It is not yet a tight implementation contract.

The repo still needs explicit answers to:

- what exact metrics feed end-state judgment
- which are mechanical scores vs narrative verdict inputs
- what scenario JSON must specify
- how early peace, Dayton, and endgame comparison consume the same substrate

This refinement keeps the thesis but makes the work packetizable.

---

## 1. Contract rule

Do **not** start with “implement a final score.”

Victory and Pyrrhic scoring should be built in this order:

1. outcome taxonomy
2. metric inventory
3. scenario data contract
4. verdict packet and UI owner
5. scoring weights only after the substrate is explicit

That keeps the game from drifting into a fake-precision scoreboard before the underlying meaning is settled.

---

## 2. Required outputs

### Output A. Outcome Taxonomy

The game needs explicit outcome classes, not one blurred “victory” value.

Minimum target set:

- survival
- strategic success
- political success
- Pyrrhic success
- negotiated escape
- condemnation / hollow victory
- failure / collapse

### Output B. Metric Inventory

Each candidate metric must be classified as one of:

- `score substrate`
- `verdict substrate`
- `narrative context only`

Candidate families already visible in repo truth:

- territory / front position
- population preserved / displacement burden
- civilian casualties caused
- military viability and exhaustion
- political legitimacy / international standing
- negotiated position / peace terms
- duration / war-shortening effects

### Output C. Scenario Contract

Every scenario needs a clear rule for:

- custom victory conditions
- default fallback evaluation when custom conditions are absent
- early-peace / Dayton / alternative-endgame handoff

### Output D. Verdict Packet

The product needs one canonical endgame packet that later UI surfaces can render without inventing their own score logic.

Minimum packet contents:

- outcome class
- major metric summaries
- key positive drivers
- key negative drivers
- condemnation / cost flags where relevant
- comparison hooks for `v0.9.1`

### Output E. QA Matrix

The scoring system needs explicit scenario tests:

- historical baseline end state
- early peace
- prolonged war
- faction survival without strong strategic success
- “won territory but lost the peace” cases

---

## 3. Packet-ready sequence

### Packet V1. Outcome Taxonomy And Metric Inventory

**Goal:** Lock the vocabulary and candidate metric classes before coding verdict logic.

**Done means:** the repo can say what a player is being judged on without hand-waving.

### Packet V2. Scenario Victory Contract

**Goal:** Define how scenarios specify end-state evaluation and how fallback works when they do not.

**Done means:** scenario authors have one clear contract and no longer depend on a stub.

### Packet V3. Endgame Verdict Packet

**Goal:** Create one canonical endgame evaluation packet that downstream UI can consume.

**Done means:** endgame surfaces no longer need to improvise their own scoring interpretation.

### Packet V4. Scoring Weights And Thresholds

**Goal:** Only after packets V1-V3 are done, assign weights and thresholds for the first live Pyrrhic evaluation model.

**Done means:** the scoring model is explainable in terms of already-owned metrics and verdict classes.

---

## 4. Dependencies and gates

### Must stay aligned with

- `2026-04-14-v090-consequence-system-refresh-plan.md`
- `2026-03-31-v090-sensitive-history-design-gate-plan.md`
- `2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`

### Gate rule

Do not let scoring trivialize sensitive-history constraints or replace consequence/narrative judgment with a naked optimization table.

If a scoring proposal rewards behavior the game’s thesis should condemn, stop and rework the taxonomy before implementing weights.

---

## 5. Deferred or blocked work

### Deferred: final numeric balance tuning

Not worth doing until the metric and verdict packet exist.

### Blocked: sensitive-history-dependent scoring

Any scoring rule that touches atrocity representation, genocide, or similar condemnation logic must wait for the sensitive-history design gate.

### Deferred: fancy UI treatment

The endgame packet and ownership contract matter first.
Visual flourish comes later.

---

## 6. Feature Done Means

Canonical owner:
- the victory/Pyrrhic contract docs and the eventual endgame verdict packet own end-state evaluation.

Demoted path:
- the current stub victory system and philosophy-only planning language are demoted as implementation guidance.

Player-visible truth:
- the player sees a readable end-state judgment grounded in explicit metrics and thesis-aligned outcome classes, not a vague stub or a misleading arcade score.

Canonical UI surface:
- one endgame verdict surface should own final judgment, with later comparison/history layers consuming the same packet secondarily.

Done means:
- Claude can implement bounded endgame packets from a clear contract, and the project no longer depends on an undefined “we’ll figure out victory later” placeholder.

