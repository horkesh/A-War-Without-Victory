# Release Process Archive Pointer

Full pre-restructure archive: ./full_archive_20260708.md

Use this topic when working on WP-9 diaries, D2/D3/D4 release sequencing, packaging, desktop release checks, or operator gates.

High-value current rule: current path is WP-9 owner friction diaries -> D2 owner full-campaign playthrough -> D3 operator release gate -> D4 final docs/release sweep -> 1.0 tag.


<!-- relocated-from-index-2026-09-12:Current Release State -->
## Current Release State
1. **[2026-08-22] HV 1995 timing+mobility is one atomic candidate, and its first 188w result got worse**
   Do instead: keep all six defs at turn 174 in the same tree as both live T3 executor changes (`osid_column_movement` and `brigade_movement_orders`); never land legs with turn 150. The controlled combined run `...n227` scored **609/712, 31/31 anchors**: 3/6 wave formations recorded movement, 0 appeared in 637 full-stack battle records, and Mistral 2 stayed blocked through turn 188. Treat this as an engine-fix candidate with unresolved calibration/mechanism evidence, not a +16 lane.
2. **[2026-08-23] The CI/manifest anomaly is settled; reconcile pins only from byte-identical local/CI evidence**
   Do instead: compare actual hash values, not failure counts. Latest CI `32619857153` and a clean local run exposed the same 24 mismatch keys and all 24 local artifact hashes matched CI's actual hashes byte-for-byte. Across the previous CI run, 18 actual hashes stayed fixed and only six 188w hashes moved with the later accepted roster calibration. The workflow caches npm dependencies only, not scenario artifacts. This is sufficient evidence for the deliberate 24-pin reconciliation; it does not authorize an unrelated refloor.
3. **[2026-08-27] Reduced RE is seven 1.0 outcomes, not an engine-cleanup programme**
   Do instead: execute only P1, P2A, P2B, P3, P4, P5, P6, and P7 from the sole RE contract, one exact-file packet at a time. Use one implementer + domain reviewer + QA, one correction/confirmation pass, and no per-packet campaign. The corrected baseline's +3.62853% cost is watch-only; do not reopen pre-1.0 performance diagnosis. After all packets, run one final pair/profile and hand off to R8. Keep probe, calibration, scenarios, references, canon, active-strength, dissolution, enclave targeting, hostile breakout, and speculative mechanics outside RE.
4. **[2026-08-23] Phantom brigades require their military substrate; the synthetic JNA command is the sole exception**
   Do instead: never let temporary JNA/HV content manufacture an OOB. Require at least one non-phantom formation and the phantom's authored host-corps formation before spawn. Preserve `jna_herzegovina_command` as the single explicit exception because corps initialization synthesizes it after its subordinates exist. The 188w/52w artifacts stayed byte-identical; only the four premature HV rows left each synthetic 4w fixture.
5. **[2026-08-15] Retain collapse v3 selection plus reversible D-shape**
   Do instead: preserve the default-OFF two-turn selector and 4.0/0.5 shock/recovery union pass. Do not revive struck breadth tuning; any RBiH/RS Tier-0 opening or neighbour topology requires fresh Section 6 and paired 188w evidence.
6. **[2026-08-15] D-shape proved a live writer, not protected-boundary campaign reach**
   Do instead: cite the `70d5e04c6f49e041` pair as one live non-enclave HRHB write with full protected absence. Keep the discriminating G1 fixture as protected-input proof, and rerun if faction gates/topology change.
7. **[2026-08-15] Publication remains separately authorized**
   Do instead: transient validation packages are allowed, but do not sign, upload, create a public release, or tag `1.0` without an explicit `Publish 1.0` instruction.
8. **[2026-08-15] R7 Phase 1.2 provenance is a zero-queue contract**
   Do instead: preserve 3,642 documented claims plus 12 explicitly non-player-facing deposits, with zero unresolved player-facing rows. Keep essay metadata mirrored into `essay_index.json`; use leading provenance headers for inventoried TS/TSX/Markdown read models; narrow or omit unsupported specificity rather than clearing it with vague citations.
