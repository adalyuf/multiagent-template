---
name: build-feature
description: "Find open issues, choose one, create a worktree, implement and verify a fix, open a pull request."
---

# GitHub Assigned Issue PR

## Overview

Execute a consistent, end-to-end issue workflow with `gh` and `git`.
Prioritize correctness, minimal diffs, and explicit verification.

Work is always done in an isolated git worktree under `/workspace/.worktrees/<branch>`
so that multiple agents can operate simultaneously without interfering with each other.
The main `/workspace` checkout always stays on `main`.

## Preconditions

- Confirm repository remotes and branch status before editing.
- Confirm `gh auth status` succeeds.
- Leave unrelated local changes untouched.

## Workflow

1. Discover assigned issues.

- Run `gh issue list --label assigned:claude --state open`.
- If none are assigned, report that and stop.

2. Select the issue.

- Prefer the lowest-numbered actionable issue (no `needs-review` or `needs:changes` label).
- Read issue details with `gh issue view <number> --json number,title,body,labels`.
- Add the `assigned:claude` label if missing: `gh issue edit <number> --add-label assigned:claude`.

3. Create a worktree for the branch.

- Branch name: `fix/issue-<number>-<short-slug>`.
- Worktree path: `/workspace/.worktrees/<branch>` (e.g. `/workspace/.worktrees/fix/issue-22-my-slug`).
- Create the branch and worktree in one step:
  ```
  git -C /workspace worktree add /workspace/.worktrees/<branch> -b <branch>
  ```
- All subsequent file reads, edits, and git commands operate inside `/workspace/.worktrees/<branch>`.

4. Implement fix.

- Make the smallest safe change that satisfies acceptance criteria.
- Update tests only when required by behavior changes.

5. Verify.

- Run focused tests first, then broader relevant tests (from within the worktree directory).
- Record pass/fail summary for PR notes.

6. Commit and push.

- Stage only intended files (run git commands from the worktree path).
- Write a specific commit message.
- Push: `git -C /workspace/.worktrees/<branch> push -u origin <branch>`.

7. Open PR.

- Write the PR body to a temp file, then create the PR:
  ```
  cat > /tmp/gh-body.md << 'EOF'
  ## Summary

  - <change 1>
  - <change 2>

  ## Testing

  - `<command and result>`

  Closes #<issue-number>
  EOF
  gh pr create --title "<title>" --body-file /tmp/gh-body.md --base main --head <branch>
  ```

8. Apply review label.

- Add `needs-review` label to the PR and to the issue.

9. Clean up the worktree.

- Remove the worktree directory only — do NOT delete the branch:
  ```
  git -C /workspace worktree remove /workspace/.worktrees/<branch>
  ```
- The branch remains available in the local repo and on the remote until the PR is merged.

## Guardrails

- Never `git switch` or `git checkout` in `/workspace`. Use worktrees only.
- Worktree root is always `/workspace/.worktrees/` — never use `/workspace/worktrees/` or any other path.
- Never include unrelated file changes in commits.
- Never remove or revert user changes you did not make.
- If tooling fails (for example, old `gh` behavior), use `gh api` fallback and verify resulting PR/labels explicitly.
- Always remove the worktree after the branch is pushed. Never delete the branch itself.
