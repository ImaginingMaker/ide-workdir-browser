import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { fileFixture, folderFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { FileIcon } from './FileIcon'

describe('FileIcon', () => {
  beforeEach(() => {
    useAppStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it.each([
    ['workspace.sqlite', '.sqlite', 'database'],
    ['events.jsonl', '.jsonl', 'json'],
    ['README.md', '.md', 'markdown']
  ])('renders a dedicated icon for %s', (name, extension, iconKind) => {
    const { container } = render(<FileIcon item={{ ...fileFixture, name, extension }} size={32} />)

    expect(container.querySelector(`.file-icon--${iconKind}`)).toBeInTheDocument()
  })

  it('uses the selected folder icon theme', () => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, folderIconTheme: 'duotone' }
    })

    const { container } = render(<FileIcon item={folderFixture} size={32} />)

    expect(container.querySelector('[data-folder-icon-theme="duotone"]')).toBeInTheDocument()
    expect(container.querySelector('.file-icon--folder-duotone')).toBeInTheDocument()
  })
})
