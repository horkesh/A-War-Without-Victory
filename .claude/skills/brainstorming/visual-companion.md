# Visual Companion Guide

The visual companion renders interactive mockups, diagrams, and layout comparisons during brainstorming sessions. It produces self-contained HTML files served locally for the user to view in their browser.

## When to Use

Use the visual companion when the user needs to **see** something to make a decision:
- UI layout comparisons (side-by-side wireframes)
- Component mockups (what a modal/panel/toolbar would look like)
- Architecture diagrams (system relationships, data flow)
- State machine diagrams (lifecycle transitions)
- Interaction flow diagrams (click → navigate → action sequences)

Do NOT use for:
- Conceptual questions ("what should this feature do?")
- Tradeoff lists (A vs B vs C text options)
- Scope decisions
- Requirements gathering

## How to Produce Visuals

1. Create a self-contained HTML file in `docs/60_visualisations/`
2. Use inline CSS and minimal JS — no external dependencies
3. Match the project's visual language:
   - Dark background: `#1c1a17` (panel-bg)
   - Card background: `#2a2622` (panel-card)
   - Accent gold: `#c4a35a`
   - Text primary: `#e8e0d0`
   - Text secondary: `#8a8578`
   - Faction colors: RBiH `#4a9eff`, RS `#e05050`, HRHB `#50b850`
   - Font: `'Segoe UI', system-ui, sans-serif` for UI, `'Courier New', monospace` for data
   - Paper cream: `#f0e8d8` (for document-style content)
4. Include a title bar explaining what the visual shows and what decision it supports
5. For layout comparisons, show options side-by-side with labels (Option A / Option B)
6. For mockups, use realistic data from the game (real officer names, real faction counts, real corps names)

## Serving to the User

After creating the HTML file, tell the user:
> "I've created a mockup at `docs/60_visualisations/<filename>.html`. Open it in your browser to see the visual."

On Windows with the project at `F:\A-War-Without-Victory\`, the user can open directly:
```
start docs/60_visualisations/<filename>.html
```

## Design Tokens (AWWV UI)

These match the Tailwind config and `awwv_map_style.json`:

```css
/* Backgrounds */
--panel-bg: #1c1a17;
--panel-card: #2a2622;
--panel-hover: #332f2a;
--panel-active: #3d3830;
--panel-border: #3a3630;
--glass: rgba(28, 26, 23, 0.85);

/* Text */
--text-primary: #e8e0d0;
--text-secondary: #8a8578;
--accent-gold: #c4a35a;
--accent-blue: #5a8ab5;
--interactive: #7ab0d4;

/* Factions */
--faction-rbih: #4a9eff;
--faction-rs: #e05050;
--faction-hrhb: #50b850;

/* Paper (document treatment) */
--paper-bg: #f0e8d8;
--paper-text: #3a3228;
--paper-secondary: #6a6050;

/* Status */
--status-green: #34d399;
--status-amber: #fbbf24;
--status-red: #f87171;
```

## Mockup Fidelity

Aim for **medium fidelity** — recognizable as the actual UI, with real data and correct proportions, but not pixel-perfect. The goal is to support a design decision, not to be a screenshot. Use CSS grid/flexbox for layout. Rounded corners (`border-radius: 8px`), subtle borders (`1px solid rgba(255,255,255,0.08)`), and backdrop blur where appropriate.

## Interactive Elements

For mockups that compare options, add simple interactivity:
- Tab switching between options
- Hover states on clickable elements
- Expandable/collapsible sections
- Tooltip previews

Keep JS minimal — vanilla event listeners, no frameworks.
