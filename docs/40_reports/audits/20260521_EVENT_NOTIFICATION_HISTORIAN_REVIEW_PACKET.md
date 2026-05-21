# Event Notification Historian Review Packet

Date: 2026-05-21

Scope: reviewer packet only. No notification copy is authored here.

Source matrix: `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`

## Historian-Required Blocks

| File | Event id | Source | Blocks | Review need |
|---|---|---|---:|---|
| `war_1992.json` | `drina_cleansing_decision_1992` | RS | 4 | Atrocity/displacement row; approve only text supported by existing event fields and cited sources. |
| `war_1992.json` | `concentration_camps_revealed_1992` | RS | 6 | Detention-camp disclosure row; confirm factual support and non-sensational recipient framing. |
| `war_1993.json` | `srebrenica_demilitarization_1993` | RBiH | 6 | Safe-area/demilitarization row; verify recipient knowledge and humanitarian-convoy framing. |
| `war_1993.json` | `operation_lukavac_93` | RS | 4 | Sarajevo siege/Igman/NATO row; verify military and civilian-context claims. |
| `war_1993.json` | `visit_to_front_rbih` | RBiH | 2 | `visit_sarajevo` to RS/HRHB only; siege-front visit needs sourced, neutral wording. |
| `war_1993.json` | `visit_to_front_rs` | RS | 4 | `visit_sarajevo_lines` and `visit_drina_front` to RBiH/HRHB; siege and Drina-front implications need review. |
| `war_1994.json` | `nato_ultimatum_sarajevo_1994` | RS | 4 | Markale/Sarajevo heavy-weapons ultimatum; verify historical and humanitarian framing. |
| `war_1995.json` | `un_hostage_crisis_1995` | RS | 4 | UN hostage/human-shield row; verify factual claims and avoid unsupported detail. |

Total historian-required blocks: 34.

## Blocked-Sensitive Blocks

These should remain absent until the underlying event row or reviewer policy changes.

| File | Event id | Source | Blocks | Blocker |
|---|---|---|---:|---|
| `war_1993.json` | `visit_to_front_rs` | RS | 2 | `visit_press_rs` to RBiH/HRHB risks unsupported press/propaganda disclosure around Sarajevo, Drina, and international observation. |
| `war_1993.json` | `visit_to_front_hrhb` | HRHB | 2 | `visit_press_hrhb` to RBiH/RS risks unsupported detention, blockade, or central-Bosnia press-management implications. |

Total blocked-sensitive blocks: 4.

## Reviewer Decision Format

For each row, return one of:

- `approved`: event row already supports neutral recipient copy.
- `approved_with_limits`: author may draft only under listed wording constraints.
- `blocked`: leave blocks absent; state the missing support or policy reason.

Do not approve copy that would introduce new historical claims, reveal implausible recipient knowledge, or turn a recipient notification into a new narrative event.
