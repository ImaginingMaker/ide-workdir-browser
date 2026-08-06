import { spawnSync } from 'node:child_process'

const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore']
})

if (gitRoot.status !== 0) {
  console.log('Git repository not found; skipping hook installation.')
  process.exit(0)
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.husky'], {
  cwd: gitRoot.stdout.trim(),
  stdio: 'inherit'
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
