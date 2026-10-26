# Corrected-engine historical calibration packet — retained audits and source correction

**Date:** 2026-10-26
**Baseline:** The retained clean-source week-39 candidate scored 703/712 and failed health at 13 > 3.
**Result:** The bounded zero-drift morale source correction has focused evidence and independent GO. The 703/712 result, four formerly-correct losses, health failure, and all global acceptance gates remain unchanged.

## Summary

- The owner authorized historical calibration on the corrected engine (“Begin it”), with the 707/707/706/706 checkpoint floors, zero formerly-correct losses, protected anchors, health, provenance, and preservation gates unchanged.
- Retained Circle delivery and HVO lifecycle reviews produced no supported Circle timing/OOB edit and no safe HVO data-only correction. The proposed permanent Circle planning-duration change is blocked because it also changes launch/recovery deadlines and movement ownership.
- The only supported source correction removes the zero-net-drift early return so existing home/existential floors and critical morale consequences execute. This repairs the morale invariant; it does not clear the 13-health failure or qualify the calibration candidate.

## Retained findings

### Operation Circle delivery

The authored roster contains seven brigades; five were admitted at T16. The 808th and 102nd failed the ordinary assembly-reachability limit at four and six friendly hops, respectively, against a maximum of three. The 843rd and 109th reached their objective areas and attacked alone; 843rd's three attacks were repulsed/stalemated/repulsed, and 109th's Tošići attack was catastrophic. Circle ended at T24 with three Goražde objectives captured and both disputed objectives still RS. The 843rd was assigned Podgrab rather than exact authored staging, but the order remained adjacent and lawful.

The proposal to change `planning_duration` from 4 to 7 is **BLOCKED** as a permanent edit: that field also feeds readiness grace, launch and recovery timing, planning invalidation, and movement ownership. The paired three-turn-per-branch counterfactual packet is prepared only, unbound, and unrun; it is not part of this proof bundle. No Circle edit or new campaign occurred.

### Stranded-formation health audit

The retained candidate has 13 stranded formations against the unchanged maximum of three. Ordinary reinforcement, movement, attrition, merge and dissolution paths do not demonstrate a lawful way to clear ten by week 39 while preserving anchors. Several formations remain viable local defenders under existing floors; forced removal or weakened defenders are unsupported. The morale source defect explained below is not a health-cap resolution.

### HVO identity and lifecycle audit

BB2 Volume II PDF pages 446/460 (printed pages 427/441) place Ban Josip Jelačić's establishment on 20 December 1992 and identify the later 94th/95th successor relationship. This establishes premature organizational labels in the April OOB, but does not establish duplicated people: 3,500 personnel are demographically possible, while exact personnel allocation, Fojnica precursor representation, the split date, and the April identities remain unresolved. Existing rename/merge lifecycle machinery cannot implement the needed lineage safely. No HVO data, lifecycle, or canon change was authorized or made.

## Source correction and evidence

The correction removes only the zero-drift early return in `src/sim/combat/morale_drift.ts`; existing home/existential floors and critical consequences now run even when net drift is zero. It changes no constants, ordering, schemas, supply, enclave rules, dissolution rules, or eligibility.

- Morale tests: RED 23/25 with two expected failures; GREEN 25/25.
- Focused coverage: 69/69 across six files.
- TypeScript: exit 0.
- Independent source review: GO.
- Source SHA-256: `170273f88521779af70cb71d87f5db5008bc2a5b0ac4e6206d0b0b2c59d4d8df`.
- Test SHA-256: `f11492b2ace45f4fc259344fdeaa42db8b4f6123cb4e3db553b3595a40ea57aa`.

The portable evidence root is [initial-calibration-packet](../../../logs/r8-native-calibration-parity-20261026/initial-calibration-packet/); [MANIFEST.json](../../../logs/r8-native-calibration-parity-20261026/initial-calibration-packet/MANIFEST.json) records 43 byte-exact copies totaling 796,207 bytes, source bindings, and the output-boundary incident. Two retained PDF page images are included; no large images were excluded. The separately prepared Circle counterfactual is excluded because it is not bound or executed.

The incident record accurately states that two delegated audit outputs were initially written under `C:/tmp`; the authorized root copied the explicitly identified outputs into the worktree and verified their bytes. The originals were left untouched. This is an output-location violation, not evidence of a broader outside-workspace audit. I did not inspect the external originals.

**Proof limits:** The test receipts do not embed the runtime source hash, and the worktree's dependency junction remains an environmental provenance limit. This bundle and source review do not establish full runtime qualification. The correction does not clear health 13 > 3 and must not be credited with calibration gain.

## Current calibration status and next work

The retained week-39 candidate remains **NO-GO / STOP_NO_RETRY** at 703/712 versus the unchanged 707 floor, with four n91/n92 formerly-correct losses and health 13 > 3. The zero-drift correction is source-qualified only. No new campaign was launched in this packet. The next calibration step is a clean-source, independently reviewed prelaunch pair for the smallest supported candidate; it must bind to committed source before any authorized trajectory. The prepared Circle counterfactual is not eligible as immutable proof until bound and independently approved. Existing gates remain: 707/707/706/706, zero formerly-correct losses, protected anchors, health, provenance, and preservation. Current188, full suite, package, and native qualification remain open.

## Files changed

| File | Change |
|---|---|
| `src/sim/combat/morale_drift.ts` | Remove zero-drift early return |
| `tests/morale_victory_feedback.test.ts` | Add focused floor/consequence regression coverage |
| `docs/40_reports/implemented/20261026_CORRECTED_ENGINE_CALIBRATION_PACKET.md` | This retained-evidence and correction report |

## Next steps

1. Preserve this packet and current gate failures as written.
2. Bind the source correction to a clean commit before starting a new calibration trajectory.
3. Obtain independent prelaunch review of the next narrowly scoped candidate and its exact acceptance checks.
4. Do not change the Circle permanent planning duration, HVO identities, health cap, benchmarks, or baselines on this evidence.