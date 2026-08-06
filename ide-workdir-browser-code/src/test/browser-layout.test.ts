/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const browserStyles = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/styles/_browser.scss'),
  'utf8'
).replace(/\s+/g, ' ')

describe('browser layout styles', () => {
  it('prevents hidden inspector layout residue from creating horizontal scrollbars', () => {
    expect(browserStyles).toContain(
      '.file-browser, .search-workspace { min-width: 256px; min-height: 0; flex: 1; overflow-x: hidden; overflow-y: auto;'
    )
    expect(browserStyles).toContain(
      '.inspector.is-collapsed { flex-basis: 0; border-left-width: 0;'
    )
  })
})
