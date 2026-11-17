## 2026-11-17 — §6 E1: each event effect applies once; war-crimes entries show no count and need a final judicial finding

**Why.** `collectEffects` applies an event's required `effect` AND every `effects[]` entry. 27 automatic cards repeated `effect` as `effects[0]`, so the engine applied twice what the card and the UI showed once. Among them: Kravica and Cerska morale, UN 808/819/820/836, the NFZ, ICTY and NATO patron pressure, and the war-crimes counters at Sovići-Doljani, Trusina, the HVO camps, Grabovica/Uždol and Stupni Do. The card itself never listed a mechanical `effect` beside `effects[]`, so 48 figures the engine already applied were hidden from the player, among them the Ahmići war-crimes entry (W5).

**Rulings.**
- Engine fix: six independent seats (engine/systems, canon-compliance, determinism, historian, scenario-tester/calibration, red-team), **unanimous GO**.
- Display and counter rule: historian, narrative designer, canon, red-team and game designer; two rounds; **unanimous GO**.
- Record: SHDG §6 "Record (§6 E1 …, 2026-11-17)". Ring 3 #9 is amended.

**Change.**
- Data: the 27 duplicates are deleted. The loader rejects a repeat (`validateNoRepeatedEffect`: catalog level, `stableStringify`, violations sorted, rows and response options).
- Card display: `eventDefinitionDisplayEffects` (DataLoader) lists a mechanical `effect` next to `effects[]`. That adds 48 shown figures and removes none; narrative prose is unchanged.
- A war-crimes entry shows no number. One line per side names its forces: "Entered in the war-crimes record against RBiH / RS / Herzeg-Bosnia forces" / "Upisano u evidenciju ratnih zločina protiv snaga …". It appears only when the delta is > 0 (`warCrimesRecordLine.ts`). "Humanitarian impact +N" is retired from the card, the acknowledgement list and the decision modal.
- Counter rule (§10.2): six cards with no final finding that a war crime occurred lose their delta:
  - barracks Tuzla (RBiH 2)
  - barracks Sarajevo (RBiH 1)
  - Kravica (RBiH 1)
  - Turajlić (RS 1)
  - Srebrenica shelling 1993 (RS 1)
  - Stari Most (HRHB 1)
- The Kravica card now states Orić's trial conviction (2006) and his acquittal on appeal (2008), and that no court convicted anyone for Kravica.
- Canon: SHDG Ring 3 #9 (depiction, not the counter) and the §6 record; Systems Manual §7.10; EVENT_SYSTEM_AUTHORING_GUIDE §2.2 and §4.
- Tests:
  - `tests/event_loader.test.ts`: key order, option level, sorted violations, clean shipped catalog.
  - `tests/ui/event_definition_display_effects.test.ts`: the display rule, no digits, no false zero, unadjudicated cards carry no delta.
  - 423 test files across the event and UI slices pass; tsc is clean.

**Measured.** Pending the re-measure after #729 and Farz guard (b). Before the counter rule, the engine fix alone gave the following (188w):
- Checkpoints 709/709/708/682 on both historical and emergent.
- Fired events 180 → 180.
- war_crimes_events at w188: RBiH 15 → 12, HRHB 22 → 16.
- Farz P-A breached on identical territory: the Farz AAR lost its Army HQ marker, the launch-path knife-edge that #729 and guard (b) address.

**Held for the card batch (item 4), with reasons recorded.** Perpetrator-side gains that remain on the six cards (Kravica RBiH morale +3, the barracks grants, Turajlić RS morale +2), and the `patron_pressure` sign (it raises the target's patron support).
