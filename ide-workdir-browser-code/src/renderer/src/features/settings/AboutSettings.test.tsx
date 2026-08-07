import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_VERSION } from '@shared/app-version'
import type { UpdateCheckResult, WorkdirApi } from '@shared/contracts'
import { SHORTCUTS } from '@shared/shortcuts'
import { AboutSettings } from './AboutSettings'

describe('AboutSettings', () => {
  const checkForUpdates = vi.fn<() => Promise<UpdateCheckResult>>()

  beforeEach(() => {
    Object.defineProperty(window, 'workdir', {
      configurable: true,
      value: { checkForUpdates } as unknown as WorkdirApi
    })
  })

  it('renders the app version and every shortcut from the shared registries', () => {
    render(<AboutSettings />)

    expect(screen.getByText(`版本 ${APP_VERSION} · macOS 13+`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查更新' })).toBeEnabled()
    expect(checkForUpdates).not.toHaveBeenCalled()

    SHORTCUTS.forEach((shortcut) => {
      expect(screen.getByText(shortcut.label)).toBeInTheDocument()
      expect(screen.getByText(shortcut.keys)).toBeInTheDocument()
    })
  })

  it('shows a validated stable release link when an update is available', async () => {
    const user = userEvent.setup()
    checkForUpdates.mockResolvedValue({
      status: 'available',
      currentVersion: APP_VERSION,
      latestVersion: '0.2.0',
      releaseUrl: 'https://github.com/example/project/releases/tag/v0.2.0',
      publishedAt: '2026-08-07T00:00:00Z'
    })
    render(<AboutSettings />)

    await user.click(screen.getByRole('button', { name: '检查更新' }))

    expect(await screen.findByRole('status')).toHaveTextContent('发现新版本 0.2.0。')
    expect(screen.getByRole('link', { name: '查看并下载' })).toHaveAttribute(
      'href',
      'https://github.com/example/project/releases/tag/v0.2.0'
    )
    expect(screen.getByRole('link', { name: '查看并下载' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: '查看并下载' })).toHaveAttribute('rel', 'noreferrer')
  })

  it.each([
    [
      { status: 'current', currentVersion: APP_VERSION, latestVersion: APP_VERSION },
      '当前已是最新稳定版本。'
    ],
    [{ status: 'no-release', currentVersion: APP_VERSION }, '暂未发布稳定版本。'],
    [{ status: 'unconfigured', currentVersion: APP_VERSION }, '当前构建未配置更新源。'],
    [
      { status: 'error', currentVersion: APP_VERSION, error: 'rate-limited' },
      '更新服务请求过于频繁，请稍后重试。'
    ],
    [
      { status: 'error', currentVersion: APP_VERSION, error: 'timeout' },
      '检查更新超时，请稍后重试。'
    ],
    [
      { status: 'error', currentVersion: APP_VERSION, error: 'invalid-response' },
      '更新服务返回了无效信息，请稍后重试。'
    ]
  ] as const)('renders the %s result', async (result, message) => {
    const user = userEvent.setup()
    checkForUpdates.mockResolvedValue(result)
    render(<AboutSettings />)

    await user.click(screen.getByRole('button', { name: '检查更新' }))

    expect(await screen.findByRole('status')).toHaveTextContent(message)
  })

  it('disables repeated checks while a request is pending', async () => {
    const user = userEvent.setup()
    let resolve: (result: UpdateCheckResult) => void = () => undefined
    checkForUpdates.mockReturnValue(
      new Promise<UpdateCheckResult>((promiseResolve) => {
        resolve = promiseResolve
      })
    )
    render(<AboutSettings />)

    await user.click(screen.getByRole('button', { name: '检查更新' }))
    const checkingButton = screen.getByRole('button', { name: '正在检查…' })
    expect(checkingButton).toBeDisabled()
    await user.click(checkingButton)
    expect(checkForUpdates).toHaveBeenCalledOnce()

    resolve({ status: 'no-release', currentVersion: APP_VERSION })
    expect(await screen.findByText('暂未发布稳定版本。')).toBeInTheDocument()
  })

  it('maps an unexpected IPC rejection to a retryable network message', async () => {
    const user = userEvent.setup()
    checkForUpdates.mockRejectedValueOnce(new Error('ipc failed')).mockResolvedValueOnce({
      status: 'current',
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION
    })
    render(<AboutSettings />)

    await user.click(screen.getByRole('button', { name: '检查更新' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      '无法连接更新服务，请检查网络后重试。'
    )

    await user.click(screen.getByRole('button', { name: '检查更新' }))
    expect(await screen.findByRole('status')).toHaveTextContent('当前已是最新稳定版本。')
    expect(checkForUpdates).toHaveBeenCalledTimes(2)
  })
})
