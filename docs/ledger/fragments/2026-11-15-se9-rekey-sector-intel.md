## 2026-11-15 — SE9: sector intel re-keyed to this turn's sector ids right after the partition (slot 4; measurement pending)

- **Defect.**
  - `partition-corps-front-sectors` re-mints every positional sector id early in the turn.
  - `derive-sector-intel` re-keys `sector_intel` only at the end of the turn.
  - Every read in between looked up this turn's ids in last turn's map. That covers the commander briefing (`collectIntelData`, feeding belief and decide), `attack_intel_context`, and the `bot_corps_directives` probe/launch confidence gate (`getSectorIntelConfidence` and the pair getters). Each read another sector's intel.
  - Measured on main `16fc0a62f` by stable key: in t2-26, 1,097 of 2,479 reads (44%) found the sector's own intel filed under another id; in t182-188, 58 of 348 (17%).
- **Fix.** A new war-phase step, `rekey-sector-intel`, runs directly after the partition (`rekeySectorIntelToCurrentSectors`, `src/sim/combat/sector_intel.ts`).
  - It moves each record to its sector's new id on both sides, matching on the stable keys the records already carry (the same match `deriveSectorIntel` makes).
  - No confidence, age or contact count changes. A record whose enemy sector no longer exists is dropped, and the end-of-turn derivation drops it as well. Legacy records with no stable keys keep the positional lookup.
  - The end-of-turn derivation produces the same map either way; only mid-turn readers change.
- **Tests.**
  - New `tests/sector_intel_rekey.test.ts`: a renumbered pair is moved on both sides; the end-of-turn derive is identical with or without the re-key; a vanished enemy is dropped; legacy records stay positional; no-op when nothing was renumbered.
  - `tests/war_phase_step_order.test.ts`: step count 197 → 198, plus ordering asserts (after the partition; before corps orders, attack resolution and the derive).
  - `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` gets a note on the new step.
- **Measurement.** One 188-week run when the orchestrator sends "slot 4 go", on an accept-if-guards-hold basis: strict health, enclave 9/9, Farz P1/P-A/P-B, cascade, consistency and determinism. Then the per-cell delta, a re-bless and the Pyrrhic gate. If a guard breaks, it is fixed properly before the engine freeze. Owner directive, 2026-11-15: no engine changes after 1.0, so it cannot be deferred.
