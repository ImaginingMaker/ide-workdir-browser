import { Icon } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/app-store'
import { formatBytes } from '@renderer/utils/format'
import { isDirectoryLike } from '@shared/file-item'
import { numericSettingOptions } from '@shared/settings'
import { SHORTCUTS } from '@shared/shortcuts'

const ZOOM_OPTIONS = numericSettingOptions('zoom')

export const Statusbar = (): React.JSX.Element => {
  const listing = useAppStore((state) => state.listing)
  const loading = useAppStore((state) => state.loading)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const summary = listing?.items.reduce(
    (result, item) => {
      if (isDirectoryLike(item)) {
        result.folderCount += 1
      } else {
        result.fileCount += 1
        result.totalSize += item.size
      }
      return result
    },
    { fileCount: 0, folderCount: 0, totalSize: 0 }
  ) ?? { fileCount: 0, folderCount: 0, totalSize: 0 }

  return (
    <footer className="statusbar">
      <div>
        <span>文件 {summary.fileCount}</span>
        <span>文件夹 {summary.folderCount}</span>
        <span>总大小 {formatBytes(summary.totalSize)}</span>
        {listing?.truncated && <span className="status-warning">目录已分页</span>}
        {loading && <span>正在处理…</span>}
      </div>
      <div className="shortcut-help">
        <button
          type="button"
          className="shortcut-hint"
          aria-label="快捷键速查"
          aria-describedby="shortcut-help-tooltip"
        >
          <Icon name="keyboard" size={13} />
          <span>快捷键</span>
        </button>
        <div id="shortcut-help-tooltip" className="shortcut-popover" role="tooltip">
          <strong>键盘快捷键</strong>
          <div>
            {SHORTCUTS.map((shortcut) => (
              <span key={shortcut.command}>
                <span>{shortcut.label}</span>
                <kbd>{shortcut.keys}</kbd>
              </span>
            ))}
          </div>
        </div>
      </div>
      <label className="zoom-control">
        <span>缩放</span>
        <select
          value={settings.zoom}
          onChange={(event) => void updateSettings({ zoom: Number(event.target.value) })}
        >
          {ZOOM_OPTIONS.map((zoom) => (
            <option key={zoom} value={zoom}>
              {zoom}%
            </option>
          ))}
        </select>
      </label>
    </footer>
  )
}
