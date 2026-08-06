import { describe, expect, it } from 'vitest'
import { fileFixture, folderFixture } from '../test/fixtures'
import { isDirectoryLike } from './file-item'

describe('isDirectoryLike', () => {
  it('accepts directories and directory symlinks', () => {
    expect(isDirectoryLike(folderFixture)).toBe(true)
    expect(
      isDirectoryLike({
        ...fileFixture,
        type: 'symlink',
        symlinkTargetType: 'directory'
      })
    ).toBe(true)
    expect(isDirectoryLike(fileFixture)).toBe(false)
  })
})
