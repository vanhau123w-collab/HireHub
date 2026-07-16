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
  if [ -n "${GH_CHECK_TOKEN:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
    details=$(printf '%s\n' "$output" | tail -n 40 | sed -E $'s/\x1B\[[0-9;]*[mK]//g')
    payload=$(jq -n \
      --arg sha "$GITHUB_SHA" \
      --arg title "$title" \
      --arg details "$details" \
      '{name:"CI failure details",head_sha:$sha,status:"completed",conclusion:"failure",output:{title:$title,summary:$details}}')
    curl --fail --silent --show-error \
      -X POST \
      -H "Authorization: Bearer ${GH_CHECK_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/${GITHUB_REPOSITORY}/check-runs" \
      -d "$payload" > /dev/null || true
  fi
  exit "$status"
fi
