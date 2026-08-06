import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

interface ModalDialogProps {
  layerClassName: string
  panelClassName: string
  label?: string
  labelledBy?: string
  describedBy?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  closeDisabled?: boolean
  onRequestClose(): void
  children: ReactNode
}

export const ModalDialog = ({
  layerClassName,
  panelClassName,
  label,
  labelledBy,
  describedBy,
  initialFocusRef,
  closeDisabled = false,
  onRequestClose,
  children
}: ModalDialogProps): React.JSX.Element => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initialFocus =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogRef.current
    initialFocus?.focus()

    return () => previouslyFocused?.focus()
  }, [initialFocusRef])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (!closeDisabled) onRequestClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
    )
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) {
      event.preventDefault()
      dialogRef.current?.focus()
      return
    }

    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialogRef.current)
    ) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      ref={dialogRef}
      className={`${layerClassName} motion-backdrop-enter`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <section className={`${panelClassName} motion-dialog-enter`}>{children}</section>
    </div>
  )
}
