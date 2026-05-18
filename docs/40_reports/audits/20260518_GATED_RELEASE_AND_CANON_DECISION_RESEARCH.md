# Gated Release And Canon Decision Research

**Date:** 2026-05-18

**Scope:** Decision research for gates that must remain unclaimed by autonomous implementation work unless the user/operator supplies approval, external evidence, or credentials.

**Status:** Adopted as planning guidance. This report does not close any operator, historian, localization, store, signing, FORAWWV, or Open Design Question gate.

---

## Executive Decisions

| Gate | Adopted Best Solution | What Claude May Do | What Remains Gated |
| --- | --- | --- | --- |
| Clean-VM proof | Keep repo smoke/build automation as preflight, then run a real Windows clean-VM protocol from a reverted VM snapshot using the exact release installer. Capture installer hash, OS build, SmartScreen screen, Settings -> Apps entry, save/load persistence, `%APPDATA%`, uninstall cleanup, and registry cleanup. Use Windows App Certification Kit when Store/MSIX packaging is involved. | Maintain scripts, templates, expected-evidence checklist, and deterministic release manifests. | Real VM execution, screenshots, OS-level installer behavior, SmartScreen behavior, and operator sign-off. |
| Code signing certificates | Prefer Microsoft Store MSIX for Windows if feasible because Store signing avoids certificate management. For direct Windows distribution, use Azure Artifact Signing / Trusted Signing if legal identity and geography are eligible; otherwise use a normal trusted OV certificate. Do not buy EV solely for SmartScreen. For macOS, use Apple Developer Program + Developer ID + notarization. | Prepare signing decision packet, CI secret placeholders as documentation only, unsigned/signed artifact checklist, and config review. | Identity validation, certificates, secrets, signed artifacts, Apple Developer account, and notarization submission. |
| SmartScreen reputation | Best UX is Microsoft Store MSIX. Direct NSIS/download builds should be signed, hosted on the official domain, and documented as reputation-building; new file hashes may still warn until reputation accumulates. | Prepare user-facing install notes, artifact hashes, signed/unsigned distinction, and release checklist. | Claiming warning-free direct downloads or accumulated reputation. |
| Store page / press kit / trailer publication | Use Steam Coming Soon as the primary game-discovery front door, Microsoft Store MSIX as the Windows trust/install path, and GOG later if DRM-free distribution becomes valuable. Store/trailer claims must map to implemented evidence only. | Draft store copy, press kit, shot list, claim-to-evidence matrix, capsule checklist, and trailer capture plan. | Steam/Microsoft/GOG account actions, page submission, pricing, release date, public publication, and final trailer/press approval. |
| Native-speaker BCS localization quality | Keep English fallback until translation is reviewed through a two-person workflow: translator plus independent reviser/LQA reviewer. Treat "BCS" as a planning label; final locale claims should be explicit, likely Bosnian Latin, Croatian, and Serbian Latin only after review. | Extract strings, maintain IDs, build pseudo-locale checks, glossary, terminology sheet, and review packet. | Native-speaker translation, independent revision, linguistic QA sign-off, and supported-language store claims. |
| Final sensitive-history prose approval | Use source-first review: historian check, narrative/tone check, then user sign-off. Required criteria: precise terms, no euphemism, no comparison of suffering, no romanticization, no reward framing for atrocity prevention, and authoritative source links. | Prepare source matrices, blocked prose packets, citations, and review checklist. | Final prose approval, historian approval, and any sensitive-history outcome/framing decision. |
| FORAWWV edits | Do not let autonomous agents edit `FORAWWV.md`. Use a manual change packet with current repo behavior, exact proposed wording, rationale, risk, and user decision. | Draft review packets and proposed wording in a separate report. | Actual manual edit or canon-authorized change. |
| Open Design Question decisions | Convert each question into a short decision record: context, options, recommendation, consequences, affected files/tests, and no-decision effect. Batch them for user review. | Prepare decision records and impact matrices. | Choosing the design option or shipping code that depends on the choice. |
| Historian approval for remaining notification rows / sensitive Codex framing | Use a three-column approval matrix: source-backed fact, proposed player-facing wording, reviewer verdict. Implementation follows only after approval. | Prefill source notes, recipient rows, blocked-row list, and tests for already-approved safe rows. | Historian/narrative verdict and final wording merge. |

---

## Source-Backed Rationale

### Windows Distribution, Signing, And SmartScreen

Microsoft's current Windows guidance is clear enough to make the release strategy decision:

- Microsoft Store MSIX is the cleanest Windows install path when feasible because Store-distributed MSIX packages are re-signed by Microsoft and avoid SmartScreen download warnings.
- For direct distribution outside the Store, Microsoft recommends Azure Artifact Signing / Trusted Signing, with identity validation and eligibility limits.
- EV certificates no longer provide the historical instant SmartScreen bypass; do not buy EV solely for that reason.
- Direct-download signed builds can still show SmartScreen prompts until reputation builds for the publisher/file hash.

**Decision:** Prioritize Microsoft Store MSIX for Windows trust/install UX. Keep signed NSIS/direct download as a secondary path if the project needs manual distribution or Steam/GOG packaging.

