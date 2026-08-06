import { useRef, useState } from 'react'
import { ModalDialog } from '@renderer/components/ui/ModalDialog'
import { useAppStore } from '@renderer/store/app-store'

export const ResetSettings = (): React.JSX.Element => {
  const resetSettings = useAppStore((state) => state.resetSettings)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const confirmReset = async (): Promise<void> => {
    setIsResetting(true)
    const didReset = await resetSettings()
    setIsResetting(false)
    if (didReset) setIsConfirming(false)
  }

  return (
    <>
      <div className="settings-reset">
        <div>
          <strong>还原所有默认设置</strong>
          <small>恢复 Agent、外观和高级选项的初始配置</small>
        </div>
        <button
          ref={triggerButtonRef}
          type="button"
          className="settings-reset__trigger"
          onClick={() => setIsConfirming(true)}
        >
          还原默认设置…
        </button>
      </div>
      {isConfirming && (
        <ModalDialog
          layerClassName="settings-reset-layer"
          panelClassName="settings-reset-dialog"
          labelledBy="settings-reset-title"
          describedBy="settings-reset-description"
          initialFocusRef={cancelButtonRef}
          closeDisabled={isResetting}
          onRequestClose={() => setIsConfirming(false)}
        >
          <h2 id="settings-reset-title">还原所有默认设置？</h2>
          <div id="settings-reset-description">
            <p>以下内容将恢复为初始配置：</p>
            <ul>
              <li>Agent 路径、启用状态和默认 Agent</li>
              <li>主题、强调色、缩放、字体、文件夹图标和隐藏文件选项</li>
              <li>搜索、文件读取和分页参数</li>
            </ul>
            <p className="settings-reset-dialog__notice">
              自定义 Agent、当前标签和浏览记录将被清除，但不会删除任何磁盘文件。
            </p>
          </div>
          <div className="settings-reset-dialog__actions">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={() => setIsConfirming(false)}
              disabled={isResetting}
            >
              取消
            </button>
            <button
              type="button"
              className="is-destructive"
              onClick={() => void confirmReset()}
              disabled={isResetting}
            >
              {isResetting ? '正在还原…' : '确认还原'}
            </button>
          </div>
        </ModalDialog>
      )}
    </>
  )
}
