# FORAWWV / Open Design-Decision Prep Packet

**Date:** 2026-06-05
**Lane:** COMMAND_BOARD P3 — "FORAWWV / open design decisions" (GATED)
**Controlling plan:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 7
**Source plan:** `docs/plans/2026-05-18-autonomous-canon-design-decision-prep-bank.md`
**Author role:** decision-PREP only (game-designer + product-manager support lane)

---

## ⚠ OWNER-MANUAL-ONLY BANNER

**`docs/10_canon/FORAWWV.md` is MANUAL-EDIT-ONLY. Claude must NEVER auto-edit it.**
This packet proposes options and wording *directions* for the owner to rule on and then
hand-edit FORAWWV (and the other canon docs) personally. Nothing here is a ruling. Every
entry ends with "Decision needed" and concrete options, per the prep-bank global rules.
This packet touches **no canon doc** and **no runtime code** — it is a single new report file.

Cross-check discipline applied: each candidate was checked against the MASTER_ROADMAP
closure log, COMMAND_BOARD, and the `docs/40_reports/design/` decision-report folder
(which **does not exist** — so none of the roadmap "open questions" have produced a formal
decision report) before being classified open vs verified-stale.

---

## Index of open decisions found

| # | Decision | Status | Impact | Primary owner |
|---|----------|--------|--------|---------------|
| **D1** | **Presidential Command Model canon reconciliation** (FORAWWV §XII.1/§XII.4 stale suppressor + Rulebook §5 brigade-direct-command idiom + flagged canon↔code gap on direct posture/movement UI) | **GENUINELY OPEN** — explicitly "owner-pending" in COMMAND_BOARD P0 | **HIGHEST** (canon hierarchy + player-truth + code alignment) | game-designer + user |
| **D2** | **International intervention (NATO / Deliberate Force) player agency** | GENUINELY OPEN — no decision report; sensitive-history-adjacent | MEDIUM-HIGH | game-designer + historian + user |
| **D3** | **War economy depth ceiling** (abstract vs production-queue) | GENUINELY OPEN — no decision report; roadmap *leans* "stays abstract" but no ruling | MEDIUM (anti-scope-creep) | product-manager + game-designer |
| **D4** | **Modding-surface formalization for 1.0** | GENUINELY OPEN — no decision report; surface exists implicitly | MEDIUM (scope + post-1.0 commitment) | product-manager + user |

### Cross-check: candidates that are NOT genuinely open (verified-stale / resolved-elsewhere)

| Candidate | Verdict | Evidence |
|-----------|---------|----------|
| Negotiation counter-offers (resolution-plan Q1) | **VERIFIED-STALE — IMPLEMENTED** | B3 shipped: persisted counter-offer state, historical envelopes, deterministic submission, Decision Room projection, IPC, **save migration v13** (MASTER_ROADMAP "B3/Sarajevo/embargo" addendum 2026-05-17; report `docs/40_reports/implemented/20260517_B3_NEGOTIATION_COUNTER_OFFERS.md`). A residual *wording* nuance for FORAWWV could be folded into D-class follow-up but the design question itself is closed. |
| Endgame scoring / victory conditions | **RESOLVED 2026-04-16** | `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` (MASTER_ROADMAP Q5). |
| Srebrenica / sensitive-history boundary | **RESOLVED 2026-04-16** | `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` three-ring boundary (MASTER_ROADMAP Q7). |
| Multiplayer | **DEFERRED (effectively ruled)** | MASTER_ROADMAP Q3 + resolution plan Task 3 both state explicit post-1.0 deferral; only architectural watch-items remain, not an open *design* question. Re-list only if the owner wants the deferral formally written into canon. |
| Play length / quick modes | **SOFT-ANSWERED, borderline** | MASTER_ROADMAP Q6 already states "April 1992 full campaign: 3–5 hours target"; no quick-battle commitment. This is close to ruled; not promoted here to avoid manufacturing work. Flag if the owner wants it canon-stamped. |
| HRHB patron directive scope | **DECIDED, IMPLEMENTATION-PENDING** | Hybrid recommendation accepted (MASTER_ROADMAP "Open P1s" 2026-05-17); this is an *implementation* lane, not an open *design decision*. |

---

# D1 — Presidential Command Model canon reconciliation (HIGHEST IMPACT)

### The question
The Presidential Command Model is **LOCKED design** (2026-06-01) and all five command levers
are SHIPPED. But three canon surfaces still contain text written in the *older* "player commands
units directly" idiom, and one self-flagged canon↔code gap remains:

1. **FORAWWV §XII.1** carries a self-NOTE that the **§XII.4 suppressor clause** — *"no political
   directive issued = player-driven design"* — is **now stale**, because under the locked model the
   president **does** issue directives via the command levers.
