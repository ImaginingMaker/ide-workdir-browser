import { useRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ModalDialog } from './ModalDialog'

const DialogHarness = ({ onClose = vi.fn() }: { onClose?: () => void }): React.JSX.Element => {
  const [open, setOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开
      </button>
      {open && (
        <ModalDialog
          layerClassName="test-layer"
          panelClassName="test-panel"
          label="确认操作"
          initialFocusRef={cancelRef}
          onRequestClose={() => {
            onClose()
            setOpen(false)
          }}
        >
          <button ref={cancelRef} type="button">
            取消
          </button>
          <button type="button">确认</button>
        </ModalDialog>
      )}
    </>
  )
}

describe('ModalDialog', () => {
  it('traps focus, closes with Escape, and restores focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<DialogHarness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: '打开' })

    await user.click(trigger)

    const cancel = screen.getByRole('button', { name: '取消' })
    const confirm = screen.getByRole('button', { name: '确认' })
    expect(cancel).toHaveFocus()
    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps focus on the dialog when it has no interactive children', async () => {
    render(
      <ModalDialog
        layerClassName="test-layer"
        panelClassName="test-panel"
        label="只读信息"
        onRequestClose={vi.fn()}
      >
        <p>没有可操作控件</p>
      </ModalDialog>
    )

    const dialog = screen.getByRole('dialog', { name: '只读信息' })
    expect(dialog).toHaveFocus()

    await userEvent.tab()
    expect(dialog).toHaveFocus()
  })

  it('blocks Escape while closing is disabled', async () => {
    const onClose = vi.fn()
    render(
      <ModalDialog
        layerClassName="test-layer"
        panelClassName="test-panel"
        label="执行中"
        closeDisabled
        onRequestClose={onClose}
      >
        <button type="button">等待</button>
      </ModalDialog>
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '执行中' })).toBeInTheDocument()
  })
})
