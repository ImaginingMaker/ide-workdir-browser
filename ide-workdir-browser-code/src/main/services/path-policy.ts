import { homedir } from 'node:os'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import type { AgentConfig } from '@shared/contracts'

export class PathPolicy {
  expandHome(input: string): string {
    if (input === '~') return homedir()
    if (input.startsWith(`~${sep}`)) return resolve(homedir(), input.slice(2))
    return resolve(input)
  }

  resolveAgentRoot(agent: AgentConfig): string {
    return this.expandHome(agent.workdir)
  }

  assertWithinRoot(root: string, target: string): string {
    const resolvedRoot = resolve(root)
    // Authorize the path as addressed so a symlink entry inside the workspace may point outside it.
    const resolvedTarget = isAbsolute(target) ? resolve(target) : resolve(resolvedRoot, target)
    const relativePath = relative(resolvedRoot, resolvedTarget)

    if (relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
      return resolvedTarget
    }

    throw new Error('拒绝访问工作目录之外的路径')
  }
}
