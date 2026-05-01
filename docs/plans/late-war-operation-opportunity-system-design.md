# Late-War Operation Opportunity System — Design Doc

**Date:** 2026-05-01
**Status:** Design proposal (no code in this doc)
**Authority:** Below canon (Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible). Inherits the Sensitive History Design Gate and the v0.9.0 Consequence System gate.
**Source catalog:** `docs/research/2026-05-01-late-war-operation-opportunity-research.md`
**Knowledge anchor:** `docs/PROJECT_LEDGER_KNOWLEDGE.md` top entry, *"Late-war operations should be opportunity proposals, not calendar-forced scripts (2026-05-01)"*
**Related plans:** `docs/plans/2026-04-08-operations-system-a-plus-plan.md`, `docs/plans/MASTER_ROADMAP.md` (v0.9.0 Consequence System), `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`, `docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md`, `docs/plans/2026-05-01-operation-opportunity-review-surface-design.md`, `docs/plans/late-war-5th-corps-opportunities-design.md`
**Sensitive-history gate:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (binding; this doc does not modify it)

---

## 0. What this doc is, and is not

**Family-doc status:** The first concrete family doc is now `docs/plans/late-war-5th-corps-opportunities-design.md`. It specializes this generic contract for the isolated Bihac pocket, APWB pressure, Storm/Oluja theater opening, and Sana exploitation arc.

This is the **generic system design** that sits underneath every future late-war operation family doc (5th Corps, Vlasic/Kupres, HV/HVO western Bosnia, failed VRS offensives, safe-area / Krivaja-95 / Stupčanica-95). The family docs in the research catalog backlog are intentionally **not** in this doc; they will be authored separately on top of this one.

This doc:

- Replaces the implicit "naked turn-gated scripted operation" pattern with an explicit **opportunity proposal → authorization → existing execution chain → AAR** loop.
- Names the prerequisite axes, the choice surface, the failure model, the painted-target relationship, and the sensitive-history carve-out.
- Specifies determinism constraints and a proposed data shape so a later implementation packet can land without re-litigating the contract.

This doc does **not**:

- Modify engine code, scenario data, OOB, painted targets, tests, or canon.
- Authorize implementation. A separate plan packet must call out the owners (`/operations-expert` + `/sector-expert` + `/historian` + `/game-designer`), the test contract, and the calibration gate before any code lands.
- Settle the sensitive-history question. That is already settled in `SENSITIVE_HISTORY_DESIGN_GATE.md`. This doc only reaffirms how the opportunity layer must respect that gate.

**Player-role anchor.** Per `Rulebook_v0_7_0.md` §16.3, the player is the political/strategic leader, not a brigade driver. They shape intent, commitment, and risk through Army HQ / corps / event surfaces. Operation opportunities surface at exactly the level where the player is already canonically deciding things.

---

## 1. Problem statement

The late-1995 scripted-op packet (`docs/PROJECT_LEDGER.md` 2026-05-01 entries) demonstrated three things at once:

1. **Useful seam discovery.** Naked turn-gated triggered ops surfaced a real engine bug (multi-corps op visibility) and exercised real downstream owners (staging window, secondary-corps stance gating, brigade-to-staging distance).
2. **Wrong final product model.** Forcing Krivaja-95, Stupčanica-95, Mistral 2, and Sana to fire on calendar even when prerequisites are absent collapses into either (a) the op silently failing in ways that look like engine bugs, or (b) the op succeeding because we tuned around the prerequisites — i.e., a railroad. The painted-vs-sim oct1995 number not moving in n1596 even after the visibility fix made this concrete.
3. **A live design gate exists.** Krivaja-95 and Stupčanica-95 are not just hard ops; they are sensitive-history events whose territorial outcome can be modeled but whose atrocity outcome cannot be a player lever. A generic opportunity model has to refuse the wrong shape here, not just sequence prerequisites.

The catalog (BB1, BB2, ICTY, contemporary press) covers ~30 named operations across six axes after the Washington Agreement. Hard-coding any of them as "fire on turn N, succeed if a few brigades exist" trades engine truth for surface coverage. The opportunity layer is the contract that lets us add many of them without that trade.

---

## 2. Goals and non-goals

### Goals

