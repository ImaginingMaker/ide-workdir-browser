import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tab } from '@shared/contracts'
import { fileFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { DocumentPreview } from './DocumentPreview'

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn().mockResolvedValue({
    svg: '<svg viewBox="0 0 10 10"><text>Graph</text></svg>'
  })
}))

const nativeActionsMock = vi.hoisted(() => ({
  openPathExternally: vi.fn()
}))

vi.mock('mermaid', () => ({
  default: mermaidMock
}))

vi.mock('@renderer/services/native-actions', () => ({
  openPathExternally: nativeActionsMock.openPathExternally
}))

describe('DocumentPreview', () => {
  const setTabPreviewMode = vi.fn()
  const openLinkedDocument = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ setTabPreviewMode, openLinkedDocument })
  })

  it('renders Markdown and exposes the source mode', async () => {
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'rendered',
      preview: { kind: 'markdown', content: '# Project' },
      loading: false
    }
    const { container } = render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(container.querySelector('.document-preview__body')).toHaveClass(
      'motion-presence-replace'
    )
    expect(screen.getByRole('heading', { name: 'Project' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '源码' }))
    expect(setTabPreviewMode).toHaveBeenCalledWith(fileFixture.path, 'source')
  })

  it('opens relative Markdown links as document tabs without browser navigation', async () => {
    const tab: Tab = {
      id: '/Users/test/.codex/wiki/index.md',
      filePath: '/Users/test/.codex/wiki/index.md',
      fileName: 'index.md',
      fileType: '.md',
      fileItem: {
        ...fileFixture,
        name: 'index.md',
        path: '/Users/test/.codex/wiki/index.md'
      },
      previewMode: 'rendered',
      preview: { kind: 'markdown', content: '[API Hub](tools/api-hub.md)' },
      loading: false
    }
    render(<DocumentPreview agentId="codex" tab={tab} />)

    await userEvent.click(screen.getByRole('link', { name: 'API Hub' }))

    expect(openLinkedDocument).toHaveBeenCalledWith('/Users/test/.codex/wiki/tools/api-hub.md')
  })

  it('opens HTTPS Markdown links in the system browser flow', () => {
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'rendered',
      preview: { kind: 'markdown', content: '[Guide](https://example.com/guide)' },
      loading: false
    }
    render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute('target', '_blank')
    expect(openLinkedDocument).not.toHaveBeenCalled()
  })

  it('scrolls same-document Markdown anchors without opening another tab', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView
    })
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'rendered',
      preview: {
        kind: 'markdown',
        content: ['# Overview', '', '[Jump to overview](#overview)'].join('\n')
      },
      loading: false
    }

    try {
      render(<DocumentPreview agentId="codex" tab={tab} />)
      await userEvent.click(screen.getByRole('link', { name: 'Jump to overview' }))

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
      expect(openLinkedDocument).not.toHaveBeenCalled()
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    }
  })

  it('omits YAML front matter from rendered Markdown previews', () => {
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'rendered',
      preview: {
        kind: 'markdown',
        content: [
          '---',
          'name: "byteio_fe_research"',
          'description: "ByteIO code research skill"',
          '---',
          '',
          '# byteio_fe_research'
        ].join('\n')
      },
      loading: false
    }
    const { container } = render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(screen.getByRole('heading', { name: 'byteio_fe_research' })).toBeInTheDocument()
    expect(container.querySelector('.markdown-preview')?.textContent).not.toContain('description:')
  })

  it('formats valid JSON source content', () => {
    const jsonFile = {
      ...fileFixture,
      name: 'settings.json',
      path: '/Users/test/.codex/settings.json',
      extension: '.json'
    }
    const tab: Tab = {
      id: jsonFile.path,
      filePath: jsonFile.path,
      fileName: jsonFile.name,
      fileType: jsonFile.extension,
      fileItem: jsonFile,
      previewMode: 'source',
      preview: { kind: 'text', content: '{"enabled":true}' },
      loading: false
    }
    const { container } = render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(container.querySelector('pre')?.textContent).toBe('{\n  "enabled": true\n}')
    expect(container.querySelector('.token.property')).toHaveTextContent('"enabled"')
  })

  it('recovers JSON content from stale binary hex previews', () => {
    const jsonFile = {
      ...fileFixture,
      name: 'config.json',
      path: '/Users/test/.codex/config.json',
      extension: '.json'
    }
    const tab: Tab = {
      id: jsonFile.path,
      filePath: jsonFile.path,
      fileName: jsonFile.name,
      fileType: jsonFile.extension,
      fileItem: jsonFile,
      previewMode: 'source',
      preview: {
        kind: 'binary',
        content: '00000000  7b 22 61 22 3a 31 7d                              {"a":1}',
        encoding: 'binary',
        message: '文件不是有效的 UTF-8 文本'
      },
      loading: false
    }
    const { container } = render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(container.querySelector('pre')?.textContent).toBe('{\n  "a": 1\n}')
    expect(screen.queryByText('文件不是有效的 UTF-8 文本')).not.toBeInTheDocument()
  })

  it('renders images inside document tabs', () => {
    const imageFile = {
      ...fileFixture,
      name: 'preview.png',
      path: '/Users/test/.codex/preview.png',
      mimeType: 'image/png',
      extension: '.png'
    }
    const tab: Tab = {
      id: imageFile.path,
      filePath: imageFile.path,
      fileName: imageFile.name,
      fileType: imageFile.extension,
      fileItem: imageFile,
      previewMode: 'source',
      preview: { kind: 'image', dataUrl: 'data:image/png;base64,AA==' },
      loading: false
    }
    render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(screen.getByRole('img', { name: 'preview.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AA=='
    )
  })

  it('renders Mermaid fences from Markdown', async () => {
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'rendered',
      preview: {
        kind: 'markdown',
        content: ['# Project', '', '```mermaid', 'graph TD', 'A --> B', '```'].join('\n')
      },
      loading: false
    }
    const { container } = render(<DocumentPreview agentId="codex" tab={tab} />)

    await waitFor(() => expect(mermaidMock.render).toHaveBeenCalled())
    expect(screen.getByLabelText('Mermaid 图表')).toBeInTheDocument()
    expect(container.querySelector('.mermaid-diagram svg')).toBeInTheDocument()
  })

  it('renders loading, explicit error, and missing-preview states', () => {
    const baseTab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'source',
      loading: true
    }
    const { rerender } = render(<DocumentPreview agentId="codex" tab={baseTab} />)
    expect(screen.getByText(`正在打开 ${fileFixture.name}…`)).toBeInTheDocument()

    rerender(
      <DocumentPreview agentId="codex" tab={{ ...baseTab, loading: false, error: '读取失败' }} />
    )
    expect(screen.getByRole('heading', { name: '无法预览此文件' })).toBeInTheDocument()
    expect(screen.getByText('读取失败')).toBeInTheDocument()

    rerender(<DocumentPreview agentId="codex" tab={{ ...baseTab, loading: false }} />)
    expect(screen.getByText('没有可用的预览内容。')).toBeInTheDocument()
  })

  it.each([
    ['too-large' as const, '文件过大'],
    ['unsupported' as const, '不支持预览']
  ])('offers an external application for %s previews', async (kind, heading) => {
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'source',
      preview: { kind, message: '请使用其他应用打开' },
      loading: false
    }
    render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '使用默认应用打开' }))

    expect(nativeActionsMock.openPathExternally).toHaveBeenCalledWith('codex', fileFixture.path)
  })

  it('distinguishes an empty text file from a preview warning', () => {
    const tab: Tab = {
      id: fileFixture.path,
      filePath: fileFixture.path,
      fileName: fileFixture.name,
      fileType: fileFixture.extension,
      fileItem: fileFixture,
      previewMode: 'source',
      preview: { kind: 'text', content: '', message: '内容为空' },
      loading: false
    }
    render(<DocumentPreview agentId="codex" tab={tab} />)

    expect(screen.getByText('空文件')).toBeInTheDocument()
    expect(screen.getByText('内容为空')).toHaveClass('inline-message')
  })
})
