# Source notes for the last four historical defaults

Four events marked a historical default but showed the player no source line, because their authored citations are developer text the player-copy filter hides. Each now carries a player-facing `localizations.<locale>.source_note` in English and BCS, same format as `us_halts_federation_advance_1995` (#655). The historian seat checked every citation against the ICTY judgments and the Balkan Battlegrounds pages before the text was written (2026-11-15); the notes use the corrected figures, not the developer text's.

## What the historian check changed

| Event | Developer citation | Shipped note |
| --- | --- | --- |
| `rbih_late_war_offensive_1995` | BB "Vol. II Ch. 15-16" | BB Vol. I, ch. 91-93 (pp. 379-391): Operation Sana is in Vol. I; the offensive is described "from the Bihać area" (the siege had already been broken in August) |
| `hrhb_1992_graz_cooperation_collapse` | Prlić Vol. 1 "§§490-525" | Prlić Vol. 1, para. 439 (the Graz meeting of 6 May 1992, a joint statement, no signed agreement); Kordić and Čerkez for the HVO takeover of municipal authority in 1992. The developer text's tie of Prozor, Novi Travnik and Vitez frictions to Prlić is not supported and is not repeated |
| `gornji_vakuf_clashes_1993` | Prlić Vol. 2 "§§221-310", BB "pp. 448, 452" | Bare judgment citation: Prlić Trial Judgment, Vol. 2, paras 336-355 (Gornji Vakuf Municipality, January 1993). BB pp. 448 and 452 are the Bugojno and Konjic-Jablanica annexes and do not support the dated claims, so they are dropped. No characterisation, no "ultimatum" |
| `csq_patron_recovery_offer` | "the historical acceptance path under Milošević pressure in 1995" | Says plainly it is a game construct that condenses 1994-95 pressure on the Pale leadership, with the 4 August 1994 blockade (BB Vol. I chronology, p. 23) and the 29 August 1995 agreement on a joint delegation led by Milošević (ICTY Karadžić, IT-95-5/18-T, para. 424). The "Patriarch Paper" name and the 30 August date from the developer text are not used |

Because a localization block that carries its own `source_note` is also the provenance for the claims beside it, the three blocks that hold other player copy (`gornji_vakuf_clashes_1993` en and bcs, `rbih_late_war_offensive_1995` en) also carry the event's `source_tier` and the same citation. The sensitive-claim inventory reports every event claim documented (2,364 of 2,364).

## Rendered proof (real desktop app, 1280x720, event queued as a pending decision for its faction)

- `csq_1280x720_desk.webp`: Patron Recovery Offer, RS. The note reads "Not a documented offer: a game construct ...".
- `gornji_1280x720_modal.webp`: Gornji Vakuf, HRHB. Prlić, Vol. 2, paras 336-355.
- `graz_1280x720_modal.webp`: Graz, HRHB. Prlić, Vol. 1, para. 439, and Kordić and Čerkez.
- `late_1280x720_modal.webp`: the Final Offensive, RBiH. BB Vol. I, ch. 91-93, and Holbrooke.

BCS is pinned by `tests/ui/event_historical_default_source_line.test.ts`, which resolves every note in both locales.
