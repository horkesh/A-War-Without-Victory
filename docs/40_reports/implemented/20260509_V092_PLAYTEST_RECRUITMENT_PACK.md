# v0.9.2 External Playtesting Recruitment Pack

**Lane:** `LANE-NIGHTSHIFT-V092-PLAYTEST-RECRUITMENT-PACK`
**Date:** 2026-05-09
**Type:** Recruitment-materials pack for user to deploy. The lane CANNOT execute recruitment itself (operator-driven outreach work); it produces the deployable assets.

## What this pack contains

1. Target-audience profiles + recommended channels per profile
2. Recruitment message templates (short + long form)
3. Playtester ask: scope, time commitment, deliverables they produce for us
4. Feedback collection mechanism design
5. Timeline + cadence recommendations
6. Logistics checklist for the user before deployment

## 1. Target-audience profiles

**Profile A — Strategy / wargame enthusiasts**
- Identity: people who play HOI4, EU4, Imperator: Rome, Unity of Command, Decisive Campaigns, etc.
- What hooks them: deterministic sim depth, novel strategic constraints (negative-sum exhaustion model), AAR culture
- Why we want them: they'll find balance + AI behavior issues that pure history readers miss
- Channels:
  - **r/wargame** (reddit, ~250k members, niche but engaged)
  - **r/grandstrategy** (~85k, broader appeal)
  - **r/paradoxplaza** (~700k, but rules around self-promo are strict — read sticky before posting)
  - **Wargamer.com forums** (older crowd, deep engagement)
  - **Steam Workshop adjacent communities** for deterministic sims
  - Discord servers: "GrandStrategyMaster", "Paradox Strategy", "Wargame Discord" — request linked invites from members already in them

**Profile B — Bosnian War / Yugoslav-era historians + academics**
- Identity: scholars, war crimes researchers, ICTY-judgment readers, BiH diaspora with historical interest
- What hooks them: ICTY-grade citation rigor in essays + canon, historical fidelity, the "Pyrrhic" thesis on war outcomes
- Why we want them: they'll catch historical inaccuracies + endorse / critique the model's representational ethics
- Channels:
  - **H-Net (H-Diplo, H-War, H-Soyuz lists)** — academic mailing lists
  - **Twitter/X war-history scholar accounts** (search for "Bosnian War", "ICTY", "Tribunal")
  - **University programs** in war studies / genocide studies / Balkan studies — direct email to professors with ICTY publication history
  - **/r/WarCollege** + **/r/AcademicHistory**
  - Specific institutions: Center for Balkan and Black Sea Studies (Vienna), International Institute for Genocide Studies, Holocaust Museum's Balkan archives staff
  - **Sarajevo / Belgrade / Zagreb** academic circles — diaspora connections may help

**Profile C — Deterministic-sim / engine enthusiasts**
- Identity: programmers, simulation-design hobbyists, OSS contributors interested in determinism + reproducibility
- What hooks them: byte-identical replay, FORAWWV canon, the engineering rigor (G1/G2/G3 gates, calibration framework)
- Why we want them: they'll exercise the harness, find edge cases, potentially become contributors
- Channels:
  - **Hacker News** (a thoughtful Show HN post when the build is more polished)
  - **/r/programming** + **/r/gamedev** (latter is more receptive to game-specific posts)
  - **Lobste.rs** (high-quality programming discussion)
  - GitHub trending if/when the repo goes public
  - Twitter/X programming-Twitter

**Profile D — Niche communities with overlapping interests**
- Identity: BiH diaspora communities (often history-aware), military-history podcasters, war-correspondent-historians
- What hooks them: intersection of personal/community history + the simulation as a meaning-making artifact
- Channels:
  - BiH diaspora Facebook groups + Discord servers
  - Podcasts: "The Rest is History", "We Have Ways", "World War 2 Pod", war-history-specific shows — pitch as a guest segment
  - YouTube war-history channels (Drachinifel, Operations Room) — pitch as a dev-diary collaboration

## 2. Recruitment message templates

### Short form (forum / subreddit post)

