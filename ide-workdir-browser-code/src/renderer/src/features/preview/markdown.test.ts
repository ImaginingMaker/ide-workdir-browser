import { describe, expect, it } from 'vitest'
import { markdownBodyForPreview, resolveMarkdownLink } from './markdown'

describe('Markdown preview helpers', () => {
  it('removes YAML front matter', () => {
    expect(markdownBodyForPreview('---\ntitle: Guide\n---\n# Guide')).toBe('# Guide')
  })

  it('resolves local document references relative to the source file', () => {
    expect(
      resolveMarkdownLink('/Users/test/My Wiki/index.md', 'wiki/tools/API Hub.md#usage')
    ).toEqual({
      kind: 'document',
      path: '/Users/test/My Wiki/wiki/tools/API Hub.md',
      fragment: 'usage'
    })
    expect(resolveMarkdownLink('/Users/test/My Wiki/wiki/tools.md', '../overview.md')).toEqual({
      kind: 'document',
      path: '/Users/test/My Wiki/overview.md',
      fragment: null
    })
  })

  it('distinguishes same-document anchors and HTTPS links', () => {
    expect(resolveMarkdownLink('/Users/test/wiki/index.md', '#overview')).toEqual({
      kind: 'fragment',
      fragment: 'overview'
    })
    expect(resolveMarkdownLink('/Users/test/wiki/index.md', 'https://example.com/guide')).toEqual({
      kind: 'external',
      url: 'https://example.com/guide'
    })
  })

  it('rejects unsupported protocols and malformed links', () => {
    expect(resolveMarkdownLink('/Users/test/wiki/index.md', 'javascript:alert(1)')).toEqual({
      kind: 'unsupported'
    })
    expect(resolveMarkdownLink('/Users/test/wiki/index.md', 'http://example.com')).toEqual({
      kind: 'unsupported'
    })
    expect(resolveMarkdownLink('relative/index.md', 'guide.md')).toEqual({
      kind: 'unsupported'
    })
  })
})
