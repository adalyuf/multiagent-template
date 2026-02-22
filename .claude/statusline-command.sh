#!/usr/bin/env bash

input=$(cat)

# --- Git branch / worktree ---
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
git_info=""
if [ -n "$cwd" ]; then
  # Detect if inside a worktree by checking commondir
  git_dir=$(git -C "$cwd" rev-parse --git-dir 2>/dev/null)
  if [ -n "$git_dir" ]; then
    # Resolve absolute git_dir path
    case "$git_dir" in
      /*) abs_git_dir="$git_dir" ;;
      *)  abs_git_dir="$cwd/$git_dir" ;;
    esac
    # Check for worktree (commondir file exists and differs from git_dir)
    if [ -f "$abs_git_dir/commondir" ]; then
      # This is a linked worktree — use the worktree folder name as label
      worktree_name=$(basename "$abs_git_dir")
      branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
      git_info="wt:${worktree_name}(${branch})"
    else
      branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
      git_info="${branch}"
    fi
  fi
fi

# --- Model name ---
model=$(echo "$input" | jq -r '.model.display_name // empty')

# --- Context usage ---
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# --- ANSI colors ---
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# --- Build plain-text segments (no ANSI) for width calculation ---
plain_parts=()
colored_parts=()

if [ -n "$git_info" ]; then
  plain_parts+=(" ${git_info}")
  colored_parts+=("$(printf "${CYAN}${BOLD} ${git_info}${RESET}")")
fi

if [ -n "$model" ]; then
  plain_parts+=("${model}")
  colored_parts+=("$(printf "${YELLOW}${model}${RESET}")")
fi

if [ -n "$used_pct" ]; then
  pct_int=$(printf "%.0f" "$used_pct" 2>/dev/null || echo "$used_pct")
  if [ "$pct_int" -ge 80 ] 2>/dev/null; then
    ctx_color="$RED"
  elif [ "$pct_int" -ge 50 ] 2>/dev/null; then
    ctx_color="$ORANGE"
  else
    ctx_color="$GREEN"
  fi
  plain_parts+=("ctx:${pct_int}%")
  colored_parts+=("$(printf "${ctx_color}ctx:${pct_int}%%${RESET}")")
fi

# --- Join parts with separator ---
plain_sep=" | "
colored_sep="$(printf "${DIM} | ${RESET}")"

plain_output=""
colored_output=""
for i in "${!plain_parts[@]}"; do
  if [ -z "$plain_output" ]; then
    plain_output="${plain_parts[$i]}"
    colored_output="${colored_parts[$i]}"
  else
    plain_output="${plain_output}${plain_sep}${plain_parts[$i]}"
    colored_output="${colored_output}${colored_sep}${colored_parts[$i]}"
  fi
done

printf "%b" "$colored_output"
