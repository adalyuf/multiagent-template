---
name: review-claude-prs
description: Find issues labeled assigned:claude and needs-review, locate the related PR, review the code changes, and either comment with approval and merge, or request changes. Use when asked to review Claude-generated PRs.
---

# Review Claude PRs

## Overview

Find GitHub issues that Claude has worked on and are ready for review,
locate the associated PR, perform a code review, and either approve
(comment + merge) or request changes.

## Preconditions

- Confirm `gh auth status` succeeds.
- Confirm repository remotes and worktree status before proceeding.
- Avoid branch switching in the shared root worktree.

## Workflow

1. Discover issues ready for review.

- Run `gh issue list --label "assigned:claude" --label "needs-review" --state open --json number,title,labels,assignees`.
- If none are found, report that and stop.

2. Select an issue.

- Pick the oldest issue (lowest number) to review first.
- Read issue details with `gh issue view <number>`.

3. Find the related PR.

- Use issue-linked PRs directly: `gh issue view <number> --json linkedPullRequests`.
- Select the open linked PR targeting the default branch.
- If no related PR exists, report that the issue has no PR to review and stop.

4. Review the PR.

- Read the PR details: `gh pr view <number>`.
- Read the full diff: `gh pr diff <number>`.
- Check CI status: `gh pr checks <number>`.
- If local execution is needed, use a temporary review worktree instead of switching branches:
  - `git fetch origin <headRefName>`
  - `git worktree add /workspace/worktrees/review-pr-<number> origin/<headRefName>`
  - Run local checks there, then remove it: `git worktree remove /workspace/worktrees/review-pr-<number>`.
- Review the code changes for:
  - **Correctness**: Does the change actually fix the issue?
  - **Tests**: Are there appropriate tests for the change?
  - **Side effects**: Does the change introduce unintended modifications?
  - **Code quality**: Is the code clean, readable, and consistent with the codebase?
  - **Security**: Are there any security concerns?
- If the diff is large, read individual changed files to understand the full context.

5. Make a review decision.

- **If approved** (correct, well-tested, no issues):
  - Leave a comment on the PR with the review summary using `--body-file`:
    - write `/tmp/pr-<number>-review.md`
    - `gh pr comment <number> --body-file /tmp/pr-<number>-review.md`
  - Update the issue: remove `needs-review`, add `reviewed:approved`: `gh issue edit <number> --remove-label "needs-review" --add-label "reviewed:approved"`.
  - Ensure all required checks are green before merge: `gh pr checks <number> --required`
  - Merge the PR: `gh pr merge <number> --merge --delete-branch`.
  - If a temporary review worktree was created, remove it after review completion: `git worktree remove /workspace/worktrees/review-pr-<number>`.
- **If changes needed** (problems found):
  - Leave a comment on the PR with detailed feedback using `--body-file`:
    - write `/tmp/pr-<number>-review.md`
    - `gh pr comment <number> --body-file /tmp/pr-<number>-review.md`
  - Update the issue: remove `needs-review`, add `needs:changes`: `gh issue edit <number> --remove-label "needs-review" --add-label "needs:changes"`.
- Include in the comment:
  - What was reviewed
  - Key findings (positive and negative)
  - Specific line references for any issues found

## Review Comment Template

Use this structure in PR comments:

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
- Provide specific, actionable feedback when requesting changes.
- Check that CI passes before approving and merging.
- If CI is failing, include that in the review as a reason for requesting changes. Do not merge.
- Review the full diff, not just a summary.
- Prefer temporary worktrees for any local PR validation.
