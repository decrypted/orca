#!/usr/bin/env node
// Builds the darwin-arm64 orcad slot on an Intel Mac: hosted Apple Silicon runners queue for an hour or more.
// build-orcad-prebuilds.mjs takes the slot's arch from process.arch and lets node-gyp default to the host's,
// so both are pointed at arm64 here; clang cross-compiles, provider-exec already builds per target.
// Usage (after pnpm run build:packages): node .github/fork-build/cross-build-darwin-arm64-slot.mjs
import { resolve } from 'node:path'

if (process.platform !== 'darwin' || process.arch !== 'x64') {
  throw new Error(
    `cross-build-darwin-arm64-slot runs on darwin-x64, not ${process.platform}-${process.arch}`
  )
}
const script = resolve(
  import.meta.dirname,
  '../../config/scripts/orcad-distribution/prebuilds/build-orcad-prebuilds.mjs'
)
Object.defineProperty(process, 'arch', { value: 'arm64' })
// node-gyp reads npm_config_* options; its child Node would otherwise build for x64.
process.env.npm_config_arch = 'arm64'
process.argv = [process.argv[0], script, '--slot=darwin-arm64']
await import(script)
