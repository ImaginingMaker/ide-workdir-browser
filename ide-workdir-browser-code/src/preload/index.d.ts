import type { WorkdirApi } from '@shared/contracts'

declare global {
  interface Window {
    workdir: WorkdirApi
  }
}
