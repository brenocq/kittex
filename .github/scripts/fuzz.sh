#!/bin/sh
# Runs the fuzz suite (core/test/fuzz/fuzz.test.ts) in shards without risking
# the machine:
#
#   npm run fuzz -- [cases] [findings dir]      # default 20000 cases
#
# - one fuzz run at a time machine-wide: a second run waits for the first
#   (agents in other worktrees share the lock, KITTEX_FUZZ_LOCK);
# - KITTEX_FUZZ_SHARDS shards (default twice the workers, so one slow shard
#   can't hold up the end), KITTEX_FUZZ_JOBS of them side by side (default 8;
#   a shard takes a few hundred MB, its heap capped at 2 GB);
# - with user systemd, the whole run capped at KITTEX_FUZZ_MEM of RAM (default
#   12G) with no swap, so a run that grows too big is killed alone instead of
#   the desktop; without it (macOS), at most 4 shards side by side.
#
# Other KITTEX_FUZZ_* variables (KITTEX_FUZZ_SHRINK, ...) pass through.
set -eu

cases=${1:-20000}
out=${2:-${KITTEX_FUZZ_OUT:-}}
jobs=${KITTEX_FUZZ_JOBS:-8}
mem=${KITTEX_FUZZ_MEM:-12G}
lock=${KITTEX_FUZZ_LOCK:-${XDG_RUNTIME_DIR:-/tmp}/kittex-fuzz.lock}
root=$(cd "$(dirname "$0")/../.." && pwd)

scope=
if systemd-run --user --scope -q true 2>/dev/null; then
  scope="systemd-run --user --scope -q -p MemoryMax=$mem -p MemorySwapMax=0"
elif [ "$jobs" -gt 4 ]; then
  jobs=4
fi
count=${KITTEX_FUZZ_SHARDS:-$((jobs * 2))}
locked=
if command -v flock >/dev/null 2>&1; then
  locked="flock $lock"
else
  echo "fuzz: no flock here, so nothing stops two runs at once" >&2
fi

# Each shard runs every seed s with s % count == its index; KITTEX_FUZZ is the
# whole run's case count.
shards='i=0; while [ "$i" -lt "$3" ]; do echo "$i"; i=$((i + 1)); done | xargs -P "$0" -I{} env KITTEX_FUZZ="$1" KITTEX_FUZZ_SHARD="{}/$3" KITTEX_FUZZ_OUT="$2" NODE_OPTIONS=--max-old-space-size=2048 npx vitest run --config core/vitest.config.ts core/test/fuzz/fuzz.test.ts'

cd "$root"
echo "fuzz: $cases cases in $count shards, $jobs at a time${scope:+, at most $mem}; lock $lock" >&2
# shellcheck disable=SC2086 # $locked and $scope are command prefixes
exec $locked $scope sh -c "$shards" "$jobs" "$cases" "$out" "$count"
