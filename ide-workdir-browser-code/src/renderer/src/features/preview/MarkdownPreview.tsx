import { useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { HighlightedCode } from './HighlightedCode'
import { markdownBodyForPreview, resolveMarkdownLink } from './markdown'
import { MermaidDiagram } from './MermaidDiagram'

interface MarkdownPreviewProps {
  content: string
  sourceFilePath: string
  onOpenDocument: (path: string) => void
}

const languageFromClassName = (className?: string): string | null =>
  /language-([a-zA-Z0-9_-]+)/.exec(className ?? '')?.[1] ?? null

const headingSlug = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')

export const MarkdownPreview = ({
  content,
  sourceFilePath,
  onOpenDocument
}: MarkdownPreviewProps): React.JSX.Element => {
  const articleRef = useRef<HTMLElement>(null)

  const scrollToFragment = (fragment: string): void => {
    const normalizedFragment = fragment.toLocaleLowerCase()
    const target = Array.from(
      articleRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? []
    ).find((heading) => {
      const text = heading.textContent?.trim() ?? ''
      return (
        text.toLocaleLowerCase() === normalizedFragment || headingSlug(text) === normalizedFragment
      )
    })
    target?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <article className="markdown-preview" ref={articleRef}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, title }) => {
            const target = href
              ? resolveMarkdownLink(sourceFilePath, href)
              : { kind: 'unsupported' as const }
            if (target.kind === 'external') {
              return (
                <a href={target.url} title={title} target="_blank" rel="noreferrer">
                  {children}
                </a>
              )
            }
            return (
              <a
                href={href}
                title={title}
                aria-disabled={target.kind === 'unsupported' || undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (target.kind === 'document') onOpenDocument(target.path)
                  if (target.kind === 'fragment') scrollToFragment(target.fragment)
                }}
              >
                {children}
              </a>
            )
          },
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const language = languageFromClassName(className)
            const code = String(children).replace(/\n$/, '')
            if (!language) return <code className={className}>{children}</code>
            if (language.toLowerCase() === 'mermaid') return <MermaidDiagram chart={code} />
            return <HighlightedCode code={code} language={language} />
          }
        }}
      >
        {markdownBodyForPreview(content)}
      </Markdown>
    </article>
  )
}
