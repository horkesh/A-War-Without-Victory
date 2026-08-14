# Brčko flip — the real channel is attacker-power (`getWarExhaustionTempoMult`), not op-tempo; the anchor was held by the saturation bug

**Date:** 2026-08-09
**Status:** Root channel re-identified by code trace (corrects `20260807_BRCKO_CORRIDOR_REGRESSION.md`'s "operational tempo" framing). Ceiling diagnostic in flight to confirm whether exhaustion re-pacing can hold Brčko at all, or whether the fix is force-density-only. Triggered by the owner's question "did we solve all engine woes behind the initial problem?" — **answer: no, and the assumed Phase-4 fix rests on a mis-identified mechanism.**

## What the earlier report got wrong

`20260807_BRCKO_CORRIDOR_REGRESSION.md` attributed the turn-58 Brčko flip to the de-saturation giving ARBiH 2nd Corps the **operational tempo to open** a Brčko offensive (an op-*selection* effect), and assigned the root fix to Phase 4 exhaustion re-pacing (which would "stop handing ARBiH the mid-war tempo").

**The op-selection channel is insensitive to the de-saturation.** The faction exhaustion drag on op-planning is `factionExhaustionDrag = max(0.3, 1 − war_exhaustion/600)` (`commander/plan.ts:286-289`). `war_exhaustion` is on the 0–10000 scale, so the term hits its **0.3 floor for any `war_exhaustion` > 420** — which binds by roughly turn 5, and certainly by turn 58. The de-saturated value (~3000–5000) and the old clamped value (~10000) **both floor to 0.3** → identical op-planning drag. The corps-exhaustion term (`plan.ts:279-282`) reads `corps_exhaustion`/`profile.exhaustion`, which the de-saturation did not touch. So op-selection cannot be the channel.

## The real channel — `getWarExhaustionTempoMult` (attacker power)

`combat_math.ts:1788` → consumed at `attack_resolution_osid.ts:930`. A **direct multiplier on ATTACKER power only** (never defender):

| ARBiH `war_exhaustion` | attacker-power mult |
|---|---|
| ≤ 3000 | ×1.00 |
| 3000–8000 | linear ×1.00 → ×0.85 |
| ≥ 8000 (80% of cap) | ×0.85 |

**Mechanism:** the exhaustion **saturation bug** pinned ARBiH's mid-war `war_exhaustion` near the ceiling (≥8000) by ~wk50 → attacker power ×0.85 → the turn-58 Brčko attack was ~15% weaker → it lost / was not a winnable target → **Brčko held**. The de-saturation (correctly, per §8.6) dropped ARBiH's turn-58 `war_exhaustion` into the ~3000–5000 band → attacker power rose to ~×0.95–1.0 → a **~12–18% attacker buff** → ARBiH now wins the knife-edge turn-58 battle → **Brčko falls**.

## The reframe — Brčko was held by the bug

The anchor's pre-de-saturation "correctness" was an **artifact of ARBiH being ahistorically over-exhausted mid-war** (too weak to attack). The tempo penalty is full only at **80% of the exhaustion cap**; turn 58 ≈ week 58/188 ≈ **mid-1993**, when a historically-paced ARBiH war-weariness arc is nowhere near 80%. So:

- **"Restoring" Brčko by raising ARBiH's mid-war exhaustion re-introduces the very over-exhaustion the de-saturation removed** — it is anti-engine-health.
- `getWarExhaustionTempoMult` is attacker-only, so RS-defender exhaustion cannot help RS defend Brčko through this lever either.
- Therefore **Phase 4 exhaustion re-pacing is very likely NOT the honest Brčko fix.** The honest fix is the **RS defensive side** — force-density / the missing resident Brčko garrison (the `1st Posavina → Brčko` OOB correction, blocked today only by the RS corridor over-subscription). Phase 4 comes OFF the Brčko critical path unless the diagnostic shows a historically-plausible ARBiH turn-58 exhaustion still holds the knife-edge.

## Diagnostic (DONE, n165) — confirms the channel, and confirms exhaustion is OFF the Brčko critical path

Temporary env override `AWWV_DIAG_ARBIH_TEMPO_085` forced ARBiH's attacker tempo mult to the pre-de-sat floor 0.85 (the CEILING of what any exhaustion level could deliver). 188w result:
- **`op:brcko:brcko` = RS [PASS], anchors 31/31** — Brčko HOLDS. ✔ confirms the `getWarExhaustionTempoMult` attacker-power channel: a ~15% ARBiH attacker reduction restores the anchor.
- **BUT `matched_osids` 634 → 633 (−1)** — forcing the penalty globally over-weakens ARBiH and costs a matched OSID elsewhere.

**Two independent reasons exhaustion re-pacing is not the honest Brčko fix:**
1. The full ×0.85 penalty requires ARBiH ≈80% `war_exhaustion` at **turn 58 ≈ mid-1993** — ahistorical. A genuinely historical war-weariness arc (Phase 4's goal) lands ARBiH well below that at turn 58, giving only a partial penalty that likely does not clear the knife-edge.
2. Even at the ceiling, the effect is a **global** ARBiH attacker nerf that trades away a matched OSID (−1). It is not a targeted lever on the turn-58 Brčko battle.

**Conclusion: Phase 4 exhaustion re-pacing comes OFF the Brčko critical path.** The honest fix is the **RS defensive / force-density side** — but the simple OOB move (`1st Posavina → Brčko`, historically correct) trades Doboj/Gračanica because the East Bosnian Corps is structurally over-subscribed (only 10 brigades for Brčko + Doboj + Gračanica + the rest). That over-subscription is the **RS cohesion-railroad / force-density** debt (`20260807_RS_BRIGADE_LOSS_ASYMMETRY_ROOT_CAUSE_FIX_DEFERRED.md`, deferred post-1.0). So **Brčko's honest fix is entangled with that structural lane** — either a targeted OOB + compensating corridor-coverage engineering that holds all three anchors, or the full combat-earned-cohesion redesign that makes RS brigades durable enough to cover the corridor. Scoping that is the next step.

(Diagnostic reverted — not shipped.)

## Determinism
Code-trace + one env-gated diagnostic (reverted). No shipped change.
