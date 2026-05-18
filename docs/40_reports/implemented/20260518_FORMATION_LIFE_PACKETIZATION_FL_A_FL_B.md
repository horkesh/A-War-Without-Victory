# Formation-Life Packetization FL-A / FL-B

**Date:** 2026-05-18  
**Scope:** Batch 6 FL-A and FL-B only  
**Type:** Diagnostic packetization; no simulation behavior change

## Summary

Batch 6 adds packet-level diagnostic output to `tools/diagnostics/formation_life_packet_inventory.cjs` without moving formations, changing combat, changing sector ownership, changing scenario data, or touching sensitive successor/OOB lanes.

The tool still emits the original zero-battle owner buckets, and now also emits:

- `packet_summaries.fl_a_sector_front_inertness`
- `packet_summaries.fl_b_far_from_home_owner_truth`

## FL-A Outcome

FL-A now isolates pure `sector_front` active-never-fights rows from loan and active-operation participants. It records whether each row has local enemy contact at its current sector-front OSID and whether the owning sector has legal corps authority.

Latest complete integrated 40w baseline used for packet proof:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1880`
- Final hash: `42607f83870e01d5`
- Inventory counts: `loan=1`, `operation_participant=4`, `sector_front=67`, `sector_reserve=4`, `sector_rear=11`, `sector_owned=0`, `doctrine=24`
- FL-A packet: `front_contact_legal_authority=67`, `front_without_local_contact=0`, `no_legal_corps_authority=0`

Result: FL-A exposes a real commander/doctrine question, not a false-owner bug. All 67 sector-front inert rows have local enemy contact and legal corps authority, so this packet does not safely justify a runtime movement/ownership fix by itself. A future behavior packet must trace stance, launch policy, target scoring, and quiet-front doctrine before changing combat or operation birth.

## FL-B Outcome

FL-B now reports far-from-home rows from live owner truth using `military.home_distance_cache` and current assignment/loan/operation/recall state.

Latest complete integrated 40w baseline:

- FL-B packet: `redeployed=9`, `loan=0`, `operation=0`, `home_recall=0`, `unassigned=1`

Result: 9 far-from-home rows have live sector ownership and should not be labeled as owner bugs. One row remains ownerless (`arbih_120th_liberation_black_swans` in the n1880 packet summary), so FL-B keeps the unresolved case visible instead of suppressing it. No broad redeployment-limit change was made because the packet does not prove a safe common runtime owner.

## Gated Scope

- FL-C and FL-E remain report-only/design-gated.
- Doctrine-only cases, same-faction unreachable remnants, and successor/OOB-sensitive lanes remain gated.
- HRHB/HVO offensive emergence is FL-D and was not touched.
- Presidential UI validation, performance optimization, cinematic verdict UI, and notification content files were not edited.

## Determinism

Determinism impact is read-only. The diagnostic consumes existing final-save state, iterates object keys through `strictCompare`, emits sorted row lists, and introduces no timestamps, randomness, filesystem traversal, or simulation mutation.

## Verification

- Red tests first: `npx.cmd vitest run tests\formation_life_sector_front_inertness.test.ts tests\formation_life_far_from_home_truth.test.ts` failed because `packet_summaries` did not exist.
- Green focused: `npx.cmd vitest run tests\formation_life_sector_front_inertness.test.ts tests\formation_life_far_from_home_truth.test.ts tests\formation_life_packet_inventory.test.ts` passed 3/3 files, 3/3 tests.
- Packet baseline command against n1880 emitted schema version 2 and the FL-A/FL-B counts above.
- `npm.cmd run typecheck` was attempted but blocked by unrelated dirty UI work in `tests/ui/records_button_behavior.test.ts` (`TurnAftermathView` fixture missing `playerFaction`). That file is outside this packet's ownership and was not touched.

No 40w rerun was required because this packet is diagnostic/report-only and does not change simulation behavior or output state.
