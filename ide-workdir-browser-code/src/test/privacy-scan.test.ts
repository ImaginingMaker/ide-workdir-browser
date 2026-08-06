/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(process.cwd(), '..')

const skippedDirectories = new Set([
  '.git',
  '.trae',
  '.vscode',
  'coverage',
  'dist',
  'node_modules',
  'out'
])

const textExtensions = new Set([
  '.design',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.op',
  '.plist',
  '.scss',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml'
])

const packageRegistryDomain = ['bnpm', 'byted', 'org'].join('\\.')
const organizationName = ['byte', 'dance'].join('')

const sensitivePatterns = [
  {
    label: 'non-fixture macOS home path',
    pattern: /\/Users\/(?!(?:test|example)\b)[^/\s"'`<>]+/i
  },
  {
    label: 'internal registry or organization marker',
    pattern: new RegExp(`${packageRegistryDomain}|${organizationName}`, 'i')
  },
  {
    label: 'credential-like field',
    pattern: new RegExp(
      [
        'authorization\\s*[:=]',
        'bearer\\s+[A-Za-z0-9._~+/-]{20,}={0,2}',
        '(?:access|refresh)[_-]?token\\s*[:=]',
        '(?:api[_-]?key|client[_-]?secret|secret[_-]?key)\\s*[:=]',
        'cookie\\s*[:=]'
      ].join('|'),
      'i'
    )
  }
]

const collectTextFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) files.push(...collectTextFiles(path))
      continue
    }

    if (entry.isFile() && textExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

const collectSystemMetadataFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) files.push(...collectSystemMetadataFiles(path))
      continue
    }

    if (entry.isFile() && entry.name === '.DS_Store') {
      files.push(relative(repoRoot, path))
    }
  }

  return files
}

describe('repository privacy scan', () => {
  it('keeps maintained text assets free of personal paths and credential-like data', () => {
    const findings = collectTextFiles(repoRoot).flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(repoRoot, file)

      return sensitivePatterns.flatMap(({ label, pattern }) =>
        pattern.test(content) ? [`${relativePath}: ${label}`] : []
      )
    })

    expect(findings).toEqual([])
  })

  it('does not keep macOS metadata files in maintained directories', () => {
    const findings = collectSystemMetadataFiles(repoRoot)

    expect(findings).toEqual([])
  })

  it('keeps the privacy scan bounded to lightweight text assets', () => {
    const oversizedFiles = collectTextFiles(repoRoot)
      .filter((file) => statSync(file).size > 10 * 1024 * 1024)
      .map((file) => relative(repoRoot, file))

    expect(oversizedFiles).toEqual([])
  })
})
