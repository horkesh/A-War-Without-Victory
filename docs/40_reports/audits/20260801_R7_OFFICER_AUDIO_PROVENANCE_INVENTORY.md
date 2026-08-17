# R7 Officer/OOB and Audio Provenance Inventory

**Date:** 2026-08-01

**Roadmap:** R7 Phase 0 inventory; officer/OOB remediation closed in Phase 2

**Disposition:** Officer/OOB accepted and closed; audio remediation remains open

## Result

The independently reviewed inventory covers every live named officer/OOB row and every registered audio cue without converting missing evidence into support.

| Inventory | Census | Supported/provided truth | Open findings |
|---|---:|---:|---:|
| Officer/OOB | 334 of 334 playable rows keyed; 40 audit-only omitted candidates | 334 exact-supported | 0 unsupported playable rows; 0 blocking violations |
| Audio | 36 of 36 keyed | 17 provided; 19 placeholders | 54 blocking violations; 5 sensitivity-review warnings |
| Audio binaries | all files below the owned audio root | 0 unregistered/orphan binaries | 3 required ambient beds absent |

Officer/OOB support requires row-local source, source URL, exact citation, accepted tier, exact confidence, supported disposition, and any applicable identity-relation or court citation. Manifest-wide defaults may express an unresolved negative state but cannot supply positive evidence.

Phase 2 closes that officer/OOB floor. The playable set comprises 68 officers, 19 corps, 244 brigades, and 3 named elite-command links. Forty unsupported, conflicting, or duplicate candidates remain explicit `omitted` audit rows and are absent from playable data. Four exact brigade alias families have one retained immutable ID each; the former `Hrvoje Vukčić Hrvatinić` Odžak row is omitted because accepted evidence supports different Jajce and later Prozor-Rama identities, not the authored Odžak assignment. Exact-ID lookup rejects duplicate IDs and never uses display-name similarity.

Audio rows are joined to both the cue registry and `audioAssets.ts`. Provided cues must resolve into the bundle; placeholders must not. The diagnostic recursively inventories audio binaries and rejects unregistered files. Its `OggS` test is only a container-signature precheck: recorded duration and LUFS remain remediation inputs and are not represented as decoded proof.

## Verification

- Phase 2 focused matrix: 8 files / 84 tests;
- adjacent stale-reference matrix: 2 files / 55 tests;
- parent integration smoke: 2 files / 11 tests;
- TypeScript, canon/determinism/baseline checks, EOL policy, and diff checks: passed;
- independent review first blocked inherited positive defaults and incomplete runtime/orphan audio joins; both defects were corrected before acceptance.

## Scope and next work

Officer/OOB remediation is closed. The retained exact mappings, omitted-candidate boundary, corrected duplicate formations and Posavina availability, regenerated startup artifact, and startup/save/UI persistence tests are now release inputs. This report still makes no claim that audio remediation is complete: Phase 4 must supply or omit the remaining priority cues and ambient beds with licensed, checksum-backed lineage. Localization Phase 3 remains explicitly post-1.0.