- One **generic opportunity object** that any historical late-war operation family can be expressed against.
- One **prerequisite vocabulary** so every family doc evaluates the same axes the same way.
- One **proposal → authorization → execution → AAR** flow that reuses the existing corps/army operation systems instead of forking them.
- A **failure-as-first-class** model: failed VRS offensives (Breza 94, Pauk/Shield, Orasje, Zvezda 94, the early Vlasic attempt) and failed allied operations (Una) must be representable without bug status.
- A **painted-target contract** that uses dated paints (`apr1994`, `apr1995`, `oct1995`) as evaluation references, not as outputs the engine is required to reproduce.
- A **sensitive-history carve-out** that lets safe-area territorial control be an opportunity while keeping atrocity / civilian harm where the canon already puts them: in consequence systems, not in player levers.

### Non-goals (deferred to later packets)

- Authoring any specific operation family. Each is its own design doc per the research catalog backlog.
- Adding new ruptures, condemnation flags, or atrocity content. Sensitive-history changes are governed by `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.
- Introducing a new combat sub-system. The opportunity layer is an authorization-and-staging shell on top of existing combat/staging/morale.
- Ahistorical "what-if" generation outside the catalog. Bot personality may decline historical proposals (that is a feature), but the engine is not asked to invent novel ops the catalog does not seed.
- Defining a new player UI shell. The opportunity surface should consume the existing review queue / Army HQ / autonomy proposal seams.

---

## 3. Conceptual model

An **operation opportunity** is a typed proposal that (a) appears when its prerequisites are met, (b) waits for an authorization decision from the player or bot, (c) on approval, instantiates a normal `CorpsOperation` (or multi-corps op) through the existing factories, and (d) on completion, produces a normal AAR plus an opportunity-resolution record so the catalog truth is observable at endgame.

Tier mapping inherits from the research catalog:

| Tier | Where it lives in this design |
|---|---|
| T1 — operation opportunity | First-class object in this design. The thing being proposed. |
| T2 — strategic event/modifier | Out-of-scope at the opportunity layer; surfaces through the existing event/modifier system as an upstream prerequisite signal. |
| T3 — defensive crisis | Modeled as a **defensive-crisis subtype** of opportunity (§5.4). Approving means counterattack/relief authorization, not "launch a chosen offensive." |
| T4 — sensitive-history gate | Allowed only as territorial opportunity. Atrocity/civilian-harm consequences remain in the locked rupture / paramilitary / displacement systems. See §9. |
| T5 — research-pending | Not eligible for opportunity authoring. Stays in the research catalog backlog. |

Three things a late-war op opportunity is **not**:

1. **Not a calendar trigger.** A turn window is one prerequisite among many, not the trigger.
2. **Not a guaranteed success.** Approval authorizes execution; the existing combat/morale/supply chain decides the outcome.
3. **Not a way to pierce the sensitive-history gate.** Approving Krivaja-95 authorizes the territorial military operation only; it does not unlock a "commit genocide" lever, and it does not reduce or trade away rupture consequences.

---

## 4. Prerequisite axes

A proposal becomes eligible when **all required axes are satisfied** and **at least the configured minimum optional axes** are satisfied. Each axis is a deterministic, testable predicate over `GameState`. None of the predicates may use random rolls, timestamps, or unsorted iteration.

The nine axes:

1. **Date window.** A `[turn_min, turn_max]` range derived from the research catalog and BB/ICTY anchors. Turn windows widen rather than narrow when in doubt — the date is a credibility filter, not the trigger. Exceeding `turn_max` retires the proposal; entering `turn_min` only turns the date axis green.
2. **Political authorization.** Faction political state must be compatible. This is faction-specific and reads existing event flags / strategic dimensions / patron pressure. Examples (illustrative, not authoritative): Mistral 2 requires Washington-Agreement-active for HV/HVO–ARBiH coordination; Tekbir 95 requires Sarajevo siege duration above some threshold; Krivaja-95 requires the documented historical political authorization signal — not a "commit atrocity" signal, but the same upstream go-ahead for the territorial reduction operation. The exact flags are family-doc work, not generic-doc work.
3. **Corps readiness.** The proposing corps must satisfy the existing readiness gates already used by the commander loop: tier classification, fitness, morale, exhaustion, recent-territory trend, and pending-operation slot availability (see `getMaxOperationSlots`).
4. **Logistics.** Supply state must be at or above the band the family doc demands. The default is *not strained*; some opportunities (e.g., 5th Corps pocket-survival counter-pressure) are eligible at *strained* with a casualty/penalty multiplier consistent with current op-launch rules.
5. **Staging access.** A friendly-controlled staging OSID must exist within reachable range of every axis's primary brigade pool. "Reachable" means the existing brigade movement / column-march system can plausibly deliver the brigades into staging within `planning_duration`. Late-1995 packet evidence (Mistral 2 axis 2, Stupčanica-95 axis brigades) showed that an unreachable staging OSID is a silent fail; the opportunity layer must reject the proposal at eligibility time, not at launch time.
6. **Weather/season.** Mountain operations (Vlasic, Bihać salient) and winter offensives (Winter 94 / Zima 94) have a season modifier on the readiness threshold. The early Vlasic attempt (Domet-95) is meaningful precisely because the *same* corps cannot pass the readiness threshold in February but can in March.
7. **Commander confidence.** The commanders of the corps and army involved must be in a confidence band consistent with launching. Low-confidence commanders may still surface the opportunity, but they will recommend decline (player can override; bot follows personality).
8. **Enemy weakness.** A corps-AI assessment of the enemy across the proposed objectives must indicate at least one of: degraded morale, recent territory loss, supply degradation, exhaustion plateau, or commander confidence collapse. If the enemy is uniformly strong, the opportunity stays out of the proposal queue — *not* out of the catalog. The same proposal can become eligible later when enemy weakness emerges.
9. **Alliance context.** Cross-faction opportunities (Mistral 2, Summer/Storm linkage, Sana under western-theater collapse) require the relevant alliance/pact state. Decoupled opportunities (single-faction territorial reductions) skip this axis.

A family doc must **explicitly mark each axis as required, optional, or N/A** for the opportunity it describes, and explain the BB/ICTY reason. The generic doc does not pick the values; it locks the vocabulary.

### 4.1 Counterfactual / divergence behavior

If the historical preconditions never converge in a given run — e.g., Cincar/Kupres never falls and Mistral 2's western corridor is therefore unreachable — the opportunity simply never appears. This is the design intent. It is the engine telling the truth about the war the player produced. Painted-target divergence is the report channel for that truth, not a bug.

The opposite case is also legal. If preconditions converge for an opportunity that the historical actor *declined*, the proposal still surfaces. Bot personality decides accept/decline as in the live system. A historically declined operation that fires in a run is divergence content for the Cost Ledger / Codex, not an engine fault.

---

## 5. Choice surface

When an opportunity is eligible, it is delivered through the existing autonomy / Army HQ review queue. The five canonical responses:

1. **Approve.** Authorize launch. The opportunity is converted to a `CorpsOperation` (or multi-corps op) via the canonical factories and enters the existing `sector_offensive.ts` lifecycle.
2. **Delay.** Hold the proposal in queue with an explicit re-evaluation turn. This is the model for "wait until weather / staging / supply improves" without forcing the player to re-click each turn. A delay budget bounded by `turn_max` ensures the opportunity does not delay past its credibility window.
3. **Redirect.** Approve a *named alternative variant* the family doc has authored. Examples: a southern-axis-only Mistral 2 instead of full two-axis; a Vlasic probe-only opportunity instead of full assault; a Sana western-axis-only instead of full three-axis. This is not free authoring — only family-doc-approved variants are selectable.
4. **Under-resource.** Approve, but with a reduced brigade pool / no army-reserve loan / no operational-group authorization. The execution path is the same; the readiness penalties stack honestly.
5. **Decline.** Reject the proposal. A declined proposal returns to the catalog with a re-eligibility lockout (default 8 turns, bounded by `turn_max`). This mirrors the existing triggered-op decline pattern noted in `triggered_operations.ts`.

The bot path uses the same five responses, decided by the existing political-leader-bot personality / corps-commander confidence / faction strategy — no new decision system.

### 5.1 Player-vs-bot scope

- **Player faction.** Approve/Delay/Redirect/Under-resource/Decline are all available, surfaced as a structured proposal review (one per opportunity, not a free-form modal). Inherits the v0.8.4 autonomy levels (`get-autonomy-state`, Level 1 proposals, `requires_player_response`).
- **Bot factions.** Approve/Delay/Decline at minimum. Redirect/Under-resource are optional by family-doc and only fire if the personality explicitly supports them. Bot decisions are deterministic and replay-stable.

### 5.2 Sensitive-history opportunities

For T4 opportunities (Krivaja-95, Stupčanica-95, Goražde pressure), the choice surface is **strictly the same five responses**. There is no extra option, no atrocity sub-decision, no "minimize civilian harm" slider. Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.3, atrocity is not a lever. The player decides whether to authorize the territorial military operation, full stop. Civilian-harm consequences flow through the existing locked systems (rupture, paramilitary policy, displacement). See §9 for the full carve-out.

---

## 6. Execution path

Once an opportunity is approved, it instantiates through the existing chain:

1. **Factory.** `buildCorpsOperation` (or the multi-corps case) constructs the `CorpsOperation` object from the opportunity's authored axes, objectives, staging OSID, planning duration, and minimum-attack-outcome. The opportunity layer never builds a `CorpsOperation` directly — it always goes through `corps_operation_helpers.ts`.
2. **Lifecycle.** `sector_offensive.ts` owns the lifecycle. The opportunity is now indistinguishable from any other corps operation in flight.
3. **Preparation.** Standard 5-phase state machine (Rulebook §7.2): Intel Gathering → Force Staging → Supply Check → Assessment → Ready. Probes, force-launch, postponement, and abort all behave normally.
4. **Execution.** Standard attack resolution (Rulebook §6.2). Reactive sector defense, entrenchment, exhaustion, posture, terrain, weather modifiers all apply normally.
5. **Multi-corps participation.** Inherits the durable rule from `PROJECT_LEDGER_KNOWLEDGE.md` (2026-05-01): brigade-side resolution must use `findBrigadeOperationAnywhere(state, brigadeId)` for cross-corps participants. Op injection and op cleanup remain primary-corps-local.
6. **Commander effects.** Operation commander assignment via `assignOperationCommander` (officer system). Commander personality continues to drive preparation tempo and launch threshold per the existing rules.
7. **Morale and exhaustion.** Standard chain — no new bookkeeping.
8. **AAR.** Standard AAR plus an **opportunity-resolution record** (§7) so the catalog truth is observable.

The opportunity layer is therefore an **authorization shell**, not a parallel combat engine. This is non-negotiable: the moment opportunity-specific combat math appears anywhere, the layer has slipped into "scripted op with extra steps."

---

## 7. Failure model

Failed operations are first-class outcomes, not bugs. The opportunity layer formalizes this so that BB-documented failures (Brana 94, Tekbir 95, Domet-95, Una 94, Breza 94, Pauk/Shield, Operation Una, Battle of Orasje, Zvezda 94) and emergent failures share the same vocabulary.

Five exit classes:

1. **Did not launch.** Approved but supply/staging/intel dropped below minimums during preparation, and the commander aborted. Common case for early-Vlasic-style opportunities.
2. **Launched and decisively succeeded.** Objectives captured at or above the catalog reference outcome. Standard AAR.
3. **Launched and partially succeeded.** Some objectives captured, others not. Standard AAR. This is the modal outcome for most catalog operations.
4. **Launched and failed.** No objectives captured, or attacker culminated and was repulsed. Standard AAR with a failed-operation flag. **This is the BB-documented outcome for several real operations and must not be treated as an engine fault.**
5. **Aborted in execution.** The corps stalled past the failure budget (Rulebook §7.3) or hit an explicit abort condition (e.g., political reversal, commander relieved, alliance ruptured mid-op). Standard AAR with abort reason.

A family doc must, for every operation it authors, list the historical exit class. The engine is not bound to reproduce it. If the proposal never even surfaces (axis 8 enemy-weakness never green), that is also a legal historical outcome — divergence is a feature.

### 7.1 Defensive-crisis subtype (T3)

T3 opportunities (Goražde under VRS pressure, Bihać under SVK/VRS/APWB pressure, Orašje under VRS pressure) are not "launch your chosen offensive" proposals. They are crisis proposals: an enemy operation has surfaced against you, and the question is what relief / counterattack / reserve commitment you authorize. The same five choice responses apply but the semantics shift:

- **Approve** = commit reserves / authorize relief operation (fires through the same execution chain).
- **Delay** = endure the pressure for another window.
- **Redirect** = shift commitment to a named alternative axis.
- **Under-resource** = commit minimum forces only.
- **Decline** = let the pocket / sector take the pressure unsupported. Possible outcomes include enclave fall, which then triggers the existing locked consequence systems.

T3 opportunities surface even if the player has no offensive readiness. They are about the player's response to enemy initiative, not the player's choice of where to attack.

---

## 8. Painted-target relationship

Per the durable rule recorded on 2026-04-30 and reaffirmed in the 2026-05-01 catalog entry: dated paints (`apr1994`, `apr1995`, `oct1995`) are **evaluation references**, not destiny. The opportunity layer makes this explicit.

- Painted targets are inputs to the engine-health view and to the player-facing endgame divergence narrative. They are not inputs to opportunity eligibility.
- Opportunity prerequisites read live game state only. A divergent run that never produces the apr1995 paint is still a legal run; the engine is not asked to back-fill the paint.
- `compare_painted_vs_sim` becomes a divergence report against an opportunity-aware baseline. A miss against the apr1995 paint, on a run where the relevant opportunities never became eligible because Cincar 1994 never happened, is a *correct divergence*, not a calibration regression. The CALIBRATION_MASTER and 40_reports surfaces should reflect that distinction.
- For built-in painted targets, the simulation-controller-universe rule (2026-05-01 ledger entry) still applies: targets must share the live OSID universe (currently 712).

The opportunity layer therefore does not change painted-target tooling; it changes the interpretation. A later doc on calibration cadence may extend `compare_painted_vs_sim` with an "opportunity-eligibility" column so divergence is legible at the report level. That tooling change is out of scope here.

---

## 9. Sensitive-history boundary

This section governs how the opportunity layer interacts with `SENSITIVE_HISTORY_DESIGN_GATE.md`. Nothing here re-opens or weakens that gate; it only specifies the opportunity-layer carve-out.

### 9.1 What is allowed (Ring 1 territorial)

- Krivaja-95 and Stupčanica-95 may exist as T4 opportunity proposals targeting the canonical Srebrenica / Žepa enclave OSIDs.
- Goražde pressure (Zvezda 94) may exist as a defensive-crisis (T3) opportunity for VRS, with the corresponding RBiH counter / NATO-ultimatum response surfaced through the existing event system.
- Approving such an opportunity authorizes the **military territorial operation** — capture or attempted capture of OSIDs, brigade staging, attack resolution. This is exactly what the existing `enclave_resilience.ts` and combat systems already model.

### 9.2 What is refused (Ring 3)

- The proposal **never** offers a "commit genocide" choice, an atrocity-policy choice, a paramilitary-targeting choice, or any branch whose effect is to convert military authorization into civilian-harm authorization. Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.3 item 1, this is a hard rule.
- The proposal **never** carries a benefit term tied to civilian harm. Approval does not yield a casualty-efficiency multiplier, a "rapid-clear" bonus, an intimidation modifier, or any payoff that depends on civilian outcomes.
- Approval **does not** suppress, defer, trade, mitigate, or delete the rupture or condemnation flag the existing system fires when the canonical conditions are met. Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §2 the Srebrenica rupture is locked, idempotent, permanent. The opportunity layer is upstream of that rupture, not negotiating with it.
- Approval **does not** unlock Ring-3-refused content (no concentration-camp system, no per-victim attribution, no negotiable condemnation, etc., per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.3 items 2–10).

### 9.3 What the player decides at a T4 proposal

Exactly the same as any other opportunity: Approve, Delay, Redirect, Under-resource, Decline. The territorial operation is a real military operation. Whether it is wise to launch it is a real strategic question. Whether the war crimes that historically followed are a player-authorizable trade is **not** a question the engine asks. They are consequence content, governed by the existing systems (`src/sim/combat/paramilitary_sweep.ts`, `src/sim/combat/enclave_resilience.ts`, `src/sim/negotiation/rupture_consequences.ts`, displacement, the Cost Ledger).

### 9.4 What the bot decides at a T4 proposal

The political-leader-bot personality decides Approve / Delay / Decline / Redirect / Under-resource the same way it does for any other opportunity. The bot **never** receives an "authorize atrocity" sub-prompt, because that prompt does not exist in the data shape. The bot's approval of the territorial operation, in conjunction with the existing Ring 1 systems, is what produces the historical consequence chain. This matches the catalog reality and the `SENSITIVE_HISTORY_DESIGN_GATE.md` design intent.

### 9.5 Sign-off requirement

Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6, any future change to enclave mechanics or to a rupture trigger requires `/historian` + `/game-designer` (and `/gameplay-programmer` for enclave mechanics). This generic doc does not change either, so it does not require those sign-offs. The follow-up family doc *late-war-safe-area-and-sensitive-history-design.md* will require `/historian` + `/game-designer` + `/war-or-game` review and user approval before any code is written, even though the territorial operation itself is Ring 1.

---

## 10. Determinism and replay

Inherits the canon Determinism Rule and the Engine Invariants:

- **No `Math.random()`, no `Date.now()`, no timestamps** in the opportunity evaluator, the eligibility predicates, the proposal generator, or the bot decision path.
- **Sorted iteration** for any cross-faction or cross-corps loop, via `strictCompare`. The `findBrigadeOperationAnywhere` precedent applies (2026-05-01 ledger): if two opportunities could theoretically claim the same brigade, the alphabetically-earliest opportunity-id wins.
- **Deterministic proposal queue order.** Proposals are sorted by `(turn_min, opportunity_id)` so the autonomy / Army HQ review queue is reproducible across replays.
- **Replay safety.** Every opportunity-resolution record persisted to AAR / opportunity-resolution log must contain the full set of (proposal_id, turn_eligible, response, response_turn, executed_op_id_or_null). The Cost Ledger and Codex consume this log; replay must reconstruct it exactly.
- **No fallback to non-deterministic behavior** when the API or LLM-assisted layer is unavailable. The opportunity layer is a pure deterministic function of `GameState`. LLM-assisted personality decisions ride on top of it; if the LLM is unavailable, the deterministic personality fallback decides.

---

## 11. Proposed data shape

This is a **proposal**, not a frozen schema. The implementation packet will pin field names against `GameState` once the operations-singularity work has fully settled. None of the names below should be assumed final.

```ts
// Catalog-level — authored in family docs, loaded from data files.
interface OperationOpportunityDef {
    opportunity_id: string;            // "krivaja_95", "mistral_2", "sana_95", ...
    name: string;                      // "Operation Krivaja-95"
    tier: 'T1' | 'T3' | 'T4';          // T2 lives in events; T5 is research-pending only
    faction: FactionId;
    primary_corps: string;
    axes: ReadonlyArray<TriggeredAxisDef>;   // existing shape from triggered_operations.ts
    redirect_variants?: ReadonlyArray<OperationOpportunityVariant>;

