import type { FileItem } from '@shared/contracts'
import { isKnownTextExtension } from '@shared/file-types'

const extensionLanguages: Record<string, string> = {
  '.c': 'c',
  '.cc': 'cpp',
  '.conf': 'bash',
  '.cpp': 'cpp',
  '.css': 'css',
  '.env': 'bash',
  '.go': 'go',
  '.gradle': 'java',
  '.h': 'c',
  '.html': 'markup',
  '.ini': 'bash',
  '.java': 'java',
  '.json': 'json',
  '.jsonc': 'javascript',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.mjs': 'javascript',
  '.plist': 'markup',
  '.properties': 'bash',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.scss': 'scss',
  '.sh': 'bash',
  '.sql': 'sql',
  '.swift': 'swift',
  '.toml': 'toml',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.xml': 'markup',
  '.yaml': 'yaml',
  '.yml': 'yaml'
}

const markdownLanguages = new Set(['markdown', 'md', 'mdx'])

export const languageForFile = (file: FileItem): string =>
  extensionLanguages[file.extension] ?? 'text'

export const normalizeMarkdownLanguage = (language: string): string =>
  markdownLanguages.has(language.toLowerCase()) ? 'markdown' : language.toLowerCase()

export const isKnownTextFile = (file: FileItem): boolean => isKnownTextExtension(file.extension)

export const decodeHexDump = (content: string): string | null => {
  const bytes: number[] = []
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    if (!/^[0-9a-f]{8}\s{2}/i.test(line)) continue
    const hexColumn = line.slice(10, 57)
    const matches = hexColumn.match(/[0-9a-f]{2}/gi)
    if (!matches) continue
    bytes.push(...matches.map((hex) => Number.parseInt(hex, 16)))
  }

  if (bytes.length === 0) return null
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
}

export const formatSource = (content: string, file: FileItem): string => {
  if (file.extension === '.json') {
    try {
      return JSON.stringify(JSON.parse(content), null, 2)
    } catch {
      return content
    }
  }

  if (file.extension === '.jsonc') {
    try {
      return JSON.stringify(JSON.parse(stripJsonComments(content)), null, 2)
    } catch {
      return content
    }
  }

  return content
}

const stripJsonComments = (content: string): string =>
  stripTrailingJsonCommas(stripJsonCommentsOnly(content))

const stripJsonCommentsOnly = (content: string): string => {
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      index += 1
      while (index + 1 < content.length && !isLineBreak(content[index + 1])) index += 1
      continue
    }

    if (char === '/' && next === '*') {
      index += 1
      while (index + 1 < content.length) {
        index += 1
        if (content[index] === '*' && content[index + 1] === '/') {
          index += 1
          break
        }
        if (isLineBreak(content[index])) output += content[index]
      }
      continue
    }

    output += char
  }

  return output
}

const stripTrailingJsonCommas = (content: string): string => {
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === ',' && isClosingJsonTokenAhead(content, index + 1)) continue

    output += char
  }

  return output
}

const isClosingJsonTokenAhead = (content: string, startIndex: number): boolean => {
  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index]
    if (/\s/.test(char)) continue
    return char === '}' || char === ']'
  }
  return false
}

const isLineBreak = (char: string | undefined): boolean => char === '\n' || char === '\r'