### Clean VM Proof

Local smoke scripts prove artifact shape, not target-machine behavior. Clean-VM proof needs a real Windows VM because the gate includes OS-integrated behavior: SmartScreen, Settings -> Apps, `%APPDATA%`, uninstall registry state, and persistence.

**Decision:** Treat repo-side packaging tests as preflight. Treat clean-VM evidence as operator-only until a fresh VM run records the required screenshots and hashes.

### Store, Press, Trailer, And Public Claims

Steam requires store presence and build checklists to be reviewed and approved before release; store page review precedes build review. Steam also restricts capsule text to artwork, title, and official subtitle on base assets. GOG's checklist requires key art, store description, system requirements, languages, screenshots, trailer, genre/tags, legal lines, age ratings, and a DRM-free release candidate.

**Decision:** Use a claim-to-evidence matrix before public page submission. Steam Coming Soon is the primary discovery target; Microsoft Store MSIX is the primary trust/install target; GOG is a later DRM-free target unless the user prioritizes it.

### Localization Quality

Game localization should be treated as linguistic QA, not string substitution. ISO 17100-style process requires independent revision by someone other than the translator. IGDA LocSIG is the relevant game-industry practice community.

**Decision:** Do not claim BCS support from extracted strings or machine/non-native translation. Keep English fallback until a qualified translator plus independent reviewer approve the locale.

### Sensitive History And Historian Approval

Guidance from genocide/Holocaust education practice maps well to AWWV's sensitive-history treatment: use precise language, avoid simple answers, avoid comparisons of pain, avoid romanticization, contextualize history, and translate statistics into people. ICTY/Srebrenica resources are appropriate primary reference material for Srebrenica-specific framing and evidence.

**Decision:** Sensitive-history prose needs historian review, narrative/tone review, and user sign-off before final merge. Claude may prepare evidence and drafts but must not approve them.

### FORAWWV And Open Design Questions

FORAWWV and Open Design Questions are governance decisions. Architecture Decision Record practice is the right model: record context, options, decision, consequences, and follow-up, then preserve the decision so it is not relitigated.

**Decision:** Claude prepares decision records and manual change packets. The user/canon owner decides.

---

## Required Evidence Templates

### Clean-VM Evidence Row

| Field | Required |
| --- | --- |
| Artifact path / URL | Yes |
| Installer SHA-256 | Yes |
| Build commit | Yes |
| Windows edition/version/build | Yes |
| VM snapshot name | Yes |
| SmartScreen screenshot/result | Yes |
| Install result | Yes |
| Settings -> Apps entry screenshot | Yes |
| First launch screenshot/result | Yes |
| Save/load persistence result | Yes |
| `%APPDATA%` path/result | Yes |
| Uninstall result | Yes |
| Registry cleanup result | Yes |
| Operator initials/date | Yes |

### Sensitive Prose Approval Row

| Field | Required |
| --- | --- |
| Event/Codex id | Yes |
| Source-backed facts | Yes |
| Proposed player-facing wording | Yes |
| Historical terms requiring precision | Yes |
| Risk notes | Yes |
| Historian verdict | Yes |
| Narrative/tone verdict | Yes |
| User final approval | Yes |

### Localization Approval Row

| Field | Required |
| --- | --- |
| Locale code | Yes |
| Translator | Yes |
| Independent reviewer | Yes |
| Glossary version | Yes |
| UI string coverage | Yes |
| In-context LQA result | Yes |
| Store-language claim approved | Yes |

---

## Primary Sources Consulted

- Microsoft Learn: [SmartScreen reputation for Windows app developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
- Microsoft Learn: [Code signing options for Windows app developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- Microsoft Learn: [Set up Azure Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart)
- Microsoft Learn: [Choose a distribution path for your Windows app](https://learn.microsoft.com/th-th/windows/apps/package-and-deploy/choose-distribution-path)
- Microsoft Learn: [How to distribute your Win32 application through Microsoft Store](https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store)
- Microsoft Learn: [Windows App Certification Kit](https://learn.microsoft.com/en-us/windows/uwp/debug-test-perf/windows-app-certification-kit)
- Apple Developer: [Developer ID](https://developer.apple.com/support/developer-id/)
- Steamworks: [Release Process](https://partner.steamgames.com/doc/store/releasing)
- Steamworks: [Graphical Asset Rules](https://partner.steamgames.com/doc/store/assets/rules)
- GOG Developer Docs: [Essentials Checklist](https://docs.gog.com/basic-game-assets/)
- IGDA: [Localization SIG](https://igda.org/sigs/localization/)
- ISO 17100 overview: [Translation quality process](https://iso17100.com/)
- USHMM: [Guidelines for Teaching About the Holocaust](https://main.ushmm.org/teach/fundamentals/guidelines-for-teaching-the-holocaust)
- ICTY: [The Tribunal Remembers: The Srebrenica Genocide resource announcement](https://www.icty.org/en/press/tribunal-launches-website-and-video-commemorating-srebrenica-genocide)
- Microsoft Azure Well-Architected: [Maintain an architecture decision record](https://learn.microsoft.com/en-ie/azure/well-architected/architect-role/architecture-decision-record)
