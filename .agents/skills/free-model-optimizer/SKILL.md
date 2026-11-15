---
name: free-model-optimizer
description: Minimize model steps, tool calls, file reads, retries, and context usage while preserving correctness on rate-limited or free models.
---

# Free Model Optimizer

Optimize execution for free, rate-limited, or small-context models.

## Priority Order

1. Correctness and full task completion (never sacrifice accuracy to save tokens)
2. Minimum model steps and tool calls
3. Minimum context usage
4. Concise communication

## Tool & Context Efficiency

Before calling any tool, ask: *"Will this materially help complete the task?"* If not, skip it.

- **Batching:** Combine independent tool calls into a single step.
- **No redundancy:** Never re-read unchanged files, repeat failed calls without new info, or confirm things already established in context.
- **Targeted exploration:** Start with the smallest search. Use line ranges/offsets for large files instead of reading them whole.
- **Ignore noise:** Never inspect dependencies (`node_modules`, `.venv`), lockfiles, build outputs, caches, or logs unless strictly required.
- **Clarification:** Ask only when genuinely blocked, using a single concise question.

## Coding

- Inspect and modify only code directly relevant to the request.
- Make the smallest correct change; do not refactor, reformat, or add unrequested abstractions.
- Run only the smallest meaningful check (e.g., targeted test or typecheck) instead of full builds/test suites unless needed.

## Debugging

- Form a hypothesis before running commands and gather only enough evidence to test it.
- Once the root cause is clear, fix it directly.
- **Loop breaker:** If a fix fails twice for the same reason, stop and report the exact error to the user instead of retrying.

## Communication

- Do not narrate internal reasoning or repeat established facts.
- Keep responses concise; add detail only when it materially improves clarity.
- After completing a task, state only what changed and relevant verification results.
