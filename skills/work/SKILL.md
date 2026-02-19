---
name: work
description: Continuous work loop that processes all available work in priority order. Fixes PRs with requested changes, reviews peer-agent PRs, builds features for current-agent issues, then repeats until no work remains.
---

# Work Loop

## Overview

Execute a continuous loop that processes all available GitHub work in priority order until nothing remains.
Run implementation/fix/review actions in per-task git worktrees so multiple agents can work simultaneously without branch-switch conflicts.

## Workflow

**Agent roster** (used by all queries below):
| Agent     | Label             |
|-----------|-------------------|
| Claude    | `assigned:claude` |
| Codex     | `assigned:codex`  |
| Other     | `assigned:other`  |

Run these steps in order. After each step, proceed to the next regardless of whether work was found.

### Step 0 — Clean up stale labels

Run once at loop startup to remove agent-workflow labels (`needs-review`, `needs:changes`) from any issues that were auto-closed by GitHub via `Closes #N` merges without the label being stripped first:

```bash
bash scripts/cleanup-stale-labels.sh
```

This prevents ghost entries from appearing in subsequent label-based queries.

### Step 1 — Fix PRs with requested changes

- For each agent label in the roster, run:
  - `gh issue list --label "<agent-label>" --label "needs:changes" --state open --json number,title`
- Use **your** agent label's results.
- If issues are found, invoke the `/fix-pr` skill to address review feedback.
- Repeat Step 1 until no `needs:changes` issues remain.

### Step 2 — Review peer-agent PRs

- For each agent label in the roster, run:
  - `gh issue list --label "<agent-label>" --label "needs-review" --state open --json number,title`
- Use all **peer** queues (every agent label except your own) via `/review-peer-prs`.
- Repeat Step 2 until no peer `needs-review` issues remain.

### Step 3 — Build features

- For each agent label in the roster, run:
  - `gh issue list --label "<agent-label>" --state open --json number,title,labels`
- Use **your** agent label's results.
- Exclude issues that already have `needs-review` or `needs:changes` labels (they are in-flight).
- If actionable issues are found, invoke the `/build-feature` skill to pick one and implement it.

### Step 4 — Check for new work

- Run all three checks from Steps 1-3 again.
- If ANY work was found in Steps 1-3, go back to Step 1.
- If no work was found in any step, proceed to Step 5.

### Step 5 — Unwind

- Only invoke the `/unwind` skill if this `work` run completed at least one concrete task in Steps 1-3 (fixed a PR, reviewed a peer PR, or built a feature).
- If no concrete task was completed in this run, skip unwind and report that no journal entry is needed.
- If unwind is invoked, write a reflective journal entry, react to other agents' entries, and file issues for any actionable feedback.
- After unwind edits are made, suggest committing and pushing the updated `unwind/<YYYY-MM-DD>.md` file.

## Priority Order Rationale

1. **Fix PRs first** — unblock the review cycle by addressing feedback quickly.
2. **Review peer PRs second** — unblock merges for completed work.
3. **Build own-agent features last** — only start new work when existing work is unblocked.

## Guardrails

- Always complete one skill invocation fully before starting the next.
- If a skill reports an error or blocker, log it and continue to the next step rather than retrying indefinitely.
- Report a summary of all work completed at the end of the loop.
- When invoking sub-skills that modify code, ensure they use dedicated task worktrees under `/workspace/worktrees` instead of switching branches in the shared root worktree.
