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
