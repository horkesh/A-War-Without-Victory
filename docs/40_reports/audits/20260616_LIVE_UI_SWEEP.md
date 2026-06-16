# 2026-06-16 Live UI Sweep

Scope: browser-driven audit of the current player flow after installer work was paused. No installer/package artifacts were rebuilt. Tested with Vite dev servers only:

- Tactical map / React shell: `http://127.0.0.1:3002/?view=game`
- Legacy Warroom parent: `http://127.0.0.1:3003/`
- Campaign state: real `apr_1992` RS state from `dist/desktop/desktop_sim.cjs`, serialized with `serializeState`.
- Viewports: 1440x920 desktop and 390x844 mobile.

## Priority Findings

### P0 - Presidential inbox routes desk actions into Army HQ - RESOLVED 2026-06-16

Live result: after dismissing the tutorial on an unblocked campaign state, clicking the opening brief `Open desk` action opens the `Army Headquarters` dialog on the `BRIEFING` tab. It does not open the presidential desk or Warroom Decision Room.

Code anchors:

- `src/ui/map/components/PresidentialInbox.tsx:275` maps opening brief `Open desk` to `onAction('army_hq_briefing', 'opening-brief:desk')`.
- `src/ui/map/components/PresidentialInbox.tsx:294` maps the quiet inbox desk action to the same Army HQ briefing route.
- `src/ui/map/data/decisionSurfaceRegistry.ts:194`, `:210`, `:242`, `:247`, `:294` classify reserve, officer, operation opportunity, and situation items as Army HQ owned or Army HQ routed.

Player impact: the presidential command loop does not hold together. The inbox says "desk/decision room", but the player lands inside military staff UI. This makes Army HQ feel like the dumping ground for presidential decisions and confirms the user's complaint.

Recommended work:

1. Make Presidential Desk / Decision Room the owner for inbox action resolution.
2. Route Army HQ only as supporting drill-in for military dossiers, records, and corps detail.
3. Rename action copy so "Open desk", "Decision Room", "Call Army HQ", and "War summary" each mean one specific shell.

Resolution: 2026-06-16 player-polish branches routed presidential inbox/desk actions to the Warroom Decision Room instead of Army HQ as the primary action surface, updated comments/docs, and expanded `qa:player-journeys` to cover inbox/decision routing.

### P0 - First-session surfaces stack and compete - RESOLVED 2026-06-16

Live result: on a fresh RS campaign the hard-blocking foundational decision modal intercepts the opening brief. On an unblocked state, the tutorial overlay intercepts the same opening brief. The first player contact can include: war-start intro, foundational decision modal, tutorial overlay, opening brief, inbox, command sidebar, and map.

Player impact: the player is exposed to foundational decisions, but the sequence is not product-led. Several surfaces are simultaneously present, visible behind each other, or blocked by overlays. The game asks the player to learn the interface before it has established the command premise.

Recommended work:

1. Create a single first-turn choreography: war-start splash -> foundational decision -> presidential desk/decision room -> optional tutorial.
2. Hide or defer the right/left command panels while blocking presidential modals are active.
3. Make the tutorial contextual after the player reaches the relevant surface, not a global overlay on top of the opening brief.

Resolution: first-hour choreography is now pinned as faction start -> war-start briefing -> President's Desk opening brief -> foundational decision -> command map/tutorial. `EventDecisionModal` auto-launch waits for `openingBriefPending`, and onboarding remains blocked behind first-hour presidential surfaces.

### P0 - Tactical map DeckGL overlay errors - RESOLVED 2026-06-16

Live console repeatedly logs DeckGL failures:

- `SolidPolygonLayer({id: 'osid-damage-overlay-fill'}): @math.gl/web-mercator: assertion failed`
- `SolidPolygonLayer({id: 'force-quality-glow-overlay-fill'}): @math.gl/web-mercator: assertion failed`

Code anchors:

- `src/ui/map/layers/buildOsidDamageOverlay.ts:151-153`
- `src/ui/map/layers/buildForceQualityOverlay.ts:218-220`

Player impact: this is a rendering reliability bug, not a style issue. It can silently remove overlays or create repeated console noise while the player changes map modes and panels.

Recommended work:

1. Audit geometry passed to these overlay builders for invalid longitude/latitude or nested polygon shape mismatch.
2. Add a runtime counter/test that fails on DeckGL initialization errors during loaded-map smoke.
3. Disable the affected overlay data path until bad polygons are filtered deterministically.

Resolution: OSID damage and force-quality overlay builders now split MultiPolygon features and reject non-finite, non-closed, or degenerate polygon rings before DeckGL receives them. Focused overlay tests and live browser smoke passed; controlled geometry-skip warnings remain for known invalid source polygons.

### P1 - Army HQ is overloaded and duplicates presidential command

Live result: Army HQ `BRIEFING` contains Chief of Staff briefing, `PresidentialDecisionRoomPanel`, `PresidentialAttentionPanel`, commander dossier, strategic position, situation briefing, and all corps cards. It has 121 visible buttons on desktop in the briefing tab. The same `PresidentialDecisionRoomPanel` is also rendered in Warroom Decision Room.

Code anchors:

- `src/ui/map/components/army_hq/ArmyHQModal.tsx:435` renders `PresidentialDecisionRoomPanel` inside Army HQ.
- `src/ui/map/App.tsx:1804` renders the same panel inside Warroom Decision Room.

Player impact: the player cannot tell whether they are acting as president, chief of staff, or map operator. Army HQ should be a military staff/dossier surface, but it currently hosts the presidential product loop.

