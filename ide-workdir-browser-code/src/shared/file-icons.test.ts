import { describe, expect, it } from 'vitest'
import { fileFixture, folderFixture } from '../test/fixtures'
import { fileIconKind } from './file-icons'

describe('fileIconKind', () => {
  it.each([
    ['workspace.sqlite', '.sqlite', 'database'],
    ['events.jsonl', '.jsonl', 'json'],
    ['README.md', '.md', 'markdown'],
    ['archive.zip', '.zip', 'archive'],
    ['metrics.csv', '.csv', 'table'],
    ['config.toml', '.toml', 'config'],
    ['setup.sh', '.sh', 'terminal'],
    ['certificate.pem', '.pem', 'key'],
    ['guide.pdf', '.pdf', 'document'],
    ['module.wasm', '.wasm', 'binary'],
    ['main.ts', '.ts', 'code'],
    ['notes.txt', '.txt', 'text']
  ] as const)('maps %s to the %s icon kind', (name, extension, expectedKind) => {
    expect(fileIconKind({ ...fileFixture, name, extension })).toBe(expectedKind)
  })

  it('maps directories before considering their old file extension', () => {
    expect(fileIconKind(folderFixture)).toBe('folder')
  })
})
