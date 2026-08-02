# R7 Phase 2 Officer/OOB Attribution — Fourth Committee Repair

**Date:** 2026-08-02
**Workstream:** R7 Phase 2
**Status:** Fourth repair implementation-green; final independent committee re-review pending

## Outcome

The second review correctly blocked the prior repair. It still accepted missing `repo://` targets, promoted eleven Wikipedia-only formation identities, left turn-zero and `bounded_model` chronology unsupported, compared OOB sources by count rather than identity, inspected only a selected dependency list, retained 35/28 stale officer rows in the tracked startup, and left the UI presenting gameplay appointment classes as invented general ranks. A later independent review then found six residual defects: the tracked startup was not canonical builder truth; seven live surfaces still rendered appointment classes as rank; two biographies misstated later appointments as opening facts; four formation aliases crossed factions without a cited relation; the 107th Gradačac source supported ARBiH rather than HVO identity; and the identity audit used locale-sensitive sorting. Review of commit `7779fca39` then blocked a third incomplete repair: persisted operation records still rendered appointment tokens, four full-officer surfaces preferred appointment labels over available sourced roles, Matuzović's BB1 citation did not support the claimed 106th Brigade command, and the master-roadmap register remained stale.

This repair closes those findings without running scenario, baseline, performance, Electron, packaging, release, or publication commands. The owner separately authorized one canonical deterministic `desktop:startup-snapshot:build` for the third repair and one additional regeneration after the fourth-review source correction; both completed successfully and no other startup build ran. `docs/10_canon/FORAWWV.md` was not edited.

## Final census

| Family | Playable supported | Explicit omissions |
|---|---:|---:|
| Officers | 63 | 35 |
| Corps/command formations | 19 | 0 |
| Brigades/regiments | 238 | 11 |
| Elite commanders | 3 | 5 |
| **Total** | **323** | **51** |

Seven formerly challenged formation rows remain because exact Balkan Battlegrounds pages name them: 10th Mountain, 1st Mountain, HVO Kralj Tvrtko, ARBiH 107th Gradačac, and HVO 108th, 110th Usora, and 115th. The cited appendix identifies the 107th as an ARBiH 2nd Corps formation, so the playable row is now RBiH and the old HVO 107th identity is an explicit evidence-only disposition. Eleven rows without exact authoritative/local identity evidence were removed from OOB, designation, scenario, startup, and UI/sim surfaces and recorded as `missing_exact_source` omissions.

## Source and chronology repair

- Every `repo://` URL is resolved against the repository root. Empty/malformed, escaping, missing, and non-file targets block the gate.
- Avdo Palić now cites the ICTY Popović transcript: appointment as Žepa-region armed-forces commander on 18 October 1992, turn 28.
- Mustafa Hajrulahović Talijan now cites the ICTY Halilović judgment: 1st Corps established under his command on 1 September 1992, turn 22.
- Tihomir Blaškić now cites the ICTY trial judgment: Central Bosnia appointment on 27 June 1992, turn 12.
- Đuro Matuzović now cites the Court of Bosnia and Herzegovina's confirmed-indictment summary, which identifies him as 106th HVO Brigade commander and later Orašje Operational Group and Operational Zone commander during the charged period. Availability is conservatively bounded `on_or_before` 31 July 1993, turn 69; the record is used only for office/chronology, not as a finding of criminal liability.
- Mehdin Hodžić, Nesib Malkić, Hajrudin Mešić, and Safet Hadžić use official Bosnia and Herzegovina government/ministry sources for their exact roles and dated boundaries.
- All 63 playable rows own `available_from_turn` evidence. Every authored exit boundary owns matching evidence. No `bounded_model` rows remain and no row is left at turn zero without a pre-campaign source.
- Imprecise year/month evidence is represented as `on_or_before` with a conservative source-date bound; it is not described as an exact appointment.
- Talijan's and Matuzović's biographies now describe their evidenced later commands instead of falsely describing those appointments as the campaign opening; Matuzović's earlier unsupported BB1 unit inference is replaced by the exact official court-record wording.

## Accepted officer semantics

[ADR-0008](../../20_engineering/ADR/ADR-0008-named-officer-tier-scope-and-rank-semantics.md) is accepted. The 63-person Tier 1 census is a named strategic/operational command pool, not a claim that all 63 historically commanded corps or armies.

- `rank` is retained as the deterministic gameplay appointment class for save compatibility.
- `historical_role` is a typed sourced office/command. The roster covers army/corps, division, operational-zone/group, enclave, brigade/battalion, staff, regional-defence, and political-military roles.
- The validator rejects unknown role tokens and legacy rows project deterministically as `unspecified_command_role`.
- The map read model carries `historical_role`; Personnel, Operations, commander selection, OOB, operation briefing, and planning surfaces render it separately.
- Appointment classes no longer become `Gen.`, general titles, stars, or title text. Voice, decision, persisted operation-history, Chronicle, and scenario-end surfaces that do not own a sourced role render the officer's name only; localization retains only neutral appointment wording for compatibility.
- Opening-command fallback is positive-only: a row must explicitly be a historical start, become available on turn zero, and name the exact historical corps. Generic pool or home-corps metadata cannot manufacture an opening commander.
- Systems Manual and Rulebook wording now match the accepted contract.

