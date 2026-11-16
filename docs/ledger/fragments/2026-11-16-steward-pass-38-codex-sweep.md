## 2026-11-16 — Pass 38: the Codex review backlog sweep (standing duty), finding G1, #701 measured

Docs only; no `src/` or `data/` change, no hash change.

- New standing steward duty (owner, 2026-11-16, via the orchestrator): inventory every comment by the Codex review bot (`chatgpt-codex-connector[bot]`) on open PRs and on PRs merged in the last 7 days, classify, route the open ones to the orchestrator, and track to closure in `C:/Pyrrhic/AWWV-coordination/codex_review_comments.md`. First sweep: the last 70 PRs (#657 to #726): 65 with no findings, 1 (#690) a completed review without findings data, 4 with findings (#706, #693, #682, #670; 6 inline comments): 3 fixed in their merge commits (#682 twice, #670), 3 open (two harness comments on #706, one on #693).
- The #693 comment is a real finding with a record consequence: `computeAddressNationAvailability` never checks the event's `turn_min`, so a human President can address the nation from turn 0 (four uses) while a bot fires it from turn 84. Registered as work list G1; the BC06 record's reason is corrected to say "about three uses for a bot". The Rulebook's wording of the recurring address (about three uses) is not edited without an instruction.
- #701 (B1): main stays df791f73c26ed642, measured (the Batch B lane re-proved it on main 0d62cdcf0, which includes #718).
