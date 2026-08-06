import { Icon } from '@renderer/components/ui/Icon'
import { openPathExternally } from '@renderer/services/native-actions'
import { useAppStore } from '@renderer/store/app-store'
import type { Tab } from '@shared/contracts'
import { HighlightedCode } from './HighlightedCode'
import { MarkdownPreview } from './MarkdownPreview'
import { decodeHexDump, formatSource, isKnownTextFile, languageForFile } from './syntax'

interface DocumentPreviewProps {
  agentId: string
  tab: Tab
}

export const DocumentPreview = ({ agentId, tab }: DocumentPreviewProps): React.JSX.Element => {
  const setTabPreviewMode = useAppStore((state) => state.setTabPreviewMode)
  const openLinkedDocument = useAppStore((state) => state.openLinkedDocument)
  const preview = tab.preview
  const isMarkdown = preview?.kind === 'markdown'
  const decodedBinaryText =
    preview?.kind === 'binary' && preview.content && isKnownTextFile(tab.fileItem)
      ? decodeHexDump(preview.content)
      : null
  const sourceContent = decodedBinaryText ?? preview?.content

  if (tab.loading) {
    return (
      <main className="document-preview document-preview--state">
        <span className="spinner" />
        <p>正在打开 {tab.fileName}…</p>
      </main>
    )
  }

  if (tab.error || !preview) {
    return (
      <main className="document-preview document-preview--state">
        <Icon name="file" size={42} />
        <h2>无法预览此文件</h2>
        <p>{tab.error ?? '没有可用的预览内容。'}</p>
      </main>
    )
  }

  if (preview.kind === 'too-large' || preview.kind === 'unsupported') {
    return (
      <main className="document-preview document-preview--state">
        <Icon name="file" size={42} />
        <h2>{preview.kind === 'too-large' ? '文件过大' : '不支持预览'}</h2>
        <p>{preview.message}</p>
        <button
          type="button"
          className="document-preview__external"
          onClick={() => void openPathExternally(agentId, tab.filePath)}
        >
          使用默认应用打开
        </button>
      </main>
    )
  }

  return (
    <main className="document-preview">
      {isMarkdown && (
        <div className="document-preview__toolbar" role="group" aria-label="Markdown 预览模式">
          <button
            type="button"
            className={tab.previewMode === 'rendered' ? 'is-active' : ''}
            aria-pressed={tab.previewMode === 'rendered'}
            onClick={() => setTabPreviewMode(tab.id, 'rendered')}
          >
            预览
          </button>
          <button
            type="button"
            className={tab.previewMode === 'source' ? 'is-active' : ''}
            aria-pressed={tab.previewMode === 'source'}
            onClick={() => setTabPreviewMode(tab.id, 'source')}
          >
            源码
          </button>
        </div>
      )}
      <div className="document-preview__content">
        <div
          className="document-preview__body motion-presence-replace"
          key={`${preview.kind}:${isMarkdown ? tab.previewMode : 'default'}`}
        >
          {preview.kind === 'image' && preview.dataUrl ? (
            <div className="image-preview">
              <img src={preview.dataUrl} alt={tab.fileName} />
            </div>
          ) : isMarkdown && tab.previewMode === 'rendered' ? (
            <MarkdownPreview
              content={preview.content ?? ''}
              sourceFilePath={tab.filePath}
              onOpenDocument={(path) => void openLinkedDocument(path)}
            />
          ) : sourceContent ? (
            <HighlightedCode
              code={formatSource(sourceContent, tab.fileItem)}
              language={isMarkdown ? 'markdown' : languageForFile(tab.fileItem)}
              file={tab.fileItem}
            />
          ) : (
            <div className="document-preview__empty">空文件</div>
          )}
          {preview.message && !decodedBinaryText && (
            <p className="inline-message">{preview.message}</p>
          )}
        </div>
      </div>
    </main>
  )
}
