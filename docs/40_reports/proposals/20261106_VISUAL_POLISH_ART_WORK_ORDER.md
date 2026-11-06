# Visual polish art work order — Codex creates, Claude approves (2026-11-06)

**Source:** owner answers D1, D2 and D7 in [20261105_VISUAL_POLISH_PHASE_F_ASSET_QA_PACKET.md](20261105_VISUAL_POLISH_PHASE_F_ASSET_QA_PACKET.md) §8.
**Roles (owner direction, 2026-11-06):** Codex generates and commits the images; Claude reviews each one against the acceptance rules below and approves or sends it back; the owner is informed through the ledger and may overrule either. All coordination goes through `F:/AWWV-coordination/CODEX_CLAUDE_HANDOFF.md`.
**Standing rules:** documentary realism (desaturated, film grain, no sepia, no oil-paint), no readable text unless a prompt names the exact string, no people or faces, no insignia unless already in the plate, no §6 subject. These files are not §6-gated. No code change is needed for any of them: every resolver picks the file up by name.

## 1. Delivery protocol

1. Codex works on its own branch (`codex/visual-polish-art-drops` or similar) in its own worktree, commits **only** the image files listed here (plus nothing else), and opens one PR to `main` per batch. A batch may be any subset; D1 alone is a fine first batch.
2. For each PR, Codex appends a `CX-` entry to the handoff file: PR number, the files delivered, the generator used, and any deviation from the prompt or acceptance rule, stated plainly.
3. Claude reviews each file at native scale against §4, runs the checks in §5, and appends a `CL-` entry per PR: **APPROVED** per file, or **REVISE** per file with the specific defect and what would pass. Claude merges an approved PR; a PR with any REVISE waits for the next commit on the same branch.
4. Three rounds on one file without approval escalates to the owner through the ledger; neither side ships it.
5. When all files are approved, Claude records closure in the plan's §11 and the ledger. Until then the plan stays open on D1, D2 and D7.

## 2. Files, in priority order

| Priority | File (repo path) | Decision | Kind |
|---|---|---|---|
| 1 | `src/ui/map/assets/tutorial/tutorial_02_map.webp` | D1 | regenerate |
| 2 | `src/ui/warroom/assets/hq_rbih_1991.webp` … `hq_rbih_1995.webp` (5) | D2 | in-paint, newspaper only |
| 3 | `src/ui/map/assets/tutorial/tutorial_01_welcome.webp`, `_03_brief`, `_04_inspect`, `_05_decide`, `_06_execute`, `_07_report`, `_08_judge` (7) | D7 | regenerate at 1200×800 |
| 4 | `src/ui/map/assets/plans/plan_vance_owen.webp`, `plan_owen_stoltenberg.webp`, `plan_contact_group.webp`, `plan_dayton.webp` (4) | D7 | regenerate at 1200×800 |

Priority 3 and 4 are "re-export opportunistically" in the owner's words: do them after 1 and 2, and only the ones the generator renders convincingly; a slide that comes out worse than the current 600×400 is a REVISE, not an upgrade.

## 3. Prompts (standalone; one per file)

### 3.1 D1 — `tutorial_02_map.webp`

```text
Generate a 1200 x 800 px photograph-style image. Scene: a 1:200,000 topographic map of central Bosnia spread flat on a dark wooden staff desk, viewed from above at a slight angle, with a second map sheet overlapping at the right edge. A front line drawn in red grease pencil runs across both sheets; two or three blue pencil arrows and three small square paper counters rest on the map. Contour shading in pale green and tan, blue rivers and thin black road lines are visible, but all map lettering is out of focus or too small to read, and the paper margins are clean white with nothing written on them. A desk lamp lights the map from the upper left; the rest of the desk falls into shadow. Style: documentary realism, early 1990s Balkan military office, muted olive, ochre and slate tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no modern electronics. Negative: readable text, place names, map legend, grid numbers, handwriting, scrawl, pseudo-text, dense annotation, margin notes, symbols, watermark, logo, signature, people, hands, screens, bright saturated colours, fantasy map.
```

### 3.2 D2 — the RBiH desk newspaper, five plates

