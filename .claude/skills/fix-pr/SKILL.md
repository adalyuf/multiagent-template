---
name: fix-pr
description: Find issues labeled needs:changes, read the review feedback on the related PR, implement the requested changes, push updates, and re-label for review. Use when asked to address PR review feedback.
---

# Fix PR

## Overview

Find GitHub issues where a PR review requested changes, read the review
feedback, implement the fixes, push to the existing PR branch, and
re-label the issue for another review cycle.

Work is always done in an isolated git worktree under `/workspace/.worktrees/<branch>`
so that multiple agents can operate simultaneously without interfering with each other.
The main `/workspace` checkout always stays on `main`.

## Preconditions

- Confirm `gh auth status` succeeds.
- Confirm the main working tree is clean (`git -C /workspace status`). Warn if dirty.

## Workflow

1. Discover issues needing changes.

- Run `gh issue list --label "assigned:claude" --label "needs:changes" --state open --json number,title,labels,assignees`.
- If none are found, report that and stop.

2. Select an issue.

- Pick the oldest issue (lowest number) first.
- Read issue details with `gh issue view <number> --json number,title,body,labels`.

3. Find the related PR via the issue timeline.

- Look up PRs that reference the issue through the GitHub timeline API:
  ```
  gh api repos/{owner}/{repo}/issues/<number>/timeline --paginate \
    --jq '[.[] | select(.event == "cross-referenced")
               | select(.source.issue.pull_request != null)
               | select(.source.issue.state == "open")
               | .source.issue.number] | last'
  ```
- Take the returned PR number and fetch its details:
  ```
  gh pr view <pr-number> --json number,title,headRefName,url
  ```
- If no open PR is found, report that the issue has no PR to fix and stop.

4. Read review feedback.

- Get PR reviews: `gh api repos/{owner}/{repo}/pulls/<pr-number>/reviews --jq '.[] | select(.state == "CHANGES_REQUESTED") | .body'`.
- Get PR review comments (inline): `gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --jq '.[] | {path, line, body}'`.
- Get general PR comments: `gh api repos/{owner}/{repo}/issues/<pr-number>/comments --jq '.[] | {user: .user.login, body}'`.
- Compile a clear list of all requested changes.

5. Create a worktree for the PR branch.

- Worktree path: `/workspace/.worktrees/<branch>` (e.g. `/workspace/.worktrees/fix/issue-20-my-slug`).
- Fetch the branch, then create a worktree:
  ```
  git -C /workspace fetch origin <branch>
  git -C /workspace worktree add /workspace/.worktrees/<branch> <branch>
  ```
- All file reads, edits, and git commands operate inside `/workspace/.worktrees/<branch>`.
- Read the full PR diff to understand what was already changed: `gh pr diff <pr-number>`.
- Read each file mentioned in the review feedback to understand current state.

6. Implement the requested changes.

- Address each piece of review feedback.
- Make the smallest safe changes that satisfy the feedback.
- If feedback is ambiguous, use best judgment and note assumptions in the commit message.

7. Verify.

- Run focused tests first, then broader relevant tests (from within the worktree directory).
- Ensure existing tests still pass.
- If the review requested new tests, add them.

8. Commit and push.

- Stage only intended files (run git commands from the worktree path).
- Write a commit message referencing the review, e.g.: `Address review feedback on #<pr-number>`.
- Push to the existing PR branch: `git -C /workspace/.worktrees/<branch> push origin <branch>`.

9. Comment on the PR.

- Write the comment to a temp file, then post it:
  ```
  cat > /tmp/gh-body.md << 'EOF'
  ## Changes made (addressing review feedback)

  - <change 1>
  - <change 2>

  ## Testing

  - <test command and result>

  Ready for re-review.
  EOF
  gh pr comment <pr-number> --body-file /tmp/gh-body.md
  ```

10. Update issue labels.

- Remove `needs:changes`: `gh issue edit <number> --remove-label "needs:changes"`.
- Add `needs-review`: `gh issue edit <number> --add-label "needs-review"`.

11. Clean up the worktree.

- Remove the worktree directory only — do NOT delete the branch:
  ```
  git -C /workspace worktree remove /workspace/.worktrees/<branch>
  ```
- The branch remains available in the local repo and on the remote until the PR is merged.

## Guardrails

- Never `git switch` or `git checkout` in `/workspace`. Use worktrees only.
- Worktree root is always `/workspace/.worktrees/` — never use `/workspace/worktrees/` or any other path.
- Never force-push — only regular push to the PR branch.
- Only change files relevant to the review feedback.
- Do not modify unrelated code.
- If review feedback conflicts with the original issue requirements, note the conflict in a PR comment and follow the review feedback.
- Always verify tests pass before pushing.
- Always remove the worktree after pushing. Never delete the branch itself.
