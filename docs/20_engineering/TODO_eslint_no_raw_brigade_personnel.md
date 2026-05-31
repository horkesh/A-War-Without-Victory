# TODO / Design note — ESLint guard `no-raw-brigade-personnel`

Status: **DEFERRED** (Phase 0 secondary item; not blocking).

## Why deferred
The repo currently has **no ESLint configuration at all** (no `.eslintrc*`, no
`eslint.config.*`, no `eslint-plugin-*` workspace). Standing up a flat-config
ESLint setup + a custom rule plugin + CI wiring from scratch is well out of
proportion for the Phase 0 safety cascade, and would risk introducing a large
volume of pre-existing lint noise into a repo that does not currently lint.
Per the Phase 0 brief, we leave a design note rather than a half-built rule.

## Intent
Prevent regressions of the TG double-count bug: when TG flags are ON, a donor's
lent personnel must not be counted toward the donor's HOME availability. The
guard should flag raw `brigade.personnel` reads in **home-availability
consumers** and require `effectivePersonnel(brigade)` from
`src/sim/combat/tactical_group_personnel.ts` instead.

## Proposed rule: `eslint-plugin-awwv/no-raw-brigade-personnel`

Flag member-expression reads of `.personnel` on an identifier that looks like a
brigade/formation (`brigade`, `donor`, `formation`, `f`, `b`) **inside files
classified as home-availability consumers**, suggesting `effectivePersonnel(x)`.

### TG-internal allowlist (MUST stay on raw `.personnel`)
These intentionally use raw personnel because they apply their own lent-fraction
math; flagging them would be wrong:

- `src/sim/combat/attack_resolution_osid.ts` — `computeTgDonorPower`
  (donor power × `lent / donor.personnel`).
- `src/sim/combat/tactical_group_casualties.ts` — pro-rata casualty split over
  `personnel_lent` / `donor.personnel`.
- `src/sim/combat/tactical_group_lifecycle.ts` — cohesion-bleed
  `donatedFraction = personnel_lent / donor.personnel`.
- `src/sim/combat/tactical_group_selection.ts` — donation sizing reads raw
  personnel to compute the lent amount.
- `src/sim/combat/combat_math.ts` `basePower` — shared attacker+defender
  primitive; the **defender call sites** are scaled by the effective fraction
  instead of mutating this primitive.

### Implementation sketch
- New workspace package `eslint-plugin-awwv` (or `tools/eslint-rules/`).
- Rule visits `MemberExpression` where `property.name === 'personnel'`.
- Configure via `overrides`/flat-config `files` globs scoping the rule to the
  migrated home-availability modules; the allowlist files above are excluded.
- `meta.fixable = 'code'` with an autofix that wraps the object in
  `effectivePersonnel(...)` and adds the import if missing.

### Migrated sites (Phase 0 — the rule's positive targets)
- `src/sim/combat/sector_combat_rating.ts` (defensive power + totalPersonnel)
- `src/sim/combat/local_front_defense.ts` (`brigadePower`)
- `src/sim/combat/brigade_assignment.ts` (`countActiveEnemyPersonnelByOsid`,
  reserve ranking, front-floor redistribution ranking)
- `src/sim/combat/bot_brigade_eval_attack.ts` (`findWeakestSubSegment`)
- `src/sim/recruitment_engine.ts` (`getMunBrigadesForFaction` capacity feed)
