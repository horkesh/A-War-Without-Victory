# Chains 1/3/5 Canon Review
**Date:** 2026-04-22
**Against:** docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md

## Summary

| Chain | Verdict | Primary issue |
|---|---|---|
| Chain 1 — No Drina Cleansing -> Partisan Rear | REAUTHOR | Frames absence of ethnic cleansing as a player-optimizable trade (international standing vs hostile rear), brushing the "atrocity as lever" line (gate L20, L224). |
| Chain 3 — Srebrenica Survives -> No Deliberate Force | REAUTHOR | Mostly Ring 1/2-compatible, but `csq_srebrenica_stalemate_1995` gives RBiH `international_standing +5` for enclave survival — reads as a "prevent genocide" reward (gate L60 prohibition #10). |
| Chain 5 — RS Maximum Aggression -> Accelerated Response | PASS (with wording note) | Mechanically aligned with Ring 1/2; atrocity is cost-only, never score-positive for RS. Cost-Ledger voice for new events must meet §4. |

## Chain 1 — No Drina Cleansing -> Partisan Rear

**Summary.** If the player sets `rs_strategic_goals = selective`, the historical Drina cleansing event does not fire; four new `csq_drina_*` events spawn Bosniak partisan resistance, supply disruption, a pinned Drina Corps, and an RBiH recruitment boost. Net: Srebrenica arc suppressed.

**Gate check.** Effects are Ring 1 (guerrilla_threat, recruitment_modifier, doctrine_constraint) and all-Ring 1-legal in shape. No new rupture, no new condemnation flag, no "commit genocide" button — so prohibitions 1-3 (L51-L53) are respected. BUT the suppression of the Srebrenica arc as a *direct consequence of the player restraining cleansing* collides with prohibition #10 (L60): "The player cannot earn points for preventing Srebrenica." The chain's framing ("RS trades international standing +15 for hostile rear... Srebrenica enclave formation SUPPRESSED — no enclave, no fall") makes genocide-avoidance a downstream reward of an early toggle.

**Atrocity-as-lever check.** This is the hot spot. Plan text on line 110: "RS trades international standing (+15 from selective goals) for a permanently hostile rear." That is the exact structure the gate forbids (L20, L123-L125, L224 "Atrocity is a consequence, not a lever."). The selective-goals decision becomes a cost-benefit calculator where *not cleansing* is an optimization axis. Chain 1 does not directly score atrocity positive, but its framing ("trade") commodifies restraint.

**Verdict.** REAUTHOR.

**Minimal rework:**
- Strip the "trade" framing from event narratives and any Cost-Ledger prose. The selective path is a political stance with military downsides; it is not a balance-sheet move against cleansing.
- Remove the explicit `international_standing +15` from the selective-goals response option (or move it out of Chain 1's scope). International standing should emerge from the absence of `war_crimes_events`, not be handed out for the policy toggle.
- Keep `csq_drina_population_resilience_1993`'s Srebrenica-suppression clause as a pure *state consequence* (no enclave wave forms because no refugees), but describe it in third-person historical voice per §4 (L134-L147), not as a reward paragraph.

## Chain 3 — Srebrenica Survives -> No Deliberate Force Trigger

**Summary.** If `srebrenica_fell` never sets (turn 170+ with enclave formed), four events fire: a stalemate, a permanent Drina Corps commitment, an alternative NATO trigger built on cumulative war crimes + Markale + RRF, and a prolonged-war exhaustion event.

**Gate check.** Effects are Ring 1 dimensions (military_credibility, international_standing, morale, cohesion, recruitment_modifier, doctrine_constraint, pressure-modifier). No new rupture, no new condemnation flag — the absence of `srebrenica_genocide_1995` simply means the existing rupture (L36, L79) does not fire, which is exactly the Ring 1 design. The "alternative NATO trigger" correctly keeps international intervention legible without fabricating a replacement rupture. The plan preserves L93's rule that non-rupture atrocities still depict fully.

**Atrocity-as-lever check.** `csq_srebrenica_stalemate_1995` gives `RBiH international_standing +5` and `RS military_credibility -5` explicitly because the enclave persists. Per prohibition #10 (L60): "The reward is the absence of a `genocide_condemnation` flag, not a badge." The +5 is a badge. The absence of the rupture is already the entire reward the gate allows. The rest of Chain 3 (enclave drain, alternative trigger, exhaustion) is gate-compliant.

**Verdict.** REAUTHOR.

**Minimal rework:**
- Delete the `international_standing +5` from `csq_srebrenica_stalemate_1995`. The reward for keeping Srebrenica is the non-firing of `srebrenica_genocide_1995` and the non-propagation of `genocide_condemnation` — that is the full canon-legal upside.
- Re-check `csq_prolonged_war_exhaustion_1995` wording does not read as "punishment for being humane" (plan §7 principle #3, L391). Frame as emergent war-weariness, not karmic retaliation.
- Keep `csq_alternative_nato_trigger_1995`: it models the historical debate about non-Srebrenica intervention catalysts and cites within existing Ring 2 atrocity accounting (Markale, cumulative war crimes).

## Chain 5 — RS Maximum Aggression -> Accelerated Response

**Summary.** If `rs_strategic_goals = aggressive`, four events accelerate history: earlier camp discovery, an early war-crimes tribunal mandate, earlier/stronger UN Safe Areas, and a lowered NATO threshold — all penalizing RS and tightening the endgame window.

**Gate check.** Every effect reduces RS standing or accelerates enforcement. No new rupture, no new condemnation flag, no "concentration camp system" (prohibition #2, L52) — the plan references camps through a `pressure modifier` and earlier discovery, not as a player-managed subsystem. `accelerated_camps_discovery_1992` correctly treats camp revelation as existing Ring 2 narrative accelerated in time, not a new modeled layer. Grade-anchor pressure (patron_confidence -10, international_standing -10) is Ring 1 dimension movement, fully legal.

**Atrocity-as-lever check.** This is the chain most at risk of inverting the Pyrrhic score (prohibition #4, L54: "The Pyrrhic score does not invert under any input"). The plan explicitly lists net effect as "faster territorial gains but triggers earlier and stronger international response" — aggression has cost, not net benefit. Aggressive is never score-positive across dimensions. "Atrocity is a consequence, not a lever" (L224) is respected: the player does not pick who to cleanse, where, or how hard; the toggle is a political posture, and its costs accumulate. The chain reinforces the gate rather than straining it.

**Verdict.** PASS.

**Wording note (non-blocking):** Any Cost-Ledger or Codex copy generated for `csq_early_war_crimes_tribunal_1993` and `csq_accelerated_camps_discovery_1992` must meet §4 (L134-L147): third-person historical voice, ICTY citations for Omarska/Keraterm/Trnopolje where applicable, no euphemisms, no "efficiency" framing. Route through `/narrative-designer` + `/historian` per §6 (L181-L192).

## Next steps

- Re-author Chain 1 first: it has the largest surface (four events, Srebrenica-arc suppression) and the clearest gate friction. Strip trade-language from the selective-goals response option and Chain 1 event prose before any implementation begins.
- Re-author Chain 3 second: single-line fix (delete `+5 international_standing` on stalemate) plus wording pass on exhaustion event.
- Chain 5 can proceed to implementation; flag Cost-Ledger wording review as a pre-merge gate rather than a pre-author gate.
