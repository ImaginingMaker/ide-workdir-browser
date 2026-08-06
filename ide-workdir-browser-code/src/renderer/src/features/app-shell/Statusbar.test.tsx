import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { fileFixture, folderFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { Statusbar } from './Statusbar'

describe('Statusbar', () => {
  it('shows the current directory summary by default', () => {
    useAppStore.setState({
      settings: DEFAULT_SETTINGS,
      listing: {
        path: '/Users/test/.codex',
        parentPath: null,
        items: [folderFixture, fileFixture],
        truncated: false
      },
      loading: false
    })
    render(<Statusbar />)

    expect(screen.getByText('文件 1')).toBeInTheDocument()
    expect(screen.getByText('文件夹 1')).toBeInTheDocument()
    expect(screen.getByText('总大小 1.0 KB')).toBeInTheDocument()
  })

  it('renders a complete shortcut hover card', () => {
    useAppStore.setState({ settings: DEFAULT_SETTINGS, listing: null, loading: false })
    render(<Statusbar />)

    expect(screen.getByRole('button', { name: '快捷键速查' })).toHaveAttribute(
      'aria-describedby',
      'shortcut-help-tooltip'
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent('⌘K')
    expect(screen.getByRole('tooltip')).toHaveTextContent('⌘A')
    expect(screen.getByRole('tooltip')).toHaveTextContent('⇧⌘.')
    expect(screen.getByRole('tooltip')).toHaveTextContent('⌥⌘O')
  })
})
