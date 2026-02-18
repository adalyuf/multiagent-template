---
name: work
description: Continuous work loop that processes all available work in priority order. Fixes PRs with requested changes, reviews Codex PRs, builds features for assigned issues, then repeats until no work remains.
---

# Work Loop

## Overview

Execute a continuous loop that processes all available GitHub work in priority order until nothing remains.

This skill never switches branches itself. All branch work is done by the sub-skills
(`build-feature`, `fix-pr`) via isolated git worktrees under `/workspace/.worktrees/`.
The main `/workspace` checkout stays on `main` throughout.

## Workflow

Run these steps in order. After each step, proceed to the next regardless of whether work was found.

### Step 1 — Fix PRs with requested changes

- Run `gh issue list --label "assigned:claude" --label "needs:changes" --state open --json number,title`.
- If issues are found, invoke the `/fix-pr` skill to address review feedback.
- Repeat Step 1 until no `needs:changes` issues remain.

### Step 2 — Review Codex PRs

- Run `gh issue list --label "assigned:codex" --label "needs-review" --state open --json number,title`.
- If issues are found, invoke the `/review-codex-prs` skill to review each PR.
- Repeat Step 2 until no `needs-review` Codex issues remain.

### Step 3 — Build features

- Run `gh issue list --label "assigned:claude" --state open --json number,title,labels`.
- Exclude issues that already have `needs-review` or `needs:changes` labels (they are in-flight).
- If actionable issues are found, invoke the `/build-feature` skill to pick one and implement it.

### Step 4 — Check for new work

- Run all three checks from Steps 1-3 again.
- If ANY work was found in Steps 1-3, go back to Step 1.
- If no work was found in any step, proceed to Step 5.

### Step 5 — Unwind

- Invoke the `/unwind` skill to write a reflective journal entry, react to Codex's entries, and file issues for any actionable feedback.

## Priority Order Rationale

1. **Fix PRs first** — unblock the review cycle by addressing feedback quickly.
2. **Review Codex PRs second** — unblock merges for completed work.
3. **Build features last** — only start new work when existing work is unblocked.

## Guardrails

- Always complete one skill invocation fully before starting the next.
- If a skill reports an error or blocker, log it and continue to the next step rather than retrying indefinitely.
- Report a summary of all work completed at the end of the loop.
