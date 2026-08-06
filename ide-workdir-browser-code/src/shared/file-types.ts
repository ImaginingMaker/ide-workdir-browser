export const MARKDOWN_EXTENSIONS: ReadonlySet<string> = new Set(['.md', '.mdx', '.markdown'])

export const IMAGE_MIME_BY_EXTENSION: Readonly<Record<string, string>> = Object.freeze({
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
})

const CODE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.css',
  '.go',
  '.h',
  '.html',
  '.java',
  '.js',
  '.jsx',
  '.mjs',
  '.py',
  '.rb',
  '.rs',
  '.scss',
  '.sh',
  '.sql',
  '.swift',
  '.ts',
  '.tsx'
])

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.conf',
  '.csv',
  '.env',
  '.gradle',
  '.ini',
  '.json',
  '.jsonc',
  '.jsonl',
  '.log',
  '.lock',
  '.ndjson',
  '.plist',
  '.properties',
  '.toml',
  '.txt',
  '.xml',
  '.yaml',
  '.yml'
])

export const imageMimeForExtension = (extension: string): string | undefined =>
  IMAGE_MIME_BY_EXTENSION[extension]

export const isImageExtension = (extension: string): boolean =>
  imageMimeForExtension(extension) !== undefined

export const isMarkdownExtension = (extension: string): boolean =>
  MARKDOWN_EXTENSIONS.has(extension)

export const isCodeExtension = (extension: string): boolean => CODE_EXTENSIONS.has(extension)

export const isTextDocumentExtension = (extension: string): boolean =>
  TEXT_EXTENSIONS.has(extension) || isMarkdownExtension(extension)

export const isKnownTextExtension = (extension: string): boolean =>
  extension === '' || isTextDocumentExtension(extension) || isCodeExtension(extension)
