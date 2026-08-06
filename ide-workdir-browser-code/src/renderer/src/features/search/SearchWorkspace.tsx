import { Icon } from '@renderer/components/ui/Icon'
import { FileIcon } from '@renderer/features/browser/FileIcon'
import { useAppStore } from '@renderer/store/app-store'
import { fileTypeLabel, formatBytes, formatDate } from '@renderer/utils/format'
import { isDirectoryLike } from '@shared/file-item'

export const SearchWorkspace = (): React.JSX.Element => {
  const search = useAppStore((state) => state.search)
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const searchQuery = useAppStore((state) => state.workspaces[activeAgentId]?.searchQuery)
  const searchScope = useAppStore((state) => state.workspaces[activeAgentId]?.searchScope)
  const openItem = useAppStore((state) => state.openItem)
  const selectAgent = useAppStore((state) => state.selectAgent)
  if (!search || searchQuery === undefined || searchScope === undefined) return <></>

  const openResult = async (agentId: string, path: string): Promise<void> => {
    if (agentId !== activeAgentId) await selectAgent(agentId)
    const result = search.results.find((entry) => entry.item.path === path)
    if (result) await openItem(result.item)
  }

  return (
    <section className="search-workspace motion-presence-enter">
      <header className="search-summary">
        <div>
          <Icon name="search" size={20} />
          <div>
            <h1>“{searchQuery}”的搜索结果</h1>
            <p>
              找到 {search.results.length} 项，已扫描 {search.scannedCount} 项
            </p>
          </div>
        </div>
        <span className="scope-chip">
          {searchScope === 'current-dir' ? '当前目录' : '当前 Agent'}
        </span>
      </header>
      {search.results.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" size={44} />
          <h2>没有找到匹配项目</h2>
          <p>请检查拼写、切换搜索范围，或在设置中显示隐藏文件。</p>
        </div>
      ) : (
        <div className="search-results">
          {search.results.map(({ agentId, item }) => (
            <button
              type="button"
              key={`${agentId}:${item.path}`}
              onDoubleClick={() => void openResult(agentId, item.path)}
            >
              <FileIcon item={item} agentId={agentId} size={22} />
              <span className="search-results__name">
                <strong>{item.name}</strong>
                <small>{item.path}</small>
              </span>
              <span>{fileTypeLabel(item.extension, item.type)}</span>
              <span>{isDirectoryLike(item) ? '—' : formatBytes(item.size)}</span>
              <span>{formatDate(item.modifiedAt)}</span>
            </button>
          ))}
          {search.truncated && <p className="search-truncated">结果已达到限制，请缩小范围。</p>}
        </div>
      )}
    </section>
  )
}
