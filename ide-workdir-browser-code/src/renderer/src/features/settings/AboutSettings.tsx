import { useEffect, useRef, useState } from 'react'
import appIcon from '../../assets/app-icon.svg'
import { APP_VERSION } from '@shared/app-version'
import type { UpdateCheckError, UpdateCheckResult } from '@shared/contracts'
import { SHORTCUTS } from '@shared/shortcuts'
import { SettingsPage } from './SettingsControls'

type UpdateViewState = { status: 'idle' | 'checking' } | UpdateCheckResult

const errorMessages: Record<UpdateCheckError, string> = {
  network: '无法连接更新服务，请检查网络后重试。',
  'rate-limited': '更新服务请求过于频繁，请稍后重试。',
  timeout: '检查更新超时，请稍后重试。',
  'invalid-response': '更新服务返回了无效信息，请稍后重试。'
}

const updateMessage = (state: UpdateViewState): string | null => {
  switch (state.status) {
    case 'idle':
      return null
    case 'checking':
      return '正在检查最新稳定版本…'
    case 'available':
      return `发现新版本 ${state.latestVersion}。`
    case 'current':
      return '当前已是最新稳定版本。'
    case 'no-release':
      return '暂未发布稳定版本。'
    case 'unconfigured':
      return '当前构建未配置更新源。'
    case 'error':
      return errorMessages[state.error]
  }
}

export const AboutSettings = (): React.JSX.Element => {
  const [updateState, setUpdateState] = useState<UpdateViewState>({ status: 'idle' })
  const requestId = useRef(0)

  useEffect(
    () => () => {
      requestId.current += 1
    },
    []
  )

  const checkForUpdates = async (): Promise<void> => {
    if (updateState.status === 'checking') return

    const currentRequest = ++requestId.current
    setUpdateState({ status: 'checking' })
    try {
      const result = await window.workdir.checkForUpdates()
      if (requestId.current === currentRequest) setUpdateState(result)
    } catch {
      if (requestId.current === currentRequest) {
        setUpdateState({
          status: 'error',
          currentVersion: APP_VERSION,
          error: 'network'
        })
      }
    }
  }

  const message = updateMessage(updateState)
  return (
    <SettingsPage title="关于" description="IDE Workdir Browser for macOS" showSaveStatus={false}>
      <div className="about-card">
        <img className="app-logo" src={appIcon} alt="" />
        <h2>IDE Workdir Browser</h2>
        <p>版本 {APP_VERSION} · macOS 13+</p>
        <small>统一浏览和管理 AI 编程 Agent 的工作目录。</small>
        <div className="update-check">
          <button
            type="button"
            className="update-check__button"
            disabled={updateState.status === 'checking'}
            onClick={() => void checkForUpdates()}
          >
            {updateState.status === 'checking' ? '正在检查…' : '检查更新'}
          </button>
          {message && (
            <p
              className={`update-check__status update-check__status--${updateState.status}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}
          {updateState.status === 'available' && (
            <a
              className="update-check__download"
              href={updateState.releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              查看并下载
            </a>
          )}
        </div>
      </div>
      <section className="shortcut-list">
        <h2>键盘快捷键</h2>
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.command}>
            <span>{shortcut.label}</span>
            <kbd>{shortcut.keys}</kbd>
          </div>
        ))}
      </section>
    </SettingsPage>
  )
}
