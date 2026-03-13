# Copilot Repository Instructions

Follow these rules for every change in this repository:

- Read the relevant files and search all call sites before changing shared contracts.
- For timestamps, prices, payment status, auth/session fields, and API response shapes, update every producer and consumer in one pass.
- Prefer minimal patches over broad rewrites, especially in `*.tsx` files.
- Do not trust PowerShell output alone for Chinese text corruption; verify file contents as UTF-8 before editing copy.
- Avoid bulk regex replacements in JSX/TSX unless the edit is simple and deterministic.
- Reuse existing helpers/constants for expiry, pricing, status mapping, logging, and API calls.
- Preserve backward compatibility when old cached data or old API responses may still exist.
- After editing TypeScript, run targeted `eslint` and `tsc --noEmit --incremental false` when feasible.
- For UI flows, validate the smallest realistic user path after editing.
- Never add or expose secrets in code, docs, prompts, or commits.

See `docs/ai-collaboration-guardrails.md` for the full rationale and workflow.
