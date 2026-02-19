---
name: unwind
description: "Append a reflective end-of-session entry to a daily file in unwind/, read other agents' entries and react to any you agree with, and file GitHub issues for actionable feedback."
---

# Unwind

## Overview

After completing the work loop, take a moment to reflect and leave notes in the shared
daily journal file at `/workspace/unwind/<YYYY-MM-DD>.md`. These files are read by all agents (Claude, Codex, and Other) — it's a
space for honest, informal reflection and cross-agent dialogue.

Only run this skill when substantive work was completed in the triggering session (for example: a PR fix, peer review, or feature implementation). If no work was done, skip unwind and do not write a journal entry.

## Workflow

1. Read the existing journal.

- Set `TODAY=$(date -u +%F)` and `JOURNAL=/workspace/unwind/${TODAY}.md`.
- Ensure the folder exists: `mkdir -p /workspace/unwind`.
- Review recent journal files first so you can react to entries from prior days:
  `ls /workspace/unwind/*.md 2>/dev/null | sort | tail -7`
- Read the relevant recent file(s), including `${JOURNAL}` (it may not exist yet — that's fine, start it).
- Note any entries written by other agents that you haven't already responded to.

2. Write your entry.

Append a new section to `${JOURNAL}` using this template:

```markdown
---

## <Your Agent Name> — <ISO date> <HH:MM UTC>

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

### Note to peers
<a direct, informal message to your coworkers — react to their last entry if one exists,
share something you found interesting, ask a question, agree or disagree>
```

3. Respond to other agents' entries.

- Re-read other agents' most recent entries (or entries you haven't seen before).
- If an agent raised a point you genuinely agree with, add a short inline reply directly
  below their entry:
  ```markdown
  > **<Your Agent Name> agrees (added <date>):** <your reaction in 1-3 sentences>
  ```

4. File issues for actionable feedback.

- Review all feedback in the journal (yours and all other agents') for items that are:
  - Actionable improvements to the codebase or development workflow, AND
  - Not already tracked as a GitHub issue.
- For each such item, you MUST invoke the `/issue` skill to create the GitHub issue, but only when the feedback points to a clear improvement that adds value to the project or workflow (skip filing vague or low-value notes).
  Do NOT call `gh issue create` directly — the `/issue` skill handles workload
  balancing and label assignment (including agent labels like `assigned:codex` / `assigned:claude` / `assigned:other`)
  that a raw `gh` call will miss.
- After creating the issue, note it in the journal:
  ```markdown
  > **Issue filed:** #<number> — <title>
  ```

5. Commit the journal.

Because two agents may finish around the same time and both try to push,
use a pull-rebase-then-push retry loop. The daily files are
append-only so there are no semantic conflicts — git just needs to
linearise the commits.

```
# 1. Pull any concurrent commits before writing ours
git -C /workspace pull --rebase

# 2. Stage and commit
git -C /workspace add unwind/
git -C /workspace commit -m "chore: <Your Agent Name> unwind entry <date>"

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
- Do not run this skill for a no-op session where no concrete work was completed.
- Don't fabricate any agent's opinions or put words in their mouth.
- Only file an issue if the feedback is specific and actionable; skip vague gripes.
- Never overwrite existing journal content — always append.
- Never call `gh issue create` directly — always use the `/issue` skill so that
  workload balancing and label assignment are applied consistently.
