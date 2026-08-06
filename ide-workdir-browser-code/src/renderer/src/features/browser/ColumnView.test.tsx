import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fileFixture, folderFixture } from '../../../../test/fixtures'
import { ColumnView } from './ColumnView'

describe('ColumnView', () => {
  it('opens nested folders in adjacent Finder-style columns', async () => {
    const nestedFolder = {
      ...folderFixture,
      name: 'src',
      path: `${folderFixture.path}/src`
    }
    const readDirectory = vi
      .fn()
      .mockResolvedValueOnce({
        path: folderFixture.path,
        parentPath: '/Users/test/.codex',
        items: [nestedFolder],
        truncated: false
      })
      .mockResolvedValueOnce({
        path: nestedFolder.path,
        parentPath: folderFixture.path,
        items: [{ ...fileFixture, path: `${nestedFolder.path}/README.md` }],
        truncated: false
      })
    Object.defineProperty(window, 'workdir', {
      configurable: true,
      value: { readDirectory }
    })
    const onActivePathChange = vi.fn()

    const { container } = render(
      <ColumnView
        agentId="codex"
        listing={{
          path: '/Users/test/.codex',
          parentPath: null,
          items: [folderFixture],
          truncated: false
        }}
        onSelect={vi.fn()}
        onOpen={vi.fn()}
        onActivePathChange={onActivePathChange}
        onDropTargetChange={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    expect(container.querySelector('.column-view')).toHaveClass('motion-presence-replace')
    expect(screen.getByText('.codex')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: /projects/ }))
    expect(onActivePathChange).toHaveBeenLastCalledWith(folderFixture.path)
    expect(await screen.findByRole('listbox', { name: 'projects' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: /src/ }))
    expect(onActivePathChange).toHaveBeenLastCalledWith(nestedFolder.path)
    expect(await screen.findByRole('listbox', { name: 'src' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: /README.md/ }))
    expect(onActivePathChange).toHaveBeenLastCalledWith(nestedFolder.path)
    expect(screen.getAllByRole('listbox')).toHaveLength(3)
  })

  it('refreshes the active nested column without collapsing the column chain', async () => {
    const readDirectory = vi
      .fn()
      .mockResolvedValueOnce({
        path: folderFixture.path,
        parentPath: '/Users/test/.codex',
        items: [fileFixture],
        truncated: false
      })
      .mockResolvedValueOnce({
        path: folderFixture.path,
        parentPath: '/Users/test/.codex',
        items: [{ ...fileFixture, name: 'updated.md', path: `${folderFixture.path}/updated.md` }],
        truncated: false
      })
    Object.defineProperty(window, 'workdir', {
      configurable: true,
      value: { readDirectory }
    })
    const props = {
      agentId: 'codex',
      listing: {
        path: '/Users/test/.codex',
        parentPath: null,
        items: [folderFixture],
        truncated: false
      },
      activePath: folderFixture.path,
      onSelect: vi.fn(),
      onOpen: vi.fn(),
      onActivePathChange: vi.fn(),
      onDropTargetChange: vi.fn(),
      onContextMenu: vi.fn()
    }
    const { rerender } = render(<ColumnView {...props} refreshVersion={0} />)
    await userEvent.click(screen.getByRole('option', { name: /projects/ }))
    expect(await screen.findByRole('listbox', { name: 'projects' })).toBeInTheDocument()

    rerender(<ColumnView {...props} refreshVersion={1} />)

    expect(await screen.findByRole('option', { name: /updated.md/ })).toBeInTheDocument()
    expect(screen.getAllByRole('listbox')).toHaveLength(2)
  })
})
