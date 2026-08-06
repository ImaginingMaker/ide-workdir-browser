import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fileFixture } from '../../../../test/fixtures'
import { ListView } from './ListView'

describe('ListView', () => {
  it('renders structured file metadata', () => {
    const { container } = render(
      <ListView
        items={[fileFixture]}
        onSelect={vi.fn()}
        onOpen={vi.fn()}
        onDropTargetChange={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    expect(container.querySelector('.file-list')).toHaveClass('motion-presence-replace')
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('1.0 KB')).toBeInTheDocument()
    expect(screen.getByText('MD 文件')).toBeInTheDocument()
  })
})
