/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appRoot = process.cwd()
const repoRoot = resolve(appRoot, '..')

const files = {
  packageJson: resolve(appRoot, 'package.json'),
  packageLock: resolve(appRoot, 'package-lock.json'),
  sharedVersion: resolve(appRoot, 'src/shared/app-version.ts'),
  prd: resolve(appRoot, 'docs/PRD.md'),
  regression: resolve(appRoot, 'docs/computer-use-regression.md'),
  rootReadme: resolve(repoRoot, 'README.md')
}

const semverPattern =
  /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<pre>[0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

const parseArgs = (argv) => {
  const args = {
    check: false,
    dryRun: false,
    preid: 'rc',
    target: null
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--check') {
      args.check = true
      continue
    }

    if (value === '--dry-run') {
      args.dryRun = true
      continue
    }

    if (value === '--preid') {
      args.preid = argv[index + 1] ?? ''
      index += 1
      continue
    }

    if (!args.target) {
      args.target = value
      continue
    }

    throw new Error(`Unexpected argument: ${value}`)
  }

  return args
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const writeJson = (file, value) => {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

const assertVersion = (version) => {
  const match = version.match(semverPattern)
  if (!match) throw new Error(`Invalid semantic version: ${version}`)
  return match
}

const nextVersion = (current, target, preid) => {
  if (!target)
    throw new Error('Usage: npm run version:bump -- <major|minor|patch|prerelease|x.y.z>')
  if (semverPattern.test(target)) return target

  const match = assertVersion(current)
  const major = Number(match.groups.major)
  const minor = Number(match.groups.minor)
  const patch = Number(match.groups.patch)

  if (target === 'major') return `${major + 1}.0.0`
  if (target === 'minor') return `${major}.${minor + 1}.0`
  if (target === 'patch') return `${major}.${minor}.${patch + 1}`

  if (target === 'prerelease') {
    if (!preid || !/^[0-9A-Za-z-]+$/.test(preid)) {
      throw new Error('Prerelease id must contain only letters, numbers, and hyphens.')
    }

    const pre = match.groups.pre
    if (pre?.startsWith(`${preid}.`)) {
      const currentNumber = Number(pre.slice(preid.length + 1))
      const nextNumber = Number.isInteger(currentNumber) ? currentNumber + 1 : 0
      return `${major}.${minor}.${patch}-${preid}.${nextNumber}`
    }

    return `${major}.${minor}.${patch + 1}-${preid}.0`
  }

  throw new Error(`Unknown version target: ${target}`)
}

const replaceVersion = (content, pattern, next, label) => {
  if (!pattern.test(content)) {
    throw new Error(`Could not find version marker in ${label}`)
  }

  return content.replace(pattern, next)
}

const readVersions = () => {
  const packageJson = readJson(files.packageJson)
  const packageLock = readJson(files.packageLock)
  const sharedVersion = readFileSync(files.sharedVersion, 'utf8')
  const prd = readFileSync(files.prd, 'utf8')
  const regression = readFileSync(files.regression, 'utf8')
  const rootReadme = readFileSync(files.rootReadme, 'utf8')

  return {
    packageJson: packageJson.version,
    packageLock: packageLock.version,
    packageLockRoot: packageLock.packages?.['']?.version,
    sharedVersion: sharedVersion.match(/APP_VERSION = '([^']+)'/)?.[1],
    prd: prd.match(/\| 对应应用版本 \| ([^|]+?)\s+\|/)?.[1],
    regression: regression.match(/\| 对应应用版本 \| ([^|]+?)\s+\|/)?.[1],
    rootReadme: rootReadme.match(/项目处于 `([^`]+)` 开发阶段/)?.[1]
  }
}

const checkVersions = () => {
  const versions = readVersions()
  const expected = versions.packageJson
  const mismatches = Object.entries(versions)
    .filter(([, value]) => value !== expected)
    .map(([name, value]) => `${name}: ${value ?? '<missing>'}`)

  if (mismatches.length > 0) {
    throw new Error(`Version markers are not synchronized:\n${mismatches.join('\n')}`)
  }

  assertVersion(expected)
  console.log(`Version markers are synchronized at ${expected}.`)
}

const updateVersion = (version, dryRun) => {
  assertVersion(version)

  const packageJson = readJson(files.packageJson)
  packageJson.version = version

  const packageLock = readJson(files.packageLock)
  packageLock.version = version
  if (!packageLock.packages?.['']) throw new Error('package-lock root package entry is missing.')
  packageLock.packages[''].version = version

  const sharedVersion = replaceVersion(
    readFileSync(files.sharedVersion, 'utf8'),
    /APP_VERSION = '[^']+'/,
    `APP_VERSION = '${version}'`,
    'shared app version'
  )
  const prd = replaceVersion(
    readFileSync(files.prd, 'utf8'),
    /\| 对应应用版本 \| [^|]+?(\s+\|)/,
    `| 对应应用版本 | ${version}$1`,
    'PRD'
  )
  const regression = replaceVersion(
    readFileSync(files.regression, 'utf8'),
    /\| 对应应用版本 \| [^|]+?(\s+\|)/,
    `| 对应应用版本 | ${version}$1`,
    'Computer Use regression'
  )
  const rootReadme = replaceVersion(
    readFileSync(files.rootReadme, 'utf8'),
    /项目处于 `[^`]+` 开发阶段/,
    `项目处于 \`${version}\` 开发阶段`,
    'root README'
  )

  if (dryRun) {
    console.log(`Next version would be ${version}.`)
    return
  }

  writeJson(files.packageJson, packageJson)
  writeJson(files.packageLock, packageLock)
  writeFileSync(files.sharedVersion, sharedVersion)
  writeFileSync(files.prd, prd)
  writeFileSync(files.regression, regression)
  writeFileSync(files.rootReadme, rootReadme)
  console.log(`Updated app version to ${version}.`)
}

try {
  const args = parseArgs(process.argv.slice(2))

  if (args.check) {
    checkVersions()
  } else {
    const current = readJson(files.packageJson).version
    updateVersion(nextVersion(current, args.target, args.preid), args.dryRun)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
