import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { NotificationHost } from './NotificationHost'
import { notify } from './notification-store'

describe('NotificationHost', () => {
  beforeEach(() => notify.clear())

  it('keeps an empty overlay viewport mounted without exposing an empty region', () => {
    const { container } = render(<NotificationHost />)

    expect(container.querySelector('.notification-host')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('region', { name: '操作消息' })).not.toBeInTheDocument()
  })

  it('renders queued variants in one shared message layer', () => {
    notify.success('保存成功')
    notify.warning('部分项目未处理')
    notify.error('读取失败')

    render(<NotificationHost />)

    expect(screen.getByRole('region', { name: '操作消息' })).toBeInTheDocument()
    expect(screen.getByText('保存成功')).toBeInTheDocument()
    expect(screen.getByText('部分项目未处理')).toBeInTheDocument()
    expect(screen.getByText('读取失败')).toBeInTheDocument()
  })
})
