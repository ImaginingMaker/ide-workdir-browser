import { describe, expect, it } from 'vitest'
import { resolveShortcut } from './shortcuts'

describe('resolveShortcut', () => {
  it.each([
    [{ key: 'k', meta: true }, 'focus-search'],
    [{ key: '1', meta: true }, 'view-icon'],
    [{ key: 'r', meta: true }, 'refresh'],
    [{ key: '.', meta: true, shift: true }, 'toggle-hidden'],
    [{ key: ',', meta: true }, 'open-settings'],
    [{ key: 'i', meta: true }, 'toggle-inspector'],
    [{ key: 'c', meta: true }, 'copy-selected'],
    [{ key: 'x', meta: true }, 'cut-selected'],
    [{ key: 'v', meta: true }, 'paste'],
    [{ key: 'a', meta: true }, 'select-all'],
    [{ key: 'o', meta: true, alt: true }, 'reveal-selected'],
    [{ key: 'c', meta: true, alt: true }, 'copy-path'],
    [{ key: 'Backspace', meta: true }, 'trash-selected'],
    [{ key: 'Delete', meta: true }, 'trash-selected']
  ] as const)('maps %o to %s', (input, command) => {
    expect(resolveShortcut(input)).toBe(command)
  })

  it('ignores unmodified and unsupported combinations', () => {
    expect(resolveShortcut({ key: 'k', meta: false })).toBeNull()
    expect(resolveShortcut({ key: 'z', meta: true })).toBeNull()
  })
})
