# January 1993 Cerska–Srebrenica Link Design

**Status:** owner-approved  
**Scope:** engine correctness plus one ordinary RBiH operation; January 1993 proof only

## Outcome

RBiH holds Cerska, Pobuđe, Ježestica, and Sebiočina at the January 1993 checkpoint. Ježestica does not change hands repeatedly. Its summer-1992 acquisition is represented by an ordinary `CorpsOperation`; the later VRS spring offensive is a separate future task.

## Engine repairs first

1. A critical brigade may be ordered from a salient to a supplied same-corps line, but the stranded lifecycle must not directly rewrite `location_osid`. It emits a normal column-movement order, leaving packing, transit, arrival, and entrenchment reset to the canonical movement owner (Systems Manual §6.2.1; Engine Invariants §§14.5, 14.9).
2. A brigade named in a queued historical operation remains reserved while that operation waits for its authored formation roster. Generic stranded withdrawal must not remove a named participant from the operation's local assembly area.
3. A later mandatory historical brigade that otherwise passes control and formation-capacity eligibility must reach the existing mandatory force-seeding path even when its municipality pool is below the authored initial personnel. Elective formations remain pool-gated (Systems Manual §13; Engine Invariants §§14.10–14.10a).

## Historical operation

Add one deferred RBiH 2nd Corps operation using the local Cerska/Kamenica formations. It has a connected, battle-resolved axis ending at Ježestica and Sebiočina. It changes no controller directly and creates no independent brigade attack authority (War Specification §2; Engine Invariants §§9.6, 14.1, 14.11).

## Rejected alternatives

- Initial-control overrides or scripted controller changes: they bypass combat causality.
- Repeated Ježestica hand changes: rejected by the owner as needless choreography for this checkpoint.
- Treating the Cerska brigade as a permanent Srebrenica-enclave unit: that would overprotect it through the later 1993 VRS offensive.
- A full 188-week validation now: expressly unauthorized; this change is proved on the canonical April 1992 trajectory truncated at week 39.

## Proof and falsification

Each engine repair receives a red/green unit test. Behavioral changes are then run sequentially to week 39 on `apr1992_definitive_188w.json`. The design is falsified if the operation does not causally capture both objectives, if Cerska/Pobuđe lose control by January, if any named brigade teleports instead of entering movement state, or if the change creates a new cut-off brigade or breaks the 9/9 enclave guard.