## Identity-level OOB comparison

`tools/audit/compare_oob_vs_markdown.ts` now parses the three actual brigade tables into identities, normalizes names deterministically, performs one-to-one matches, applies authored cross-name aliases, and requires a non-empty disposition for every unmatched row. Same-faction aliases require the explicit `designation_alias` relation. Cross-faction mappings fail closed unless a row-local repository citation proves the operational relation and the evidence faction equals the playable row's `recruit_pool_faction`; this preserves the cited 108th, 110th Usora, and 115th operational-alignment cases without relabelling their playable faction.

| Evidence | Parsed rows | Playable rows |
|---|---:|---:|
| RBiH Appendix H | 106 | 115 |
| VRS Appendix G | 76 | 83 |
| HVO full list | 35 | 40 |

Result: 213 identity matches, 29 explicit snapshot/narrative dispositions, zero unresolved mismatches. Missing evidence files, malformed JSON, missing disposition ledgers, uncited faction crossing, or unresolved identities exit nonzero.

## Recursive dependency and generated-state closure

The new recursive diagnostic scans sorted text files under all scenario, generated-startup, source, sim, and UI roots. Its universe includes playable designation/officer IDs plus omitted brigade/officer IDs, so stale references cannot disappear merely by removing a catalog row. A nested fixture proves discovery beyond a hand-picked file list.

- Unsupported formation references: zero.
- Unsupported officer references: zero.
- Tracked startup is byte-identical to the canonical deterministic builder output and the sector audit is clean.
- Tracked startup `named_officer_data`: exactly the 63 playable source rows; stale rows zero.
- Tracked startup `named_officers`: no unsupported states; stale rows zero; unsupported opening-command projections are absent.
- Four preplanned-operation commander fields that referenced omitted officers were removed rather than silently substituted.

## Determinism

All diagnostics use stable path, ID, violation, match, and disposition ordering with explicit code-unit comparators; locale-sensitive comparison is forbidden in the identity audit. Temporal mapping is UTC and pure from the 6 April 1992 campaign start. No clock, random source, environment-dependent ordering, or cross-turn cache was introduced. Stable officer and formation IDs are preserved for retained records except for the corrected HVO-to-ARBiH 107th identity.

## Verification

RED evidence preceded production changes:

- missing/escaping/malformed repository URLs were accepted;
- turn-zero availability passed without evidence;
- the roster lacked `historical_role`;
- the comparison exposed no identities;
- the recursive dependency module did not exist.
- the residual-review matrix failed 14 of 82 tests across eight files before the third repair, reproducing UI title leakage, false opening biographies, permissive cross-faction aliases, unsupported opening fallbacks, and locale-sensitive ordering.
- a wider defensive audit then failed 2 of 12 focused assertions, exposing an eighth raw appointment-token renderer in Decision Room operation evidence and a source gate that accepted directories; both were repaired before commit.
- review of `7779fca39` remained BLOCKED; the fourth-repair RED matrix failed 5 of 63 tests across five files, reproducing persisted AAR/end-report leakage, missed sourced-role surfaces, Chronicle rank propagation, and Matuzović's unsupported source/turn contract.
- review of `383797818` found the production/source/docs gates green but correctly remained BLOCKED because a legacy Phase-E UI test still expected the explicitly omitted Dževad Rađo elite-commander attribution; the follow-up changes that regression contract to require `undefined` while retaining the supported Savčić sidecar control.

Green evidence for the repaired packet:

- strict provenance diagnostic: 323 supported, 51 omissions, zero blockers/warnings;
- identity comparison: 213 matches, 29 dispositions, zero unresolved, CLI exit 0;
- focused officer/source/UI matrix: 12 files / 116 tests green;
- canonical startup plus operations-planning matrix: 2 files / 49 tests green;
- final startup/read-model/browser-adjacent matrix: 6 files / 82 tests green;
- full Decision Room dossier matrix: 1 file / 63 tests green;
- fourth-repair source/startup/record matrix: 6 files / 81 tests green;
- fourth-repair full-officer UI/report adjacency: 8 files / 189 tests green;
- reconciled Phase-E elite-commander omission contract: 1 file / 2 tests green;
- recursive real-repository audit: zero stale brigade/officer identities;
- both separately authorized canonical deterministic startup regenerations: success, each followed by byte-truth/current-state and sector-audit tests green;
- TypeScript `tsc --noEmit`: exit 0;
- `git diff --check` and static forbidden-renderer/`localeCompare` scan: green;
- independent committee result is recorded after the final review below.

The final verification command census is recorded in the ledger and commit handoff. No baseline was refreshed and no release state changed.
