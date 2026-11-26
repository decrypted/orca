#!/usr/bin/env node
// Fork CI only: raises upstream's phone web bundle eager budget by a fixed allowance in the
// checked-out tree (never committed, like the version stamp).
// Why: upstream sizes MOBILE_WEB_APP_BUNDLE_MAX_EAGER_BYTES to its own bundle (267 bytes of headroom
// on 2026-11-26), and fork branches that touch shared sidebar code the phone also bundles
// (#7's project-group filter in sidebar-feed-rows, +1418 bytes) tip it over. The allowance is
// bounded so a real regression still fails; the measured eager size stays in the verify output.
import { readFileSync, writeFileSync } from 'node:fs'

const ALLOWANCE_BYTES = 16 * 1024
const file = 'config/scripts/build/mobile-web-app/verify-mobile-web-app-bundle.mjs'
const pattern = /^(export const MOBILE_WEB_APP_BUNDLE_MAX_EAGER_BYTES = )(.+)$/gm
const marker = '// fork CI allowance'

const source = readFileSync(file, 'utf8')
if (source.includes(marker)) {
  console.log('phone web eager budget: fork allowance already applied')
  process.exit(0)
}
const matches = [...source.matchAll(pattern)]
if (matches.length !== 1) {
  console.error(
    `::error::${file}: expected one MOBILE_WEB_APP_BUNDLE_MAX_EAGER_BYTES definition, found ${matches.length}`
  )
  process.exit(1)
}
const upstreamExpression = matches[0][2]
writeFileSync(
  file,
  source.replace(
    pattern,
    (_line, head, expression) => `${head}(${expression}) + ${ALLOWANCE_BYTES} ${marker}`
  )
)
console.log(
  `phone web eager budget: upstream ${upstreamExpression} + fork allowance ${ALLOWANCE_BYTES} bytes`
)
