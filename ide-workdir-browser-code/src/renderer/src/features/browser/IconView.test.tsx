import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fileFixture, folderFixture } from '../../../../test/fixtures'
import { IconView } from './IconView'

describe('IconView', () => {
  it('renders items and distinguishes selection from open', async () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()
    render(
      <IconView
        items={[folderFixture, fileFixture]}
        selectedPath={fileFixture.path}
        onSelect={onSelect}
        onOpen={onOpen}
        onDropTargetChange={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const file = screen.getByRole('gridcell', { name: 'README.md' })
    expect(file.closest('.icon-grid')).toHaveClass('motion-presence-replace')
    expect(file).toHaveClass('is-selected')
    await userEvent.click(file)
    expect(onSelect).toHaveBeenCalledWith(fileFixture)
    await userEvent.dblClick(screen.getByRole('gridcell', { name: 'projects' }))
    expect(onOpen).toHaveBeenCalledWith(folderFixture)
  })

  it('marks long names for two-line clamping while preserving the full tooltip', () => {
    const longName = 'presentation_index_global_runtime_with_a_very_long_name.json'
    render(
      <IconView
        items={[{ ...fileFixture, name: longName }]}
        onSelect={vi.fn()}
        onOpen={vi.fn()}
        onDropTargetChange={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    const tile = screen.getByRole('gridcell', { name: longName })
    expect(tile).toHaveAttribute('title', longName)
    expect(screen.getByText(longName)).toHaveClass('file-tile__name')
  })

  it('loads image thumbnails for image files', async () => {
    const thumbnail = vi.fn().mockResolvedValue('data:image/png;base64,AA==')
    Object.defineProperty(window, 'workdir', {
      configurable: true,
      value: { thumbnail }
    })
    const imageFile = {
      ...fileFixture,
      name: 'preview.png',
      path: `${fileFixture.path}.preview.png`,
      mimeType: 'image/png',
      extension: '.png'
    }

    const { container } = render(
      <IconView
        agentId="codex"
        items={[imageFile]}
        onSelect={vi.fn()}
        onOpen={vi.fn()}
        onDropTargetChange={vi.fn()}
        onContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('.file-icon__thumbnail')).toHaveAttribute(
        'src',
        'data:image/png;base64,AA=='
      )
    })
    expect(thumbnail).toHaveBeenCalledWith('codex', imageFile.path)
  })
})
