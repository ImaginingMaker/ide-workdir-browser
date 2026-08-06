import { useEffect, useId, useState } from 'react'

interface MermaidDiagramProps {
  chart: string
}

type MermaidModule = typeof import('mermaid')

interface MermaidRenderState {
  chart: string
  svg: string | null
  error: string | null
}

const sanitizeSvg = (svg: string): string => {
  const parser = new DOMParser()
  const document = parser.parseFromString(svg, 'image/svg+xml')
  if (document.querySelector('parsererror')) return ''

  document.querySelectorAll('script, foreignObject').forEach((element) => element.remove())
  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(document.documentElement)
}

const renderMermaid = async (id: string, chart: string): Promise<string> => {
  const mermaidModule: MermaidModule = await import('mermaid')
  const mermaid = mermaidModule.default
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'
  })
  const { svg } = await mermaid.render(id, chart)
  const safeSvg = sanitizeSvg(svg)
  if (!safeSvg) throw new Error('Mermaid 图表渲染结果无效')
  return safeSvg
}

export const MermaidDiagram = ({ chart }: MermaidDiagramProps): React.JSX.Element => {
  const reactId = useId()
  const [renderState, setRenderState] = useState<MermaidRenderState | null>(null)
  const currentRenderState = renderState?.chart === chart ? renderState : null
  const svg = currentRenderState?.svg ?? null
  const error = currentRenderState?.error ?? null

  useEffect(() => {
    let cancelled = false
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`

    void renderMermaid(id, chart)
      .then((result) => {
        if (!cancelled) setRenderState({ chart, svg: result, error: null })
      })
      .catch((renderError: unknown) => {
        if (!cancelled) {
          setRenderState({ chart, svg: null, error: (renderError as Error).message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  if (error) {
    return (
      <div className="mermaid-diagram mermaid-diagram--error">
        <strong>Mermaid 渲染失败</strong>
        <pre>{chart}</pre>
        <p>{error}</p>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="mermaid-diagram mermaid-diagram--loading">
        <span className="spinner" />
        <span>正在渲染 Mermaid 图表…</span>
      </div>
    )
  }

  return (
    <div
      className="mermaid-diagram"
      role="img"
      aria-label="Mermaid 图表"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
