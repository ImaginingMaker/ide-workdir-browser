import { describe, expect, it } from 'vitest'
import { compareSemanticVersions, parseSemanticVersion } from './version'

describe('semantic versions', () => {
  it.each([
    ['0.1.0', 0, 1, 0, []],
    ['v2.3.4', 2, 3, 4, []],
    ['1.0.0-rc.2+build.5', 1, 0, 0, ['rc', '2']]
  ])('parses %s', (value, major, minor, patch, prerelease) => {
    expect(parseSemanticVersion(value)).toEqual({ major, minor, patch, prerelease })
  })

  it.each(['', '1', '1.0', '01.0.0', '1.01.0', '1.0.01', '1.0.0-01', '1.0.0-', 'version-1.0.0'])(
    'rejects %s',
    (value) => {
      expect(parseSemanticVersion(value)).toBeNull()
    }
  )

  it.each([
    ['1.0.1', '1.0.0', 1],
    ['1.1.0', '1.0.9', 1],
    ['2.0.0', '1.99.99', 1],
    ['1.0.0', '1.0.0', 0],
    ['1.0.0', '1.0.0-rc.1', 1],
    ['1.0.0-beta.2', '1.0.0-beta.11', -1],
    ['1.0.0-beta.2', '1.0.0-beta.alpha', -1],
    ['1.0.0-rc.1', '1.0.0-beta.9', 1],
    ['1.0.0-alpha', '1.0.0-alpha.1', -1],
    ['v1.2.3+first', '1.2.3+second', 0]
  ])('compares %s against %s', (left, right, expected) => {
    expect(compareSemanticVersions(left, right)).toBe(expected)
  })

  it('rejects comparisons containing an invalid version', () => {
    expect(() => compareSemanticVersions('current', '1.0.0')).toThrow('Invalid semantic version.')
  })
})
