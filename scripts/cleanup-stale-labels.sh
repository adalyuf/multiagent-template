#!/usr/bin/env bash
# cleanup-stale-labels.sh
#
# Remove agent-workflow labels (needs-review, needs:changes) from any
# closed issues that still carry them.  GitHub auto-closes issues when
# a PR with "Closes #N" is merged, but it does not strip custom labels.
# Run this at the start of the work loop or any time label hygiene is
# desired.

set -euo pipefail

LABELS=("needs-review" "needs:changes")

for label in "${LABELS[@]}"; do
  # Collect closed issue numbers that still carry this label
  numbers=$(gh issue list --label "$label" --state closed --json number \
            --jq '.[].number' 2>/dev/null || true)

  for num in $numbers; do
    echo "Removing stale label '$label' from closed issue #$num"
    gh issue edit "$num" --remove-label "$label"
  done
done

echo "Stale label cleanup complete."
