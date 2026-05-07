# Stupčanica-95 w27 Trigger Fix — LANE-NIGHTSHIFT-STUPCANICA-W27-TRIGGER-FIX

**Date:** 2026-05-07
**Status:** SHIPPED (commit SHA pending)
**Class:** Ring 1 / canon-data tweak / §6 sensitive-history compliance fix (ENFORCING canonical floor via name-collision repair)
**Sign-off precedent:** Krivaja Phase 1 `bc44ddec`; Stupčanica SHAPE B `b03333af`; Krivaja-95 t168 floor fix `d622b762`

## Summary

Pre-existing canon-violation: the operation name "Operacija Stupčanica"
appeared in 40w / 188w runs at w27 (`n1717`, `n1707`), well below the
§6 sensitive-history canonical floor of t≥172 for the canonical
Stupčanica-95 (Žepa fall, July 14–25 1995). The Krivaja-95 t168 floor
fix (`d622b762`) bumped both Krivaja-95 and Stupčanica-95 trigger
predicates in `triggered_operations.ts` to t≥170 / t≥172 respectively,
and those predicates were always being honored. The leak was elsewhere.

## Phase 0 — Investigation

### Diagnosis: (c) Name-collision

`src/sim/combat/operation_names.ts` defines per-faction bot operation
name pools (`RS_NAMES`, `RBiH_NAMES`, `HRHB_NAMES`) consumed by
`pickOperationName(corpsId, turn, faction, state?)` for any
bot-launched corps op. The pool comment at the top of that file
explicitly states:

> Pre-planned and triggered operation names are NOT in these pools
> (they use explicit names like "Operation Koridor", "Operation Jajce").

But the actual data contained **four canonical sensitive-history names**
that collide with pre-planned/triggered/opportunity ops:

| Bot pool name (collision) | Canonical op (excluded by intent) | Defined in |
|---|---|---|
| `'Operacija Krivaja'` (RS) | `'Operation Krivaja-95'` | `triggered_operations.ts:400` |
| `'Operacija Stupčanica'` (RS) | `'Operation Stupčanica-95'` | `triggered_operations.ts:448` |
| `'Operacija Sana'` (RBiH) | `'Operation Sana'` | `operation_opportunity_catalog_5th_corps.ts` |
| `'Operacija Maestral'` (HRHB) | `'Operation Mistral 2'` | `triggered_operations.ts:500` |

Because `pickOperationName` selects via `simpleHash(corpsId:turn) % pool.length`
then scans forward for the first unused name, an unrelated bot-launched
RS corps op at any turn (including w27) could be assigned the canonical
name "Operacija Stupčanica" — **masquerading as the canonical
Stupčanica-95 in AAR scans, weekly reports, and op-audit JSONs**.

### Why the 5-lane batch suppressed it incidentally

The 5-lane batch (R2 six-lane parallel) altered the timing/ordering of
which corps launched ops at which turn, shifting the `simpleHash` keys.
That shifted which name slot got picked — incidentally moving "Operacija
Stupčanica" out of the 40w window in `n1728` / `n1729`. The underlying
name-collision was untouched.

### Trigger predicate audit

`triggered_operations.ts:454`:
```ts
trigger: (_state, turn) => turn >= 172,
```
Verified correct since `d622b762`. Block-comment date math at line 311:
"w172 ≈ July 22 1995 → Stupčanica-95 (Žepa fall, July 14–25 1995)."

### Phase 0 Evidence Trail

- `src/sim/combat/triggered_operations.ts:448-471`: canonical Stupčanica-95
  def with `trigger: turn >= 172` (correct).
- `src/sim/combat/operation_names.ts:45` (pre-fix): `'Operacija Stupčanica'`
  in `RS_NAMES` historical block.
- `src/sim/combat/operation_names.ts:202-237`: `pickOperationName` —
  no exclusion list for canonical sensitive-history names.
