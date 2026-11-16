#!/usr/bin/env node
// The fork has no runners for most orcad targets: take their native slots from an official release,
// hash-checked against its manifest; common JS and the host target stay the fork's own build.
// Usage: node graft-orcad-template-targets.mjs <donor resources dir>
//        node graft-orcad-template-targets.mjs --check <donor resources dir> <targets built here, comma-separated>
// --check exits 3 when the donor's slots no longer match this source (a slot file or pin changed since the release).
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '../..')
const outDir = join(root, 'out')
const templateDir = join(outDir, 'orcad-template')
const { orcadTemplatePackagedRipgrep, orcadTemplateTargetFilenames } = require(
  join(root, 'src/shared/remote-runtime/orcad-distribution/orcad-artifacts.ts')
)
const { ORCAD_TEMPLATE_TARGETS, pinnedNodeRuntimeAsset } = require(
  join(root, 'src/shared/node-runtime/node-runtime-pin.ts')
)
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

function readDonor(donorResources) {
  return JSON.parse(
    readFileSync(join(donorResources, 'orcad-template/orcad-template.json'), 'utf8')
  )
}

function donorProblems(donorResources, donor, builtTargets) {
  const problems = []
  for (const target of ORCAD_TEMPLATE_TARGETS) {
    if (builtTargets.includes(target)) {
      continue
    }
    const entry = donor.targets[target]
    if (!entry) {
      problems.push(`${target}: missing from the donor`)
      continue
    }
    // packagedBrowser points at the app's own agent-browser; packaging (referencePackagedOrcadBrowser) re-adds it.
    if (entry.browserName && entry.packagedBrowser !== true) {
      problems.push(`${target}: donor ships its own browser`)
    }
    const expected = [...orcadTemplateTargetFilenames(target)].sort()
    const got = Object.keys(entry.files).sort()
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      problems.push(`${target}: donor files ${got.join(',')} vs source ${expected.join(',')}`)
      continue
    }
    const runtime = readFileSync(
      join(donorResources, 'orcad-template/targets', target, '.runtime-node'),
      'utf8'
    ).trim()
    if (runtime !== pinnedNodeRuntimeAsset(target).executableSha256) {
      problems.push(`${target}: donor Node runtime pin differs from the source`)
    }
  }
  return problems
}

function graft(donorResources) {
  const { verifyPackagedOrcadTemplate } = require(
    join(root, 'config/scripts/orcad-distribution/template/verify-packaged-orcad-template.cjs')
  )
  const donor = readDonor(donorResources)
  const manifestPath = join(templateDir, 'orcad-template.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const built = Object.keys(manifest.targets)
  console.log(`[graft] built targets: ${built.join(', ')}; donor schema ${donor.schemaVersion}`)
  const problems = donorProblems(donorResources, donor, built)
  if (problems.length > 0) {
    throw new Error(`[graft] donor does not fit this source:\n  ${problems.join('\n  ')}`)
  }
  const grafted = []
  for (const target of ORCAD_TEMPLATE_TARGETS.filter((t) => !built.includes(t))) {
    const entry = donor.targets[target]
    const packagedRipgrep = orcadTemplatePackagedRipgrep(
      donor.schemaVersion,
      target,
      entry.packagedRipgrep
    )
    const destDir = join(templateDir, 'targets', target)
    cpSync(join(donorResources, 'orcad-template/targets', target), destDir, { recursive: true })
    if (packagedRipgrep) {
      const dest = join(destDir, ...packagedRipgrep.split('/'))
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(join(donorResources, ...packagedRipgrep.split('/')), dest)
      chmodSync(dest, 0o755)
    }
    for (const [file, hash] of Object.entries(entry.files)) {
      if (sha256(join(destDir, ...file.split('/'))) !== hash) {
        throw new Error(`[graft] ${target}/${file}: checksum mismatch`)
      }
    }
    manifest.targets[target] = { files: entry.files }
    grafted.push(target)
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  verifyPackagedOrcadTemplate(outDir, ORCAD_TEMPLATE_TARGETS)
  console.log(`[graft] grafted from donor: ${grafted.join(', ')}`)
  const all = Object.keys(manifest.targets).sort()
  console.log(`[graft] ok — ${all.length} targets: ${all.join(', ')}`)
}

if (process.argv[2] === '--check') {
  const donorResources = resolve(process.argv[3])
  const builtTargets = (process.argv[4] ?? '').split(',').filter(Boolean)
  const problems = donorProblems(donorResources, readDonor(donorResources), builtTargets)
  if (problems.length > 0) {
    console.log(`[graft] donor does not fit this source:\n  ${problems.join('\n  ')}`)
    process.exit(3)
  }
  console.log(`[graft] donor fits; built here: ${builtTargets.join(', ')}`)
} else {
  graft(resolve(process.argv[2]))
}
