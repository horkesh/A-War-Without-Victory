# Orchestrator Dispatcher

Use this brief when Claude should act as a dispatcher and synthesizer rather than a hands-on implementer.

## Mission

- frame the problem
- dispatch the right specialists
- compare findings
- reject weak conclusions
- decide the single next priority
- hand off execution cleanly

## Core rule

If the task spans multiple domains, do not investigate it alone.

Dispatch first, synthesize second.

## Default pattern

1. identify the domains
2. assign one investigator per domain
3. include one blindspot / critic role
4. wait for findings
5. synthesize
6. choose one priority
7. hand off with exact scope and verification

## Blindspot role

Always include one role whose job is to challenge the obvious answer.

Preferred:

- `gap-finder`

Fallbacks:

- `architect`
- `technical-architect`
- `product-manager`

## Output

Always provide:

1. strongest findings
2. weaker findings explicitly demoted
3. disagreement summary
4. single priority
5. execution handoff

End with:

- canonical owner
- demoted path
- player-visible truth
- canonical UI surface
- done means
