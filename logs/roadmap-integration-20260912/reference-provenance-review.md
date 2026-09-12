# Main-reference provenance review

Date: 2026-09-12
Scope: existing local evidence only. No scenario run, campaign, source edit, or tracked-report edit was performed.

## Verdict

The preserved `main-baseline-before-integration` directory is a **usable accepted-output comparator but not a clean-run provenance receipt**. Its eight manifest-owned outputs match the currently accepted manifest byte for byte, and all 31 consumed inputs match the current tree under the repository's canonical CRLF-to-LF provenance hashing. Its `run_meta.json`, however, says commit `e607508bc65dad1950d560d8b5b628da89674360`, `git_dirty: true`; the directory therefore cannot be described as the documented clean `2a8eb4244` run or used to prove clean-before reproducibility.

The existing n392 directory is a **usable clean historical reference**, but not the exact current-main pre-integration output baseline. It records clean commit `c2f6592ec1e2f049d93ade595760c19633bb2ce7`, Node `v22.23.2`, and the older consumed-input digest. Six of its eight manifest outputs differ from the owner-authorized #518 pins, exactly as the #518 record says; only `formation_delta.json` and `watched_operations.json` remain identical.

No local clean `2a8eb4244` or clean `e607508bc` run directory was found in the permitted main `runs`/`logs` and calibration-tree `runs`/`logs` roots. The #518 authority and CI reproduction remain documented, and the accepted manifest preserves their eight output bytes, but their clean local `run_meta.json` is no longer present in those roots.

## Inventory searched

- Enumerated 695 existing `run_meta.json`/related evidence paths under main `runs` and `F:/AWWV-worktrees/apr1994-calibration-investigation/runs`.
- Exact metadata search found no `git_commit` beginning `2a8eb4244` or `e607508bc` in those two run roots.
- The preserved directory is `F:/AWWV-worktrees/_preserved/roadmap-integration-20260912/main-baseline-before-integration`: 15 files, 53,895,998 bytes (53.90 MB decimal / 51.40 MiB), all matching `logs/roadmap-integration-20260912/baseline-preservation.json`.
- The clean historical directory is `runs/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n392`: 15 files, 53,925,329 bytes.

## Preserved directory versus accepted eight-pin manifest

Manifest: `data/derived/scenario/baselines/manifest.json`.

| Artifact | Preserved SHA-256 | Manifest SHA-256 | Result |
|---|---|---|---|
| `activity_summary.json` | `7d10356d0715db21370c3f7d6acc15db7948856c80962363f505641b48bfbd4e` | same | match |
| `control_delta.json` | `4cb8219cf3b7dcbfdd66476a7af5bbfa0709fdd24e0a37d6900a9b808d6acb85` | same | match |
| `end_report.md` | `fea39f3bf7eda907b290e3bd2579ac050c847ae2f783153117f95f1f94d0cf8d` | same | match |
| `final_save.json` | `e414dc69f6e875fcd2a7394582921f20ca03123112baf12e9308c50035c29c50` | same | match |
| `formation_delta.json` | `bbd7260e219d311bea201053d0d7c913f4b30b83bcead72b05d5f2c957566cb1` | same | match |
| `run_summary.json` | `b8ebc2c1ff4522fed0651be224ba360fcfeff0da4e6983f27d9df008eeba98cb` | same | match |
| `watched_operations.json` | `785a073b9312e34d20ba143915478ab768ce7847ad337b121f98491df8325b18` | same | match |
| `weekly_report.jsonl` | `4c5cb00bde51a15e2f7766d31ececb03e86d81bfcf1f93a4c04c01cbda31b9cf` | same | match |

Result: **8/8 exact**. The preserved `final_state_hash` is `e414dc69f6e875fc`. Existing `reference-checkpoints.log` scores 702/678/672/667, all 31 October anchors pass, the enclave guard is 9/9, and eastern provenance is clean. Its sole checkpoint-validator failure is the inherited Farz P-A discriminator: turn 168, `arbih_327th_vitezka_mountain`, `arbih_3rd_corps`; exit 1. This is useful behavioral reference evidence but does not cure dirty provenance.

## n392 versus accepted manifest

n392 provenance: `git_commit: c2f6592ec1e2f049d93ade595760c19633bb2ce7`, `git_dirty: false`, Node `v22.23.2`, consumed-input digest `eaa6b1778fc26c0a9894e1063ad2df5549a3030ce1c66d80af5ecde5ad4aa0ce`, final-state hash `723726ab301b0b84`.