- `data/derived/_op_audit_n1621.json:26988`: canonical entry
  `"vrs_drina:Operation Stupčanica-95:t172"` (correct firing). The w27
  firings would carry the bot-pool name `"Operacija Stupčanica"` (without
  "-95" suffix), which is how the two were distinguishable.

## Phase 1 — Fix

Single-file data edit in `src/sim/combat/operation_names.ts`:

1. Remove `'Operacija Krivaja'` from `RS_NAMES`.
2. Remove `'Operacija Stupčanica'` from `RS_NAMES`.
3. Remove `'Operacija Sana'` from `RBiH_NAMES` (faction-symmetric).
4. Remove `'Operacija Maestral'` from `HRHB_NAMES` (faction-symmetric).
5. Replace each removed line with an inline LANE-tagged comment recording
   the rationale + sign-off precedent.
6. Update top-of-file docstring + RS pool docstring to enumerate the
   newly-excluded names, matching the documented intent of the existing
   "reserved for pre-planned/triggered ops and excluded here" comment.

`Operacija Vrbas` (RS, Vrbas 92 = Jajce salient) is **preserved** — the
canonical pre-planned op is named "Operation Jajce", not "Operation
Vrbas", so there is no name collision.

The trigger predicates in `triggered_operations.ts` are NOT touched
(they were already correct since `d622b762`).

## Phase 2 — Tests

`tests/stupcanica_w27_trigger_fix.test.ts` (7 tests):

- **T1:** Stupčanica-95 trigger evaluates to false at turn=27, plus a
  full sweep of [0, 10, 27, 40, 100, 168, 170, 171] — canon floor pin.
- **T2:** Stupčanica-95 trigger evaluates to true at turn=172, 174, 175,
  200 — existing behavior preserved.
- **T3:** Trigger evaluation deterministic — three calls byte-identical.
- **T4:** RS bot pool excludes both "Operacija Krivaja" + "Operacija
  Stupčanica".
- **T5:** RBiH bot pool excludes "Operacija Sana".
- **T6:** HRHB bot pool excludes "Operacija Maestral".
- **T7:** `pickOperationName(corps, turn, faction)` never returns any of
  the four canonical sensitive-history names across a 10-corps × 200-turn
  × 3-faction sweep (6 000 calls).

## Verification

- `npx vitest run tests/stupcanica_w27_trigger_fix.test.ts tests/triggered_operations_late_1995.test.ts tests/sector_offensive.test.ts` → **3 files, 29 tests GREEN** (7 new + 10 contract + 12 sector).
- `node_modules/.bin/tsc --noEmit` → **clean** (no errors).
- 40w smoke: command `npm run sim:scenario:run:40w` (parent runs). Hash
  may drift if the fix alters which bot ops fire in the 40w window
  (binding threshold). Stupčanica/Krivaja/Sana/Maestral should NOT
  appear as bot-pool names anywhere; only the canonical triggered/
  opportunity instances may fire (and only at their canonical turn
  gates, which are all >40 so 40w is unaffected by the canonical ops
  themselves).

## Sensitive-History §6 Compliance

- ENFORCING canonical floor via name-collision repair (compliance fix).
- Faction-symmetric mechanism: applied to RS / RBiH / HRHB pools where
  the canonical name was duplicated.
- No combat math, §6 territorial, or §6 atrocity surface touched.
- FORAWWV / paint anchors / `political_controllers` / OOB / rupture-
  wiring / `enclave_resilience.ts` UNTOUCHED.

## Files

- `src/sim/combat/operation_names.ts` — fix (data edit).
- `tests/stupcanica_w27_trigger_fix.test.ts` — new (7 tests).
- `docs/40_reports/implemented/20260507_STUPCANICA_W27_TRIGGER_FIX.md` — this report.

## Commit

(SHA pending — to be backfilled per durable KNOWLEDGE 2026-05-06)
