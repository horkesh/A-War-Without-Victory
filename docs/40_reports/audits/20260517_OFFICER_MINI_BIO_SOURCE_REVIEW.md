# Officer Mini-Bio Source Review

**Date:** 2026-05-17
**Scope:** First-pass opening commanders displayed by Army HQ/OOB surfaces.

## Review Boundary
- Included only officers in `data/scenarios/officers/apr1992_officers.json` with `is_historical_start: true`, `available_from_turn: 0`, and rank `army_commander` or `corps_commander`.
- Excluded deputies, future-turn commanders, and broader pool officers even when historically important.
- Added no new atrocity, culpability, intent, or disputed sensitive-history prose. Existing `war_crimes_record` fields were not changed.

## Included Officers
| Officer ID | Officer | Basis | Mini-Bio Source Class |
|---|---|---|---|
| `vrs_mladic` | Ratko Mladic | Opening VRS army commander in scenario data | Scenario-source-backed identity plus conservative trait inference from existing stats |
| `vrs_talic` | Momir Talic | Opening 1st Krajina Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `vrs_tomanic` | Radivoje Tomanic | Opening 2nd Krajina Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `vrs_simic` | Novica Simic | Opening East Bosnian Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `vrs_sipcic` | Tomislav Sipcic | Opening Sarajevo-Romanija Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `vrs_grubac` | Radovan Grubac | Opening Herzegovina Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `arbih_halilovic` | Sefer Halilovic | Opening RBiH army commander in scenario data | Scenario-source-backed identity plus conservative trait inference |
| `arbih_talijan` | Mustafa Hajrulahovic "Talijan" | Opening 1st Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `arbih_knez` | Zeljko Knez | Opening 2nd Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `arbih_drekovic` | Ramiz Drekovic | Opening 5th Corps commander | Scenario-source-backed assignment plus conservative trait inference |
| `hvo_petkovic` | Milivoj Petkovic | Opening HVO army commander in scenario data | Scenario-source-backed identity plus conservative trait inference |
| `hvo_blaskic` | Tihomir Blaskic | Opening Central Bosnia HVO commander | Scenario-source-backed assignment plus conservative trait inference |
| `hvo_tole` | Zarko Tole | Opening Tomislavgrad commander | Scenario-source-backed assignment plus conservative trait inference |
| `hvo_lasic` | Miljenko Lasic | Opening Southeast Herzegovina commander | Scenario-source-backed assignment plus conservative trait inference |
| `hvo_matuzovic` | Duro Matuzovic | Opening Northwest Bosnia commander | Scenario-source-backed assignment plus conservative trait inference |

## Source Notes
- `bio_short` uses only existing scenario fields: origin, faction, rank, opening availability, and opening/home command assignment.
- `command_style` is a conservative UI label derived from existing numeric stats already used for officer archetypes: competence, aggressiveness, and defensive skill.
- `known_for` is limited to the officer's opening scenario command assignment.
- `political_alignment_note` is a generic command-chain note, not an external biographical or intent claim.
- `sensitive_history_note` was not populated in this pass.

## Historian Gate
- No new sensitive-history claim was authored.
- Any later expansion beyond opening-command assignment, origin, and trait inference should receive historian review with citations before data entry.
