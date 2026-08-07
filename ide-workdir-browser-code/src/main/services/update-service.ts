import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { UpdateCheckResult } from '@shared/contracts'
import { compareSemanticVersions, parseSemanticVersion } from '@shared/version'

const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/
const githubApiVersion = '2026-03-10'

type Fetcher = typeof fetch

interface GitHubRelease {
  tagName: string
  releaseUrl: string
  publishedAt: string
}

const isRepository = (value: unknown): value is string =>
  typeof value === 'string' &&
  repositoryPattern.test(value) &&
  !value.includes('..') &&
  !value.endsWith('.')

export const readUpdateRepository = (appPath: string): string | null => {
  try {
    const value = JSON.parse(
      readFileSync(join(appPath, 'out', 'update-config.json'), 'utf8')
    ) as unknown
    if (
      typeof value !== 'object' ||
      value === null ||
      !('repository' in value) ||
      !isRepository(value.repository)
    ) {
      return null
    }
    return value.repository
  } catch {
    return null
  }
}

const parseRelease = (value: unknown, repository: string): GitHubRelease | null => {
  if (typeof value !== 'object' || value === null) return null

  const release = value as Record<string, unknown>
  const tagName = release.tag_name
  const releaseUrl = release.html_url
  const publishedAt = release.published_at
  if (
    typeof tagName !== 'string' ||
    !parseSemanticVersion(tagName) ||
    typeof releaseUrl !== 'string' ||
    typeof publishedAt !== 'string' ||
    !Number.isFinite(Date.parse(publishedAt))
  ) {
    return null
  }

  try {
    const url = new URL(releaseUrl)
    const expectedPath = `/${repository}/releases/`.toLowerCase()
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'github.com' ||
      !url.pathname.toLowerCase().startsWith(expectedPath)
    ) {
      return null
    }
  } catch {
    return null
  }

  return { tagName, releaseUrl, publishedAt }
}

export class UpdateService {
  constructor(
    private readonly currentVersion: string,
    private readonly repository: string | null,
    private readonly fetcher: Fetcher = globalThis.fetch,
    private readonly timeoutMs = 10_000
  ) {}

  async check(): Promise<UpdateCheckResult> {
    if (!this.repository) {
      return { status: 'unconfigured', currentVersion: this.currentVersion }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetcher(
        `https://api.github.com/repos/${this.repository}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'IDE-Workdir-Browser',
            'X-GitHub-Api-Version': githubApiVersion
          },
          signal: controller.signal
        }
      )

      if (response.status === 404) {
        return { status: 'no-release', currentVersion: this.currentVersion }
      }
      if (response.status === 403 || response.status === 429) {
        return {
          status: 'error',
          currentVersion: this.currentVersion,
          error: 'rate-limited'
        }
      }
      if (!response.ok) {
        return {
          status: 'error',
          currentVersion: this.currentVersion,
          error: 'invalid-response'
        }
      }

      const release = parseRelease(await response.json(), this.repository)
      if (!release || !parseSemanticVersion(this.currentVersion)) {
        return {
          status: 'error',
          currentVersion: this.currentVersion,
          error: 'invalid-response'
        }
      }

      const latestVersion = release.tagName.replace(/^v/, '')
      if (compareSemanticVersions(latestVersion, this.currentVersion) > 0) {
        return {
          status: 'available',
          currentVersion: this.currentVersion,
          latestVersion,
          releaseUrl: release.releaseUrl,
          publishedAt: release.publishedAt
        }
      }

      return {
        status: 'current',
        currentVersion: this.currentVersion,
        latestVersion
      }
    } catch {
      return {
        status: 'error',
        currentVersion: this.currentVersion,
        error: controller.signal.aborted ? 'timeout' : 'network'
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
