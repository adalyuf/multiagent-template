---
name: build-feature
description: "Execute the GitHub workflow for assigned issues: discover both assignee queues, pick an actionable issue from the current-agent queue, create a task worktree + branch, implement and verify a fix, open a pull request, and set the needs-review label. Use when asked to take an assigned issue through implementation and PR handoff with gh CLI."
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
- Use absolute path: `/workspace/.worktrees/<branch>`.
- Do all issue edits, commits, and pushes from that issue worktree, not the shared root worktree.

## Workflow

1. Discover assigned issues.

- Run both:
  - `gh issue list --label assigned:codex --state open`
  - `gh issue list --label assigned:claude --state open`
- Use your agent queue:
  - Codex uses `assigned:codex`.
  - Claude uses `assigned:claude`.
- If your queue is empty, report that and stop.

2. Select the issue.

- Prefer issue labels or severity guidance if present.
- Read issue details with `gh issue view <number>`.
- Ensure the issue has your agent label:
  - Codex: `gh issue edit <number> --add-label assigned:codex`
  - Claude: `gh issue edit <number> --add-label assigned:claude`

3. Create task worktree and branch.

- Use `fix/issue-<number>-<short-slug>`.
- Create from `origin/main` with:
  - `git fetch origin`
  - `git worktree add -b <branch> /workspace/.worktrees/<branch> origin/main`
- Run all following commands from `/workspace/.worktrees/<branch>`.

- **Symlink untracked dependency directories** so tests run without a full install.
  Worktrees share git history but not untracked files like `node_modules`.
  After creating the worktree, symlink each dependency directory that exists in the main workspace:
  ```
  # Frontend JavaScript dependencies
  if [ -d /workspace/frontend/node_modules ]; then
    ln -s /workspace/frontend/node_modules \
          /workspace/.worktrees/<branch>/frontend/node_modules
  fi
  # Add similar lines for other package dirs if present
  ```

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

- After finishing the PR handoff, call `build-feature` again to pick up the next issue from your agent queue.
- Remove the issue worktree after handoff if it is clean:
  - First, remove any dependency symlinks created in step 3:
    ```
    rm /workspace/.worktrees/<branch>/frontend/node_modules
    # Remove any other symlinks created in step 3
    ```
  - Then `cd /workspace` to move the shell's cwd out of the worktree directory.
    Using `git -C /workspace` is not sufficient — the shell's cwd must actually
    change before the directory is deleted or subsequent commands will break.
  - Remove the worktree:
    ```
    cd /workspace && git worktree remove /workspace/.worktrees/<branch>
    ```

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
