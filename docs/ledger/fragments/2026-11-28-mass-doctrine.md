## 2026-11-28 — MASS-DOCTRINE: the bot attack gate forecasts by mass, written down in code, records and canon

Authority: orchestrator ruling §75 (Fable consult 14 adopted; memo `fable_consults/14_forecast_gap.md`, appendix B). Canon panel on the Systems Manual paragraph: canon-compliance-reviewer and systems-programmer, polled independently, implementer excluded; unanimous 2/2 SIGN (their wording fixes applied).

**What was unwritten.** A bot brigade's go or no-go on an attack (`predictCombatOutcome`) leaves the attacker's firepower deficit out, while the battle and the launch estimate price it. The predictor's header said it "mirrors" the resolver, so traces read the gap as a defect (§74). Fable 14 measured the mirror fix: battles fall under the 2.35/wk floor in both modes, the Farz tripwire trips, and ARBiH 1st-4th Corps operations succeed 15 times against history's 5. The unpriced gate is the modelled ARBiH mass and attrition doctrine.

**Change (byte-identical).**
- `predictCombatOutcome` takes an explicit first argument `firePricing: AttackFirePricing` (`'by_mass' | 'priced'`, no default). Every src caller passes `'by_mass'`, so behaviour is unchanged. `'priced'` applies the deficit on the resolver's roster.
- `CombatPrediction.firepower_deficit_mult` returns the deficit either way. The debug-only `AxisOrderGenerationDetail` (persisted only under `AWWV_DEBUG_REASON_CODES=axis_reject`) records it beside the by-mass `power_ratio`.
- Comments corrected: the predictor header and `attack_force_power.ts` (the reason is doctrine, not hidden knowledge).
- Systems Manual: new paragraph "Attack gate: the mass doctrine" after the P3-EST force-ratio paragraph.
- `tests/mass_doctrine_contract.test.ts`: a source scan fails if any src caller stops passing `'by_mass'` (message names the memo), plus by-mass vs priced and post-Storm fixtures. Spy-index tests shift by one argument.

**Not in this change.** The directive card's priced numbers (`operation_prediction.ts`, memo appendix B) need the UI seat and a rendered card; split out, not a freeze blocker.
