import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes an accessible label and handles activation', async () => {
    const onClick = vi.fn()
    render(<IconButton icon="refresh" label="刷新" onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: '刷新' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('uses tab selection semantics without adding aria-pressed', () => {
    render(
      <IconButton
        role="tab"
        icon="list"
        label="列表视图"
        active
        aria-selected="true"
        onClick={vi.fn()}
      />
    )

    const tab = screen.getByRole('tab', { name: '列表视图' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).not.toHaveAttribute('aria-pressed')
  })
})
