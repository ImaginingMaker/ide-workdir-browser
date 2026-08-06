import type { FileItem } from './contracts'
import { isDirectoryLike } from './file-item'
import {
  isCodeExtension,
  isImageExtension,
  isMarkdownExtension,
  isTextDocumentExtension
} from './file-types'

export type FileIconKind =
  | 'archive'
  | 'binary'
  | 'code'
  | 'config'
  | 'database'
  | 'document'
  | 'file'
  | 'folder'
  | 'image'
  | 'json'
  | 'key'
  | 'markdown'
  | 'table'
  | 'terminal'
  | 'text'

const extensions = (...values: string[]): ReadonlySet<string> => new Set(values)

const DATABASE_EXTENSIONS = extensions(
  '.db',
  '.db3',
  '.db-shm',
  '.db-wal',
  '.sqlite',
  '.sqlite3',
  '.sqlite-shm',
  '.sqlite-wal'
)
const JSON_EXTENSIONS = extensions('.json', '.jsonc', '.jsonl', '.ndjson')
const ARCHIVE_EXTENSIONS = extensions('.7z', '.bz2', '.gz', '.rar', '.tar', '.tgz', '.xz', '.zip')
const TABLE_EXTENSIONS = extensions('.csv', '.tsv', '.xls', '.xlsx')
const CONFIG_EXTENSIONS = extensions(
  '.conf',
  '.env',
  '.ini',
  '.lock',
  '.plist',
  '.properties',
  '.toml',
  '.yaml',
  '.yml'
)
const TERMINAL_EXTENSIONS = extensions('.bash', '.fish', '.sh', '.zsh')
const KEY_EXTENSIONS = extensions('.cer', '.crt', '.key', '.p12', '.pem', '.pub')
const DOCUMENT_EXTENSIONS = extensions('.doc', '.docx', '.pages', '.pdf', '.rtf')
const BINARY_EXTENSIONS = extensions('.a', '.bin', '.class', '.dylib', '.exe', '.o', '.so', '.wasm')

export const fileIconKind = (item: FileItem): FileIconKind => {
  if (isDirectoryLike(item)) return 'folder'

  const extension = item.extension.toLowerCase()
  if (isImageExtension(extension)) return 'image'
  if (DATABASE_EXTENSIONS.has(extension)) return 'database'
  if (JSON_EXTENSIONS.has(extension)) return 'json'
  if (isMarkdownExtension(extension)) return 'markdown'
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'archive'
  if (TABLE_EXTENSIONS.has(extension)) return 'table'
  if (CONFIG_EXTENSIONS.has(extension)) return 'config'
  if (TERMINAL_EXTENSIONS.has(extension)) return 'terminal'
  if (KEY_EXTENSIONS.has(extension)) return 'key'
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document'
  if (BINARY_EXTENSIONS.has(extension)) return 'binary'
  if (isCodeExtension(extension)) return 'code'
  if (isTextDocumentExtension(extension)) return 'text'
  return 'file'
}
