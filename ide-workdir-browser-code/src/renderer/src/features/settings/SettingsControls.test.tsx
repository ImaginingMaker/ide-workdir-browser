import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../store/app-store'
import { SettingsPage } from './SettingsControls'

describe('SettingsPage', () => {
  beforeEach(() => useAppStore.setState({ settingsSaveStatus: 'saved' }))

  it('announces the current automatic-save state', () => {
    render(
      <SettingsPage title="测试设置" description="设置说明">
        <div>内容</div>
      </SettingsPage>
    )

    expect(screen.getByRole('status')).toHaveTextContent('已保存')

    act(() => useAppStore.setState({ settingsSaveStatus: 'saving' }))
    expect(screen.getByRole('status')).toHaveTextContent('正在保存…')

    act(() => useAppStore.setState({ settingsSaveStatus: 'error' }))
    expect(screen.getByRole('status')).toHaveTextContent('保存失败')
  })

  it('omits the save state on informational pages', () => {
    render(
      <SettingsPage title="关于" description="应用信息" showSaveStatus={false}>
        <div>内容</div>
      </SettingsPage>
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
