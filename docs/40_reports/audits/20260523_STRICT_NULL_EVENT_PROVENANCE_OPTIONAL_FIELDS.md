# Strict-Null Audit: Event Provenance Optional Fields

Date: 2026-05-23

Scope:

- `ControlEvent` in `src/state/game_state.ts`
- `DisplacementEvent` in `src/state/game_state.ts`
- `DisplacementState` in `src/state/game_state.ts`

## Finding

These three event/provenance groups contribute nine optional fields to the strict-null `optional_fields_game_state` inventory:

- `ControlEvent`: `mun_id`, `battle_id`, `attacker_brigade`
- `DisplacementEvent`: `origin_osid`, `dest_osid`, `caused_by`
- `DisplacementState`: `displaced_in_by_faction`, `displaced_out_by_osid`, `displaced_in_by_osid`

## Producer/Consumer Review

`ControlEvent` has required control-change identity (`turn`, `settlement_id`, `mechanism`, `from`, `to`). The optional fields are join/provenance enrichments: municipality lookup, battle join key, and attacking brigade. UI and diagnostics use them when available but preserve older/minimal event rows.

`DisplacementEvent` has required displacement accounting (`turn`, origin/destination municipalities, ethnicity, displaced/killed/fled/settled totals). The optional fields add OSID-level origin/destination and controller-causer context. `GameStateAdapter.ts` scans these rows for per-OSID departures when available and falls back to municipality-level totals when not.

`DisplacementState` has required municipality-level cumulative counters. The optional maps add faction-split arrivals and OSID-level in/out counters. Routing and UI consumers tolerate absence because older saves and some displacement paths only carry municipality-level totals.

## Decision

Do not promote these nine fields generically in the strict-null cleanup lane.

They are provenance/detail fields layered onto already-required event or cumulative accounting. Forcing them onto all rows would require inventing fake OSID, battle, or brigade provenance for older events and for mechanics that do not naturally have direct combat provenance.

Safe reduction requires a dedicated event-provenance schema lane:

1. Decide which event producers must emit OSID-level and battle-level provenance.
2. Add migrations or compatibility adapters for older rows where provenance is unknowable.
3. Preserve fallback behavior for non-combat displacement and non-battle control flips.
4. Run UI adapter and save roundtrip tests before changing requiredness.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `ControlEvent`, `DisplacementEvent`, and `DisplacementState` with three optional fields each, intentionally classified rather than reduced.

## Roadmap Impact

This burns down three small `state` optional-field groups by classification. It does not reduce the 477 optional-field floor. Future promotion belongs in event-provenance/schema work, not broad optional cleanup.
