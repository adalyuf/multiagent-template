---
name: review-codex-prs
description: Find issues labeled assigned:codex and needs-review, locate the related PR, review the code changes, and either comment with approval and merge, or request changes. Use when asked to review Codex-generated PRs.
---

# Review Codex PRs

## Overview

Find GitHub issues that Codex has worked on and are ready for review,
locate the associated PR, perform a code review, and either approve
(comment + merge) or request changes.

This skill reviews PRs via `gh pr diff` and `git show` without checking
out branches, so it is safe to run while other agents are working in
their own worktrees. Do NOT `git switch` or `git checkout` in `/workspace`.
If you need to read a specific file from the PR branch, use:
`git -C /workspace show origin/<branch>:<path/to/file>`

## Preconditions

- Confirm `gh auth status` succeeds.
- Do not switch branches in `/workspace` — reviews are read-only via `gh` and `git show`.

## Workflow

1. Discover issues ready for review.

- Run `gh issue list --label "assigned:codex" --label "needs-review" --state open --json number,title,labels,assignees`.
- If none are found, report that and stop.

2. Select an issue.

- Pick the oldest issue (lowest number) to review first.
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
- If no open PR is found, report that the issue has no PR to review and stop.

4. Review the PR.

- Read the PR details: `gh pr view <pr-number> --json number,title,body,headRefName`.
- Read the full diff: `gh pr diff <pr-number>`.
- Check CI status — **all required checks must be green**:
  ```
  gh pr checks <pr-number> --required
  ```
  If any required check has not passed, do not merge — request changes and note the failing checks.
- Review the code changes for:
  - **Correctness**: Does the change actually fix the issue?
  - **Tests**: Are there appropriate tests for the change?
  - **Side effects**: Does the change introduce unintended modifications?
  - **Code quality**: Is the code clean, readable, and consistent with the codebase?
  - **Security**: Are there any security concerns?
- If the diff is large, read individual changed files to understand the full context.

5. Make a review decision.

- **If approved** (correct, well-tested, all required checks green):
  - Write the review comment to a temp file, then post it:

    ```
    cat > /tmp/gh-body.md << 'EOF'
    ## Review of #<pr-number> (fixes #<issue-number>)

    ### Summary
    - <what the PR does>

    ### Findings
    - <finding 1>
    - <finding 2>

    ### Decision
    - Approved — merging.
    EOF
    gh pr comment <pr-number> --body-file /tmp/gh-body.md
    ```

  - Update the issue: remove `needs-review`, add `reviewed:approved`:
    ```
    gh issue edit <number> --remove-label "needs-review" --add-label "reviewed:approved"
    ```
  - Merge the PR: `gh pr merge <pr-number> --merge --delete-branch`.

- **If changes needed** (problems found or required checks failing):
  - Write the feedback to a temp file, then post it:

    ```
    cat > /tmp/gh-body.md << 'EOF'
    ## Review of #<pr-number> (fixes #<issue-number>)

    ### Summary
    - <what the PR does>

    ### Findings
    - <specific issue with file:line reference>

    ### Decision
    - Changes requested: <rationale>
    EOF
    gh pr comment <pr-number> --body-file /tmp/gh-body.md
    ```

  - Update the issue: remove `needs-review`, add `needs:changes`:
    ```
    gh issue edit <number> --remove-label "needs-review" --add-label "needs:changes"
    ```

## Guardrails

- Do NOT use `gh pr review --approve` (fails on own PRs). Use `gh pr comment` instead.
- Do NOT merge if any required CI check has not passed. Note the failing checks in the review comment.
- Provide specific, actionable feedback when requesting changes.
- Review the full diff, not just a summary.