> **A War Without Victory** — early playtest signups open
>
> AWWV is a deterministic strategic-level simulation of the 1992-1995 Bosnian War. Negative-sum wargame: exhaustion, political collapse, constrained agency — not conquest. Three factions (RBiH / RS / HRHB), 712 OSIDs, 188-week campaign horizon, 121 condition-gated divergence events, ICTY-cited essay corpus, fully byte-deterministic replay.
>
> Looking for **15-25 playtesters** willing to:
> - Run a 40w or 188w campaign (~1-3 hours per scenario)
> - Submit a structured AAR via [feedback form link]
> - Comment on calibration realism, AI commander behavior, and event triggers
>
> Build available at [GitHub release link / itch.io / Discord]. No NDA — feedback can be public. Discord channel: [link] for builds + discussion.
>
> Specifically welcome: strategy-gamers, BiH-war historians, deterministic-sim enthusiasts.

### Long form (academic / direct-email outreach)

> Subject: AWWV — Bosnian War simulation seeking historian-playtesters for v0.9.2 release
>
> Dear [Professor / Researcher / Diaspora-Scholar],
>
> I'm writing to invite you to playtest **A War Without Victory** (AWWV), a deterministic strategic-level simulation of the 1992-1995 Bosnian War currently in v0.9 release-candidate stage.
>
> AWWV models the war as a negative-sum game: the design thesis is that no faction "wins" in any meaningful sense — exhaustion, political collapse, and constrained agency dominate, with conquest emerging only as a degenerate outcome. The simulation includes a 96-essay Codex corpus (~500 words each, ICTY-judgment-cited, 5-round QA-certified), 121 condition-gated divergence events covering documented historical pressure points (Markale, Srebrenica, Operation Storm, the Drina cleansing), and a faction-symmetric mechanism layer with faction-asymmetric data fidelity to OOB and ICTY-evidentiary records.
>
> What I'd value from a playtest commitment:
> - Run one 40-week scenario (~1 hour)
> - Submit a structured AAR via [feedback form link]
> - Specifically: identify any historical claim, attribution, or representational choice that strikes you as inaccurate, ahistorical, or ethically uncomfortable
>
> The simulation does NOT depict atrocity gameplay. The §6 "sensitive history" design gate explicitly forbids genocide-as-mechanic, body-count optimization, and condemnation as a negotiable variable. Your read on whether this gate holds in practice would be valuable.
>
> Build at [link]; Discord at [link]; documentation at [link]. No NDA; public commentary welcome. The codebase is [open / private] at [github link if applicable].
>
> Yours,
> [User's name]

### Discord / Twitter short pitch (140-280 char)

> Playtesting **A War Without Victory** — deterministic Bosnian War (1992-95) sim. Negative-sum wargame: exhaustion + political collapse, not conquest. ICTY-cited Codex, byte-identical replay. Looking for 15-25 testers. Build + signups: [link]

## 3. Playtester ask

**Time commitment:** 1-3 hours per scenario; 1 scenario minimum, 3 scenarios for "full bench" status.

**Scenario menu:**
- **40w default historical** (~1 hour wallclock; 40 in-game weeks Apr 1992 → Jan 1993)
- **188w full campaign** (~2-3 hours; full April 1992 → November 1995 horizon)
- **Probe scenarios** — Drina valley, Sarajevo siege, Operation Storm — narrower; ~30 min each

**What we ask them to produce:**
1. **Structured AAR** via feedback form: per-faction outcome + 3 surprising events + 3 implausible events + open-text "what felt wrong"
2. **Calibration calls:** identify any anchor (territorial control point) that feels historically wrong
3. **AI commander behavior:** flag corps-CO decisions that defied military logic
4. **Bug reports:** actual crashes, freezes, save-load issues — via GitHub issues if preferred
5. **Optional: persona-roleplay observation** — if they enable Claude personas, flag any LLM commentary that feels off-base for the historical figure

## 4. Feedback collection mechanism

**Recommended infrastructure:**
- **Google Form OR Tally Form** for structured AAR (faster than building a dedicated portal)
- **GitHub Issues** for bug reports (already exists)
- **Discord channel** `#playtest-feedback` for casual / quick observations
- **GitHub Discussions** for deeper analytical threads

**Form structure (suggested 12-15 questions):**
1. Demographic: identify as strategy-gamer / historian / sim-enthusiast / other
2. Time spent on this playtest run
3. Scenario played (40w / 188w / probe)
4. Most surprising event and why
5. Most implausible event and why
6. Per-faction outcome assessment (RBiH / RS / HRHB)
7. AI commander best decision observed
8. AI commander worst decision observed
9. Specific anchor that felt historically wrong (free text + OSID if known)
10. Persona enabled? If yes, most insightful Claude observation
11. Crashes / freezes / save-load issues (free text)
12. Would you play again? (Y/N + why)
13. Recommend to others? (Y/N + why)
14. Open: what's missing
15. Open: what should be removed

## 5. Timeline + cadence recommendations

**Pre-launch (week before recruitment):**
- Confirm v0.9.5 platform builds are downloadable (currently DEV-HOST APPROXIMATION PASS at `268373d6`; clean-VM cosmetic items pending)
- Set up Discord server with structured channels
- Set up feedback form
- Set up GitHub Discussions

**Launch wave 1 (Profile A — strategy gamers):**
- Post short-form on r/wargame + r/grandstrategy + Wargamer.com
- Pin Discord invite
- Expected response: 30-60 signups in first 72 hours; ~20-30 actually playtest

**Launch wave 2 (Profile B — historians, ~1 week later):**
- Send long-form to 10-15 targeted professors / researchers
- Post in H-Net war-history listservs
- Expected response: 5-10 thoughtful responses; ~3-5 actually playtest with serious depth

**Launch wave 3 (Profile C — sim/engineering enthusiasts, ~2 weeks later):**
- Show HN post (only if v0.9.5 build is genuinely polish-grade)
- /r/programming submission
- Expected response: 50-200 transient interest; ~10-20 hands-on testers

**Cadence:**
- Weekly playtest digest published (anonymized AAR highlights, top-3 bugs identified, fixes shipped)
- 4-6 week initial playtest window
- Mid-window v0.9.6+ patches incorporating feedback
- End-of-window: comprehensive playtest report + gratitude wave

## 6. Logistics checklist for the user before deployment

Before posting recruitment messages:

- [ ] Discord server set up with: announcements, builds-and-issues, playtest-feedback, general-chat
- [ ] Feedback form created (Google Forms or Tally) with the 12-15 questions above
- [ ] GitHub Discussions enabled on the repo (if public)
- [ ] Build downloadable from a stable URL (GitHub releases or itch.io)
- [ ] README.md (or playtest-specific README) covers: install, first-run, save format, where-to-report-bugs
- [ ] Privacy statement: what data we collect (just AAR content, no telemetry beyond what the sim already writes)
- [ ] Code of conduct: standard "be respectful + factual" wording
- [ ] Pinned message in Discord with "If you're a playtester here for the first time, start here: [link]"
- [ ] Pre-recorded "first 5 minutes of AWWV" YouTube video (3-5 min) showing install + scenario start + advance turn + save (lowers barrier to entry)
- [ ] Decide: NDA or no-NDA. Recommendation: NO NDA; encourage public commentary; this builds the discourse-graph that helps future development

## Recommendations for v0.9.2 closure

External playtesting is structurally not v0.9.x-blocking — it's a polish + feedback step that informs v0.9.6+ refinements. **v0.9.2 should close to PARTIAL when the recruitment pack ships + the user begins outreach**, not gated on completed-playtest-cycle.

The playtest cycle itself is a v0.9.6+ → v1.0 ongoing activity (continuous feedback as builds evolve), not a milestone gate.

## Successor handoff

This pack is the agent-deliverable portion. The remaining work is operator-driven:
- User deploys recruitment messages to selected channels
- User configures Discord + form infrastructure
- User triages incoming feedback as it lands
- AWWV development cycles incorporate feedback per release notes

## Sensitive-history compliance

- Ring 1 (recruitment-materials only); no §6 surface; no engine code; no canon doc edits
- Recruitment language describes the sim's existing design ethic accurately (no atrocity-gameplay; ICTY-grade essay corpus; faction-symmetric mechanism); does not promise features that don't exist
- Long-form academic outreach explicitly invites scrutiny of the §6 sensitive-history design gate as a feature, not a defense
