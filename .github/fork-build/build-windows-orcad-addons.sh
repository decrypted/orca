#!/usr/bin/env bash
# Usage: build-windows-orcad-addons.sh <host arch> [<other arch>...]   (Windows, repo root, dependencies installed)
# Builds the process-table and security addons the win32 orcad slots ship (private copies in .build/, the
# desktop's own addons stay untouched) and loads the host arch's: orcad's instance lock reads a PID's
# creation time through the first, its data-root privacy check fails closed without the second.
set -euo pipefail
host_arch="$1"
for arch in "$@"; do
  node config/scripts/native-build/windows/build-windows-process-tree-addon.mjs --arch="$arch"
  node config/scripts/native-build/windows/build-windows-security-addon.mjs --arch="$arch"
done
HOST_ARCH="$host_arch" node -e "
const arch = process.env.HOST_ARCH
const { assertWindowsProcessTreeCreationTime } = require('./config/scripts/native-build/windows/windows-process-tree-creation-time.cjs')
const addon = require('./.build/windows-process-tree/' + arch + '/windows-process-tree.node')
assertWindowsProcessTreeCreationTime({ module: addon })
if (addon.getProcessCreationTime(0x7ffffff0) !== undefined) throw new Error('a missing PID must read undefined')
require('./.build/windows-security/' + arch + '/windows-security.node').currentUserSid()
"
