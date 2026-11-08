# Warroom panoramas and room art audit

- **Date** 2026-11-08
- **Branch** `codex/warroom-ultrawide`
- **Base** `8bc049421`
- **Accepted visual revision** `4cf2510a5`

The Warroom now fills ultrawide displays for all 15 faction and year combinations. Each faction uses one fixed panoramic layout across its five years. Lighting and dressing follow the annual center art. The center remains the reference for the clickable objects, live map, date board, and toolbar. The side panels are decorative. Opening previews use the standard plate.

## Implementation record

| Commit | Change |
| --- | --- |
| `19492f532` | Added 15 side atlases derived from 3840 × 1280 outpaints and registered to the center plates. Used the logical viewport to preserve alignment under interface scaling. |
| `cf62b7c29` | Rebuilt the extensions around a fixed master per faction and checked both joins in all 15 rooms. |
| `435de699e` | Continued wood paneling across the RS curtain fragment and finished the cropped RBiH switch as a single control. |
| `fe86758dc` | Continued the four marked RS and RBiH baseboard and floor joins along their original perspective. Moved the RBiH fade inside the overlap to remove the dark browser-rendered column. |
| `4cf2510a5` | Audited the interiors and repaired the HVO and ARBiH sleeve insignia and RS newspaper across the five annual plates. Regenerated board luminance from the final center art. |

The HVO badge uses the game's embroidery checked against the archived design. The RBiH opening-year plate uses the early lilies shield, followed by the Army mark in 1993–95. The 1991 HVO and ARBiH art previews omit the later sleeve insignia. The RS newspaper reads **Глас** in the 1991 and 1992 opening plates and **Глас српски** in 1993–95. The 1992 art represents the opening rather than changing after the September rename. [HVO patch reference](https://commons.wikimedia.org/wiki/File:HVO.png), [ARBiH insignia study](https://prilozi.iis.unsa.ba/wp-content/uploads/2024/01/Prilozi-IIS-52-2023_ONLINE-1.pdf), [Glas publisher's wartime history](https://www.glassrpske.com/lat/novosti/drustvo/glasovih-66-godina/25733), [publisher's account of the 2003 rename](https://www.glassrpske.com/lat/info/o-nama).

## Verification

- Chromium verified all 12 playable rooms at 1280 × 720 and 3426 × 1186. Each retained eight hittable objects, the live map, and the date board. The three 1991 assets were checked via direct previews at both sizes because the live resolver selects 1992 for 1991.
- The baseboard revision passed 3440 × 1440 spot checks for RS and RBiH. The final art revision passed a 3440 × 1440 spot check for HRHB. The original panorama work included a 150% interface-scale check.
- All 66 focused tests passed on the final art revision. The production map build and 21-chunk cycle check passed. SHA-256 confirmed that all 15 center plates and all 15 wings in the production bundle matched their source files.
- Independent review confirmed the four baseboard corrections and inspected the insignia and newspaper crops for all years. At close range, a faint RBiH plaster transition, a soft patch on the 1991 HVO sleeve, a small kink on the far sleeve in RBiH 1993, and a faint print remnant on the RS 1992 paper remain.

This was presentation-only work. The verification above covers the browser and production map bundle. Native Electron packaging and hosted CI were outside this pass.

## Evidence on Dragon

The evidence root is `F:/AWWV-worktrees/.warroom-ultrawide`. `continuity-fix` records the fixed layouts, `continuity-detail` records the curtain and switch repairs, and `baseboard-fix` contains the before-and-after lower-join crops. `room-art-audit` contains the final standard and ultrawide contact sheets, detail comparisons, material donors, assembly script, test logs, and exact bundle inventory. Each phase has a `RESULT.md`.