    // Prerequisite axes (§4). Each axis is required | optional | n_a.
    prerequisites: {
        date_window: { turn_min: number; turn_max: number };
        political_authorization: PrereqMode;
        corps_readiness: PrereqMode;
        logistics: PrereqMode;
        staging_access: PrereqMode;
        weather_season: PrereqMode;
        commander_confidence: PrereqMode;
        enemy_weakness: PrereqMode;
        alliance_context: PrereqMode;
        min_optional_axes: number;     // how many "optional" axes must be green
    };

    // BB / ICTY / primary citation. Required for every catalog entry.
    citations: ReadonlyArray<string>;

    // Catalog historical reference outcome — for divergence reporting only.
    historical_exit_class: 'did_not_launch' | 'decisive_success' | 'partial_success' | 'failed' | 'aborted';
}

type PrereqMode = 'required' | 'optional' | 'n_a';
```

```ts
// Live state — added to GameState (proposed nesting under state.military).
interface OperationOpportunityState {
    opportunity_id: string;
    proposal_id: string;               // unique per (opportunity_id, eligibility_turn)
    eligibility_turn: number;
    expires_turn: number;              // <= prerequisites.date_window.turn_max
    status:
        | 'eligible_pending_review'
        | 'delayed'
        | 'approved'
        | 'declined'
        | 'expired'
        | 'redirected'
        | 'under_resourced_approved';
    approver_faction: FactionId;       // who decided / will decide
    response_turn?: number;
    redirect_variant_id?: string;
    executed_op_id?: string;           // links to CorpsOperation once instantiated
    last_axis_evaluation: ReadonlyArray<{ axis: PrereqAxis; green: boolean; reason: string }>;
}

