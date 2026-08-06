import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  active?: boolean
}

export const IconButton = ({
  icon,
  label,
  active = false,
  className = '',
  ...props
}: IconButtonProps): React.JSX.Element => (
  <button
    type="button"
    className={`icon-button ${active ? 'is-active' : ''} ${className}`}
    aria-label={label}
    title={label}
    aria-pressed={props.role === 'tab' ? undefined : active}
    {...props}
  >
    <Icon name={icon} />
  </button>
)
