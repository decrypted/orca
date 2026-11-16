#!/usr/bin/env bash
# Usage: check-macho-arch.sh <dir> <arch> [--only]
# Fails when a Mach-O file under <dir> lacks <arch> (--only: has any other arch too). Universal files
# pass without --only: upstream ships its Swift helpers universal in every macOS package.
# The orcad template's other targets and the other platforms' ripgrep copies are skipped; Orca uploads those
# to remote hosts of other platforms.
set -euo pipefail
dir="$1"
arch="$2"
only="${3:-}"
total=0 universal=0 bad=0
while IFS= read -r path; do
  case "$path" in
    */orcad-template/targets/darwin-"$arch"/*) ;;
    */orcad-template/targets/*) continue ;;
    */ripgrep/darwin-"$arch"/*) ;;
    */ripgrep/*/*) continue ;;
  esac
  archs="$(lipo -archs "$path" 2>/dev/null || echo unreadable)"
  total=$((total + 1))
  if [[ " $archs " != *" $arch "* ]] || { [ "$only" = --only ] && [ "$archs" != "$arch" ]; }; then
    echo "::error::${path#"$dir"/}: $archs"
    bad=$((bad + 1))
  elif [ "$archs" != "$arch" ]; then
    echo "universal: ${path#"$dir"/} ($archs)"
    universal=$((universal + 1))
  fi
done < <(find "$dir" -type f -print0 | xargs -0 file -h -F $'\t' | awk -F'\t' '$2 ~ /Mach-O/ { sub(/ \(for architecture [^)]*\):?$/, "", $1); print $1 }' | sort -u)
echo "[check-macho-arch] $dir: $total Mach-O files, $universal universal, $bad without $arch${only:+ only}"
[ "$total" -gt 0 ] || { echo "::error::no Mach-O files under $dir"; exit 1; }
[ "$bad" -eq 0 ]
