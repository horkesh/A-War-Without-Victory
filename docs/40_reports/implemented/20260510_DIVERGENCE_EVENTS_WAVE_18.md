# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-18 -- Closeout

**Date:** 2026-05-10
**Status:** CLOSED -- 4/4 events shipped, lane tests GREEN
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lane:** Wave 17 + saturation closeout (`docs/40_reports/implemented/20260508_V090_EVENTS_AUTHORING_SATURATION.md`)

---

## Scope

Wave 18 re-opened `consequences.json` because the roadmap asked for deeper v0.9.0 dispatch, and because the prior saturation report explicitly named `csq_captured_equipment_windfall_HRHB` as a fold-in candidate if the file was touched again.

The lane adds four additive Ring 1 / no-section-6 consequence records:

| Event | Purpose |
|---|---|
| `csq_third_party_arms_channel_HRHB` | Adds the missing HRHB opener that the existing HRHB attenuation event already expects. |
| `csq_captured_equipment_windfall_HRHB` | Closes the captured-equipment windfall RBiH / RS / HRHB family. |
| `csq_winter_supply_attrition_RS` | Closes the winter-supply attrition triad. |
| `csq_doctrine_drift_RS` | Closes the doctrine-drift triad after RS corps reorganization. |

## Catalog Delta

Pre-lane catalog: **121 events**.

Post-lane catalog: **125 events**.

Responding-faction split after this lane: RBiH 50 / RS 38 / HRHB 31 / 6 faction-agnostic.

## Contract

- No new `EventCondition` kinds.
- No new `EventEffect` kinds.
- No new state fields.
- No `political_controllers`, OOB, scenario paint, FORAWWV, rupture, or sensitive-history-gate mutation.
- Every authored event has `turn_min >= 50`, so the 40w baseline is inert by construction.
- Cost Ledger annotations are audit-only narrative records and do not drive mechanics.

## Verification

Red first:

- `npx.cmd vitest run tests/divergence_events_wave_18.test.ts --reporter=dot` failed 6/6 on missing event IDs.

Green after implementation:

- `npx.cmd vitest run tests/divergence_events_wave_18.test.ts --reporter=dot` passed 6/6.

Broader verification was run before commit in the implementation session.

## Consequence-System State

This does not fully close v0.9.0. It materially reduces ordinary authoring debt by folding in the named mirror gap and three non-sensitive substrate-backed mirrors. Remaining v0.9.0 work is now less about event count and more about player-facing consequence narration: Cost Ledger / dynamic essay readers, decision-event sparsity if desired, and STOP-gated substrate lanes that require their own audits before new content.