Input: upload the existing plate (`src/ui/warroom/assets/hq_rbih_<year>.webp`, 2752×1536). Mask: the folded newspaper on the left front of the desk and nothing above the desk edge. Output overwrites the same file at the same size. Same prompt for all five years:

```text
Edit the uploaded image in place at its original size of 2752 x 1536 px, WebP output, same filename. Change only the folded newspaper lying on the left front of the desk. Everything else in the room stays pixel-identical: desk, green banker's lamp, leather chair, blue-and-white flag on its pole, empty corkboard, whiteboard, coat stand with jacket, folders, radio, telephone, walls, floor and lighting. The newspaper becomes a folded Sarajevo daily whose masthead reads exactly the one word "Oslobođenje" in a heavy black serif typeface, including the letter đ, printed across the top of the front page. Below the masthead the headline and columns are soft, out of focus and unreadable. Keep the newspaper's existing position, fold, angle, shadow and paper tone, and keep the paper looking as aged or as fresh as the rest of the room already is. Negative: readable headline, readable columns, second masthead, pseudo-text, moved objects, changed desk layout, altered lighting, new props, colour shift, logo, watermark.
```

### 3.3 D7 — tutorial deck (seven files, 1200×800)

`tutorial_01_welcome.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a large paper wall map of Bosnia and Herzegovina pinned to a cracked plaster wall above a cluttered wooden desk; a single articulated desk lamp on the desk throws a pool of warm light up onto the map; a black field telephone, loose papers and a folder lie on the desk; the back of an office chair is in the foreground; the rest of the room is dark. Style: documentary realism, early 1990s Balkan military office, muted olive, ochre and grey tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, place names, labels, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`tutorial_03_brief.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a thick stack of manila folders tied with white string sits in the centre of a worn wooden desk with a green leather top; a green rotary telephone stands at the left; behind the desk a tall window shows a grey city out of focus; on the right wall hang a small map and a few pinned notes; soft grey daylight. Style: documentary realism, early 1990s Balkan government office, muted green, brown and grey tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, labels, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`tutorial_04_inspect.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a desk covered in overlapping topographic map sheets and typed report pages, a brass magnifying glass resting on the map, a green banker's lamp at the upper left lighting the papers, pencils, paper clips and a ruler scattered about, grey filing cabinets in shadow behind. Style: documentary realism, early 1990s Balkan military office, muted olive, ochre and slate tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, place names, numbers, labels, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`tutorial_05_decide.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: two closed grey cardboard folders lie side by side on a bare dark wooden desk under a black desk lamp; a single fountain pen rests between them; a cast-iron radiator and a tall window with thin curtains are behind; the composition is symmetrical and spare, lit from the lamp with cool daylight behind. Style: documentary realism, early 1990s Balkan government office, muted grey, brown and slate tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, labels, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`tutorial_06_execute.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a black telephone handset lies across a spread map sheet, its coiled cord running up to a green military field radio set at the top of the frame; an open ruled notebook and a pencil lie at the left; warm lamp light from above; the map's lettering is out of focus. Style: documentary realism, early 1990s Balkan command post, muted olive, ochre and grey tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, place names, labels, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`tutorial_07_report.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a desk pushed against a window in a bare observation room; a pair of black binoculars rests on the windowsill; a stack of typed tally sheets with ruled columns and a folded map lie in the foreground; through the window a flat grey winter plain with a distant column of people walking along a road; cold overcast daylight. The tally sheets read as tables but no figure is legible. Style: documentary realism, early 1990s Bosnia, muted grey, olive and brown tones, slight film grain, no sepia, no oil-paint look. No people in the foreground, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, numbers, labels, flags, insignia, logos, watermark, signature, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`tutorial_08_judge.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a bare wooden table in a gutted room with broken plaster and rubble in the background; loose ledger pages with ruled columns are spread over a folded political map; a cold cup of coffee on a saucer and an ashtray full of dead cigarettes sit at the right; flat grey daylight from a window out of frame. The ledger pages read as tables but no number is legible. Style: documentary realism, Bosnia 1995, muted grey, brown and ochre tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no insignia, no modern electronics. Negative: readable text, numbers, labels, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy, gore.
```

### 3.4 D7 — peace-plan stills (four files, 1200×800; owner-approved no-map route, the objects carry each plan's meaning)

