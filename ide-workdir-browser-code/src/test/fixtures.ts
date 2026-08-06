import type { FileItem, ResolvedAgent } from '@shared/contracts'

export const agentFixture: ResolvedAgent = {
  id: 'codex',
  name: 'Codex',
  icon: 'box',
  workdir: '~/.codex',
  resolvedWorkdir: '/Users/test/.codex',
  enabled: true,
  isDefault: true,
  isCustom: false,
  lastScanned: 0,
  status: 'connected'
}

export const fileFixture: FileItem = {
  name: 'README.md',
  path: '/Users/test/.codex/README.md',
  type: 'file',
  size: 1024,
  mimeType: 'text/markdown',
  modifiedAt: new Date('2026-08-05T12:00:00Z').getTime(),
  createdAt: new Date('2026-08-01T12:00:00Z').getTime(),
  isHidden: false,
  isReadable: true,
  extension: '.md'
}

export const folderFixture: FileItem = {
  ...fileFixture,
  name: 'projects',
  path: '/Users/test/.codex/projects',
  type: 'directory',
  size: 0,
  mimeType: 'application/octet-stream',
  extension: ''
}
