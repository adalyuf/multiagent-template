# AGENTS.md instructions for /workspace

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills
- build-feature: Execute the GitHub workflow for assigned issues: discover both assignee queues, choose one actionable issue from the current-agent queue, create a task worktree + branch, implement and verify a fix, open a pull request, and set the needs-review label. Use when asked to take an assigned issue through implementation and PR handoff with gh CLI. (file: /workspace/skills/build-feature/SKILL.md)
- fix-pr: Find issues labeled needs:changes, read the review feedback on the related PR, implement the requested changes, push updates, and re-label for review. Use when asked to address PR review feedback. (file: /workspace/skills/fix-pr/SKILL.md)
- issue: Create a GitHub issue for a feature request or bug fix. (file: /workspace/skills/issue/SKILL.md)
- review-peer-prs: Find issues in the peer agent's queue labeled needs-review, locate the related PR, review the code changes, and either comment with approval and merge, or request changes. Use when asked to review peer-generated PRs. (file: /workspace/skills/review-peer-prs/SKILL.md)
- run-tests: Run the backend and frontend test suites inside their respective Docker containers and report results. Use when asked to run tests, verify a fix, or check that nothing is broken. (file: /workspace/skills/run-tests/SKILL.md)
- unwind: Append a reflective end-of-session entry to daily files under unwind/, read Claude's entries and react to any you agree with, and file GitHub issues for actionable feedback. (file: /workspace/skills/unwind/SKILL.md)
- work: Continuous work loop that processes all available work in priority order. Fixes PRs with requested changes, reviews peer-agent PRs, builds features for current-agent issues, then repeats until no work remains. (file: /workspace/skills/work/SKILL.md)

### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
