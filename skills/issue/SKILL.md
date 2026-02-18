---
name: issue
description: "Create a GitHub issue for a feature request or bug fix."
---

# Create GitHub Issue

## Overview

Create a well-structured GitHub issue from a user's description of a feature or bug.
Use `gh` to submit the issue and return the URL.

## Preconditions

- Confirm `gh auth status` succeeds before proceeding.

## Workflow

1. Understand the request.

- Read the user's description carefully.
- Determine whether this is a **bug** (something broken) or a **feature** (new capability).

2. Choose labels.

- Bug: `bug`
- Feature request: `enhancement`
- Balance workload between agents by counting only *actionable* open issues
  (exclude issues already in the review cycle via `needs-review` or `needs:changes`):
  ```
  gh issue list --label assigned:claude --state open --json number,labels \
    | jq '[.[] | select(.labels | map(.name) | (contains(["needs-review"]) or contains(["needs:changes"])) | not)] | length'
  gh issue list --label assigned:codex --state open --json number,labels \
    | jq '[.[] | select(.labels | map(.name) | (contains(["needs-review"]) or contains(["needs:changes"])) | not)] | length'
  ```
  Assign to whichever agent has fewer actionable open issues.
  Break ties by assigning to `assigned:codex`.
- Add any other relevant labels that already exist in the repo (check with `gh label list`).

3. Draft the issue.

- **Title**: concise, imperative phrase (e.g. "Fix login redirect loop" or "Add CSV export to reports").
- **Body**: use the template below, filling in only the sections that apply.

Bug template:
```
## Description

<what is broken and what the expected behavior is>

## Steps to Reproduce

1. <step>
2. <step>

## Acceptance Criteria

- [ ] <criterion>
```

Feature template:
```
## Description

<what the feature does and why it is needed>

## Acceptance Criteria

- [ ] <criterion>
- [ ] <criterion>
```

4. Create the issue.

- Write the body to a temp file, then create:
  ```
  cat > /tmp/gh-issue-body.md << 'EOF'
  <body>
  EOF
  gh issue create --title "<title>" --body-file /tmp/gh-issue-body.md --label "<label>,<assigned:claude|assigned:codex>"
  ```

5. Report back.

- Print the issue URL returned by `gh issue create`.

## Guardrails

- Do not assign the issue or add a milestone unless the user requests it.
- Keep the title short (under 72 characters).
- Do not guess at labels that do not exist in the repo.
