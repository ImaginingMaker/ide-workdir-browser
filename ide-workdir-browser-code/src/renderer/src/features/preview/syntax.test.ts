import { describe, expect, it } from 'vitest'
import { fileFixture } from '../../../../test/fixtures'
import { formatSource, isKnownTextFile } from './syntax'

describe('preview syntax helpers', () => {
  it('formats JSONC without stripping comment-like text inside strings', () => {
    const jsoncFile = {
      ...fileFixture,
      name: 'settings.jsonc',
      path: '/Users/test/.codex/settings.jsonc',
      extension: '.jsonc'
    }

    expect(
      formatSource(
        [
          '{',
          '  // leading comment',
          '  "url": "https://example.com/a//b",',
          '  "pattern": "/* keep this text */",',
          '  "enabled": true,',
          '}'
        ].join('\n'),
        jsoncFile
      )
    ).toBe(
      JSON.stringify(
        {
          url: 'https://example.com/a//b',
          pattern: '/* keep this text */',
          enabled: true
        },
        null,
        2
      )
    )
  })

  it('uses shared file type rules for known extensionless text files', () => {
    expect(isKnownTextFile({ ...fileFixture, extension: '' })).toBe(true)
  })
})
