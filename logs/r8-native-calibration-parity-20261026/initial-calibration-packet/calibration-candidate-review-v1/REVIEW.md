# Independent calibration-candidate review

Scope: read-only source/retained-evidence review at `6b36ba312b88c431088856743437aaf643f7243a`; no run, API query, or production/test/data/canon edit. Existing `703/707`, four protected losses, and `health 13 > 3` remain unmet.

## 1. Operation Circle `planning_duration: 4 -> 7` — **BLOCK**

**Evidence.** The retained packet establishes a coherent seven-formation authored pool, five admitted at T16, and deterministic reconstruction of the 808th/102nd exclusions through `canReachAxisStaging(..., planning_duration - 1)` (`pre_planned_operations.ts:2092-2102`). It does not establish that either authored identity, the complete pool, or Donje Žešće/Tošići capture is historical fact. Late-July regional activity supports the window only; model allocation is not evidence that the current allocation is wrong.

The proposed field is not assembly-only. It is copied into the stored operation (`pre_planned_operations.ts:2494-2504`). Production then uses it for early no-readiness recovery, planning invalidation, continued march/opening-readiness grace, and forced anti-paralysis launch (`sector_offensive.ts:1506-1516, 1620-1666, 1699-1730`). It also raises `preparation_max_turns` through `max(aggressivenessMaxTurns, planning_duration)` (`operation_preparation.ts:1412-1421`), although this pre-planned operation becomes preparation-ready immediately (`:1427-1439`). Creation remains controlled by queue/availability, but roster, movement ownership, launch/recovery window, and possibly attack timing all change. The “assembly-budget only” claim is false.

**Inference/risk.** Admitting two distant brigades may improve concentration, but could also delay or invalidate opening readiness, divert their ordinary commitments, or alter attack sequencing. No retained evidence resolves that counterfactual, and no source supports a Circle-specific seven-turn lifecycle budget.

**Smallest lawful next prerequisite.** Before any gameplay edit, obtain one preserved T15→completed-T18 replay of the *exact proposed candidate* with `preplanned_eligibility`, `route_decision`, and opening-readiness/axis rejection receipts, proving for all seven formations: admission, operation-owned destinations, transit/arrival, no displaced pre-existing commitment, stored roster/axes, actual launch turn, and T18 orders/battles. Stop on input/hash mismatch. This is the exact missing production-path predicate set; the current-run replay proposed in `FINDING.md` cannot prove the changed candidate. No pool, threshold, control, teleport, or special bypass is justified.

Canon mapping: `CANON.md` Calibration Truth Rule; `War_Specification_v0_9_0.md:147-171`; `Engine_Invariants_v0_9_0.md:439-447`; `Game_Bible_v0_9_0.md:203-205`.

## 2. Zero-drift morale early exit — **GO for source correction before tuning**

**Evidence.** `morale_drift.ts:266` skips the home/existential floors and the critical-morale cohesion/desertion consequences at `:289-334`. The retained final Travnik brigade is active HRHB at its exact `origin_mun`/`home_osid`, has `home_defense_active: true`, morale `0`, cohesion `40`, personnel `700`, and low streak `12`; it is therefore directly eligible for the HRHB floor `25` (`:99-108, :291-294`). Canon describes that existing floor and unconditional morale-state consequences (`Systems_Manual_v0_9_0.md:85-87, 141, 391-393`; `Engine_Invariants_v0_9_0.md:86-93, 352-369`). Code contradicts canon.

**Repair boundary.** Remove only the zero-drift short circuit while preserving drift calculation/cap, sorted iteration, floor order before collapse consequences, diagnostics, streak loop, constants, thresholds, supply, dissolution gate, and serialization. Smallest RED fixture in `tests/morale_victory_feedback.test.ts`: an inactive-in-combat HRHB home defender at morale 0 with no census/outcome/supply drift must end at 25 without desertion/cohesion loss. Add a zero-drift non-floor morale-0 control proving existing cohesion `-2` and personnel `×0.95` consequences execute. Existing positive/nonzero floor tests remain required.

This correction is deterministic and likely preserves Travnik; it does **not** clear `health 13 > 3` or imply calibration gain. Ordinary independent canon/determinism review is required. The standard four-seat §6 panel is not required for this exact conformance repair because it changes no enclave exception, protected control, canon, or `FORAWWV`; any expansion of floor eligibility, dissolution/enclave semantics, or canon text triggers the applicable panel (`AGENT_WORKFLOW.md:29-35`).
