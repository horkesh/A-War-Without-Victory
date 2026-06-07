# D5 — Multiplayer for 1.0 — DECISION

**Date:** 2026-06-07
**Status:** RULED — **Option A (explicit post-2.0 deferral; zero 1.0 work)**
**Owner ruling:** Multiplayer is deferred to a post-2.0 architecture review; no 1.0 work.
**Source packet:** Pyrrhic decision-prep round (2026-06-07); FORAWWV open-decisions gate B-MP.
**Roadmap refs:** MASTER_ROADMAP FORAWWV gate B-MP; owner decision backlog
`docs/plans/2026-06-07-owner-decision-backlog.md` §8.
**Class:** design-decision report (product-manager + owner lane). No code, no calibration impact.

---

## The question

Should AWWV ship any multiplayer (hot-seat, asynchronous, or networked) for 1.0, or commit to a
later target?

## The adopted ruling — Option A

**Multiplayer is explicitly deferred to a post-2.0 architecture project. Zero multiplayer work is
scheduled for 1.0.**

Network multiplayer in a *deterministic, asymmetric-information* simulation is a 2.0+ architecture
project, not a 1.0 feature. The determinism contract (no `Math.random`, no wall-clock, sorted
iteration) is an asset for lockstep networking, but asymmetric information (fog of war, hidden
enemy supply/intent) plus the existing single-player save/replay model means a faithful MP layer
requires deliberate netcode, authority, and information-partition design that does not exist today
and must not be improvised under 1.0 pressure.

## Rationale

- **Architecture, not a feature.** Deterministic lockstep is necessary but not sufficient; the
  hard part is partitioning hidden information per player and reconciling it with the
  single-authority save/replay model. That is a dedicated project.
- **Scope protection.** 1.0 is a single-player historical/emergent simulation. Bolting on MP would
  divert the whole release.
- **The determinism asset is preserved, not spent.** Keeping the sim deterministic and replayable
  for 1.0 leaves the cleanest possible substrate for a future MP project — no MP-specific debt is
  incurred now.
- **Calibration.** Zero impact — this is a scope ruling, not a behavior change.

## What this forecloses (for 1.0)

- No hot-seat, asynchronous, or networked multiplayer in 1.0.
- No MP-oriented netcode, authority model, or per-player information-partition work in 1.0.
- No public MP claim or roadmap commitment before the post-2.0 review.

## Deferral note (post-2.0)

Any multiplayer effort is a post-2.0 architecture review. It MUST:

1. Preserve the determinism contract (lockstep-friendly).
2. Solve per-player hidden-information partitioning explicitly (fog of war, hidden supply/intent).
3. Reconcile MP authority with the single-player save/replay model rather than retrofitting it.
4. Honor the §6 sensitive-history gate regardless of session type.

---

*Cites the 2026-06-07 Pyrrhic decision-prep round, FORAWWV gate B-MP.*
