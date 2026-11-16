## 2026-11-16 — Pass 36: #701 (B1) recorded; where the citation package's §6 record row lives

Docs only; no `src/` or `data/` change, no hash change.

- #701, B1: an overstaying army commander's competence now decays linearly as documented (it was quadratic: 12 turns cost 0.325 instead of 0.05). Inert in headless (no army commander overstays in the historical or emergent 188-week runs); the PR measured 70f4dc05bf375bc7 against its base d10892602. Not re-measured on top of #718; main is expected to stay df791f73c26ed642. #721 (PK5) is added to the roadmap merged list.
- Pointer, per the orchestrator: the citation-audit content package's §6 record row is in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` ("Record (Citation-audit content package, 2026-11-16)", added by #718 beside the RB1 row). It records unanimous §6 verdicts for 47 strings (11 rewrites, 34 changes, 2 unchanged); the verdicts file is `_logs/s6_content_package_citation_audit_20261115_verdicts.md` in the worktrees folder; the UI lane applies them. Work list Part 7.
