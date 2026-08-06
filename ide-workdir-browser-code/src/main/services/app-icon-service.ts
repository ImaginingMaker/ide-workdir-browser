import { join } from 'node:path'

export const resolveAppIconPath = (
  isPackaged: boolean,
  resourcesPath: string,
  moduleDirectory: string
): string =>
  isPackaged
    ? join(resourcesPath, 'app.asar.unpacked', 'resources', 'icon.png')
    : join(moduleDirectory, '..', '..', 'resources', 'icon.png')
