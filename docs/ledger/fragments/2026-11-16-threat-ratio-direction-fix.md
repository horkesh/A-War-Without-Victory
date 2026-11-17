## 2026-11-16 — threat_ratio direction corrected (comment and canon wording only; Codex r4588239176)

Comment and canon wording only; no behaviour change, no hash change.

- #745 described the sector pressure index `threat_ratio` as falling with own cohesion. It rises: `brigadePower` multiplies personnel by cohesion (`local_front_defense.ts:43-48`), `defensive_power` is own cohesion-weighted personnel per front edge, and `recomputeSectorPowerAndThreat` divides enemy personnel by it (`brigade_assignment.ts:2561`), so lower own cohesion or fewer own men raises the index, as does a longer sector. Codex flagged the inversion on #745 (comment r4588239176); #745 merged before the fix reached it.
- Corrected, on the orchestrator's explicit instruction of 2026-11-16: the `CorpsFrontSector.threat_ratio` field comment in `src/state/game_state.ts` (comment only) and the Systems Manual Corps Sectors paragraph, with a one-line Amended note.
- Proof: the `src/` diff is comment lines only; no executable line changes, so the 188-week hash is unchanged (the pin stays 03159b9ee1e5877f).
