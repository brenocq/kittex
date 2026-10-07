#!/bin/sh
# Runs the fuzz suite (core/test/fuzz/fuzz.test.ts) in shards without risking
# the machine:
#
#   npm run fuzz -- [cases] [findings dir]      # default 20000 cases
#
# - one fuzz run at a time machine-wide: a second run waits for the first
#   (agents in other worktrees share the lock);
# - KITTEX_FUZZ_JOBS shards (default 3), run side by side;
# - the whole run, every shard included, capped at KITTEX_FUZZ_MEM of RAM
#   (default 8G) with no swap, so a run that grows too big is killed alone
#   instead of the desktop.
#
# Other KITTEX_FUZZ_* variables (KITTEX_FUZZ_SHRINK, ...) pass through.
set -eu

cases=${1:-20000}
out=${2:-${KITTEX_FUZZ_OUT:-}}
jobs=${KITTEX_FUZZ_JOBS:-3}
mem=${KITTEX_FUZZ_MEM:-8G}
lock=${XDG_RUNTIME_DIR:-/tmp}/kittex-fuzz.lock
root=$(cd "$(dirname "$0")/.." && pwd)

shards='i=0; while [ "$i" -lt "$0" ]; do echo "$i"; i=$((i + 1)); done | xargs -P "$0" -I{} env KITTEX_FUZZ="$1" KITTEX_FUZZ_SHARD="{}/$0" KITTEX_FUZZ_OUT="$2" NODE_OPTIONS=--max-old-space-size=2048 npx vitest run core/test/fuzz/fuzz.test.ts'

cd "$root"
echo "fuzz: $cases cases in $jobs shards, at most $mem; waiting for $lock" >&2
if systemd-run --user --scope -q true 2>/dev/null; then
  exec flock "$lock" systemd-run --user --scope -q -p MemoryMax="$mem" -p MemorySwapMax=0 \
    sh -c "$shards" "$jobs" "$cases" "$out"
fi
# No user systemd: cap each shard's address space instead (looser, but bounded).
exec flock "$lock" sh -c "ulimit -v 4194304; $shards" "$jobs" "$cases" "$out"