Recommended work:

1. Remove the presidential decision-room panel from Army HQ or convert it into a read-only "staff handoff" summary.
2. Keep Army HQ tabs focused: Briefing, Corps, Operations, Personnel, Records.
3. Move "What is expected of me?", "Priority lanes", and "Review before advance" into the presidential desk/decision room.

### P1 - Command sidebar floods sectors and operations

Live result: expanding `Sectors69` renders all 69 sector buttons in one long list. Expanding `Operations6` adds all operation cards above that. Sector and operation drill-ins work, but they layer detail rails over an already-expanded feed.

Player impact: the data is present, but it is not commandable. The player sees a wall of "1st Krajina Corps - X, Y / assigned / km / density" rows without prioritization, filters, or a clear next action.

Recommended work:

1. Replace full sector dump with grouped filters: critical, exposed, understrength, opsec, by corps.
2. Default to top 5 priority sectors with "show all" behind a dedicated panel.
3. When a sector or operation is selected, collapse or dim the source list so the detail rail becomes the focus.

### P1 - Mobile layout is broken

Live result at 390x844:

- Document width becomes 403px against a 390px viewport.
- Top buttons `RECORDS` and `CHRONICLE` have negative x positions.
- The command sidebar extends far below the viewport and remains visible behind Army HQ.
- Army HQ opens, but it is still a desktop modal compressed into mobile width.

Player impact: mobile is not usable. If mobile is not a target, the app should explicitly gate it. If it is a target, this requires responsive redesign, not tweaks.

Recommended work:

1. Add a minimum-supported-width gate or a real mobile shell.
2. Collapse top nav into an icon/menu rail on narrow widths.
3. Make Army HQ a routed full-screen mobile page with one active section at a time.

### P1 - Warroom dev parent cannot inject the tactical iframe bridge

Live result: starting a campaign from the legacy Warroom parent on port 3003 creates iframe `http://127.0.0.1:3002/index.html?embedded=1&view=warroom&...&intro=war_start`, but the parent logs a cross-origin warning and the frame shows `WARROOM UNAVAILABLE UNTIL A CAMPAIGN SIDE IS SELECTED.`

Observed warning:

`SecurityError: Failed to read a named property 'document' from 'Window': Blocked a frame with origin "http://127.0.0.1:3003" from accessing a cross-origin frame.`

Player/dev impact: dev browser verification of the real parent-to-map flow is brittle. Packaged Electron may still work through its different origin/resource setup, but the browser path should not require privileged frame access.

Recommended work:

1. Move embedded bridge handoff to `postMessage` plus frame-side listener.
2. Use the same origin in dev where possible, or explicitly serve Warroom and tactical map under one dev host.
3. Add a browser test that starts from legacy Warroom and asserts the embedded React Warroom receives state.

### P2 - Warroom main-menu background asset 404s in dev

Live result: Warroom requests `/assets/game%20start.webp` and receives 404, even though `src/ui/warroom/assets/game start.webp` exists. The main menu falls back to the radial gradient.

Code anchors:

- `src/ui/warroom/warroom.ts:13` imports `./assets/game start.webp?url`.
- `src/ui/warroom/vite.config.ts:23-68` custom public middleware checks the raw encoded `pathname` without decoding `%20`.

Player impact: the first visual impression loses its intended asset in dev and may hide packaged asset-path issues.

Recommended work:

1. Decode the request pathname in `serveWarroomPublic`.
2. Add a smoke check for `game start.webp` resolving with HTTP 200 in dev and packaged paths.

### P2 - Duplicate labels and tiny controls hurt accessibility

Live result:

- `RECORDS` appears both in top nav and Army HQ tabs.
- `War Summary` appeared ten times in the Army HQ briefing view.
- Several controls are 18-21px tall, including tab buttons, close/back buttons, and dossier buttons.

Player impact: keyboard/screen-reader navigation and automation become ambiguous. Small controls also feel like debug UI rather than production command UI.

Recommended work:

1. Give duplicate actions distinct accessible names and visible context where needed.
2. Standardize minimum interactive target size.
3. Reduce repeated "War Summary" actions by grouping or using a single source-handoff area.

### P2 - Settlement detail works but competes with command clutter

Live result: clicking the map opened `SETTLEMENT INFO` for Voljevac (Gornji Vakuf), with Overview / Municipality / Timeline tabs, population, ethnic structure, terrain, local support, and staff-priority controls. The panel content is useful and did not overflow at desktop width.

Player impact: the settlement panel itself is viable, but it opens while the left command/OOB feed remains fully expanded. The player can read the settlement, but the surrounding screen still screams Army/corps/operations instead of making the selected place the focus.

Recommended work:

1. Collapse or dim the OOB sidebar when a settlement detail rail opens.
2. Give settlement panel actions a stronger hierarchy: inspect, support, route to sector, route to operations.
3. Keep the current tabs, but make the active tab and close/focus state more visually dominant.

## Suggested Work Order

1. Fix routing ownership first: Presidential Inbox and opening brief must land in Presidential Desk/Decision Room, not Army HQ.
2. Define the first-turn choreography and remove competing first-session overlays.
3. Split presidential command loop out of Army HQ.
4. Fix DeckGL overlay errors.
5. Redesign Army HQ briefing, settlement focus, and command sidebar prioritization.
6. Decide mobile support: gate it or redesign it.
7. Harden Warroom dev embedding and fix the asset URL decode bug.

## Verification Notes

The sweep used live browser interaction, transient screenshots, console collection, and DOM/viewport checks. No installer/package build was run.
