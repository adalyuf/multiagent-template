---
name: fix-pr
description: Find issues labeled needs:changes, read the review feedback on the related PR, implement the requested changes, push updates, and re-label for review. Use when asked to address PR review feedback.
---

# Fix PR

## Overview

Find GitHub issues where a PR review requested changes, read the review
feedback, implement the fixes, push to the existing PR branch, and
re-label the issue for another review cycle.

## Preconditions

- Confirm `gh auth status` succeeds.
- Confirm working tree is clean (`git status`). Stash or warn if dirty.

## Workflow

1. Discover issues needing changes.

- Run `gh issue list --label "assigned:claude" --label "needs:changes" --state open --json number,title,labels,assignees`.
- If none are found, report that and stop.

2. Select an issue.

- Pick the oldest issue (lowest number) first.
- Read issue details with `gh issue view <number> --json number,title,body,labels`.

3. Find the related PR.

- Search for a PR that closes the issue: `gh pr list --search "closes #<number> OR fixes #<number> OR resolves #<number>" --state open --json number,title,headRefName,url`.
- If no PR is found via search, look for PRs with a branch name matching the issue number: `gh pr list --state open --json number,title,headRefName,url` and filter for branches containing `issue-<number>`.
- If no related PR exists, report that the issue has no PR to fix and stop.

4. Read review feedback.

- Get PR reviews: `gh api repos/{owner}/{repo}/pulls/<pr-number>/reviews --jq '.[] | select(.state == "CHANGES_REQUESTED") | .body'`.
- Get PR review comments (inline): `gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --jq '.[] | {path, line, body}'`.
- Get general PR comments: `gh pr view <number> --comments`.
- Compile a clear list of all requested changes.

5. Understand the current code.

- Check out the PR branch: `git fetch origin <branch> && git switch <branch>`.
- Read each file mentioned in the review feedback to understand current state.
- Read the full PR diff to understand what was already changed: `gh pr diff <number>`.

6. Implement the requested changes.

- Address each piece of review feedback.
- Make the smallest safe changes that satisfy the feedback.
- If feedback is ambiguous, use best judgment and note assumptions in the commit message.

7. Verify.

- Run focused tests first, then broader relevant tests.
- Ensure existing tests still pass.
- If the review requested new tests, add them.

8. Commit and push.

- Stage only intended files.
- Write a commit message referencing the review, e.g.: `Address review feedback on #<pr-number>`.
- Push to the existing PR branch: `git push origin <branch>`.

9. Comment on the PR.

- Leave a comment summarizing what was changed: `gh pr comment <number> --body "<summary of changes made>"`.

10. Update issue labels.

- Remove `needs:changes`: `gh issue edit <number> --remove-label "needs:changes"`.
- Add `needs-review`: `gh issue edit <number> --add-label "needs-review"`.

11. Return to previous branch.

- Switch back to the branch you were on before: `git switch -`.

## PR Comment Template

Use this structure:

```md
## Changes made (addressing review feedback)

- <change 1>
- <change 2>

## Testing

- <test command and result>

Ready for re-review.
```

## Guardrails

- Never force-push — only regular push to the PR branch.
- Only change files relevant to the review feedback.
- Do not modify unrelated code.
- If review feedback conflicts with the original issue requirements, note the conflict in a PR comment and follow the review feedback.
- Always verify tests pass before pushing.
- Always switch back to the original branch when done.
