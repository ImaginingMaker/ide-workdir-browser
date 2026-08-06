/// <reference types="node" />

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const runVersionScript = (...args: string[]): string =>
  execFileSync(process.execPath, ['scripts/bump-version.mjs', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })

const packageVersion = (): string => JSON.parse(readFileSync('package.json', 'utf8')).version

describe('app version control script', () => {
  it('checks that all version markers are synchronized', () => {
    expect(runVersionScript('--check')).toContain(
      `Version markers are synchronized at ${packageVersion()}.`
    )
  })

  it('supports dry-run explicit version bumps without writing files', () => {
    const currentVersion = packageVersion()

    expect(runVersionScript('9.9.9', '--dry-run')).toContain('Next version would be 9.9.9.')
    expect(packageVersion()).toBe(currentVersion)
  })
})
