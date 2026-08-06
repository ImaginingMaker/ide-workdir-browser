import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentFixture, fileFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { DocumentTabs } from './DocumentTabs'

describe('DocumentTabs', () => {
  const activateTab = vi.fn()
  const closeTab = vi.fn()

  beforeEach(() => {
    useAppStore.setState({
      agents: [agentFixture],
      activeAgentId: agentFixture.id,
      workspaces: {
        [agentFixture.id]: {
          ...createWorkspace(agentFixture),
          openTabs: [
            {
              id: fileFixture.path,
              filePath: fileFixture.path,
              fileName: fileFixture.name,
              fileType: fileFixture.extension,
              previewMode: 'rendered',
              fileItem: fileFixture,
              preview: { kind: 'markdown', content: '# Project' },
              loading: false
            }
          ],
          activeTabId: fileFixture.path
        }
      },
      activateTab,
      closeTab
    })
  })

  it('switches between the browser and document tabs and closes documents', async () => {
    render(<DocumentTabs />)

    expect(screen.getByText('Codex · 独立标签')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: '.codex' }))
    expect(activateTab).toHaveBeenCalledWith(null)

    await userEvent.click(screen.getByRole('tab', { name: fileFixture.name }))
    expect(activateTab).toHaveBeenCalledWith(fileFixture.path)

    await userEvent.click(screen.getByRole('button', { name: `关闭 ${fileFixture.name}` }))
    expect(closeTab).toHaveBeenCalledWith(fileFixture.path)
  })
})
