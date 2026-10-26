# Independent HVO identity review

**Overall: BLOCK direct OOB mutation; GO on the diagnosis of premature identities; UNRESOLVED on personnel duplication and the correct April representation.**

## Source finding

The repository labels the evidence “BB2 p.446/p.460,” but those are **PDF pages**, not printed folios. In the local *Balkan Battlegrounds, Volume II* scan (CIA Office of Russian and European Analysis, repository-described 2002 edition; PDF SHA-256 `e7a0b2f9eb696429fb502ccfb77e77ac0ae409f2b431a8a1e95bc53da1287bf7`), PDF p.446 is printed p.427 and PDF p.460 is printed p.441. The page images and source-bound KB text agree.

PDF p.446 / printed p.427 calls the Ban Josip Jelačić Brigade a 1993 Kiseljak-enclave OOB entry, says it was “Established 20 December 1992,” formed from Kiseljak, Kreševo and Fojnica municipal HVO headquarters, and “Later split” into the 94th and 95th Home Defense Regiments. PDF p.460 / printed p.441 independently repeats Ban as the parent later split into those regiments (KB: `BB2_p0446.json`, `BB2_p0460.json`).

**GO — premature organizational identities:** Ban, 94th and 95th cannot all be historically labelled, distinct April brigades. Ban is post-April; 94th/95th are later successors. The five OOB records are separate mandatory 700-person formations available at 0, at three Kiseljak and two Kreševo OSIDs (`oob_brigades.json:3204-3218,3264-3293,3340-3369`). Their designation entries say only `catalogued_designation`, not “April territorial-force proxy” (`oob_brigade_designations.json:1366-1393,1426-1433,1456-1463`). The April scenario note names one Kiseljak Brigade, not Ban/94th/95th (`SCENARIO_01_APRIL_1992.md:821-825`). Therefore the proxy defense is **not documented**.

**UNRESOLVED — duplicated people:** BB2 establishes lineage, not an exhaustive personnel ledger. It does not say all three municipal headquarters contributed all personnel, or that no distinct local forces remained. The five rows total 3,500. The source census records 23,887 Croats across Fojnica (6,623), Kiseljak (12,550) and Kreševo (4,714), so 3,500 is not demographically impossible (`bih_census_1991.json`, municipality records 10324/10472/10545). Population plausibility does not validate identities or strengths. No source/author note allocates April personnel, equipment, or Fojnica’s force among these counters.

## Correction boundary

**BLOCK — small data-only correction now.** Delaying Ban is individually supported, but leaving April 94th/95th preserves the successor anachronism; delaying all three removes 2,100 modeled April personnel without evidence for replacement identities/strengths. Renaming them generic territorial forces would invent names and allocation. The split date and division remain absent.

Calendar arithmetic is sound but does not cure that gap: zero-based month 3 is 6 April; boundaries 36/37 are 14/21 December. `runTurn` increments first (`turn_pipeline.ts:132-142`) and lifecycle then sees that turn. A strict not-before-20-December convention points to 37, while an “event during week” convention could use 36. No convention or split turn is selected here.

**BLOCK — existing lifecycle machinery.** `rename` changes display name only; `merge` is one source into an already-existing target, transfers personnel only, and removes only active-operation participation (`formation_lifecycle_events.ts:108-124`). It cannot conserve equipment/history, create a one-to-two split, preserve/remap all references, validate separated locations, or migrate saves. A full lineage solution therefore needs a larger reviewed reorganization design unless new evidence supports a simpler static OOB representation.

## Required review seats

For any OOB change: Historian, Formation Expert, Canon Compliance, and scenario/calibration review; add Engine/Systems and Game Designer for a new reorganization/abstraction rule. Because behavior changes at scenario scale, FORAWWV XVI.2’s calibration mini-panel and unchanged campaign/protected/provenance gates apply. The sensitive-history §6 panel is **not triggered by ordinary formation chronology alone**. If canon/FORAWWV is amended or the design crosses protected sensitive-history/control boundaries, use the exact standard seats: Historian, scenario/calibration, Engine/Systems, and Red-team, unanimously.
