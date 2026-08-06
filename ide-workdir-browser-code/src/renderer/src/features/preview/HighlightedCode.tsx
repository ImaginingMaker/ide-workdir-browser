import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@renderer/components/ui/Icon'
import type { FileItem } from '@shared/contracts'
import { languageForFile, normalizeMarkdownLanguage } from './syntax'

type CopyState = 'idle' | 'copied' | 'error'

const tokenClassName = (token: Prism.Token): string => {
  const aliases = Array.isArray(token.alias) ? token.alias : token.alias ? [token.alias] : []
  return ['token', token.type, ...aliases].join(' ')
}

const renderToken = (token: string | Prism.Token, key: string): ReactNode => {
  if (typeof token === 'string') return token

  const content = Array.isArray(token.content)
    ? token.content.map((entry, index) => renderToken(entry, `${key}-${index}`))
    : renderToken(token.content, `${key}-content`)

  return (
    <span key={key} className={tokenClassName(token)}>
      {content}
    </span>
  )
}

interface HighlightedCodeProps {
  code: string
  language?: string
  file?: FileItem
}

export const HighlightedCode = ({
  code,
  language,
  file
}: HighlightedCodeProps): React.JSX.Element => {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimer = useRef<number | null>(null)
  const resolvedLanguage = normalizeMarkdownLanguage(
    language ?? (file ? languageForFile(file) : 'text')
  )
  const grammar = Prism.languages[resolvedLanguage]
  const highlighted = grammar
    ? Prism.tokenize(code, grammar).map((token, index) => renderToken(token, String(index)))
    : code
  const copyLabel =
    copyState === 'copied' ? '已复制全文' : copyState === 'error' ? '复制失败，重试' : '复制全文'

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    },
    []
  )

  const copyCode = async (): Promise<void> => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)

    try {
      await window.workdir.copyText(code)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }

    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1800)
  }

  return (
    <div className="code-preview-container">
      <pre className={`code-preview language-${resolvedLanguage}`}>
        <code>{highlighted}</code>
      </pre>
      <button
        type="button"
        className={`code-preview__copy code-preview__copy--${copyState}`}
        aria-label={copyLabel}
        aria-live="polite"
        title={copyLabel}
        onClick={() => void copyCode()}
      >
        <Icon name={copyState === 'copied' ? 'check' : 'copy'} size={14} />
      </button>
    </div>
  )
}