interface OperationOpportunityResolution {
    proposal_id: string;
    opportunity_id: string;
    response: 'approve' | 'delay' | 'redirect' | 'under_resource' | 'decline' | 'expire';
    response_turn: number;
    executed_op_aar_id?: string;       // resolves at op completion
    exit_class?: ExitClass;            // resolves at op completion
}
```

Three integration touchpoints (proposed; not implemented in this doc):

- **A war-pipeline step** that evaluates the catalog against `GameState` once per turn, surfaces newly-eligible proposals, expires stale ones, and re-evaluates delayed ones. Step name to be assigned by `/operations-expert` + `/sector-expert`.
- **An IPC / autonomy bridge** that feeds eligible proposals into the existing Army HQ / autonomy review surfaces with the autonomy-domain `'ops'` tag (Phase D / Phase E precedent). No new operation lifecycle or command owner is required. A future UI packet may add a richer mutating decision invoke for Delay / Redirect / Under-resource if the current accept/reject bridge is too narrow.
- **An AAR / opportunity-resolution log writer** that closes the loop at op completion and persists the resolution record for the Cost Ledger / Codex / Wrapped consumers.

---

## 12. Implementation constraints (forward-looking)

These constraints bind any future packet that turns this doc into code:

1. **One canonical opportunity object.** Same operations-singularity rule (`docs/plans/2026-03-31-v08x-operations-singularity-plan.md`). No "scripted op" path running alongside an "opportunity op" path. The existing triggered-ops file becomes a thin loader for the catalog, not a parallel system.
2. **One canonical lifecycle.** `sector_offensive.ts` continues to own all op-type lifecycles. The opportunity layer never owns a partial lifecycle.
3. **Brigade-side resolution always state-wide-aware.** Per the 2026-05-01 multi-corps fix, any brigade-side "what op is this brigade in?" lookup uses `findBrigadeOperationAnywhere`.
4. **Built-in painted targets respect the live OSID universe** (currently 712). No catalog entry may reference a geometry-only OSID outside the simulation-controller universe.
5. **No avoided-OSIDs hack.** A T1 opportunity must never be backed by `avoided_osids_by_faction` for "balance." If an opportunity surfaces against the wrong target list, fix the family doc's objectives, not the override surface.
6. **Initial OSID control is sacrosanct.** Approving an opportunity does not preset, paint, or warp initial control. The territorial outcome must come from attack resolution or defined corps/frontline ops, per Rulebook §4.3.
7. **Five-question ownership gate** (per v0.8.x-final): every prerequisite axis predicate, every choice-surface handler, every AAR consumer must answer (a) canonical owner after change, (b) competing path being removed or demoted, (c) test or observable behavior proving the change, (d) UI/report surface reflecting new truth, (e) future milestone unblocked.
8. **One change per calibration run** still applies. Opportunity-layer rollout must be staged behind a feature flag and tested without bundling into a tuning pass.
9. **Sensitive-history sign-off precedes T4 family-doc code.** Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6, no T4 opportunity ships without the named sign-offs and user approval.

---

## 13. Open questions (resolve in family docs, not here)

- Per-faction default delay budget. Is 8 turns (the current decline-relisten cadence) right for all factions, or should it scale with patron pressure / exhaustion?
- Redirect-variant authoring contract. How many variants per opportunity is reasonable before the choice surface becomes overwhelming?
- Bot personality interaction with under-resource. Does any current personality ever choose under-resource over decline, or is under-resource effectively player-only? If the latter, the field stays in the schema but we accept asymmetric usage.
- Cost Ledger phrasing for declined T4 opportunities. Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §4, the language must be historical voice and ICTY-cited where applicable. The exact wording belongs in the safe-area family doc with `/narrative-designer` + `/historian` review.
- Calibration tooling extension. Whether `compare_painted_vs_sim` should add an "opportunity-eligible-but-declined" column. Goes to the calibration-cadence packet, not here.

---

## 14. Acceptance criteria for this doc

This design doc is considered accepted when:

- It is referenced by at least one family-doc draft from the research catalog backlog without that family doc needing to redefine the prerequisite vocabulary.
- It does not require any change to canon (`docs/10_canon/`).
- It is consistent with `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, §2, §6 and is explicitly silent on Ring 3 surfaces.
- The PROJECT_LEDGER carries a docs-only entry pointing to this file.
- No engine code, scenario data, OOB, painted target, or test changed in the same commit.

A future implementation packet (separate from this doc) will own canonical-owner naming against the actual `GameState` shape, the war-pipeline step name, the IPC bridge, the calibration tooling, and the test contract.
