# R7 Phase 2 Officer/OOB Attribution — Committee Repair

**Date:** 2026-08-02
**Workstream:** R7 Phase 2
**Status:** Authored source gate repaired and focused proof green; generated officer-state alignment remains pending

## Outcome

The first Phase 2 checkpoint (c4aab9a3b) was not acceptable. It made the provenance report green by deleting 80 canonical formations even though 55 were still present in the generated April 1992 startup and many were hardcoded participants in operation catalogs. It also reduced the playable officer roster from 98 to 31 despite the binding Systems Manual census of 63, and the OOB comparison tool silently treated two missing evidence files as zero rows.

This repair restores every formation candidate to the playable OOB, restores a sourced 63-officer roster, adds temporal-evidence validation, and makes missing comparison evidence fatal. No startup, scenario, baseline, Electron, package, performance, version, release, or publication command ran.

## Corrected census

| Family | Before repair | After repair | Supported | Omitted |
|---|---:|---:|---:|---:|
| Officers | 31 | 63 | 63 | 35 |
| Corps/command formations | 19 | 19 | 19 | 0 |
| Brigades/regiments | 169 | 249 | 249 | 0 |
| Elite commanders | 3 | 3 | 3 | 5 |
| **Total playable/authored** | **222** | **334** | **334** | **40** |

Faction source counts after repair:

- Officers: RS 21, RBiH 27, HRHB 15.
- Brigades/regiments: RBiH 126, RS 83, HRHB 40.
- The Systems Manual's 63-officer contract is now true in source data and enforced by test.
- All 80 formation omissions were removed. The omission ledger now contains only 35 officer and five elite-commander research candidates.

## Formation dependency repair

The committee finding was correct: the removed formation set was not safe.

- 55 of the 80 omitted IDs were instantiated in the tracked April 1992 startup.
- Additional IDs were authored in triggered operations, pre-planned operations, opportunity catalogs, enclave rules, sector helpers, Jan-1993 scenario data, localization, and regression fixtures.
- The Krivaja/Stupčanica participants are restored, including rs_1st_zvornik, rs_1st_bratunac, rs_1st_milii, rs_5th_podrinje, and rs_skelani_battalion.
- The Drina rows cite the official ICTY Popović et al. Trial Judgment, IT-05-88-T, paragraphs 244–249. Paragraph 244 names the Zvornik, Birač, Romanija, Vlasenica, Podrinje, Bratunac, Milići, and Skelani formations addressed by the preparatory order.
- A regression now joins the canonical designation catalog against generated startup and every live formation-authored combat catalog. Any referenced historical formation absent from the playable OOB fails the suite.

Post-repair, the previous 55-row generated formation mismatch is zero. The 41 startup formation IDs not present in oob_brigades.json are expected corps/staff, JNA/HV tactical-group, garrison, and phantom identities; they are not stale brigade rows.

## Officer canon and chronology

Thirty-two source-backed officers were restored, bringing the roster to exactly 63. Restored command identities own row-local BB or official ICTY citations. Unsupported residual candidates remain deterministic omissions and are not playable.

The audit also exposed an inherited canon/schema ambiguity rather than hiding it: several members of the original 63-person command pool are historically operational-zone, enclave, independent-brigade, or political command personalities, while the three-value engine enum calls every non-army/non-deputy candidate `corps_commander` and the UI renders that token as a general-officer rank. [ADR-0008](../../20_engineering/ADR/ADR-0008-named-officer-tier-scope-and-rank-semantics.md) is proposed to define the token as gameplay assignment class and require the source layer to retain exact historical offices. It is not marked accepted and no canon wording or UI behavior was changed in this lane.

The temporal sidecar now distinguishes evidence precision:

- exact_date: a sourced calendar date mapped to the first campaign-week boundary on or after it.
- on_or_before: a sourced no-later-than bound mapped conservatively and explicitly, not presented as an exact appointment.
- bounded_model: an authored gameplay boundary whose citation does not establish an exact calendar date.

Every non-zero available_from_turn and every authored available_until_turn must now have a matching temporal-evidence row. Strict mode fails on a missing row, a data/evidence turn mismatch, an incomplete rule/citation, an invalid date, or an incorrect weekly mapping.

