# D3 — War Economy Depth Ceiling — DECISION

**Date:** 2026-06-05
**Status:** RULED — **Option A (abstract economy is final for 1.0; production queues rejected)**
**Owner ruling:** Owner thumbed-up the Pyrrhic panel recommendation (A).
**Source packet:** `docs/40_reports/20260605_FORAWWV_OPEN_DECISIONS_PACKET.md` (D3)
**Roadmap refs:** MASTER_ROADMAP Q8; resolution-plan Task 6.
**Class:** design-decision report (product-manager + game-designer lane). No code, no calibration impact.

---

## The question

How detailed is the war economy in 1.0? The current model is abstract: capacity numbers,
smuggling routes, equipment lifecycle, supply states (Adequate/Strained/Critical), corridors.
Do we ever add Paradox-style production queues (player-managed factories / build orders)?

## The adopted ruling — Option A

**The abstract war economy is FINAL for 1.0.** Production queues are **REJECTED**. The economy
stays at the political-strategic altitude — scarcity, supply state, corridors, smuggling, and
equipment lifecycle — with no player-managed production/build-order system. The player governs
*scarcity and allocation pressure*, not a factory queue.

Light economy depth (panel Option B — a few player-visible production/allocation knobs) and a
full production system (panel Option C) are both rejected for 1.0; Option C is explicitly
out-of-scope (far-future, post-2.0 at the earliest, only if a future product thesis demands it).

## Rationale

- **Soul (presidential altitude / scarcity-not-production).** The player is the **president**,
  not a quartermaster. Production micro (allocating factory output, ammo-vs-replacement build
  orders) is general/quartermaster work and fights the strategic-president framing. Abstraction
  is *more* faithful to a leadership-level sim than a factory queue would be — the war's economy
  was felt as **scarcity and constraint**, not as production throughput the leadership tuned.
- **Scope (anti-creep).** The roadmap *leaned* abstract but never ruled it, leaving the door
  open to recurring "add production depth" proposals. This ruling closes that door. It is the
  cheapest high-value decision available: a pure scope-fence, zero build.
- **Calibration.** Option A = **zero** calibration impact. Option B would move supply/equipment
  trajectories and require a 188w A/B; avoiding it protects the baseline.

## What this forecloses (for 1.0 and bound thereafter)

- No player-managed **production queues** or **build orders**.
- No factory/output micro-allocation surface.
- No "prioritize ammo vs replacements" production knob (Option B).

Equipment lifecycle, smuggling allocation, airdrop/convoy/tunnel relief, and supply-state
mechanics already in the engine are **unaffected** — those are scarcity-and-allocation
surfaces at presidential altitude, not production management.

## Deferral note (post-1.0)

A full production system (Option C) is parked as a far-future possibility only, contingent on a
future product thesis that explicitly justifies departing from the presidential-altitude,
scarcity-not-production model. It is not on the 1.0, v1.6, or near-term roadmap.

## Canon scope sentence added

- `docs/10_canon/Systems_Manual_v0_9_0.md` §14 (Logistics, supply, and corridors) — one binding
  sentence: the war economy is abstract (scarcity, supply state, corridors, smuggling, equipment
  lifecycle) and final for 1.0; no player-managed production queues or build orders.

`docs/10_canon/FORAWWV.md` is **NOT** touched (no FORAWWV invariant needed).

---

*Cites the Pyrrhic decision-prep panel, packet `20260605_FORAWWV_OPEN_DECISIONS_PACKET.md` §D3.*
