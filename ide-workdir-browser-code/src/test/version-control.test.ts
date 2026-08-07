/// <reference types="node" />

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const versionScript = resolve('scripts/bump-version.mjs')
const repoRoot = resolve(process.cwd(), '..')
const temporaryDirectories: string[] = []

const runVersionScript = (args: string[], cwd = process.cwd()): string =>
  execFileSync(process.execPath, [versionScript, ...args], {
    cwd,
    encoding: 'utf8'
  })

const packageVersion = (): string => JSON.parse(readFileSync('package.json', 'utf8')).version

const createVersionFixture = (version: string): string => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'version-control-test-'))
  const appRoot = join(repoRoot, 'app')
  temporaryDirectories.push(repoRoot)
  mkdirSync(join(appRoot, 'src/shared'), { recursive: true })
  mkdirSync(join(appRoot, 'docs'), { recursive: true })
  writeFileSync(join(appRoot, 'package.json'), `${JSON.stringify({ version }, null, 2)}\n`)
  writeFileSync(
    join(appRoot, 'package-lock.json'),
    `${JSON.stringify({ version, packages: { '': { version } } }, null, 2)}\n`
  )
  writeFileSync(
    join(appRoot, 'src/shared/app-version.ts'),
    `export const APP_VERSION = '${version}'\n`
  )
  writeFileSync(join(appRoot, 'docs/PRD.md'), `| 对应应用版本 | ${version} |\n`)
  writeFileSync(join(appRoot, 'docs/computer-use-regression.md'), `| 对应应用版本 | ${version} |\n`)
  writeFileSync(join(repoRoot, 'README.md'), `项目处于 \`${version}\` 开发阶段\n`)
  return appRoot
}

describe('app version control script', () => {
  afterEach(() => {
    temporaryDirectories
      .splice(0)
      .forEach((directory) => rmSync(directory, { recursive: true, force: true }))
  })

  it('checks that all version markers are synchronized', () => {
    expect(runVersionScript(['--check'])).toContain(
      `Version markers are synchronized at ${packageVersion()}.`
    )
  })

  it('supports every stable increment in dry-run mode without writing files', () => {
    const currentVersion = packageVersion()
    const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!match) throw new Error('Test requires a semantic package version.')
    const [, major, minor, patch] = match.map(Number)

    expect(runVersionScript(['patch', '--dry-run'])).toContain(
      `Next version would be ${major}.${minor}.${patch + 1}.`
    )
    expect(runVersionScript(['minor', '--dry-run'])).toContain(
      `Next version would be ${major}.${minor + 1}.0.`
    )
    expect(runVersionScript(['major', '--dry-run'])).toContain(
      `Next version would be ${major + 1}.0.0.`
    )
    expect(runVersionScript(['9.9.9', '--dry-run'])).toContain('Next version would be 9.9.9.')
    expect(packageVersion()).toBe(currentVersion)
  })

  it('increments an existing prerelease and synchronizes every fixture marker', () => {
    const appRoot = createVersionFixture('1.2.3-beta.0')

    expect(runVersionScript(['prerelease', '--preid', 'beta'], appRoot)).toContain(
      'Updated app version to 1.2.3-beta.1.'
    )
    expect(JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')).version).toBe(
      '1.2.3-beta.1'
    )
    expect(readFileSync(join(appRoot, 'package-lock.json'), 'utf8')).toContain(
      '"version": "1.2.3-beta.1"'
    )
    expect(readFileSync(join(appRoot, 'src/shared/app-version.ts'), 'utf8')).toContain(
      "APP_VERSION = '1.2.3-beta.1'"
    )
    expect(readFileSync(join(appRoot, 'docs/PRD.md'), 'utf8')).toContain('1.2.3-beta.1')
    expect(readFileSync(join(appRoot, 'docs/computer-use-regression.md'), 'utf8')).toContain(
      '1.2.3-beta.1'
    )
    expect(readFileSync(join(appRoot, '../README.md'), 'utf8')).toContain('1.2.3-beta.1')
  })

  it('rejects unknown targets and invalid prerelease identifiers', () => {
    expect(() => runVersionScript(['build', '--dry-run'])).toThrow()
    expect(() =>
      runVersionScript(['prerelease', '--preid', 'invalid.value', '--dry-run'])
    ).toThrow()
  })

  it('keeps packaging separate from GitHub Release publishing', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts['build:mac']).toContain('--publish never')
  })

  it('keeps the GitHub Release body and artifacts in the documented format', () => {
    const workflow = readFileSync(join(repoRoot, '.github/workflows/release.yml'), 'utf8')

    expect(workflow).toContain('# IDE Workdir Browser ${{ steps.metadata.outputs.tag }}')
    expect(workflow).toContain('## Downloads')
    expect(workflow).toContain('## Installation')
    expect(workflow).toContain('shasum -a 256 -c SHA256SUMS')
    expect(workflow).toContain(
      'IDE Workdir Browser-${{ steps.metadata.outputs.version }}-arm64.dmg'
    )
    expect(workflow).toContain('IDE Workdir Browser-${{ steps.metadata.outputs.version }}-x64.dmg')
  })

  it('keeps every README screenshot linked and backed by a PNG design export', () => {
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8')
    const screenshots = ['browser-overview.png', 'markdown-preview.png', 'appearance-settings.png']

    screenshots.forEach((name) => {
      const relativePath = `ide-workdir-browser-code/docs/screenshots/${name}`
      const file = join(repoRoot, relativePath)

      expect(readme).toContain(relativePath)
      expect(existsSync(file)).toBe(true)
      expect(readFileSync(file).subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
      expect(statSync(file).size).toBeGreaterThan(10_000)
    })
  })
})
