## 2026-11-16 — Pass 22: #696 (F7b) and #698 (address copy) recorded

Docs only; no `src/` or `data/` change, no hash change.

- #696, F7b: the Army HQ plan's unread `army_stance` and `aggression_modifier` and the three theater statuses that fed only them are retired, with the reserves-off supply bug. Control-identical (0 cells differ at w39, w104, w156 and w188; all 251 control events identical; scores unchanged at 709/709/708/681). The headless `final_state_hash` is now 70f4dc05bf375bc7, state only (the six retired fields), from 799e43a7ee2f4764; recorded as the main hash at #696, not the freeze hash. Work list row C1b added.
- #698: the `address_to_nation_rbih` closing line is year-neutral ("a people who have lived under siege this long"), so the BC06 copy condition of the final-behaviour record is met. String only; the headless hash stays 799e43a7ee2f4764 at that commit.
- Still open on GitHub at this pass: #697 (B0, the peace-plan floor) and #700 (B4, the autonomous launch retired).
