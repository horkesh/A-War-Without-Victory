# Event Notification Narrative And Timing Review Packet

Date: 2026-05-21

Scope: reviewer packet only. No notification copy is authored here.

Source matrix: `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`

## Narrative-Tone Blocks

| File | Event id | Source | Blocks | Review need |
|---|---|---|---:|---|
| `war_1992.json` | `rs_strategic_goals` | RS | 4 | `selective` and `aggressive` to RBiH/HRHB; avoid omniscient intent, present-day moralizing, or unsupported accusation beyond authored row. |
| `war_1992.json` | `rbih_state_identity` | RBiH | 4 | `bosniak_national` and `pragmatic` to RS/HRHB; preserve faction framing without adding private intent. |
| `war_1993.json` | `visit_to_front_rbih` | RBiH | 4 | `visit_bihac` and `visit_press_rbih` to RS/HRHB; keep as operational/political readout, not new siege or atrocity narration. |
| `war_1993.json` | `visit_to_front_hrhb` | HRHB | 4 | `visit_mostar_front` and `visit_central_bosnia` to RBiH/RS; avoid unsupported blockade/detention claims. |

Total narrative-tone blocks: 16.

## Washington-Timing Blocks

| File | Event id | Source | Blocks | Review need |
|---|---|---|---:|---|
| `war_1994.json` | `washington_agreement_1994` | RBiH | 4 | Formal authored Washington event; copy may reference signature only in this event context. |
| `war_1994.json` | `ic_rbih_restraint_post_washington` | RBiH | 4 | Must not imply formal Washington signature before the authored event or confuse it with live `washington_signed` predicate. |

Total Washington-timing blocks: 8.

## Late-War-Outcome Blocks

| File | Event id | Source | Blocks | Review need |
|---|---|---|---:|---|
| `war_1994.json` | `contact_group_plan_1994` | RBiH | 4 | Peace-plan territorial split must remain compatible with alternate control state. |
| `war_1994.json` | `belgrade_embargo_rs_1994` | RS | 4 | Patron rupture copy must avoid asserting downstream RS collapse or peace outcome. |
| `war_1994.json` | `carter_ceasefire_1994` | RBiH | 4 | Ceasefire copy must not promise later offensives or final settlement facts. |
| `war_1995.json` | `karadzic_mladic_split_1995` | RS | 4 | Command crisis tied to Operation Storm timing; avoid deterministic outcome claims. |
| `war_1995.json` | `us_halts_federation_advance_1995` | RBiH | 4 | Banja Luka/refugee/final-territory implications need outcome-policy approval. |
| `war_1995.json` | `holbrooke_ceasefire_demand_oct95` | RBiH | 4 | Dayton setup must not assert final concessions or territorial map. |
| `war_1995.json` | `dayton_talks_begin_1995` | RBiH | 4 | Final settlement framing must remain conditional on current sim state. |

Total late-war-outcome blocks: 28.

## Reviewer Decision Format

For each row, return one of:

- `approved`: safe to draft recipient copy under normal content review.
- `approved_with_limits`: author may draft only under the stated timing/outcome/tone constraints.
- `blocked`: leave blocks absent and state the policy blocker.

No reviewer approval here authorizes event JSON edits by itself; a future implementation pass must still add tests and update the tracker.