Specific corrections:

- Ramiz Dreković: 5th Corps formation on 20 October 1992 maps to turn 29.
- Milivoj Petković: 14 April 1992 maps to turn 2; the HVO army-command roster begins his tenure at turn 2.
- Grujo Borić: the evidence only establishes command by the end of 1992. The old invented turn-28 claim is removed; turn 39 is labeled on_or_before with a conservative boundary rule.
- Exact HVO succession dates continue to map at turns 68, 84, 108, and 122.
- Other retained modeled bounds are honestly marked bounded_model; strict green does not misrepresent them as exact dates.

No edit was made to docs/10_canon/FORAWWV.md.

## OOB comparison fail-closed repair

tools/audit/compare_oob_vs_markdown.ts now uses the real sources:

| Faction | Evidence file | Parsed brigade rows |
|---|---|---:|
| RBiH | ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md | 106 |
| RS | VRS_APPENDIX_G_FULL_BRIGADE_LIST.md | 76 |
| HRHB | HVO_FULL_BRIGADE_LIST.md | 35 |

A missing evidence file now throws, the CLI reports failure and exits non-zero, malformed OOB JSON remains fatal, and tests exercise the real repository files and exact counts. The parser no longer mistakes rows containing both “brigade” and “corps” for table headers.

## Generated artifact inventory

Startup regeneration was explicitly outside this repair lane, so the residual is reported rather than hidden:

| Generated class | Total in tracked startup | Stale against repaired source |
|---|---:|---:|
| named_officer_data | 98 | 35 |
| named_officers | 71 | 28 |
| Historical formation dependencies omitted from playable OOB | 55 before repair | 0 after repair |

The 35/28 officer residue is exactly the unsupported remainder still embedded in the previously generated save. It remains the owner of generated startup/baseline work when that serialized lane is authorized. Source-data and formation-dependency closure are green; generated officer-state closure is not yet claimed.

## Determinism

- Provenance records, omissions, violations, and serialized JSON use stable ordering and contain no clock fields.
- Temporal mapping is UTC and pure: campaign start 6 April 1992, seven-day boundaries, mathematical ceiling to the first boundary on or after a sourced date.
- Dependency tests sort all missing IDs before comparison.
- The prior deterministic OOB lookup fix remains intact.
- Mojibake introduced during the first checkpoint's data rewrite was repaired in the touched officer, brigade, and provenance JSON.

## Verification

Red-first evidence was captured:

- 31 officers failed the new 63-officer canon assertion.
- 169 brigades failed the 249-row source assertion.
- Live/generated dependency closure returned the omitted formation IDs.
- The comparison module had no real evidence-path export and missing files did not throw.
- Dreković, Petković, and Borić failed the new chronology assertions.

Final verification:

- Focused Vitest: 11 files / 101 tests passed, including exact 35/28 generated officer-residue inventory.
- Hardcoded-operation/OOB dependent matrix: 9 files / 153 tests passed after replacing the stale one-row elite-gap allowlist with the five explicit provenance omissions plus the independently unresolved Vitezovi row.
- TypeScript: tsc --noEmit exited 0.
- Strict provenance diagnostic: two invocations were byte-identical; 334 total, 334 supported, zero unsupported, 40 omitted, zero blockers, zero warnings.
- OOB evidence comparison: RBiH 106 evidence / 126 source; RS 76 / 83; HRHB 35 / 40; command exited 0.
- Static generated/runtime dependency inventory: zero referenced historical formation IDs absent from playable OOB.
- Honest startup officer residue: 35 stale named_officer_data rows and 28 stale named_officers rows.
- JSON parsing and git diff --check exited 0.

## Files

- data/scenarios/officers/apr1992_officers.json
- data/scenarios/army_co_roster.json
- data/source/oob_brigades.json
- docs/provenance/OFFICER_OOB_PROVENANCE.json
- docs/20_engineering/ADR/ADR-0008-named-officer-tier-scope-and-rank-semantics.md
- tools/diagnostics/officer_oob_provenance.ts
- tools/audit/compare_oob_vs_markdown.ts
- focused provenance, chronology, source-count, formation-dependency, and officer-system tests
