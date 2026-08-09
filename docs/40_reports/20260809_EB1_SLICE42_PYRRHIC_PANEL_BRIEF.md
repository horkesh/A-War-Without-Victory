# FROZEN PANEL BRIEF — E-B1 slice 4.2 (coherence consumers) GO/BLOCK

**Convened:** 2026-08-09 · **Integrator:** orchestrator (sole reconciler) · **Artifact is FROZEN — evaluate only what is below.**

## The question before the panel
Slice 4.1 (a per-corps `coordination_coherence` ∈ [0,1] derivation + run_summary diagnostic) is **built, validated behavior-INERT, and committed** (`8f6b1d211` on `codex/eb1-coherence`): 40w structural fingerprint UNCHANGED (`5cfcf1c840bae488`); 188w territory-flat (matched **634**, anchors **30/31** — `op:brcko:brcko` only, no new flips; §6 intact; K:W in band); `tsc` clean; unit test 10/10. It is a stateless recompute-from-current-state module mirroring `strategic_depth.ts`. It has **zero consumers** — currently it changes nothing.

**Slice 4.2 wires two combat consumers** so coherence finally *does* something:
1. **Op-launch admission block** — a corps below a coherence threshold cannot launch new CorpsOperations (models a fragmented corps losing operational grip in the late-war endgame). Tiered thresholds (e.g. 0.7 / 0.5 / 0.3).
2. **Peripheral abandoned-OSID defender modifier** — a `×0.80` defender-power modifier applied ONLY to abandoned **peripheral** OSIDs (never a core town; Banja Luka core explicitly excluded), in `src/sim/combat/attack_resolution_osid.ts`.

**Design fork inside 4.2:** keep the **stateless** derivation (recompute each turn from current state — simple, no save-migration) vs. convert to a **stateful accumulator** (coherence decays from discrete events and carries memory — richer, but adds save-schema + migration surface). Orchestrator's prior: stateless unless it proves too coarse.

## Hard constraints (invariant — a proposal that violates any is an automatic BLOCK)
- **Anchor floor:** matched must stay **≥ 634**; the full 31-anchor `anchor_checks` set must show **no NEW flips** beyond the accepted `op:brcko:brcko` debt. (The cohesion-dimension experiments of 2026-08-07 were RETIRED precisely because they flipped `petrovo_2`/`boljanic_2` RBiH — a real regression, see [[petrovo_2_vozuca_anchor_fidelity]].)
- **§6 bright line:** Srebrenica + Žepa fall; Goražde + Bihać + Sarajevo + Teočak hold. Atrocity never rewarded.
- **Core-town stability:** the peripheral modifier must never touch a core town or Banja Luka.
- **Determinism:** no wall-clock/RNG; sorted iteration.
- **Adopt-or-retire:** 4.2 is an EXPERIMENT on predeclared criteria (matched ≥634, no new anchor flips, §6, K:W in band, engine-health gate PASS). Clean → ADOPT; any regression → RETIRE, no exceptions.

## What E-B1 is trying to model (design source: `docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md §3`)
The Fall-1995 endgame: as corps come under sustained pressure and lose strategic depth, their *operational coordination* degrades — they can still defend but progressively cannot mount coherent offensives, and their grip on non-essential peripheral ground loosens. This is meant to be an EMERGENT signal (never hardcoded per-OSID/per-brigade), asymmetric by pressure, and concentrated late-war.

## Each specialist returns (tight, no rebuild required — read-only reasoning)
- **VERDICT: GO / GO-WITH-CONDITIONS / BLOCK** (one line, up front).
- **Rationale** (≤150 words) from your lens.
- **The single thing most likely to make 4.2 RETIRE** from your lens.
- **Stateless vs accumulator:** your recommendation + one-line why.
- Any bright-line/§6 concern (explicit "none" if none).

Unanimous GO (or GO-with-compatible-conditions) = the signature to build+validate 4.2 under adopt-or-retire. Any BLOCK or split → escalate to owner.

---

# PANEL VERDICT (2026-08-09) — integrated by orchestrator

**Tally:** wargame-expert GO-COND · calibration GO-COND · historian GO-COND · red-team **BLOCK** → split → owner escalation, with the integrated recommendation below.

