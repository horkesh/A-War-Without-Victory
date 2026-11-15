## 2026-11-14 — RF-AI2: the readiness gate counts a light strike group; bot objective lockout (PR #619)

Calibration-moving engine AI lane (register AI2). Owner-accepted 2026-11-14 ("Yes, accept it") as an honest cost of fixing the corps gate. Under the owner's hold-calibration decision, the scores are recorded, not a merge bar.

**Defect, measured on main.** A new opt-in trace (`AWWV_CORPS_STANCE_TRACE=1`, inert) showed that the N1297 readiness gate capped every corps without a motorized or mechanized `main_effort` brigade at `defensive`, so it never planned. Turns capped out of 188:
- ARBiH: 5th Corps 188; General Staff 174/174; 2nd Corps 91; 4th Corps 74.
- VRS: Herzegovina 188; East Bosnian 188; 2nd Krajina 175; Drina 104; SRK 92. These corps hold 40-700 units of massed fire support but their brigades are classed mountain.

**Change.**
- **Light strike group.** Corps-army-commander, historian and war-or-game seats chose this over an artillery threshold. A corps with >= 3 fit, combat-effective brigades in one zone, of any equipment class, may reach `balanced` and plan a local main effort. It never reaches `offensive` from this term alone. Sources: 5th Corps infiltration assaults (BB1 p.393, p.415; BB2 pp.527, 536). No tube counts exist for the 5th Corps.
- **Bot objective lockout** (orchestrator-granted scope). The bot plan path now honours the failed-objective cooldown. A bot commander-planned op that ends `zero_eligible_axis` or `max_failures` locks its objectives out for 8 × failure-count turns, and a later failure never shortens a lockout already in force. Authored, triggered, pre-planned and Army HQ ops are unchanged. Woken, the 5th Corps had re-planned Ripac every ~5 turns.
- Systems Manual §6 records both.

**Runs** (all against main 712/709/710/705):

| Run | Result | Notes |
|---|---|---|
| Gate removed | 707/706/704/690 | P-B breached |
| D2 | 712/705/707/699 | Farz P-A breached by the 3rd Corps' own "Džihad" at Ozren, t167-173 |
| D2 + flat lockout | 712/705/706/693 | — |
| D2 + escalating lockout | 712/705/706/698 | — |
| Final, on merged main | 712/705/706/698 (`7d4cf2cf698e3c41`) | reproduced 3 times |

Final run: strict health PASS; all guards intact; battles +2.2%; consistency 2. Both consistency failures are SE7E-class gaps, and the end report shows 4 empty VRS sectors against 3 on main. Baseline manifest re-blessed; the compare run is clean.

**Cells.**
- Lost, ahistorical outcomes (historian):
  - Vesela and Prusac: VRS "Grom"/"Vihor", t57-59.
  - Lopare selo and Donja Trnova: 2nd Corps "Most", t82-85.
- Lost at Oct95: 7 western cells, because Mistral 2 and Southern Move launch two turns late. Mistral 2's recon probe at Prekaja stays unresolved t176-178 at intel confidence 0.03.
- Gained: Jemanlići, Korenići, Varošluk.

**Pyrrhic gate:** GO with conditions; all met or registered.

**Standing question.** On main, Ozren (Vidik paralysis) and the Krupa, Majevica and Prusac/Vesela cells (corps capped by this gate) were matches bought by defects. The head's matches in those areas rest on known defects too:
- Krupa: the Ripac casualty scale;
- Ozren: VRS2;
- the western cells: the t186-188 knife-edge;
- Vesela: inertia.

**Follow-ups:** VRS2 (paired with RF-1); SE7E covering both gaps and the empty VRS sectors; the Ripac casualty scale (1.0 blocker candidate for the bot-attack path); the Mistral recon-probe stall; the Prusac reference conflict; woken ops that end with 0 attacks; a design review of `failure_count` never decaying.
