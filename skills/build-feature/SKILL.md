---
name: build-feature
description: "Execute the GitHub workflow for assigned issues: find open issues with label assigned:codex, choose one actionable issue, create a task worktree + branch, implement and verify a fix, open a pull request, and set the needs-review label. Use when asked to take an assigned issue through implementation and PR handoff with gh CLI."
---

# GitHub Assigned Issue PR

## Overview

Execute a consistent, end-to-end issue workflow with `gh` and `git`.
Prioritize correctness, minimal diffs, and explicit verification.

## Preconditions

- Confirm repository remotes and worktree status before editing.
- Confirm `gh auth status` succeeds.
- Leave unrelated local changes untouched.

## Worktree Conventions

- Use a dedicated worktree per issue so multiple agents can run concurrently.
- Use absolute path: `/workspace/worktrees/<branch>`.
- Do all issue edits, commits, and pushes from that issue worktree, not the shared root worktree.

## Workflow

1. Discover assigned issues.

- Run `gh issue list --label assigned:codex --state open`.
- If none are assigned, report that and stop.

2. Select the issue.

- Prefer issue labels or severity guidance if present.
- Read issue details with `gh issue view <number>`.
- Add the `assigned:codex` label if missing: `gh issue edit <number> --add-label assigned:codex`.

3. Create task worktree and branch.

- Use `fix/issue-<number>-<short-slug>`.
- Create from `origin/main` with:
  - `git fetch origin`
  - `git worktree add -b <branch> /workspace/worktrees/<branch> origin/main`
- Run all following commands from `/workspace/worktrees/<branch>`.

4. Verify issue-described base state on `main`.

- Before editing, confirm that the key base-state assumption in the issue body is actually true on `origin/main`.
- Use quick checks (`rg`, targeted file reads, or `gh pr list --search`) from the issue worktree to validate the described starting point.
- If the described state is not present on `main`:
  - Note the mismatch in your PR summary.
  - Adjust implementation to the real `main` state (do not assume pending/unmerged PR state).

5. Implement fix.

- Make the smallest safe change that satisfies acceptance criteria.
- Update tests only when required by behavior changes.

6. Verify.

- Run focused tests first, then broader relevant tests.
- Record pass/fail summary for PR notes.

7. Commit and push.

- Stage only intended files.
- Write a specific commit message.
- Push: `git push -u origin <branch>`.

8. Open PR.

- Create PR against `main` unless repo specifies another base.
- Include summary, testing, and `Closes #<number>`.
- Standardize on `--body-file`:
  - Write PR body to `/tmp/pr-<number>.md`.
  - Create PR with `gh pr create --base main --head <branch> --title "<title>" --body-file /tmp/pr-<number>.md`.

9. Apply review label.

- Add `needs-review` label to PR.
- If workflow expects issue labeling too, add `needs-review` to the issue.

10. Continue queue processing.

- After finishing the PR handoff, call `build-feature` again to pick up the next `assigned:codex` issue.
- Remove the issue worktree after handoff if it is clean:
  - Return to the root workspace first: `cd /workspace`.
  - Remove from root workspace: `cd /workspace && git worktree remove /workspace/worktrees/<branch>`.

## PR Body Template

Use this structure:

```md
## Summary

- <change 1>
- <change 2>

## Testing

- `<command>`
- `<command>`

Closes #<issue-number>
```

## Guardrails

- Never include unrelated file changes in commits.
- Never remove or revert user changes you did not make.
- Never use `git switch` in the shared root worktree for task development.
- Always clean up the issue worktree when the task is complete.
- If tooling fails (for example, old `gh` behavior), use `gh api` fallback and verify resulting PR/labels explicitly.
