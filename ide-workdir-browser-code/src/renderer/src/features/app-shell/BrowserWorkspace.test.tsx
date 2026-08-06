import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { notify } from '../notifications/notification-store'
import { BrowserWorkspace } from './BrowserWorkspace'

vi.mock('./Sidebar', () => ({ Sidebar: () => <aside data-testid="sidebar" /> }))
vi.mock('./Statusbar', () => ({ Statusbar: () => <footer data-testid="statusbar" /> }))
vi.mock('../browser/Toolbar', () => ({ Toolbar: () => <header data-testid="toolbar" /> }))
vi.mock('../browser/Pathbar', () => ({ Pathbar: () => <nav data-testid="pathbar" /> }))
vi.mock('../browser/FileBrowser', () => ({
  FileBrowser: () => <main data-testid="file-browser" />
}))
vi.mock('../preview/DocumentTabs', () => ({
  DocumentTabs: () => <div data-testid="document-tabs" />
}))
vi.mock('../preview/DocumentPreview', () => ({
  DocumentPreview: () => <article data-testid="document-preview" />
}))
vi.mock('../preview/Inspector', () => ({ Inspector: () => <aside data-testid="inspector" /> }))

describe('BrowserWorkspace', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeAgentId: agentFixture.id,
      workspaces: { [agentFixture.id]: createWorkspace(agentFixture) }
    })
    notify.clear()
  })

  it('positions the global message host inside the primary file management container', () => {
    notify.error('找不到该工作目录')

    const { container } = render(<BrowserWorkspace />)

    const alert = screen.getByRole('alert')
    const primary = container.querySelector('.browser-primary')
    const content = container.querySelector('.browser-primary__content')
    const host = container.querySelector('.notification-host')
    expect(alert).toHaveTextContent('找不到该工作目录')
    expect(container.querySelector('.browser-workspace')).toHaveClass('motion-presence-enter')
    expect(content).toHaveClass('motion-presence-replace')
    expect(content?.parentElement).toBe(primary)
    expect(host?.parentElement).toBe(primary)
    expect(screen.getByTestId('inspector')).not.toContainElement(alert)
    expect(screen.getByRole('button', { name: '关闭消息' })).toBeInTheDocument()
  })

  it('does not rerender file content when notifications are added or removed', () => {
    render(<BrowserWorkspace />)
    const renderedContent = screen.getByTestId('file-browser')
    let id = ''
    act(() => {
      id = notify.error('读取失败')
    })

    expect(screen.getByTestId('file-browser')).toBe(renderedContent)

    act(() => notify.dismiss(id))

    expect(screen.getByTestId('file-browser')).toBe(renderedContent)
  })
})
