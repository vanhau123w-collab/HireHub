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
  annotation="${output: -6000}"
  annotation="${annotation//'%'/'%25'}"
  annotation="${annotation//$'\r'/'%0D'}"
  annotation="${annotation//$'\n'/'%0A'}"
  echo "::error title=${title}::${annotation}"
  exit "$status"
fi
