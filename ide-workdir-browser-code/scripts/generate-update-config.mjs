/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/

const parseArgs = (argv) => {
  const args = {
    output: 'out/update-config.json',
    repository: null
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--output' || value === '--repository') {
      const next = argv[index + 1]
      if (!next) throw new Error(`${value} requires a value.`)
      if (value === '--output') args.output = next
      else args.repository = next
      index += 1
      continue
    }

    throw new Error(`Unexpected argument: ${value}`)
  }

  return args
}

const normalizeRepository = (value) => {
  const repository = value?.trim() || null
  if (!repository) return null

  if (
    !repositoryPattern.test(repository) ||
    repository.includes('..') ||
    repository.endsWith('.')
  ) {
    throw new Error('Update repository must use a valid owner/repository slug.')
  }

  return repository
}

try {
  const args = parseArgs(process.argv.slice(2))
  const repository = normalizeRepository(
    args.repository || process.env.APP_UPDATE_REPOSITORY || process.env.GITHUB_REPOSITORY
  )
  const output = resolve(process.cwd(), args.output)

  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify({ repository }, null, 2)}\n`)
  console.log(repository ? 'Configured the application update source.' : 'Update source disabled.')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
