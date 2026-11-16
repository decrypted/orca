#!/usr/bin/env bash
# Usage: extract-orcad-donor.sh <version X.Y.Z> <sha256 of orca-ide_X.Y.Z_amd64.deb> <dest dir>
# Prints the donor's resources dir. ar + tar instead of dpkg-deb so the macOS runner can extract it too.
set -euo pipefail
version="$1"
sha256="$2"
dest="$3"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "bad donor version: $version" >&2; exit 1; }
[[ "$sha256" =~ ^[0-9a-f]{64}$ ]] || { echo "bad donor sha256: $sha256" >&2; exit 1; }
name="orca-ide_${version}_amd64.deb"
mkdir -p "$dest"
cd "$dest"
curl -fsSL --retry 3 -o "$name" "https://github.com/stablyai/orca/releases/download/v${version}/${name}"
echo "$sha256  $name" | shasum -a 256 -c - >&2
ar x "$name"
tar -xf data.tar.*
rm -f "$name" data.tar.* control.tar.* debian-binary
[ -f opt/Orca/resources/orcad-template/orcad-template.json ] || { echo "donor has no orcad template" >&2; exit 1; }
echo "$dest/opt/Orca/resources"
