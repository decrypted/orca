#!/usr/bin/env bash
# Usage: build-orcad-slot.sh <slot>   (run from the repo root, dependencies installed)
# Builds and gates one orcad slot into out/orcad-prebuilds: natively when <slot> is this host's, or
# darwin-arm64 cross-built on an Intel Mac. The cross slot can't be smoked (an Intel Mac cannot execute
# arm64), so it gets the manifest/hash gate plus a check that every Mach-O in it is arm64 only.
set -euo pipefail
slot="$1"
prebuilds=config/scripts/orcad-distribution/prebuilds/build-orcad-prebuilds.mjs
host_slot="$(node "$prebuilds" --print-slot)"
if [ "$slot" = "$host_slot" ]; then
  pnpm run build:orcad-prebuilds
  pnpm run build:orcad-prebuilds --require-slots "$slot"
  pnpm run build:orcad-prebuilds --smoke
elif [ "$slot" = darwin-arm64 ] && [ "$host_slot" = darwin-x64 ]; then
  pnpm run build:packages
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON .github/fork-build/cross-build-darwin-arm64-slot.mjs
  node "$prebuilds" --require-slots darwin-arm64
  bash .github/fork-build/check-macho-arch.sh out/orcad-prebuilds/darwin-arm64 arm64 --only
  echo "[build-orcad-slot] darwin-arm64 cross-built on darwin-x64; --smoke skipped (cannot execute arm64 here)"
else
  echo "[build-orcad-slot] cannot build $slot on $host_slot" >&2
  exit 1
fi
