#!/usr/bin/env bash
# find-pr-for-issue.sh <issue-number>
#
# Prints the PR number associated with the given issue, then exits 0.
# Exits 1 if no PR is found.
#
# Strategy (in order):
#   1. GitHub timeline API — looks for cross-referenced PR events.
#      Works for both open and closed PRs, regardless of merge state.
#   2. PR body search — scans open + closed PRs for "Closes #N" or
#      "Fixes #N" patterns in the body text.
#
# This avoids `gh issue view --json linkedPullRequests`, which is
# unavailable in some gh CLI versions deployed in agent environments.

set -euo pipefail

ISSUE="${1:-}"
if [[ -z "$ISSUE" ]]; then
  echo "Usage: $0 <issue-number>" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

# --- Strategy 1: timeline cross-reference ---------------------------------
PR=$(gh api "repos/${REPO}/issues/${ISSUE}/timeline" --paginate \
  --jq '[.[] | select(.event == "cross-referenced")
             | select(.source.issue.pull_request != null)
             | .source.issue.number] | last // empty' 2>/dev/null || true)

if [[ -n "$PR" ]]; then
  echo "$PR"
  exit 0
fi

# --- Strategy 2: PR body search -------------------------------------------
# Search both open and closed PRs for "Closes #N" / "Fixes #N" in the body.
PR=$(gh pr list --state all --json number,body \
  --jq "[.[] | select(.body | test(\"(Closes|Fixes|closes|fixes) #${ISSUE}(\\\\b|$)\"))
             | .number] | first // empty" 2>/dev/null || true)

if [[ -n "$PR" ]]; then
  echo "$PR"
  exit 0
fi

echo "No PR found for issue #${ISSUE}" >&2
exit 1
