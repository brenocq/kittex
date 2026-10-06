#!/bin/sh
# Points the `assets` branch at one new parentless commit holding the README's
# media, as generated into .github/assets/:
#
#   scripts/readme/publish-assets.sh
#   git push --force-with-lease origin assets
#
# The branch never has more than that one commit, so a full clone fetches only
# the current media, and plugin installs (a shallow clone of the default
# branch) fetch none of it. Builds the commit from git objects alone: no
# checkout, no change to any working tree or index.
set -eu

root=$(git rev-parse --show-toplevel)
dir="$root/.github/assets"
files="banner.svg demo.webp demo.png demo.mp4 demo.rec.gz"

GIT_INDEX_FILE=$(mktemp -u "${TMPDIR:-/tmp}/kittex-assets-index.XXXXXX")
export GIT_INDEX_FILE
trap 'rm -f "$GIT_INDEX_FILE"' EXIT

for file in $files; do
  [ -f "$dir/$file" ] || { echo "missing $dir/$file" >&2; exit 1; }
  blob=$(git hash-object -w "$dir/$file")
  git update-index --add --cacheinfo "100644,$blob,$file"
done

source=$(git rev-parse --short HEAD)
commit=$(git commit-tree "$(git write-tree)" -m "chore(assets): README media" -m "Generated from $source by scripts/readme. This branch always holds this one commit: each update replaces it.")
git update-ref -m "publish README media" refs/heads/assets "$commit"
echo "assets -> $(git rev-parse --short "$commit"): $files"
