import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkdirApi } from '@shared/contracts'
import { HighlightedCode } from './HighlightedCode'

describe('HighlightedCode', () => {
  const copyText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    Object.defineProperty(window, 'workdir', {
      configurable: true,
      value: { copyText } as unknown as WorkdirApi
    })
  })

  it('copies the complete rendered source and reports success', async () => {
    const code = ['const first = 1', 'const last = "完整内容"'].join('\n')
    render(<HighlightedCode code={code} language="typescript" />)

    const copyButton = screen.getByRole('button', { name: '复制全文' })
    expect(copyButton).toHaveClass('code-preview__copy')

    await userEvent.click(copyButton)

    expect(copyText).toHaveBeenCalledWith(code)
    expect(screen.getByRole('button', { name: '已复制全文' })).toBeInTheDocument()
  })

  it('keeps the copy action available after a clipboard failure', async () => {
    copyText.mockRejectedValueOnce(new Error('clipboard unavailable'))
    render(<HighlightedCode code="content" />)

    await userEvent.click(screen.getByRole('button', { name: '复制全文' }))

    expect(screen.getByRole('button', { name: '复制失败，重试' })).toBeInTheDocument()
  })
})
