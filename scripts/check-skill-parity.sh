#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pairs=(
  "build-feature:build-feature"
  "fix-pr:fix-pr"
  "issue:issue"
  "review-peer-prs:review-peer-prs"
  "run-tests:run-tests"
  "unwind:unwind"
  "work:work"
)

errors=0

for pair in "${pairs[@]}"; do
  codex_name="${pair%%:*}"
  claude_name="${pair##*:}"

  codex_file="$ROOT/skills/$codex_name/SKILL.md"
  claude_file="$ROOT/.claude/skills/$claude_name/SKILL.md"

  if [[ ! -f "$codex_file" ]]; then
    echo "Missing Codex skill file: $codex_file"
    errors=1
    continue
  fi
  if [[ ! -f "$claude_file" ]]; then
    echo "Missing Claude skill file: $claude_file"
    errors=1
    continue
  fi

  if ! diff -u "$codex_file" "$claude_file" > /tmp/skill-diff-$$.txt; then
    echo
    echo "Skill mismatch: skills/$codex_name/SKILL.md <> .claude/skills/$claude_name/SKILL.md"
    cat /tmp/skill-diff-$$.txt
    errors=1
  fi

done

rm -f /tmp/skill-diff-$$.txt

if [[ $errors -ne 0 ]]; then
  echo
  echo "Skill parity check failed."
  exit 1
fi

echo "Skill parity check passed."
