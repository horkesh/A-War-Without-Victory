# D4 — Modding-Surface Formalization for 1.0 — DECISION

**Date:** 2026-06-05
**Status:** RULED — **Option A + B (ship the de-facto surface, read-only "unsupported" note)**
**Owner ruling:** Owner thumbed-up the Pyrrhic panel recommendation (A+B).
**Source packet:** `docs/40_reports/20260605_FORAWWV_OPEN_DECISIONS_PACKET.md` (D4)
**Roadmap refs:** MASTER_ROADMAP Q4; resolution-plan Task 4.
**Class:** design-decision report (product-manager + user lane). No code, no calibration impact.

---

## The question

Event definitions and scenario manifests are already JSON; Lua bindings exist but are
unsurfaced. Do we formalize a modding surface for 1.0 (none / read-only docs / a formal editor /
Steam Workshop)?

## The adopted ruling — Option A + B

**Ship the de-facto JSON/Lua modding surface that already exists, accompanied by a short
read-only note that the data formats are internal and unsupported — "formats may change without
notice."** No formal scenario editor and no Steam Workshop for 1.0.

This is Option A (expose no *supported* surface, preserve format freedom) combined with the
cheap Option B upgrade (a short honest "unsupported, may change" note rather than silence),
which the owner adopted to set honest expectations and earn early-community goodwill without a
support commitment.

A formal editor / Workshop (panel Option C) is **deferred post-1.0** (v1.7 candidate).

**Binding constraint:** modding **never bypasses the §6 sensitive-history gate.** No mod, data
override, or scripted surface may circumvent `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
(the three-ring boundary and rupture-expansion rule).

## Rationale

- **Scope / format freedom.** Shipping 1.0 silently still ships a de-facto modding surface
  (JSON scenarios/events, Lua). The only real question is whether and how much to *support* and
  *commit* to it — and support commitments are hard to walk back. The "unsupported, may change"
  note keeps maximum internal freedom to refactor data formats during active development.
- **Honesty / goodwill.** Modders will find the JSON/Lua surface regardless. An explicit
  "unsupported" stance manages expectations, builds modest community goodwill, and protects the
  right to change formats — strictly better than silence at near-zero cost.
- **Sensitive-history integrity.** The non-bypass clause ensures the modding surface cannot be
  used as an end-run around the sensitive-history gate; the gate governs content regardless of
  whether it arrives via core data or a mod.
- **Calibration.** Zero impact — modding-surface policy does not change sim behavior.

## What this forecloses (for 1.0)

- No **formal scenario editor** ships with 1.0.
- No **Steam Workshop** integration for 1.0.
- No **support commitment** to format stability — formats are explicitly internal/unsupported
  and may change without notice.
- No modding path that bypasses the §6 sensitive-history gate (bound permanently, not just 1.0).

## Deferral note (post-1.0 / v1.7 candidate)

A formal scenario editor and/or Steam Workshop integration is deferred to a post-1.0 scope
review (v1.7 candidate). Any formalization:

1. MUST still honor the §6 sensitive-history non-bypass rule, and
2. Would convert today's "unsupported" formats into supported, versioned ones — a commitment to
   be weighed deliberately at that review, not now.

## Canon scope sentence added

- `docs/10_canon/Game_Bible_v0_9_0.md` §18 (Design boundaries and non-negotiables) — one binding
  sentence: scenario/event JSON and Lua data formats are internal and unsupported for 1.0
  (may change without notice; no formal editor or Workshop); mods never bypass the §22
  sensitive-history gate.

`docs/10_canon/FORAWWV.md` is **NOT** touched (product/scope decision, no invariant).

---

*Cites the Pyrrhic decision-prep panel, packet `20260605_FORAWWV_OPEN_DECISIONS_PACKET.md` §D4.*
