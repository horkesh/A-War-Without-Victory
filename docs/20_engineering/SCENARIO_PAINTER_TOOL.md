# Scenario Control Painter Tool

## Overview
The **Scenario Control Painter** is a web-based utility designed to facilitate the rapid creation and modification of political control maps for AWWV scenarios. It allows users to visually assign control of municipalities and settlements to specific factions (RS, RBiH, HRHB) and export the data in the required JSON format.

## Location
- **Source Code**: `tools/control_painter.html`
- **Related Scripts**: `tools/control_painter.js`, `tools/generate_control_json.ts`

## Prerequisites
- A local web server to serve the HTML and data files. (e.g., `npx http-server`, `python -m http.server`, or VS Code Live Server).
- Access to the project's `data/` directory.

## Usage

### 1. Starting the Tool
1.  Open a terminal in the project root.
2.  Start a local server:
    ```bash
    npx http-server -p 8080 --cors
    ```
    *(Note: Ensure you have permission to run scripts if using PowerShell, or use `npx.cmd`)*
3.  Open your browser to: `http://localhost:8080/tools/control_painter.html`

### 2. Interface Overview
- **Map View**: Displays the game map with municipality boundaries.
- **Sidebar (Right)**:
    - **Faction Palette**: Select the active faction to paint with (RS: Red, RBiH: Green, HRHB: Blue, Neutral: Grey).
    - **Mode Toggle**: Switch between **Municipality** (paint entire regions) and **Settlement** (fine-grained control - *WIP*).
    - **Layers**: Toggle visibility of **1990 Borders**, **Modern (Dayton) Borders**, and **Satellite Imagery**.
    - **IO Panel**: Import existing `control.json`, Export current state.

### 3. Painting Control
1.  **Select a Faction**: Click a button in the palette (e.g., "RS").
2.  **Paint**:
    - **Click** on a municipality to assign it to the selected faction.
    - **Click + Drag** to paint multiple municipalities in a single stroke (hold mouse button).
    - **Right-Click + Drag** to pan the map.
    - **Wheel** to zoom in/out.

### 4. Saving Work
1.  Click **Export JSON** in the sidebar.
2.  This generates a JSON blob containing the control status of all mapped municipalities.
3.  Save this file as `control_export.json` (or copy the content).
4.  Use `tools/generate_control_json.ts` to convert this export into the game-ready `control.json` format:
    ```bash
    npx tsx tools/generate_control_json.ts <path/to/control_export.json> <output/path/control.json>
    ```

## Workflow for New Scenarios
1.  **Load Baseline**: Start with the `baseline` dataset or import an existing scenario's control file.
2.  **Paint Changes**: visually adjust control to match historical frontlines (referencing the **Modern Borders** layer for Dayton lines vs 1990 lines).
3.  **Export**: Save the work.
4.  **Integrate**: Run the generation script and place the output in `data/scenarios/<scenario_name>/control.json`.
5.  **Verify**: Load the scenario in the Tactical Map Viewer.

## Key Features
- **Municipality-Level Granularity**: rapidly assign control based on 1990 municipality definitions.
- **Historical Comparison**: Overlay modern boundaries to see how frontlines align with present-day entities (RS/Fed).
- **Settlement Mapping**: Automatically maps painted municipalities to their constituent settlements during the generation phase.

## Historical checkpoint calibration workflow

The browser painter above is an authoring aid, not the runtime or scoring authority. Current
checkpoint calibration uses settlement/OSID-level references under
`data/source/calibration/painted_control_<checkpoint>.json`.

1. Run only the declared master
   `data/scenarios/apr1992_definitive_188w.json`. January 1993 is week 39 of this scenario;
   do not use `apr1992_definitive_40w*.json` for a current score.
2. Treat the painted controller as checkpoint truth. Research is used to identify combat
   operations, dates, formations, and axes capable of producing that boundary.
3. Do not add a calibration-authored `control_change` event. Initial April corrections,
   ordinary combat, general paramilitary/consolidation rules, agreements, and separately
   canonical sensitive-history receipts retain their normal authority.
4. Verify a reached checkpoint with
   `node tools/verify_checkpoints.cjs <run-directory>`. Do not interpret later-checkpoint
   output from a save that stopped at week 39.
5. Build the review artifact with
   `node tools/build_calibration_map_html.mjs <map.png> <out.html> <title> <score> [footer]`.
   Output is north-up; amber is a mismatch; outline and center circle identify the painted
   target faction.
6. Record the accepted run, hash, score, focused region score, residual mismatches, rejected
   levers, and debt in `docs/40_reports/CALIBRATION_MASTER.md` and
   `docs/PROJECT_LEDGER.md`.

The current accepted January result and remote mobile viewer are listed at the top of
`CALIBRATION_MASTER.md`.
