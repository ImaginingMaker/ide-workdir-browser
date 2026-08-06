const includesAny = (value: string, fragments: string[]): boolean =>
  fragments.some((fragment) => value.includes(fragment))

export type UserErrorContext =
  'directory' | 'file-operation' | 'initialization' | 'preview' | 'search' | 'settings'

type ErrorKind = 'missing' | 'permission' | 'not-directory' | 'outside-root' | 'unknown'

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const classifyError = (error: unknown): ErrorKind => {
  const normalized = errorMessage(error).toLowerCase()
  if (includesAny(normalized, ['enoent', 'no such file or directory'])) return 'missing'
  if (
    includesAny(normalized, ['eacces', 'eperm', 'permission denied', 'operation not permitted'])
  ) {
    return 'permission'
  }
  if (includesAny(normalized, ['enotdir', 'not a directory'])) return 'not-directory'
  if (normalized.includes('拒绝访问工作目录之外的路径')) return 'outside-root'
  return 'unknown'
}

export const isFileAccessDeniedError = (error: unknown): boolean =>
  classifyError(error) === 'permission'

const contextMessages: Record<UserErrorContext, Record<ErrorKind, string>> = {
  directory: {
    missing: '找不到该工作目录，它可能已被移动或删除。请在“设置 > Agent”中重新选择有效文件夹。',
    permission:
      '当前没有权限访问该工作目录。你可以重新尝试、选择其他目录，或在 macOS“隐私与安全性 > 文件与文件夹”中允许访问。',
    'not-directory': '配置的工作目录不是文件夹。请在“设置 > Agent”中重新选择有效文件夹。',
    'outside-root': '无法访问该路径，因为它超出了当前 Agent 的工作目录。',
    unknown: '无法读取工作目录。请检查路径和 macOS 文件访问权限后重试。'
  },
  'file-operation': {
    missing: '源文件或目标文件夹已被移动或删除，文件操作未能完成。',
    permission: '没有权限完成该文件操作。请检查相关文件夹的 macOS 访问权限。',
    'not-directory': '目标位置不是有效文件夹，文件操作未能完成。',
    'outside-root': '无法完成文件操作，因为目标路径超出了当前 Agent 的工作目录。',
    unknown: '文件操作未能完成，请检查文件状态后重试。'
  },
  initialization: {
    missing: '应用配置引用的文件夹不存在。请打开设置并重新选择有效目录。',
    permission: '应用没有所需的文件访问权限。请检查 macOS“隐私与安全性”设置。',
    'not-directory': '应用配置中包含无效的工作目录。',
    'outside-root': '应用配置中包含不允许访问的路径。',
    unknown: '应用初始化失败，请重新启动后再试。'
  },
  preview: {
    missing: '文件已被移动或删除，无法继续预览。',
    permission: '没有权限读取该文件。请检查 macOS 文件访问权限。',
    'not-directory': '无法预览该项目，因为文件类型与路径不匹配。',
    'outside-root': '无法预览该文件，因为它不属于当前工作目录。',
    unknown: '文件预览失败，请稍后重试。'
  },
  search: {
    missing: '搜索目录已被移动或删除，请刷新工作目录后重试。',
    permission: '没有权限搜索该目录。请检查 macOS 文件访问权限。',
    'not-directory': '搜索范围不是有效文件夹，请重新选择搜索位置。',
    'outside-root': '无法搜索当前路径，因为它超出了 Agent 工作目录。',
    unknown: '搜索未能完成，请缩小范围或稍后重试。'
  },
  settings: {
    missing: '设置引用的文件夹不存在，请重新选择有效目录。',
    permission: '没有权限保存或验证该设置，请检查 macOS 文件访问权限。',
    'not-directory': '设置中的工作目录不是有效文件夹。',
    'outside-root': '设置包含不允许访问的路径。',
    unknown: '设置保存失败，请稍后重试。'
  }
}

export const formatUserFacingError = (error: unknown, context: UserErrorContext): string =>
  contextMessages[context][classifyError(error)]
