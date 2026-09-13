# Post-A regression attribution

- Baseline: `F:\AWWV-worktrees\_preserved\roadmap-integration-20260912\main-baseline-before-integration` — commit `e607508bc65dad1950d560d8b5b628da89674360`, `git_dirty:true`; accepted 8-pin bytes and normalized 31-input comparator only.
- Candidate: `F:\A-War-Without-Victory\runs\roadmap_integration_20260912\post_a\apr1992_definitive_188w__6898d6d2e324c7a3__w188_n0` — clean commit `51fe494151397c1cc6521b54006b0f8da70705e5`.
- Hashes: baseline `e414dc69f6e875fc`; candidate `5d6f8378dbf433fc`.

## Checkpoints

| checkpoint | baseline | candidate | delta | newly wrong | recovered |
|---|---:|---:|---:|---:|---:|
| jan1993 | 702 | 692 | -10 | 10 | 0 |
| apr1994 | 678 | 698 | +20 | 7 | 27 |
| apr1995 | 672 | 694 | +22 | 7 | 29 |
| oct1995 | 667 | 665 | -2 | 28 | 26 |

## January 1993

Ten baseline matches became wrong; none recovered. Six are direct losses of retired passive transfers: `op:bihac:orasac_2`, `op:jajce:jezero_2`, and `op:zavidovici:cardak_2` had baseline consolidation at t21; `op:jajce:lupnica`, `op:mrkonjic_grad:baljvine_2`, and `op:skender_vakuf:donji_koricani` had baseline abandonment to RS at t21. Candidate history has no replacement event for any of the six.

Four come from changed execution of existing authored operations: Donji Vakuf and Prusac miss the checkpoint because Operation Donji Vakuf starts at t30 instead of t23 (Prusac arrives t44; Donji Vakuf never flips); Maglaj/Jablanica changes from a successful t24 counterattack to max-failures with no capture; Mostar/Vranjevići changes from no captured Herzegovina objective to an RS capture at t2.

## Western cascade

The score `40 → 33` is **12 lost matches offset by 5 recovered matches**, rather than seven uniquely identifiable losses. Exact lost matches:

- `op:bosanski_petrovac:jasenovac_2`: baseline `RBiH`, candidate `HRHB`; baseline last `combat` t186; candidate last `combat` t178.
- `op:bosansko_grahovo:ugarci`: baseline `HRHB`, candidate `RS`; baseline last `consolidation` t170; candidate last `none` t-.
- `op:kljuc:hadzici`: baseline `RBiH`, candidate `RS`; baseline last `combat` t187; candidate last `paramilitary` t5.
- `op:kljuc:kljuc_2`: baseline `RBiH`, candidate `RS`; baseline last `combat` t188; candidate last `paramilitary` t9.
- `op:sanski_most:ilidza_2`: baseline `RBiH`, candidate `RS`; baseline last `combat` t187; candidate last `combat` t3.
- `op:sanski_most:jelasinovci`: baseline `RBiH`, candidate `RS`; baseline last `combat` t182; candidate last `none` t-.
- `op:sanski_most:kljevci`: baseline `RBiH`, candidate `RS`; baseline last `combat` t188; candidate last `none` t-.
- `op:sanski_most:lusci_palanka_2`: baseline `RBiH`, candidate `RS`; baseline last `combat` t181; candidate last `none` t-.
- `op:sanski_most:ostra_luka`: baseline `RBiH`, candidate `RS`; baseline last `combat` t186; candidate last `none` t-.
- `op:sanski_most:sanski_most_2`: baseline `RBiH`, candidate `RS`; baseline last `combat` t185; candidate last `combat` t2.
- `op:sanski_most:skucani_vakuf_2`: baseline `RBiH`, candidate `RS`; baseline last `combat` t183; candidate last `paramilitary` t14.
- `op:sanski_most:stari_majdan`: baseline `RBiH`, candidate `RS`; baseline last `combat` t184; candidate last `combat` t1.

Recovered matches:

- `op:mrkonjic_grad:baljvine_2`: baseline `RS`, candidate/reference `HRHB`; candidate last `initial retained` t-.
- `op:mrkonjic_grad:gerzovo_2`: baseline `RS`, candidate/reference `HRHB`; candidate last `combat` t185.
- `op:mrkonjic_grad:majdan_2`: baseline `RS`, candidate/reference `HRHB`; candidate last `combat` t186.
- `op:mrkonjic_grad:mrkonjic_grad_2`: baseline `RS`, candidate/reference `HRHB`; candidate last `combat` t188.
- `op:mrkonjic_grad:podrasnica_2`: baseline `RS`, candidate/reference `HRHB`; candidate last `combat` t187.

Eleven losses are missing Operation Sana late captures. The retained operations have the same t175 start, 32 objectives, and ten participants. Baseline records 28 late 5th-Corps captures; candidate records 19. Its Sanski Most/Ključ axis captures only Budimlić Japra at t183 and then stalls, while the baseline axis advances through nine objectives. Bosansko Grahovo/Ugarci is the twelfth loss and directly reflects the missing baseline t170 consolidation. The five recoveries are Baljvine staying at its initial HRHB control after abandonment removal, plus four t185–188 Operation Southern Move combat captures.

## Bounded correction scope

- Trace and correct execution/timing for the three existing January authored operations. The six former passive outcomes require a separate bounded authored/event representation only if their accepted painted outcomes remain required; this evidence does not support restoring global passive control.
- Trace Operation Sana axis routing/progression with its existing objectives and roster, while preserving the new Southern Move gains. Recovering five net matches is sufficient for the unchanged cascade floor.

The artifact comparison does not identify a single source function for the operation timing/routing changes. It also cannot attribute the post-A t178 HRHB Jasenovac capture to a completed AAR. Those remain explicitly unresolved. Floors remain January `694` and cascade `>=38`.
