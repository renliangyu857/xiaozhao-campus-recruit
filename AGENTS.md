# AI Agent Guardrails

This file defines repository-wide rules for AI coding agents working in this project.

## Scope
- Applies to the entire repository unless a deeper `AGENTS.md` overrides it.
- Use this file together with repository docs and the closest task-specific files.

## Primary Workflow
1. Read the relevant files first, then search all call sites before editing shared contracts.
2. For any cross-layer field or behavior, define the contract first, then update all producers and consumers in one pass.
3. Prefer minimal, structural patches over broad rewrites.
4. Validate changed code with both static checks and the smallest realistic behavior check.
5. Update docs or agent instructions when the workflow or project rules change.

## Hard Rules
- Never change time, money, status, auth, payment, or login semantics in only one layer.
- For fields such as timestamps, amounts, status enums, cookie names, and API response shapes, search globally and update all affected paths together.
- Prefer single-source helpers/constants for high-risk logic. Do not duplicate expiry, pricing, or status mapping logic in multiple places.
- Keep backward-compatibility guards when old cached data, old API responses, or existing database rows may still exist.
- Do not rewrite an entire TS/TSX file unless the task explicitly requires it.
- Do not use terminal output alone to judge Chinese text corruption. First verify whether the source file is truly corrupted by reading it as UTF-8.
- Treat PowerShell mojibake as a display problem unless browser rendering or UTF-8 file inspection proves otherwise.
- Avoid regex or line-based bulk replacements in JSX/TSX unless the target is simple and deterministic.
- Never include secrets, keys, or real credentials in docs, prompts, code, or commits.

## Required Validation
- After code changes, run targeted `eslint` on edited JS/TS files when available.
- Run `tsc --noEmit --incremental false` after TypeScript contract changes when feasible.
- For UI or flow changes, verify the primary user path with the smallest realistic scenario.
- For payment/login/order flows, check at least one success path and one timeout/error path when the task touches those areas.

## Editing Guidance
- Prefer existing utilities and patterns over new abstractions.
- Keep code changes focused; do not fix unrelated issues.
- If a bug spans frontend and backend, land the contract fix and the UI fix together.
- When a file contains user-facing Chinese copy, edit surgically and re-check rendering-sensitive strings.

## Docs for Humans and Agents
- Repository-wide rationale and examples live in `docs/ai-collaboration-guardrails.md`.
- GitHub Copilot-specific instructions live in `.github/copilot-instructions.md`.
