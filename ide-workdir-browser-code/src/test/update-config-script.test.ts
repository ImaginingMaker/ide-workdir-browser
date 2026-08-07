/// <reference types="node" />

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const temporaryDirectories: string[] = []

const createOutput = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'update-config-test-'))
  temporaryDirectories.push(directory)
  return join(directory, 'update-config.json')
}

const runScript = (output: string, args: string[] = [], env: Record<string, string> = {}): string =>
  execFileSync(
    process.execPath,
    ['scripts/generate-update-config.mjs', '--output', output, ...args],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        APP_UPDATE_REPOSITORY: '',
        GITHUB_REPOSITORY: '',
        ...env
      }
    }
  )

const readConfig = (output: string): { repository: string | null } =>
  JSON.parse(readFileSync(output, 'utf8')) as { repository: string | null }

describe('update config generator', () => {
  afterEach(() => {
    temporaryDirectories
      .splice(0)
      .forEach((directory) => rmSync(directory, { recursive: true, force: true }))
  })

  it('writes an explicitly configured public repository', () => {
    const output = createOutput()

    expect(runScript(output, ['--repository', 'example/project'])).toContain(
      'Configured the application update source.'
    )
    expect(readConfig(output)).toEqual({ repository: 'example/project' })
  })

  it('prefers the application environment variable over the GitHub environment', () => {
    const output = createOutput()

    runScript(output, [], {
      APP_UPDATE_REPOSITORY: 'example/application',
      GITHUB_REPOSITORY: 'example/automation'
    })

    expect(readConfig(output)).toEqual({ repository: 'example/application' })
  })

  it('uses the GitHub repository when no application override exists', () => {
    const output = createOutput()

    runScript(output, [], { GITHUB_REPOSITORY: 'example/automation' })

    expect(readConfig(output)).toEqual({ repository: 'example/automation' })
  })

  it('writes an explicit disabled state when no repository is configured', () => {
    const output = createOutput()

    expect(runScript(output)).toContain('Update source disabled.')
    expect(readConfig(output)).toEqual({ repository: null })
  })

  it.each([
    'missing-owner',
    '/missing-owner',
    'missing-repository/',
    '../escape',
    'owner/repository/extra',
    'owner/repository..invalid'
  ])('rejects the invalid repository slug %s', (repository) => {
    const output = createOutput()

    expect(() => runScript(output, ['--repository', repository])).toThrow()
  })
})
