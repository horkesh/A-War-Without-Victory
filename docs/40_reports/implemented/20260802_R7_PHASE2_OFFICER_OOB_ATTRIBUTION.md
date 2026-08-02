# R7 Phase 2 Officer/OOB Attribution — Exact-Evidence Checkpoint

**Date:** 2026-08-02
**Workstream:** R7 Phase 2
**Status:** Focused implementation verified; generated startup/baseline verification remains serialized behind the R5 runtime lane

## Outcome

This packet replaces inferred authored officer/commander identity with an exact-source rule. Each retained identity in the authoritative officer/OOB source owns a row-local citation. Candidates without exact identity-and-command evidence were removed from those authored sources and retained in the deterministic omission section of `docs/provenance/OFFICER_OOB_PROVENANCE.json`.

The source review also corrected a repository misconception: BB Volume I contains Appendix I, a Croatian Defense Council order of battle for October 1995, on pages 518–521. Those pages now support the five HVO command rows and four guard-formation rows alongside Appendices G and H.

## Exact census

| Family | Authored source rows | Exactly supported | Unsupported source rows | Omitted candidates |
|---|---:|---:|---:|---:|
| Officers | 31 | 31 | 0 | 67 |
| Corps/command formations | 19 | 19 | 0 | 0 |
| Brigades/regiments | 169 | 169 | 0 | 80 |
| Elite commanders | 3 | 3 | 0 | 5 |
| **Total** | **222** | **222** | **0** | **152** |

The 169 supported formation rows comprise 105 ARBiH Appendix H rows, 60 VRS Appendix G rows, and four HVO Appendix I guard rows. All 19 corps/command rows have exact provenance. `jna_herzegovina_command` is explicitly classified as a synthetic engine command and cites the repository design ledger rather than being presented as a historical corps.

The source review also found 80 named formation candidates without exact row-local evidence:

| Faction | Count | Corps distribution |
|---|---:|---|
| HRHB | 36 | Central Bosnia 12; Posavina 7; Southeast Herzegovina 14; Tomislavgrad 3 |
| RBiH | 21 | 1st Corps 4; 2nd Corps 14; 3rd Corps 1; 5th Corps 2 |
| RS | 23 | 1st Krajina 1; Drina 9; Herzegovina 8; Sarajevo-Romanija 5 |

They are historical OOB identity claims, not anonymous engine slots. They were therefore removed from authoritative OOB source data and preserved as typed `brigade` omission rows; no blanket source, name similarity, HQ mention, or appendix-adjacent inference promotes them. They may return only through a future exact-evidence packet.

## Generated/reference closure still required

A post-omission reference scan prevents this source checkpoint from being misreported as full runtime closure. Of the 80 omitted brigade IDs, 55 still occur as formation instances in the tracked generated April 1992 startup artifact, one occurs in `initial_formations_jan1993.json`, and 10 occur in `jan1993_start.json`. Additional references in designation/localization maps and conditional operation catalogs do not instantiate formations, but their behavior after source removal still belongs to integrated proof.

The current runtime/startup success criterion therefore remains open. The generated-artifact owner must rebuild or explicitly remove the stale instances under the serialized runtime lane, review the resulting scenario/baseline drift, and prove that conditional catalogs fail safely. This packet does not weaken the exact-evidence gate or call those stale instances supported.

## Sources promoted

- BB1 pp.496–501: Appendix G, VRS skeleton OOB, July 1995.
- BB1 pp.506–515: Appendix H, ARBiH skeleton OOB, October 1995.
- BB1 pp.518–521: Appendix I, HVO OOB, October 1995.
- BB1 pp.524–525 and 527–528: exact commander charts.
- BB1 pp.170, 186, 189, 442, 456 and BB2 pp.406, 446, 452: exact formation, command, and named-commander rows used where the charts do not carry the opening or subordinate role.
- ICTY `Prlić et al.` Trial Judgment, Vol. I, paras. 715–728, and Appeal Judgment, Vol. I, para. 7: exact Petković → Praljak → Roso → Petković succession dates.
- ICTY `Blaškić` Amended Indictment, para. 2: exact 5 August 1994 army-command appointment and November 1995 exit.

Promoted BB rows use repository-relative `repo://data/derived/knowledge_base/balkan_battlegrounds/pages/<page>.json` paths. Tribunal rows use permanent official ICTY document URLs. The sidecar requires explicit row ownership of source, URL, citation, tier, confidence, and disposition; positive evidence cannot be inherited from defaults.

## Identity and chronology corrections