## The panel effectively splits 4.2 into two very different consumers:

### Consumer 1 — op-launch admission block = the VALUABLE, historically-earned, genuinely-new half
- **Endorsed by 3 lenses.** Historian: the defends-core-loses-periphery + offensive-paralysis-under-defensive-pressure pattern is directly attested — VRS 2nd/1st Krajina disintegrated on the western periphery Sept-Oct 1995 while Banja Luka held (BB1 p.417/380, p.428/391); ARBiH 2nd Corps "so heavily engaged defensively... we simply could not" relieve Srebrenica 1993 (BB2 p.406/387). Wargame: nothing today gates a corps's *ability to attack* on fragmentation — this is a true new lever.
- **Two landmines, same root** (signal false-triggering on corps that are low-coherence by GEOMETRY, not by Fall-95 exhaustion):
  - Red-team: besieged corps (Bihać 5th, Goražde 81st, pre-fall Srebrenica) have shallow depth + high AOR-contested *by geography* → trip <0.7 early-war → their relief/breakout ops gated out all game.
  - Historian (**highest-stakes §6 risk in canon**): VRS Drina Corps sat static/defensive 1993-95 → a naive coherence signal reads it INCOHERENT the week before it executed the swift multi-brigade Srebrenica/Žepa breakthrough — the exact §6-mandated operation.
- **Required guard:** an enclave/siege-geometry exemption so the block models Fall-95 *exhaustion* paralysis, not enclave geometry; + a min-consecutive-turns sustain gate on the consumer (kills flicker); + validation must LOG Drina-Corps + enclave-relief-corps coherence/op-eligibility in the weeks before the §6 anchors (not just confirm anchors held).

### Consumer 2 — ×0.80 peripheral defender modifier = the UNSAFE + REDUNDANT half → DROP from 4.2
- Red-team BLOCK: "never core" is NOT a curated flag — it resolves via `strategic_priorities.json`, which defaults any unlisted OSID to `periphery`. RBiH `core` = only 4 OSIDs; **Goražde + Teočak have zero entries, all non-`stari_grad` Sarajevo OSIDs unlisted** → the ×0.80 hits §6-protected towns *by documented default*.
- Wargame: it re-taxes an event the engine already models three times — `strategic_depth` (`0.5+0.5×depth`, combat_math.ts:1636-1639) + `getKrajinaCollapseMult ×0.65` (those exact post-Storm Krajina corps) + NATO Deliberate Force ×0.70. A fourth multiplier off a product of those primitives = collapse cliff, not grind — and it's *why western Bosnia already falls correctly in the sim*.
- Calibration: corridor-flip risk (same failure mode as the retired 2026-08-07 cohesion-dim experiment).

### Derivation shape — UNANIMOUS: STATELESS
All four. Accumulator adds save-migration + reload-exploit surface AND wrongly suppresses recovery (historian: 5th Corps stopped 1994 → broke through in days Sept 1995 once external coordination arrived; memory-of-failure would ahistorically pin it down). Flicker handled by the cheap consumer-side sustain gate, not an accumulator.

## INTEGRATED RECOMMENDATION (orchestrator)
1. **ADOPT** (build + validate under adopt-or-retire) **only the op-launch admission block** — stateless, WITH the enclave/siege-geometry guard + min-consecutive-turns sustain gate.
2. **DROP the ×0.80 peripheral defender modifier from 4.2** — §6-unsafe by default AND redundant with strategic_depth+Krajina-collapse+NATO. Park as post-1.0 idea contingent on a full core/periphery classification that first lists every §6 town.
3. **Validation adds** to the brief's criteria: (a) Drina-Corps coherence/op-eligibility trace in the weeks before the Srebrenica+Žepa anchors; (b) Bihać-5th / Goražde-81st op-eligibility across the full run; (c) explicit controller diff of `petrovo_2` / `boljanic_2` / `op:brcko:brcko`.

This reduced, guarded scope satisfies every specialist's condition and converts red-team's (conditional) BLOCK to GO. Combat-central + a BLOCK was raised + this drops a consumer → owner go on the scope before build.
