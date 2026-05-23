# BCS Brigade Name Localization

**Date:** 2026-05-23
**Result:** All 249 source OOB brigade rows now resolve to Bosnian display labels in BCS UI mode.

## Summary
- Added a deterministic brigade-name localization boundary that preserves canonical English/OOB names in saves and simulation state while rendering Bosnian labels in player-facing UI.
- Covered all source OOB brigades: 126 RBiH, 83 RS, and 40 HRHB/HVO rows.
- Added regression coverage for full OOB coverage and banned-language leakage: no English unit terms, Croatian forms such as `stožer`/`zapovjed*`, or Serbian ekavian/Cyrillic-derived forms such as `pesad*`.

## Research Basis
- RBiH naming follows Bosnian military usage for ARBiH honorifics and types: `slavna`, `viteška`, `brdska`, `lahka`, `oslobodilačka`, and `muslimanska`. The 503rd Brigade source records the native name as `503. slavna brdska brigada`; the repo-local research packet also references the same 5th Corps naming family.
- VRS naming follows the Bosnian ijekavian Latin form used by the existing VRS research packet and public unit histories: `laka pješadijska`, `pješadijska`, `motorizovana`, `mehanizovana`, `oklopna`. The 5th Kozara source records `5. Kozarska laka pješadijska brigada`; the Hercegovački korpus source trail records `1. hercegovačka motorizovana brigada Trebinje`.
- HVO/HRHB named brigades preserve proper unit names and local toponyms while converting generic English `Brigade`/`Guards`/`Mechanized` labels into Bosnian UI text. The 106th Orašje/Bosanska Posavina source trail supports keeping the official numbered HVO brigade identity rather than translating the quoted formation identity.

## Sources Consulted
| Source | Use |
|---|---|
| `data/source/oob_brigades.json` | Source of truth for the 249 brigade ids and canonical English names. |
| `data/derived/sr_wiki_vrs_brigade_report.md` | Repo-local VRS brigade research packet with corps/brigade names and reorganization notes. |
| [503rd Brigade (ARBiH)](https://en.wikipedia.org/wiki/503rd_Brigade_%28ARBiH%29) | Cross-check for `503. slavna brdska brigada` native ARBiH naming. |
| [5. Kozarska laka pješadijska brigada](https://potkozarje.net/5-kozarska-laka-pjesadijska-brigada/) | Cross-check for VRS `laka pješadijska brigada` naming. |
| [106. brigada HVO Orašje](https://hrvatskonebo.org/2024/05/15/foto-video-15-svibnja-1992-utemeljena-106-brigada-hvo-orasje-od-5500-pripadnika-poginuo-je-271-branitelj-a-oko-1-200-ih-je-ranjeno/) | Cross-check for 106th HVO Orašje/Bosanska Posavina identity. |
| [ČSP article PDF](https://hrcak.srce.hr/file/227504) | Cross-check for VRS Hercegovina naming, including `1. hercegovačka motorizovana brigada Trebinje`. |

## Changes Made
### Data/UI Boundary
- `src/ui/map/data/formationNameLocalizations.ts`
  - New `getLocalizedFormationName(...)` helper.
  - Uses exact researched overrides where official/local names are not safely derivable from generic translation.
  - Uses deterministic grammar and adjective replacements for the remaining OOB rows.
  - Only returns localized names for `locale === 'bcs'`; English fallback remains the canonical `formation.name`.

### Player-Facing Surfaces
- Map marker GeoJSON now emits localized brigade marker names when BCS is active.
- Brigade rows, tactical cards, formation detail, attack confirmation, OOB reserve chips, corps-front brigade rows, Army Reserve, Army HQ ORBAT/personnel/sector views, and ops-planning brigade cards now resolve names through the localization helper.

### Tests
- `tests/brigade_name_localization.test.ts`
  - Verifies every source OOB brigade resolves to a BCS label.
  - Verifies no localized label leaks English unit terms or banned Croatian/ekavian forms.
  - Pins representative exact names for ARBiH, VRS, and HVO.

## Determinism And Scope
- UI/localization only.
- No simulation behavior, scenario data, save schema, OOB canonical names, generated saves, combat outputs, calibration values, or ordering semantics changed.
- Existing English save names remain untouched; BCS display labels are computed at the UI boundary.

## Verification
- `npx.cmd vitest run tests/brigade_name_localization.test.ts --reporter=dot` passed 3/3.
- `npm.cmd run typecheck` passed.

## Follow-Up
- Audit remaining report/history prose surfaces that serialize `formation_name` into saved turn summaries; those are intentionally left canonical for now because changing them would affect persisted output contracts.
- If future UI surfaces need brigade labels, call `getLocalizedFormationName(...)` instead of translating ad hoc.
