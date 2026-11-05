---
name: orchestrator
user_invocable: true
description: Use when setting strategic priority, coordinating work across multiple domains, resolving conflicting findings, or deciding the next bounded action for a complex task.
---

# Orchestrator

Turn an owner goal into the smallest complete, reviewable result. Follow `docs/20_engineering/AGENT_WORKFLOW.md` for shared authority, validation, and closeout.

## Frame the work

State the question, bounded scope, evidence, pass criteria, expected cost, and stopping rule. Read only the task-specific authorities. Preserve canon, determinism, protected state/data/save boundaries, production gates, and recorded acceptance criteria.

## Coordinate proportionately

Use the smallest qualified team. Handle small reversible administrative work directly. For nontrivial implementation, default to one implementer and one independent reviewer; add a specialist for a distinct question. Mandatory canon panels and distinct seats remain exceptions. Do not invent unavailable roles or tool identifiers.

The lead may inspect evidence, analyze, synthesize, integrate, and resolve routine in-scope decisions. When independent review is required, the implementer must not approve the same implementation. For domain work, attribute findings and distinguish established facts, inference, and unresolved risk.

## Cost and failure discipline

Run cheap prerequisites before a long test, build, package, or campaign. Freeze the expensive question and stopping rule. After an unexpected failure, inspect retained evidence, verify a targeted correction cheaply, and repeat only the affected expensive gate when it answers a new question. Do not replace an unmet acceptance criterion with a proxy.

## Host boundary

Use Claude's available Task tooling and supported model settings. Codex model names, collaboration APIs, and concurrency policy are runtime-specific and do not belong here. `.claude/settings.json` hook enforcement is Claude-specific and remains unchanged.

## Completion

Continue authorized implementation through checks, correction, documentation, and independent review where required. Ask only when authority, acceptance criteria, or costly scope must change, or when a consolidated blocker remains. Report outcome, evidence paths and exits/counts, material residuals, and the exact next decision if one remains.
