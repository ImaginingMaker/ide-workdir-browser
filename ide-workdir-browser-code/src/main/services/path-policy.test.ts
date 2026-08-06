import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PathPolicy } from './path-policy'

describe('PathPolicy', () => {
  const policy = new PathPolicy()

  it('expands home-relative paths', () => {
    expect(policy.expandHome('~/.codex')).toBe(join(homedir(), '.codex'))
  })

  it('accepts paths inside the configured root', () => {
    expect(policy.assertWithinRoot('/tmp/workdir', 'nested/file.ts')).toBe(
      '/tmp/workdir/nested/file.ts'
    )
  })

  it('rejects traversal outside the configured root', () => {
    expect(() => policy.assertWithinRoot('/tmp/workdir', '../secret')).toThrow(
      '拒绝访问工作目录之外的路径'
    )
  })
})
