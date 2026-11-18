## 2026-11-17 — Pass 59: #757 recorded and its two doc fixes made; the Codex sweep now covers every open PR

Docs only; no `src/` or `data/` change, no hash change.

- #757: the army standing order no longer overrides corps stances or hides stance matters from the President (hash-neutral; Systems Manual §6.4 amended in the PR; historical 0b86d3d7 = the pin, hands-off emergent 84595a73, no re-pin). It clears the chapters' pre-freeze item "retire the army-stance override" (consult 5 ruling 3, Batch B).
- Doc fixes that waited on #757: `docs/30_planning/design/BOT_AI_DESIGN_SPEC.md` (the "Doctrine override" line, which described an adaptive army stance replacing `FACTION_DOCTRINE_PHASES`; that part was retired in F7b, #696, and the army order stopped overriding corps in #757) and `docs/20_engineering/GUI_DESIGN_BLUEPRINT.md` section 11.2 (the army-stance options "all corps forced ..." and the confirmation dialog "will override all corps stances"): both now say the army order is the General Staff's proposal and display value only.
- Codex duty, widened by the orchestrator: every pass covers every OPEN PR, whatever its age, plus the PRs merged since the last pass, with the resolved state of each Codex thread. Tracker: C:/Pyrrhic/AWWV-coordination/codex_review_comments.md.
