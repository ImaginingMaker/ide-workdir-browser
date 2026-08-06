const yamlFrontMatterPattern =
  /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

export const markdownBodyForPreview = (content: string): string =>
  content.replace(yamlFrontMatterPattern, '')

export type MarkdownLinkTarget =
  | { kind: 'document'; path: string; fragment: string | null }
  | { kind: 'fragment'; fragment: string }
  | { kind: 'external'; url: string }
  | { kind: 'unsupported' }

const encodeFilePath = (path: string): string =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const decodeUrlComponent = (value: string): string | null => {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

export const resolveMarkdownLink = (sourceFilePath: string, href: string): MarkdownLinkTarget => {
  if (!sourceFilePath.startsWith('/') || !href.trim()) return { kind: 'unsupported' }

  let target: URL
  try {
    target = new URL(href, `workdir://local${encodeFilePath(sourceFilePath)}`)
  } catch {
    return { kind: 'unsupported' }
  }

  if (target.protocol === 'https:') return { kind: 'external', url: target.href }
  if (target.protocol !== 'workdir:' || target.host !== 'local') {
    return { kind: 'unsupported' }
  }

  const path = decodeUrlComponent(target.pathname)
  const fragment = target.hash ? decodeUrlComponent(target.hash.slice(1)) : null
  if (!path || (target.hash && fragment === null)) return { kind: 'unsupported' }
  if (path === sourceFilePath && fragment) return { kind: 'fragment', fragment }

  return { kind: 'document', path, fragment }
}