`plan_vance_owen.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a long conference table under grey window light, scattered with many thin folders, loose map sheets, wooden rulers, coloured pencils and a mosaic of overlapping papers, suggesting a territory being carved into many provinces; a few paper tabs in different colours; no single document dominates. Style: documentary realism, 1993 international conference room, muted grey, beige and brown tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no flags, no insignia. Negative: readable text, labels, numbers, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`plan_owen_stoltenberg.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a round polished negotiating table in a dim hotel conference room, exactly three closed folders set at three places around it, three water glasses, a beige push-button telephone, a few loose pages, heavy curtains half drawn, suggesting three parties and a division into three parts. Style: documentary realism, 1993 European hotel conference room, muted brown, grey and amber tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no flags, no insignia. Negative: readable text, labels, numbers, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`plan_contact_group.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: a conference table with a long wooden ruler laid across it, dividing two stacks of folders and map sheets of nearly equal size, a few coloured paper tabs, a pencil and a pair of reading glasses, grey daylight from a window at the left; the division reads as roughly half and half. Style: documentary realism, 1994 diplomatic office, muted grey, beige and olive tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no flags, no insignia. Negative: readable text, labels, numbers, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

`plan_dayton.webp`
```text
Generate a 1200 x 800 px photograph-style image. Scene: an empty conference table in a plain institutional room on a military air base, a row of high-backed black chairs along the far side, a closed leather folder and a thin gooseneck microphone at each place, water glasses, a pinboard of papers on the pale wall behind, flat fluorescent light from the ceiling. Style: documentary realism, November 1995 American air-base conference room, muted grey, beige and black tones, slight film grain, no sepia, no oil-paint look. No people, no hands, no readable text, no flags, no insignia, no signatures. Negative: readable text, labels, numbers, flags, insignia, logos, watermark, signature, people, faces, hands, computer, screen, bright saturated colours, clean stock photo, fantasy.
```

## 4. Acceptance rules (what Claude checks on every file)

- **A1 Size and format.** WebP; D1/D7 exactly 1200×800; D2 exactly 2752×1536. Quality 85–92, no alpha.
- **A2 No pseudo-text.** At native scale, nothing on the plate reads as script, characters or numbers, except the one word the D2 prompt names. "Reads as a table" is fine; "reads as words" is not.
- **A3 Style.** Documentary photograph register: desaturated, grainy, muted. No sepia wash, no painterly brushwork, no HDR glow, no stock-photo gloss.
- **A4 Content.** No people (D7 `tutorial_07` may show a distant column through the window, no faces), no insignia or flags that the prompt does not name, no modern electronics, no watermark or signature.
- **A5 D2 geometry.** Outside the newspaper region, the plate is unchanged: less than 0.5 % of pixels outside the mask differ from the current plate by more than 8/255 in any channel (Claude measures this with a script). The corkboard luminance table (`tools/derive_warroom_board_luminance.cjs`) must reproduce the committed values.
- **A6 D2 masthead.** Reads exactly "Oslobođenje", with đ, once; nothing else on the page legible.
- **A7 Not worse.** A D7 regeneration must read better at 1920 than the 600×400 plate it replaces; otherwise REVISE and keep the old file.
- **A8 Scene identity.** Each D7 slide keeps the scene its onboarding step depends on (map wall, folders, inspection desk, two folders, handset on map, window with binoculars, gutted room with ledgers); each plan still keeps its object language (many provinces, three parties, a half-and-half split, the empty signing table).

## 5. Claude's checks per PR

1. View every delivered file at native scale and on a 2× zoom of any text-like area.
2. `node -e` metadata check for size, format and alpha.
3. For D2: pixel diff against the previous commit outside the newspaper mask (script kept at `F:/AWWV-worktrees/_logs/visual-polish/F/`), and `node tools/derive_warroom_board_luminance.cjs --check` or its equivalent to confirm the cork values are unchanged.
4. `npx vitest run tests/ui/warroom_board_luminance.test.ts tests/ui/verdict_and_tutorial_art.test.ts tests/ui/peace_plan_art.test.ts`, as applicable to the batch.
5. Browser proof of the surface that shows the file (tutorial deck step, Warroom room, peace-plan modal) at 1366 and 1920.
6. Verdict entry in the handoff file; merge on approval.
