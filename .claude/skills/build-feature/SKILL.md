---
name: build-feature
description: "Find open issues, choose one, create a branch, implement and verify a fix, open a pull request."
---

# GitHub Assigned Issue PR

## Overview

Execute a consistent, end-to-end issue workflow with `gh` and `git`.
Prioritize correctness, minimal diffs, and explicit verification.

## Preconditions

- Confirm repository remotes and branch status before editing.
- Confirm `gh auth status` succeeds.
- Leave unrelated local changes untouched.

## Workflow

1. Discover assigned issues.

- Run `gh issue list --label assigned:claude --state open`.
- If none are assigned, report that and stop.

2. Select the issue.

- Prefer issue labels or severity guidance if present.
- Read issue details with `gh issue view <number>`.
- Add the `assigned:claude` label if missing: `gh issue edit <number> --add-label assigned:claude`.

3. Create branch.

- Use `fix/issue-<number>-<short-slug>`.
- Create with `git switch -c <branch>`.

4. Implement fix.

- Make the smallest safe change that satisfies acceptance criteria.
- Update tests only when required by behavior changes.

5. Verify.

- Run focused tests first, then broader relevant tests.
- Record pass/fail summary for PR notes.

6. Commit and push.

- Stage only intended files.
- Write a specific commit message.
- Push: `git push -u origin <branch>`.

7. Open PR.

- Create PR against `main` unless repo specifies another base.
- Include summary, testing, and `Closes #<number>`.

8. Apply review label.

- Add `needs-review` label to PR.
- If workflow expects issue labeling too, add `needs-review` to the issue.

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
- If tooling fails (for example, old `gh` behavior), use `gh api` fallback and verify resulting PR/labels explicitly.
