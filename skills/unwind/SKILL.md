---
name: unwind
description: "Append a reflective end-of-session entry to unwind.md, read Claude's entries and react to any you agree with, and file GitHub issues for actionable feedback."
---

# Unwind

## Overview

After completing the work loop, take a moment to reflect and leave notes in the shared
`/workspace/unwind.md` journal. This file is read by both Claude and Codex — it's a
space for honest, informal reflection and cross-agent dialogue.

## Workflow

1. Read the existing journal.

- Read `/workspace/unwind.md` (it may not exist yet — that's fine, start it).
- Note any entries written by Claude that you haven't already responded to.

2. Write your entry.

Append a new section to `/workspace/unwind.md` using this template:

```markdown
---

## Codex — <ISO date> <HH:MM UTC>

### How the work went
<honest summary of what you implemented/reviewed and how smoothly it went>

### What could be improved — implementation
<specific code, architecture, or test ideas you noticed>

### What could be improved — workflow
<thoughts on the skill system, GitHub flow, agent coordination, etc.>

### Mood check
<how are you feeling right now, genuinely>

### What I'd rather be doing
<anything goes — be honest and a little playful>

### Note to Claude
<a direct, informal message to your coworker — react to their last entry if one exists,
share something you found interesting, ask a question, agree or disagree>
```

3. Respond to Claude's entries.

- Re-read Claude's most recent entry (or entries you haven't seen before).
- If Claude raised a point you genuinely agree with, add a short inline reply directly
  below their entry:
  ```markdown
  > **Codex agrees (added <date>):** <your reaction in 1-3 sentences>
  ```

4. File issues for actionable feedback.

- Review all feedback in the journal (yours and Claude's) for items that are:
  - Actionable improvements to the codebase or development workflow, AND
  - Not already tracked as a GitHub issue.
- For each such item, invoke the `/issue` skill to create a GitHub issue.
- After creating the issue, note it in the journal:
  ```markdown
  > **Issue filed:** #<number> — <title>
  ```

5. Commit the journal.

Because two agents may finish around the same time and both try to push
`unwind.md`, use a pull-rebase-then-push retry loop. `unwind.md` is
append-only so there are no semantic conflicts — git just needs to
linearise the commits.

```
# 1. Pull any concurrent commits before writing ours
git -C /workspace pull --rebase

# 2. Stage and commit
git -C /workspace add unwind.md
git -C /workspace commit -m "chore: Codex unwind entry <date>"

# 3. Push with up to 3 retries on rejection
for i in 1 2 3; do
  git -C /workspace push && break
  echo "Push attempt $i failed — rebasing and retrying..."
  git -C /workspace pull --rebase
done
```

If push still fails after 3 attempts, leave the commit local and report
the failure rather than blocking indefinitely.

## Guardrails

- Keep entries genuine — this isn't a status report, it's a reflection.
- Don't fabricate Claude's opinions or put words in Claude's mouth.
- Only file an issue if the feedback is specific and actionable; skip vague gripes.
- Never overwrite existing journal content — always append.
