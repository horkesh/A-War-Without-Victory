# R7 Phase 2 Officer/OOB Attribution — Second Committee Repair

**Date:** 2026-08-02
**Workstream:** R7 Phase 2
**Status:** Implementation and focused verification green; independent committee re-review requested

## Outcome

The second review correctly blocked the prior repair. It still accepted missing `repo://` targets, promoted eleven Wikipedia-only formation identities, left turn-zero and `bounded_model` chronology unsupported, compared OOB sources by count rather than identity, inspected only a selected dependency list, retained 35/28 stale officer rows in the tracked startup, and left the UI presenting gameplay appointment classes as invented general ranks.

This repair closes those findings without running scenario, baseline, performance, Electron, packaging, release, or publication commands. `docs/10_canon/FORAWWV.md` was not edited.

## Final census

| Family | Playable supported | Explicit omissions |
|---|---:|---:|
| Officers | 63 | 35 |
| Corps/command formations | 19 | 0 |
| Brigades/regiments | 238 | 11 |
| Elite commanders | 3 | 5 |
| **Total** | **323** | **51** |

Seven formerly Wikipedia-only formation rows remain because exact Balkan Battlegrounds pages name them: 10th Mountain, 1st Mountain, HVO Kralj Tvrtko, and HVO 107th, 108th, 110th Usora, and 115th. Eleven rows without exact authoritative/local identity evidence were removed from OOB, designation, scenario, startup, and UI/sim surfaces and recorded as `missing_exact_source` omissions.

## Source and chronology repair

- Every `repo://` URL is resolved against the repository root. Empty/malformed, escaping, missing, and non-file targets block the gate.
- Avdo Palić now cites the ICTY Popović transcript: appointment as Žepa-region armed-forces commander on 18 October 1992, turn 28.
- Mustafa Hajrulahović Talijan now cites the ICTY Halilović judgment: 1st Corps established under his command on 1 September 1992, turn 22.
- Tihomir Blaškić now cites the ICTY trial judgment: Central Bosnia appointment on 27 June 1992, turn 12.
- Mehdin Hodžić, Nesib Malkić, Hajrudin Mešić, and Safet Hadžić use official Bosnia and Herzegovina government/ministry sources for their exact roles and dated boundaries.
- All 63 playable rows own `available_from_turn` evidence. Every authored exit boundary owns matching evidence. No `bounded_model` rows remain and no row is left at turn zero without a pre-campaign source.
- Imprecise year/month evidence is represented as `on_or_before` with a conservative source-date bound; it is not described as an exact appointment.

## Accepted officer semantics

[ADR-0008](../../20_engineering/ADR/ADR-0008-named-officer-tier-scope-and-rank-semantics.md) is accepted. The 63-person Tier 1 census is a named strategic/operational command pool, not a claim that all 63 historically commanded corps or armies.

- `rank` is retained as the deterministic gameplay appointment class for save compatibility.
- `historical_role` is a typed sourced office/command. The roster covers army/corps, division, operational-zone/group, enclave, brigade/battalion, staff, regional-defence, and political-military roles.
- The validator rejects unknown role tokens and legacy rows project deterministically as `unspecified_command_role`.
- The map read model carries `historical_role`; command profiles render it separately.
- Appointment classes no longer become `Gen.`, general titles, or star insignia. A neutral `CMD` badge and appointment wording preserve gameplay information without inventing rank.
- Systems Manual and Rulebook wording now match the accepted contract.

## Identity-level OOB comparison

`tools/audit/compare_oob_vs_markdown.ts` now parses the three actual brigade tables into identities, normalizes names deterministically, performs one-to-one matches, applies authored cross-name/faction aliases, and requires a non-empty disposition for every unmatched row.

| Evidence | Parsed rows | Playable rows |
|---|---:|---:|
| RBiH Appendix H | 106 | 115 |
| VRS Appendix G | 76 | 83 |
| HVO full list | 35 | 40 |

Result: 214 identity matches, 27 explicit snapshot/narrative dispositions, zero unresolved mismatches. Missing evidence files, malformed JSON, missing disposition ledgers, or unresolved identities exit nonzero.

## Recursive dependency and generated-state closure

The new recursive diagnostic scans sorted text files under all scenario, generated-startup, source, sim, and UI roots. Its universe includes playable designation/officer IDs plus omitted brigade/officer IDs, so stale references cannot disappear merely by removing a catalog row. A nested fixture proves discovery beyond a hand-picked file list.

- Unsupported formation references: zero.
- Unsupported officer references: zero.
- Tracked startup `named_officer_data`: exactly the 63 playable source rows; stale rows zero.
- Tracked startup `named_officers`: no unsupported states; stale rows zero.
- Four preplanned-operation commander fields that referenced omitted officers were removed rather than silently substituted.

## Determinism

All diagnostics use stable path, ID, violation, match, and disposition ordering. Temporal mapping is UTC and pure from the 6 April 1992 campaign start. No clock, random source, environment-dependent ordering, or cross-turn cache was introduced. Stable officer and formation IDs are preserved for retained records.

## Verification

RED evidence preceded production changes:

- missing/escaping/malformed repository URLs were accepted;
- turn-zero availability passed without evidence;
- the roster lacked `historical_role`;
- the comparison exposed no identities;
- the recursive dependency module did not exist.

Green evidence for the repaired packet:

- strict provenance diagnostic: 323 supported, 51 omissions, zero blockers/warnings;
- identity comparison: 214 matches, 27 dispositions, zero unresolved, CLI exit 0;
- focused and adjacent officer/UI/save projection matrix: 9 files / 102 tests green;
- recursive real-repository audit: zero stale brigade/officer identities;
- TypeScript `tsc --noEmit`: exit 0;
- `git diff --check`: exit 0.

The final verification command census is recorded in the ledger and commit handoff. No baseline was refreshed and no release state changed.