| Artifact | n392 SHA-256 | Current manifest relation |
|---|---|---|
| `activity_summary.json` | `dc65e6e18e55b1da69305834ad653335f4e293525eaaca164100afe56a9b8a64` | differs |
| `control_delta.json` | `1d1f4ea337b2f31cad16573754a8de2fc4b925e4fbb887eaadfda247db617748` | differs |
| `end_report.md` | `0694f20ce874c546366aa87d38626ee9b22e7ba460c75f4cb1cb06e3632a761a` | differs |
| `final_save.json` | `723726ab301b0b8483a13e014f67535bb18f4a4c56176e328efa1440f4cbe301` | differs |
| `formation_delta.json` | `bbd7260e219d311bea201053d0d7c913f4b30b83bcead72b05d5f2c957566cb1` | matches |
| `run_summary.json` | `750e1922bf0722f7388a6fc6fb4c45054ace5748a692033c85d5d0dc2acc2a8f` | differs |
| `watched_operations.json` | `785a073b9312e34d20ba143915478ab768ce7847ad337b121f98491df8325b18` | matches |
| `weekly_report.jsonl` | `5dc8fa5e55bb0f446189b85ef4281a159e4d41ef778ac811e868e45987dfa095` | differs |

Result: **2/8 match, 6/8 differ**, the exact accepted #518 drift signature. n392 remains appropriate for historical protected-anchor comparison and for explaining the pin transition. It must not be presented as the current manifest's byte baseline.

## Consumed-input classification

The preserved metadata records 31 named consumed inputs and digest `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`. A raw-byte comparison against the Windows checkout flags three files, but all three are line-ending-only representations:

| Path | Recorded canonical SHA-256 | Current raw SHA-256 | Exact classification |
|---|---|---|---|
| `data/derived/operational/operational_settlements.geojson` | `c03cc9ce4286b779139ce460e5f515d67415fe633e4ed2dbda1764b9440338c8` | `03713c8e80ba7111ff64ad0bd69b70db4c7e2b30e22f23b8c4e2c11be60baa1a` | 151,882 LF line endings checked out as CRLF; JSON semantics identical |
| `data/scenarios/political_leader_data.json` | `6affed383f92f9786fa112c1fedc2b6a9c4dc5193c750c822c1ccf114b643474` | `4463e1fc9a76632dd35641e80f94fe3da338a2e43d6ddce511efdca0f28d12df` | 67 LF line endings checked out as CRLF; JSON semantics identical |
| `data/source/settlement_political_controllers_overrides.json` | `0eb42921290f1812adc5fc4a008113483840d7d2ab2e2d382ea7582ca4659a33` | `6d3939d32f2c9016650d8ede725964311196134136a090ef9030717a12a53b15` | 18 LF line endings checked out as CRLF; JSON semantics identical |

`src/scenario/run_provenance.ts` explicitly normalizes CRLF to LF before SHA-256 hashing. Applying that exact rule produces **0/31 input mismatches** and current digest `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`, exactly matching the preserved metadata. Each recorded file hash also equals the Git content at `e607508bc`, `2a8eb4244`, and base `9588876bc`. The `reference-inputs.json` raw 3/31 result is therefore checkout-format noise, not simulation-input drift.

## Honest merge-order use

Use the references with explicit roles:

1. **Current-main expected output:** the accepted eight-pin manifest, corroborated byte-for-byte by the preserved 15-file directory. Compare the candidate run against these eight pins and, where names correspond, against the preserved nonmetadata outputs. Label the preserved metadata dirty.
2. **Clean historical behavior/provenance:** n392. Use it for historical anchor/controller comparisons and the documented six-pin transition, while retaining its older source/input identity.
3. **Candidate acceptance:** requires the planned clean exact-tip 188-week run and conditional clean repeat. Those two runs must match across all corresponding nonmetadata outputs and must each carry clean exact-tip metadata. Neither preserved reference substitutes for that pair.

This is enough to measure and explain the merge-order delta without pretending that a clean local #518 directory survives. It is not enough to prove a clean immediate-base before/after pair locally. If an exact clean-before provenance pair at `9588876bc` is treated as mandatory rather than the accepted manifest/#518 authority, that evidence is missing and would require a separately authorized additional base campaign; do not relabel the dirty preserved directory to avoid that decision.
