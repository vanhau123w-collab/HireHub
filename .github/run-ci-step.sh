#!/usr/bin/env bash
set -o pipefail

title="$1"
shift

set +e
output=$("$@" 2>&1)
status=$?
set -e

echo "$output"

if [ "$status" -ne 0 ]; then
  annotation=$(printf '%s\n' "$output" | tail -n 24 | sed -E $'s/\x1B\[[0-9;]*[mK]//g' | tr '\n' ' ')
  annotation="${annotation: -3000}"
  annotation="${annotation//'%'/'%25'}"
  annotation="${annotation//$'\r'/''}"
  echo "::error file=.github/workflows/ci.yml,line=1,title=${title}::${annotation}"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "### ${title}"
      echo '```text'
      printf '%s\n' "$output" | tail -n 40
      echo '```'
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit "$status"
fi