- Radivoje Tomanić is no longer the opening 2nd Krajina Corps commander. BB1 p.524 places his tenure in 1994–95; the deterministic year boundary is modeled from turn 91.
- Grujo Borić is available from the late-1992 2nd Krajina command evidenced at BB1 p.186, with the late-1994 exit bounded by the BB2 Bihac command narrative.
- Milivoj Petković's second tenure is retained after official ICTY research proved the exact 26 April–5 August 1994 interval. It is an explicit `tenure_of` relation rather than an inferred duplicate.
- The HVO army-command sequence now uses the first campaign-week boundary on or after each exact appointment: Petković → Praljak at turn 68, Praljak → Roso at turn 84, Roso → Petković at turn 108, and Petković → Blaškić at turn 122. The canonical succession roster has no omitted/dead officer reference.
- Tihomir Blaškić's Central Bosnia and 1995 army roles are retained as an explicit `tenure_of` relation.
- Željko Glasnović's officer and 1st Guards commander rows are retained as an explicit `same_person` relation.
- All other normalized-name collisions disappeared because unsupported duplicate officer/elite rows were omitted rather than inferred.

## Sensitive legal metadata

Court-record prose was removed from the retained officer/elite rows in this packet. The local BB commander/OOB pages prove identity and assignment but are not exact official judgment citations for every verdict, charge, sentence, and summary field. Sensitive legal metadata may return only through a separate official/tribunal row-level citation packet; it is not inherited from repository prose or case-number mentions.

## Determinism and persistence

- The provenance report now emits deterministic `omissions`, an `omitted_records` count, stable record ordering, repository-relative paths, and no clock fields.
- `src/sim/oob_lookup.ts` now sorts municipality and settlement inputs and keeps the lexicographically lowest settlement ID for duplicate `(name, municipality-code)` rows instead of depending on JSON insertion order.
- Save/load persistence and the UI read model have focused tests proving static identity, faction, corps attribution, and biography fields remain in `named_officer_data`, while mutable command state remains separate.
- The stale `compare_oob_vs_markdown` tool now accepts the canonical top-level brigade array, retains legacy wrapped-shape compatibility, rejects malformed input, and no longer executes on test import.

## Verification record

Red-first evidence:

- The first focused run failed because the provenance report had no omission channel and the OOB comparison tool exported no canonical-array reader and executed on import.
- The first data-aware run exposed the obsolete 98/80-officer census assertions and the inference-backed 15-officer biography cohort.
- The OOB lookup determinism and HVO succession-closure fixtures were added during the exclusive runtime lease and passed in the final focused matrix.

Pre-lease evidence:

- `tests/compare_oob_vs_markdown.test.ts`, `tests/officer_oob_provenance.test.ts`, `tests/officer_state_persistence.test.ts`, and `tests/officer_bio_read_model.test.ts`: 4 files / 11 tests passed before the roster rewrite.
- Save/load and read-model persistence continued to pass in the data-aware focused run.

Final focused verification after the R5 lease released:

```powershell
npm.cmd run test:vitest -- tests/canon_officer_corps_refs.test.ts tests/officer_oob_provenance.test.ts tests/officer_state_persistence.test.ts tests/officer_bio_read_model.test.ts tests/officer_mini_bio_schema.test.ts tests/officer_system.test.ts tests/oob_loader.test.ts tests/oob_lookup_determinism.test.ts tests/compare_oob_vs_markdown.test.ts tests/a4_army_co_roster_personalities.test.ts tests/army_co_emergent_lifecycle.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npx.cmd tsx tools/diagnostics/officer_oob_provenance.ts --strict
git diff --check
```

- Focused Vitest: 11 files / 95 tests passed. The first released-lane run exposed one stale loader assertion that still required the omitted Dževad Rađo row; the corrected test now proves retained exact-source elites and absence of unsupported elite metadata.
- TypeScript: `tsc --noEmit -p tsconfig.json` exited 0.
- Provenance diagnostic: two strict invocations exit 0 with the same serialized output. The summary is 222 records, 222 supported, zero unsupported, 152 omitted, zero blocking findings, and zero warnings.
- Static JSON closure: 222 manifest/playable records and 152 omissions, with zero duplicate record or omission keys, zero playable/omission overlap, zero missing or extra playable records, and zero malformed omission rows.
- `git diff --check` exited 0.

The startup snapshot check is intentionally not refreshed or bypassed in this packet. Removing the 80 unsupported named formations changes clean-campaign OOB construction, while 55 stale exact-ID instances remain in the tracked generated startup artifact. The generated snapshot and baseline owners must account for that intentional source correction under the serialized runtime lane before global identity closure can be claimed. No scenario, baseline, startup-snapshot, performance, Electron, package, version, release, or publication command ran here.

## Files

- `data/scenarios/officers/apr1992_officers.json`
- `data/scenarios/army_co_roster.json`
- `data/source/oob_brigades.json`
- `docs/provenance/OFFICER_OOB_PROVENANCE.json`
- `src/sim/oob_lookup.ts`
- `tools/diagnostics/officer_oob_provenance.ts`
- `tools/audit/compare_oob_vs_markdown.ts`
- focused provenance, persistence, read-model, lookup-determinism, and comparison tests

No edit was made to `docs/10_canon/FORAWWV.md`.
