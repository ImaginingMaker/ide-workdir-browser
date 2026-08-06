import { Icon } from '@renderer/components/ui/Icon'
import { FileIcon } from '@renderer/features/browser/FileIcon'
import { revealPathInFinder } from '@renderer/services/native-actions'
import { useAppStore } from '@renderer/store/app-store'
import { fileTypeLabel, formatBytes, formatDate } from '@renderer/utils/format'
import type { FileItem, PreviewResponse } from '@shared/contracts'
import { HighlightedCode } from './HighlightedCode'
import { decodeHexDump, formatSource, isKnownTextFile, languageForFile } from './syntax'

const textContentForPreview = (
  preview: PreviewResponse | null,
  selectedItem: FileItem
): string | null => {
  if (!preview || selectedItem.type !== 'file') return null
  if (preview.kind === 'text' || preview.kind === 'markdown') return preview.content ?? ''
  if (preview.kind === 'binary' && preview.content && isKnownTextFile(selectedItem)) {
    return decodeHexDump(preview.content)
  }
  return null
}

export const Inspector = (): React.JSX.Element => {
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const workspace = useAppStore((state) => state.workspaces[activeAgentId])
  const selectedItem = useAppStore((state) => state.selectedItem)
  const preview = useAppStore((state) => state.preview)
  const visible = Boolean(workspace?.inspectorVisible)
  const textPreviewContent = selectedItem ? textContentForPreview(preview, selectedItem) : null
  const hasImagePreview = preview?.kind === 'image' && Boolean(preview.dataUrl)
  const previewClassName =
    textPreviewContent !== null
      ? 'inspector-file--text'
      : hasImagePreview
        ? 'inspector-file--image'
        : 'inspector-file--placeholder'

  return (
    <aside
      className={`inspector ${visible ? '' : 'is-collapsed'}`}
      aria-label="检查器"
      aria-hidden={!visible}
      inert={!visible}
    >
      <header>预览与信息</header>
      <div className={`inspector__content ${selectedItem ? 'inspector__content--selected' : ''}`}>
        {!selectedItem ? (
          <div className="inspector-empty">
            <Icon name="info" size={32} />
            <p>选择文件以查看预览和完整信息</p>
          </div>
        ) : (
          <>
            <section
              className={`inspector-file ${previewClassName}`}
              aria-label="文件预览"
              tabIndex={textPreviewContent !== null ? 0 : undefined}
            >
              {textPreviewContent !== null ? (
                textPreviewContent ? (
                  <HighlightedCode
                    code={formatSource(textPreviewContent, selectedItem)}
                    language={
                      preview?.kind === 'markdown' ? 'markdown' : languageForFile(selectedItem)
                    }
                    file={selectedItem}
                  />
                ) : (
                  <div className="inspector-file__empty">空文件</div>
                )
              ) : hasImagePreview && preview?.dataUrl ? (
                <img src={preview.dataUrl} alt={selectedItem.name} />
              ) : (
                <FileIcon item={selectedItem} agentId={activeAgentId} size={48} />
              )}
              {preview?.kind === 'image' && preview.message && (
                <p className="inline-message">{preview.message}</p>
              )}
            </section>
            <section className="metadata">
              <h2>{selectedItem.name}</h2>
              <dl>
                <dt>完整路径</dt>
                <dd title={selectedItem.path}>{selectedItem.path}</dd>
                <dt>种类</dt>
                <dd>{fileTypeLabel(selectedItem.extension, selectedItem.type)}</dd>
                <dt>大小</dt>
                <dd>{formatBytes(selectedItem.size)}</dd>
                <dt>修改时间</dt>
                <dd>{formatDate(selectedItem.modifiedAt)}</dd>
                <dt>创建时间</dt>
                <dd>{formatDate(selectedItem.createdAt)}</dd>
              </dl>
              <button
                type="button"
                onClick={() => void revealPathInFinder(activeAgentId, selectedItem.path)}
              >
                在 Finder 中显示
              </button>
            </section>
          </>
        )}
      </div>
    </aside>
  )
}
