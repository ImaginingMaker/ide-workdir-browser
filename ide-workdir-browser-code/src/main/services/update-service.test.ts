/// <reference types="node" />

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readUpdateRepository, UpdateService } from './update-service'

const repository = 'example/project'
const releaseUrl = 'https://github.com/example/project/releases/tag/v1.2.0'
const publishedAt = '2026-08-07T00:00:00Z'
const temporaryDirectories: string[] = []

const response = (status: number, body: unknown = {}): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn(() => Promise.resolve(body))
  }) as unknown as Response

const release = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  tag_name: 'v1.2.0',
  html_url: releaseUrl,
  published_at: publishedAt,
  ...overrides
})

describe('update repository config', () => {
  afterEach(() => {
    temporaryDirectories
      .splice(0)
      .forEach((directory) => rmSync(directory, { recursive: true, force: true }))
  })

  const writeConfig = (value: unknown): string => {
    const appPath = mkdtempSync(join(tmpdir(), 'update-service-test-'))
    temporaryDirectories.push(appPath)
    mkdirSync(join(appPath, 'out'), { recursive: true })
    writeFileSync(join(appPath, 'out/update-config.json'), JSON.stringify(value))
    return appPath
  }

  it('reads a generated repository slug', () => {
    expect(readUpdateRepository(writeConfig({ repository }))).toBe(repository)
  })

  it.each([
    { repository: null },
    { repository: '../escape' },
    { repository: 'owner/repository/extra' },
    { other: repository }
  ])('rejects an unavailable or invalid generated config', (value) => {
    expect(readUpdateRepository(writeConfig(value))).toBeNull()
  })

  it('returns null when the generated config is absent or malformed', () => {
    expect(readUpdateRepository('/tmp/update-config-does-not-exist')).toBeNull()
    expect(readUpdateRepository(writeConfig('{invalid'))).toBeNull()
  })
})

describe('UpdateService', () => {
  it('does not request the network when no update source is configured', async () => {
    const fetcher = vi.fn()

    await expect(new UpdateService('1.0.0', null, fetcher).check()).resolves.toEqual({
      status: 'unconfigured',
      currentVersion: '1.0.0'
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns an available stable release from the fixed GitHub endpoint', async () => {
    const fetcher = vi.fn(() => Promise.resolve(response(200, release())))

    await expect(new UpdateService('1.1.0', repository, fetcher).check()).resolves.toEqual({
      status: 'available',
      currentVersion: '1.1.0',
      latestVersion: '1.2.0',
      releaseUrl,
      publishedAt
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/example/project/releases/latest',
      expect.objectContaining({
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'IDE-Workdir-Browser',
          'X-GitHub-Api-Version': '2026-03-10'
        },
        signal: expect.any(AbortSignal)
      })
    )
  })

  it.each(['1.2.0', '1.3.0'])(
    'reports the current app version when the local version is %s',
    async (currentVersion) => {
      const fetcher = vi.fn(() => Promise.resolve(response(200, release())))

      await expect(new UpdateService(currentVersion, repository, fetcher).check()).resolves.toEqual(
        {
          status: 'current',
          currentVersion,
          latestVersion: '1.2.0'
        }
      )
    }
  )

  it('treats the stable release as newer than a matching prerelease', async () => {
    const fetcher = vi.fn(() => Promise.resolve(response(200, release())))

    await expect(
      new UpdateService('1.2.0-rc.1', repository, fetcher).check()
    ).resolves.toMatchObject({
      status: 'available',
      latestVersion: '1.2.0'
    })
  })

  it('reports a repository without stable releases', async () => {
    const fetcher = vi.fn(() => Promise.resolve(response(404)))

    await expect(new UpdateService('1.0.0', repository, fetcher).check()).resolves.toEqual({
      status: 'no-release',
      currentVersion: '1.0.0'
    })
  })

  it.each([403, 429])('maps HTTP %s to a rate limit result', async (status) => {
    const fetcher = vi.fn(() => Promise.resolve(response(status)))

    await expect(new UpdateService('1.0.0', repository, fetcher).check()).resolves.toEqual({
      status: 'error',
      currentVersion: '1.0.0',
      error: 'rate-limited'
    })
  })

  it('maps other unsuccessful responses without exposing their body', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(response(500, { message: 'sensitive upstream response' }))
    )

    await expect(new UpdateService('1.0.0', repository, fetcher).check()).resolves.toEqual({
      status: 'error',
      currentVersion: '1.0.0',
      error: 'invalid-response'
    })
  })

  it.each([
    release({ tag_name: 'latest' }),
    release({ html_url: 'https://example.com/example/project/releases/tag/v1.2.0' }),
    release({ html_url: 'https://github.com/other/project/releases/tag/v1.2.0' }),
    release({ published_at: 'not-a-date' }),
    { tag_name: 'v1.2.0' }
  ])('rejects malformed or untrusted release metadata', async (body) => {
    const fetcher = vi.fn(() => Promise.resolve(response(200, body)))

    await expect(new UpdateService('1.0.0', repository, fetcher).check()).resolves.toEqual({
      status: 'error',
      currentVersion: '1.0.0',
      error: 'invalid-response'
    })
  })

  it('maps a rejected request to a network error', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('offline')))

    await expect(new UpdateService('1.0.0', repository, fetcher).check()).resolves.toEqual({
      status: 'error',
      currentVersion: '1.0.0',
      error: 'network'
    })
  })

  it('aborts requests that exceed the timeout', async () => {
    const fetcher = vi.fn(
      (_input: URL | RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })
    )

    await expect(new UpdateService('1.0.0', repository, fetcher, 1).check()).resolves.toEqual({
      status: 'error',
      currentVersion: '1.0.0',
      error: 'timeout'
    })
  })
})
