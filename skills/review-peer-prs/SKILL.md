---
name: review-peer-prs
description: Find issues in the peer agent's queue labeled needs-review, locate the related PR, review the code changes, and either comment with approval and merge, or request changes.
---

# Review Peer PRs

## Overview

Find GitHub issues ready for review in the peer agent queue, locate the associated PR, perform code review, and either approve (comment + merge) or request changes.

## Preconditions

- Confirm `gh auth status` succeeds.
- Confirm repository remotes and worktree status before proceeding.
- Avoid branch switching in the shared root worktree.

## Workflow

1. Discover issues ready for review.

- Run both:
  - `gh issue list --label "assigned:codex" --label "needs-review" --state open --json number,title,labels,assignees`
  - `gh issue list --label "assigned:claude" --label "needs-review" --state open --json number,title,labels,assignees`
- Use the peer queue:
  - Codex reviews `assigned:claude` issues.
  - Claude reviews `assigned:codex` issues.
- If the peer queue is empty, report that and stop.

2. Select an issue.

- Pick the oldest issue (lowest number) to review first.
- Read issue details with `gh issue view <number>`.

3. Find the related PR.

- Resolve PR number with helper:
  - `scripts/find-pr-for-issue.sh <number>`
- If no PR is found, report that the issue has no PR to review and stop.
- Read PR metadata with `gh pr view <pr-number> --json number,title,headRefName,url`.

4. Review the PR.

- Read PR details: `gh pr view <pr-number>`.
- Read full diff: `gh pr diff <pr-number>`.
- Check CI status: `gh pr checks <pr-number> --required`.
- If local validation is needed, use a temporary review worktree:
  - `git fetch origin <headRefName>`
  - `git worktree add /workspace/worktrees/review-pr-<pr-number> origin/<headRefName>`
  - Run checks there, then cleanup from root:
    - `cd /workspace && git worktree remove /workspace/worktrees/review-pr-<pr-number>`
- Evaluate:
  - Correctness
  - Tests
  - Side effects
  - Code quality
  - Security

5. Make a review decision.

- If approved:
  - Post review summary comment using `--body-file`.
  - Update issue labels:
    - `gh issue edit <number> --remove-label "needs-review" --add-label "reviewed:approved"`
  - Ensure required checks are green.
  - Merge PR:
    - `gh pr merge <pr-number> --merge --delete-branch`
- If changes needed:
  - Post detailed feedback using `--body-file`.
  - Update issue labels:
    - `gh issue edit <number> --remove-label "needs-review" --add-label "needs:changes"`

## Review Comment Template

Use this structure:

```md
## Review of #<PR-number> (fixes #<issue-number>)

### Summary

- <what the PR does>

### Findings

- <finding 1>
- <finding 2>

### Decision

- <Approved — merging / Changes requested with rationale>
```

## Guardrails

- Do NOT use `gh pr review --approve` (fails on own PRs). Use `gh pr comment` instead.
- Do not merge if required checks are failing.
- Provide specific, actionable feedback when requesting changes.
- Review the full diff, not only summary text.
- Prefer temporary worktrees for local PR validation.
- Always leave a review summary comment.
