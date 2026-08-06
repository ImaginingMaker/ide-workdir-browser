import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { agentFixture, fileFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { Inspector } from './Inspector'

describe('Inspector', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: DEFAULT_SETTINGS,
      agents: [agentFixture],
      activeAgentId: agentFixture.id,
      workspaces: { [agentFixture.id]: createWorkspace(agentFixture) },
      selectedItem: fileFixture,
      preview: { kind: 'markdown', content: '# Project' }
    })
  })

  it('keeps document content in the main workspace and renders complete metadata', () => {
    render(<Inspector />)
    expect(screen.queryByRole('heading', { name: 'Project' })).not.toBeInTheDocument()
    expect(screen.getByText(fileFixture.path)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '在 Finder 中显示' })).toBeInTheDocument()
  })

  it('marks text previews for content-sized scrolling', () => {
    render(<Inspector />)

    const previewRegion = screen.getByLabelText('文件预览')
    expect(previewRegion).toHaveClass('inspector-file--text')
    expect(previewRegion.querySelector('.code-preview')).toHaveTextContent('# Project')
    expect(screen.getByText(fileFixture.path)).toBeInTheDocument()
  })

  it('marks image previews for aspect-ratio-preserving sizing', () => {
    const image = {
      ...fileFixture,
      name: 'preview.png',
      path: '/Users/test/.codex/preview.png',
      extension: '.png',
      mimeType: 'image/png'
    }
    useAppStore.setState({
      selectedItem: image,
      preview: { kind: 'image', dataUrl: 'data:image/png;base64,AA==' }
    })

    render(<Inspector />)

    expect(screen.getByLabelText('文件预览')).toHaveClass('inspector-file--image')
    expect(screen.getByRole('img', { name: 'preview.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AA=='
    )
  })

  it('uses the shared semantic icon for files without an inline preview', () => {
    useAppStore.setState({
      selectedItem: {
        ...fileFixture,
        name: 'workspace.sqlite',
        path: '/Users/test/.codex/workspace.sqlite',
        extension: '.sqlite'
      },
      preview: { kind: 'unsupported' }
    })

    const { container } = render(<Inspector />)

    expect(container.querySelector('.file-icon--database')).toBeInTheDocument()
  })

  it('keeps the inspector mounted while applying the collapsed animation state', () => {
    useAppStore.setState({
      workspaces: {
        [agentFixture.id]: {
          ...createWorkspace(agentFixture),
          inspectorVisible: false
        }
      }
    })
    render(<Inspector />)

    expect(screen.getByLabelText('检查器', { selector: 'aside' })).toHaveClass('is-collapsed')
    expect(screen.getByLabelText('检查器', { selector: 'aside' })).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })
})
