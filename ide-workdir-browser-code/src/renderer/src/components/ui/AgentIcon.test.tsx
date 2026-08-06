import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENTS } from '@shared/defaults'
import { AgentIcon } from './AgentIcon'

const decodeSvgDataUrl = (source: string): string => {
  const separatorIndex = source.indexOf(',')
  const payload = source.slice(separatorIndex + 1)

  return source.slice(0, separatorIndex).endsWith(';base64')
    ? atob(payload)
    : decodeURIComponent(payload)
}

describe('AgentIcon', () => {
  it('renders bundled brand assets for every default Agent', () => {
    DEFAULT_AGENTS.forEach((agent) => {
      const { container, unmount } = render(<AgentIcon agentId={agent.id} fallback={agent.icon} />)
      const image = container.querySelector('.agent-icon--brand img')

      expect(image).toBeInTheDocument()
      expect(image?.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
      expect(image).toHaveAttribute('width', '20')
      expect(image?.parentElement).toHaveStyle({ width: '24px', height: '24px' })
      unmount()
    })
  })

  it('keeps four pixels of framing around a custom brand size', () => {
    const { container } = render(<AgentIcon agentId="codex" fallback="box" size={24} />)
    const image = container.querySelector('.agent-icon--brand img')

    expect(image).toHaveAttribute('width', '24')
    expect(image?.parentElement).toHaveStyle({ width: '28px', height: '28px' })
  })

  it('uses the current Gemini sparkle brand asset', () => {
    const gemini = DEFAULT_AGENTS.find((agent) => agent.id === 'gemini')

    expect(gemini).toBeDefined()
    const { container } = render(
      <AgentIcon agentId="gemini" fallback={gemini?.icon ?? 'sparkles'} />
    )
    const source = container.querySelector('img')?.getAttribute('src')

    expect(source).toBeDefined()
    const svg = decodeSvgDataUrl(source ?? '')
    expect(svg).toContain('M20.616 10.835')
    expect(svg).not.toContain('M0 4.391')
  })

  it('falls back to a Lucide icon for an unknown Agent', () => {
    const { container } = render(<AgentIcon agentId="custom-agent" fallback="box" />)

    expect(container.querySelector('.agent-icon--fallback svg')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })
})