2. **FORAWWV §XII.4** still lists that stale suppressor in the canonical persona-prompt suppressor
   block that "new personas must include."
3. **Rulebook §5** is only partially reconciled: §5.1 and §5.5 were corrected to "commanders propose,
   president approves/declines," but §5.1's own embedded NOTE warns that **"the rest of §5 still reads
   in the older brigade-direct-command idiom and needs a fuller reconciliation pass,"** and flags a
   **potential canon↔code gap** — *"if the current UI lets the player set posture/movement directly."*

COMMAND_BOARD P0 lists this verbatim as the **next owner-pending action**:
*"FORAWWV.md §XII.4 proposed text + Rulebook §5.1/§5.5 brigade-command reconciliation; #113 (OPEN)
removes the dead direct-set stance/movement controls."*

### Why it's open
Canon-hierarchy integrity. FORAWWV (Engine-extension canon) and the Rulebook now contain a
**known-stale clause** that contradicts the LOCKED Presidential Command Model. Leaving it creates
(a) a persona-QA suppressor that suppresses the *wrong* artifact (signal-quality risk per §XII.5),
and (b) a Rulebook that can be read as licensing direct unit command, contradicting the
president-through-generals doctrine and the ops-only rule. The code side (#113) is in flight to
remove the dead direct-set stance/movement handlers; canon should land in lockstep so docs and
code agree. **FORAWWV is manual-only**, so only the owner can perform the edit — hence this packet.

### Concrete options

**Option A — Minimal correction (retire the stale clause + finish the §5 pass).**
- FORAWWV §XII.4: replace the suppressor *"no political directive issued = player-driven design"*
  with the accurate framing *"the president issues directives via the five command levers; absence
  of a direct *unit* order is by design (command is through generals)."* Remove the §XII.1 self-NOTE
  once applied.
- Rulebook §5.2 / §5.4 / §5.7 / §5.10: sweep remaining "movement orders" / "manually assign"
  language into the propose→approve idiom (§5.2 already says "the president does not issue brigade
  movement orders"; §5.10 still says "the player can also manually assign elite brigades" — reconcile
  against lever #4 elite-deployment-authorize).
- Pair the canon edit with #113 (remove dead direct-set UI handlers) so doc and code ship together.

**Option B — Full §5 rewrite + new "Presidential Command" Rulebook section.**
- Promote the §1 additive note into a first-class Rulebook section (e.g. §5.0 or §8.3) that defines
  the five levers, the propose→approve contract, and the post-1.0/DLC boundary for brigade/axis
  planning; then prune every echelon-level "order" verb in §5 to reference it.
- Larger, cleaner, but more canon surface touched at once → higher review burden.

**Option C — Defer canon, ship code first (#113), annotate canon as "code-leads."**
- Land #113, leave the stale clauses with a dated "superseded-by-code, canon edit pending" marker.
- Lowest immediate effort, but leaves the canon-hierarchy violation live and the persona suppressor
  wrong in the interim — weakest on the "canon is authoritative" principle.

### Pros / cons / risks
- **Gameplay:** No mechanic change in any option — the levers are already shipped and player-only.
  Risk is purely *documentary correctness*, but that correctness governs persona-QA prompts (§XII.4)
  which **do** affect QA signal quality.
- **Historical fidelity:** Neutral. The president-through-generals model is the ICTY-grounded one;
  reconciliation strengthens it.
- **Canon-hierarchy:** Option A/B *restore* hierarchy integrity (FORAWWV + Rulebook stop contradicting
  the LOCKED design doc). Option C leaves it violated.
- **Calibration impact:** **ZERO** in all options. Levers are player-only → historical/headless
  byte-identical by construction; #113 removes *dead* (no-op) handlers. No baseline movement.
- **Risk if unchanged ("do nothing"):** Persona prompts keep suppressing a now-false artifact;
  Rulebook stays internally contradictory; future contributors may re-introduce direct-command UI
  citing §5's stale verbs.

### Recommendation
**Option A**, executed in lockstep with code PR #113. It is the smallest correct change, restores
canon-hierarchy integrity, fixes the persona suppressor, and carries zero calibration risk. Reserve
Option B for a later dedicated Rulebook pass if §5 accumulates more drift. **Verify the canon↔code
gap first** (does any live UI path still set posture/movement directly, or are they already no-op
handlers?) — if #113 confirms they are dead handlers, the canon edit is purely a wording correction.

### Decision needed
Owner picks A / B / C and (if A or B) hand-edits FORAWWV + Rulebook.

### Canon docs the owner would touch (manual)
- `docs/10_canon/FORAWWV.md` §XII.1 (remove self-NOTE), **§XII.4** (replace stale suppressor) — **OWNER MANUAL EDIT ONLY**.
- `docs/10_canon/Rulebook_v0_9_0.md` §5.2 / §5.4 / §5.7 / §5.10 (idiom sweep), §5.1 (remove the
  embedded "needs fuller reconciliation" NOTE once done).
- Reference (no edit needed): `docs/plans/2026-06-01-presidential-command-model-design.md` (LOCKED design),
  `docs/10_canon/Game_Bible_v0_9_0.md` Command Chain section (verify consistency).
- Pairs with code lane: **#113** (remove dead direct-set stance/movement controls) — separate non-canon PR.

---

# D2 — International intervention (NATO / Deliberate Force) player agency

### The question
Is NATO air intervention a single scripted event, a temporary combat modifier, or a multi-turn
campaign the player can influence (timing / intensity / targeting of Deliberate Force)?
MASTER_ROADMAP Q2; resolution-plan Task 2.

### Why it's open
No decision report exists (`docs/40_reports/design/` is absent). Current implementation is
event-only with conditions. The resolution plan flags it as **sensitive-history-adjacent**
(atrocity-linked triggers require historian review), so it cannot be silently absorbed into a
combat lane. It is also entangled with the v1.6 "Deliberate Force" roadmap milestone.

### Concrete options
- **Option A — Stay event-only (status quo, canon-stamp it).** NATO remains a conditioned event with
  no fine-grained player control over timing/intensity/targeting. Write the ruling so v1.0 scope is
  explicit and the v1.6 milestone owns any expansion.
- **Option B — Temporary combat modifier.** Deliberate Force becomes a multi-turn modifier on RS
  combat/supply that the player's diplomatic posture can *nudge* (request escalation), without a
  targeting minigame. Medium build; requires sensitive-history review of trigger linkage.
- **Option C — Influenceable multi-turn campaign.** Player affects timing/intensity/targeting. Highest
  fidelity-vs-agency tension and highest atrocity-linkage risk (targeting decisions adjacent to
  sensitive events). Almost certainly post-1.0.

### Pros / cons / risks
- **Gameplay:** B/C add agency but risk turning an externally-imposed historical event into a
  player power-fantasy lever — conflicts with the negative-sum, constrained-agency thesis.
- **Historical fidelity:** A is most faithful to the "intervention happened *to* the belligerents."
  C risks ahistorical player control over NATO targeting.
- **Sensitive-history:** B/C trigger the SENSITIVE_HISTORY_DESIGN_GATE review (atrocity-linked
  causation). A does not.
- **Canon-hierarchy:** Mostly Game Bible / War Specification + events data; FORAWWV touch only if a
  systemic invariant is added.
- **Calibration impact:** A = none. B/C = potentially significant (RS combat/supply modifiers move
  late-war territory) → must run 188w A/B and re-anchor per §XVI.1 discipline.
- **Do-nothing:** Acceptable for 1.0; the question only blocks the v1.6 milestone.

### Recommendation
**Option A for 1.0** (canon-stamp event-only, assign any expansion to v1.6 Deliberate Force with a
mandatory sensitive-history review gate). This matches the negative-sum thesis (intervention is
imposed, not commanded) and avoids late-war calibration churn before 1.0.

### Decision needed
Owner rules A / B / C and assigns the milestone owner.

### Canon docs the owner would touch
- `docs/10_canon/Game_Bible_v0_9_0.md` / `War_Specification_v0_9_0.md` (scope statement).
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (note the gate applies to any B/C expansion).
- Decision report to author: `docs/40_reports/design/20260605_INTERNATIONAL_INTERVENTION_DECISION.md`.
- FORAWWV: **only** if a new systemic invariant is introduced (none under Option A) — **manual-only**.

---

# D3 — War economy depth ceiling

### The question
How detailed is the war economy in 1.0? Current: abstract capacity numbers, smuggling routes,
equipment lifecycle. Do we ever add Paradox-style production queues? MASTER_ROADMAP Q8;
resolution-plan Task 6.

### Why it's open
No decision report. The roadmap *leans* "probably stays abstract" but never rules it, leaving the
door open to feature-creep proposals. An explicit ruling closes that door.

### Concrete options
- **Option A — Abstract economy is the final 1.0 posture (explicit reject of production queues).**
  Canon-stamp the abstraction; reject Paradox-style queues unless a future product thesis demands it.
- **Option B — Light economy depth.** Add a small number of player-visible production/allocation
  knobs (e.g. prioritize ammo vs replacements) without full queues.
- **Option C — Full production system (post-2.0).** Explicitly out of scope; only list as a far-future
  possibility.

### Pros / cons / risks
- **Gameplay:** B adds texture but risks micromanagement that fights the strategic-president framing
  (economy micro is general/quartermaster work, not presidential). A keeps the player at the
  political-strategic altitude.
- **Historical fidelity:** Abstraction is *more* faithful to a leadership-level sim than a factory
  queue would be.
- **Canon-hierarchy:** Game Bible / Systems Manual + COMBAT_MASTER; no FORAWWV invariant needed.
- **Calibration impact:** A = none. B = potentially moves supply/equipment trajectories → 188w A/B.
- **Do-nothing:** Low risk to ship, but leaves a recurring scope-creep magnet unaddressed.

### Recommendation
**Option A.** Canon-stamp the abstract economy as the 1.0 posture and explicitly reject production
queues. It protects the negative-sum / presidential-altitude thesis and pre-empts scope creep.
This is the cheapest high-value ruling in the packet (pure scope-fence, zero build).

### Decision needed
Owner rules A / B / C.

### Canon docs the owner would touch
- `docs/10_canon/Game_Bible_v0_9_0.md` / `Systems_Manual_v0_9_0.md` (economy-scope statement).
- Reference: `docs/40_reports/COMBAT_MASTER.md`.
- Decision report to author: `docs/40_reports/design/20260605_WAR_ECONOMY_DEPTH_DECISION.md`.
- FORAWWV: not touched.

---

# D4 — Modding-surface formalization for 1.0

### The question
Event definitions and scenario manifests are already JSON; Lua bindings exist but are unsurfaced.
Do we formalize a modding surface for 1.0 (none / read-only docs / a formal editor / Steam Workshop)?
MASTER_ROADMAP Q4; resolution-plan Task 4.

### Why it's open
No decision report. The modding surface exists **implicitly** (JSON scenarios/events, Lua), so
shipping 1.0 silently still ships a de-facto modding surface — the question is only whether and how
much to *support* and *commit* to it (support commitments are hard to walk back).

### Concrete options
- **Option A — Expose nothing official for 1.0 (no support commitment).** The JSON/Lua surface stays
  unsupported and undocumented; no Workshop. Lowest commitment, preserves freedom to refactor formats.
- **Option B — Read-only modding docs for 1.0.** Document the scenario/event JSON schema as an
  "unsupported, may change" reference; no editor. Modest goodwill, low commitment.
- **Option C — Formal editor / Workshop (post-1.0, v1.7 candidate).** Scenario editor + Steam Workshop.
  High effort; explicitly defer.

### Pros / cons / risks
- **Gameplay / community:** B/C build community goodwill and longevity; A keeps maximum internal
  freedom to change data formats without breaking mods.
- **Canon-hierarchy:** None directly; this is a product/scope decision (Game Bible product-spine note
  at most).
- **Calibration impact:** None — modding-surface policy does not change sim behavior.
- **Risk if unchanged:** Shipping with an undocumented-but-real JSON surface means modders will find
  it anyway; an explicit "unsupported" stance (A or B) manages expectations and protects the right to
  change formats.

### Recommendation
**Option A for 1.0, with B as a cheap upgrade** if the owner wants early-community goodwill: ship a
short "data formats are internal and may change without notice" note rather than nothing. Defer any
formal editor/Workshop to a post-1.0 scope review (v1.7 candidate). This preserves format freedom
during active development while setting honest expectations.

### Decision needed
Owner rules A / B / C.

### Canon docs the owner would touch
- `docs/10_canon/Game_Bible_v0_9_0.md` (product-spine modding-scope statement) — optional.
- Reference: `data/scenarios/*`, `data/scenarios/events/*`, `docs/20_engineering/LUA_SCRIPTING.md` (if present).
- Decision report to author: `docs/40_reports/design/20260605_MODDING_SURFACE_DECISION.md`.
- FORAWWV: not touched.

---

## Highest-impact recommendation (single)

**Execute D1 (Presidential Command Model canon reconciliation), Option A, in lockstep with code
PR #113.** It is the only entry that resolves a **live canon-hierarchy violation** — FORAWWV §XII.4
and the Rulebook §5 idiom currently *contradict* the LOCKED Presidential Command Model and feed a
**wrong persona-QA suppressor** — at **zero calibration/determinism risk** (the levers are already
shipped and player-only; #113 removes dead no-op handlers). It is explicitly the owner-pending next
action on COMMAND_BOARD P0. D3 (war-economy scope-fence) is the cheapest secondary win.

---

## Owner action checklist
- [ ] D1: verify the canon↔code gap (does any live UI set posture/movement directly?), then hand-edit
      FORAWWV §XII.1/§XII.4 + Rulebook §5 idiom; ship with #113.
- [ ] D2: rule event-only-for-1.0 (or escalate) + author intervention decision report.
- [ ] D3: rule abstract-economy-final + author war-economy decision report.
- [ ] D4: rule no-official-surface (or read-only docs) + author modding decision report.
- [ ] All FORAWWV edits are **owner-manual-only** — this packet does not and must not touch it.
