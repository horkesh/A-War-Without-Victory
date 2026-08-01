# R4 Phase 2 Source-Bounded Presidential Cadence

**Date:** 2026-08-01
**Roadmap:** R4, Phase 2, Task 2.1
**Baseline parent:** `60e963e0dd2754e96cfe39050f5919cb589d3b0c`
**Result:** source implementation complete; lease-backed Task 2.2 proof pending

## Outcome

The presidential initiative registry now tells the historical truth: the accepted BB1/BB2 review supports no additional initiative for the measured RBiH, RS, or HRHB quiet intervals. The shipped APR1992 registry therefore contains `0` initiative rows and an explicit `positive_hold` source disposition. High or near-cap Authority is an eligibility signal only; it never creates historical evidence or a generic spend decision.

Task 2.1 is complete. Task 2.2 is deliberately still open because fresh three-faction 104-week cadence runs require the exclusive scenario/performance/Electron lease currently held by R5.

## Historical disposition

The accepted audit is [20260801_RS_104W_PRESIDENTIAL_CADENCE_AUDIT.md](../audits/20260801_RS_104W_PRESIDENTIAL_CADENCE_AUDIT.md). Its source inventory admits zero new rows. The previously accepted positive-hold intervals remain evidence inputs rather than newly rerun results:

| Faction | Accepted positive-hold intervals |
|---|---|
| RBiH | 20–38, 40–54, 54–70, 82–97 |
| RS | 17–40, 40–56, 56–70, 76–89 |
| HRHB | 40–51, 52–65, 87–102 |

Operation Lukavac 93 remains an existing authored operation/event supported by BB2 pp. 410–411; it is not reclassified as a new presidential initiative. Generic command-presence rows remain design abstractions. No Neretva, Grabovica, Uzdol, or other calendar event was converted into a cadence choice.

## Implementation

### Explicit, fail-closed source registry

`data/scenarios/presidential_initiatives/apr1992.json` owns the source-audit disposition and its evidence link. `src/sim/presidency/presidential_initiatives.ts` validates and stable-sorts any authored row. A row must provide:

- a stable lower-snake-case id, faction, bounded turn window, and nonempty deterministic state predicate;
- an allowed BB1, BB2, UN, or IRMCT citation with locator and claim;
- one of the existing five presidential levers at its canonical Authority cost;
- cooldown and once semantics; and
- explicit source support before any historical default is admitted.

The allowed lever set remains exactly `authorize_operation`, `request_operation`, `stop_operation`, `deploy_elite_formation`, and `replace_corps_commander`. There is no generic `spend Authority` route and no sixth lever.

The pure cadence evaluator rejects invalid or below-threshold Authority, too-short review gaps, required decisions, or an already-pending optional initiative. Eligible rows are sorted by stable id and at most one can be selected. The accepted empty registry returns `no_eligible_source_row`; it does not invent an initiative or a second positive-hold predicate.

### Runtime and Desk projection

The war pipeline validates the shipped registry after ordinary Level 1 operation proposals. The empty positive-hold registry is state-inert. If a future supported row is authored before its named existing lever owns the action, runtime fails closed instead of exposing an incomplete or fictional decision.

`src/ui/map/data/presidentialCadenceHold.ts` remains the single quiet-week selector. When its existing live rule is true—Authority at least 90% and no required/recommended Desk item—the Desk packet adds one informational monitor row with the localized player-faction label and live Authority value. The row has action `none`, is not actionable, is not an Advance blocker, creates no receipt, and changes no simulation state. Desk Header and Warroom Status continue to consume the same selector and existing explanation.

## RED/GREEN evidence

RED first failed because the registry module did not exist. After the schema/evaluator was added, RED narrowed to the absent Desk positive-hold row. Final contract review added exact cost-parity proof and confirmed the canon distinction: approving a commander's surfaced operation is the free `authorize_operation` lever, while authoring a brand-new operation is a separate 25-Authority action outside this five-lever registry. GREEN proves:

- the shipped audit is explicitly empty;
- missing citations, a sixth lever, noncanonical costs, unsupported historical defaults, and premature runtime rows fail closed;
- candidate order is deterministic under input permutation and at most one row is selected;
- an existing optional row prevents a second; and
- the Desk hold is monitor-only, actionless, nonblocking, localized as `Republika Srpska`, and backed by live `95/100` Authority in the fixture.

## Verification

Passed:

```powershell
npm.cmd run test:vitest -- tests/presidential_initiatives.test.ts tests/ui/inbox_items.test.ts tests/ui/advance_turn_button_gated_feedback.test.ts --pool=forks --reporter=dot
# 3 files / 86 tests

npm.cmd run test:vitest -- tests/presidential_initiatives.test.ts tests/presidential_cadence_report.test.ts tests/presidential_cadence_catalog_audit.test.ts tests/presidential_cadence_provenance.test.ts tests/presidential_cadence_cli_provenance.test.ts tests/rs_104week_decision_cadence.test.ts tests/event_timing.test.ts tests/event_timeline_integrity.test.ts --pool=forks --reporter=dot
# 8 files / 85 tests

npm.cmd run typecheck
npm.cmd run test:vitest -- tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
```

The combined canon-static check passed the determinism scan, non-strict sensitive-history audit, and paramilitary canon contract, but the strict sensitive-history audit remained red: `34/35` tests passed and one strict test reported `57` inherited event-catalog findings. This packet changes no event JSON, event audit, or event-timing source; its new registry contains zero initiative rows, so it adds none of those findings. R7 owns that pre-existing remediation queue. The gate was not weakened.

## Determinism, canon, and scope

- Registry parsing and selection use stable sorting and current state only; no clock, randomness, locale comparison, or filesystem path enters output.
- The shipped catalog is state-inert and adds no save field, migration, cooldown state, scenario output, or baseline change.
- No historical decision, default, event, effect, response, operation, cost, or recurrence was authored.
- No scenario/headless rerun, performance measurement, Electron run, package, version, tag, installer, push, publication, or release-state action occurred.
- `docs/10_canon/FORAWWV.md` is unchanged.

## Files

| Area | Files |
|---|---|
| Registry/runtime | `data/scenarios/presidential_initiatives/apr1992.json`; `src/sim/presidency/presidential_initiatives.ts`; `src/sim/turn_phases/war_phases.ts` |
| Shared projection | `src/ui/map/data/presidentialCadenceHold.ts`; `src/ui/map/data/inboxItems.ts`; Desk Header; Warroom Status; EN/BCS messages |
| Proof | `tests/presidential_initiatives.test.ts` |
| Governance | R4 plan; master roadmap; command board; reports indices; project ledger |

## Remaining Task 2.2 gate

After R5 releases the exclusive runtime lease:

1. rerun fresh RBiH, RS, and HRHB 104-week cadence reports;
2. distinguish actual-decision gaps from briefing gaps;
3. prove every unsupported interval has the explicit hold projection;
4. require an 8–10-week sourced review only where the zero-or-future catalog actually supports one;
5. confirm no generic Authority-spend content appears; and
6. run the deferred baseline/runtime gates before claiming Phase 2 complete.
