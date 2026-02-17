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
- Confirm repository remotes and branch status before proceeding.

## Workflow

1. Discover issues ready for review.

- Run `gh issue list --label "assigned:claude" --label "needs-review" --state open --json number,title,labels,assignees`.
- If none are found, report that and stop.

2. Select an issue.

- Pick the oldest issue (lowest number) to review first.
- Read issue details with `gh issue view <number>`.

3. Find the related PR.

- Search for a PR that closes the issue: `gh pr list --search "closes #<number> OR fixes #<number> OR resolves #<number>" --state open --json number,title,headRefName,url`.
- If no PR is found via search, look for PRs with a branch name matching the issue number: `gh pr list --state open --json number,title,headRefName,url` and filter for branches containing `issue-<number>`.
- If still no PR is found, check if the issue body or comments reference a PR: `gh issue view <number> --comments`.
- If no related PR exists, report that the issue has no PR to review and stop.

4. Review the PR.

- Read the PR details: `gh pr view <number>`.
- Read the full diff: `gh pr diff <number>`.
- Check CI status: `gh pr checks <number>`.
- Review the code changes for:
  - **Correctness**: Does the change actually fix the issue?
  - **Tests**: Are there appropriate tests for the change?
  - **Side effects**: Does the change introduce unintended modifications?
  - **Code quality**: Is the code clean, readable, and consistent with the codebase?
  - **Security**: Are there any security concerns?
- If the diff is large, read individual changed files to understand the full context.

5. Make a review decision.

- **If approved** (correct, well-tested, no issues):
  - Leave a comment on the PR with the review summary: `gh pr comment <number> --body "<review summary>"`.
  - Update the issue: remove `needs-review`, add `reviewed:approved`: `gh issue edit <number> --remove-label "needs-review" --add-label "reviewed:approved"`.
  - Merge the PR: `gh pr merge <number> --merge --delete-branch`.
- **If changes needed** (problems found):
  - Leave a comment on the PR with detailed feedback: `gh pr comment <number> --body "<detailed feedback with specific issues>"`.
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
