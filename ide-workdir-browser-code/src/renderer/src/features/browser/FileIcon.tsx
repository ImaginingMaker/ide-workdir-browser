import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/app-store'
import type { FileItem, FolderIconTheme } from '@shared/contracts'
import { fileIconKind } from '@shared/file-icons'
import { isDirectoryLike } from '@shared/file-item'
import { isImageExtension } from '@shared/file-types'

const thumbnailCache = new Map<string, string | null>()
const pendingThumbnails = new Map<string, Promise<string | null>>()

const thumbnailKeyFor = (agentId: string, item: FileItem): string =>
  `${agentId}:${item.path}:${item.modifiedAt}:${item.size}`

const loadThumbnail = (key: string, agentId: string, path: string): Promise<string | null> => {
  const pending = pendingThumbnails.get(key)
  if (pending) return pending

  const request = window.workdir
    .thumbnail(agentId, path)
    .catch(() => null)
    .finally(() => pendingThumbnails.delete(key))
  pendingThumbnails.set(key, request)
  return request
}

interface ThumbnailState {
  key: string
  dataUrl: string | null
}

export const FolderIconGlyph = ({
  theme,
  size
}: {
  theme: FolderIconTheme
  size: number
}): React.JSX.Element => (
  <svg
    className={`file-icon__folder-glyph file-icon__folder-glyph--${theme}`}
    data-folder-icon-theme={theme}
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
  >
    {theme === 'outline' && (
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
    )}
    {theme === 'solid' && (
      <path d="M2.25 6.75A2.25 2.25 0 0 1 4.5 4.5h4.72c.6 0 1.17.24 1.59.66l1.34 1.34h7.35a2.25 2.25 0 0 1 2.25 2.25v8.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25z" />
    )}
    {theme === 'duotone' && (
      <>
        <path
          className="file-icon__folder-back"
          d="M3 7V6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5V10H5a2 2 0 0 0-2 2z"
        />
        <path
          className="file-icon__folder-front"
          d="M3.2 10.5h17.9l-1.25 7.25A1.5 1.5 0 0 1 18.37 19H4.83a1.5 1.5 0 0 1-1.48-1.25L2.5 12.26a1.5 1.5 0 0 1 .7-1.76"
        />
      </>
    )}
  </svg>
)

export const FileIcon = ({
  item,
  agentId,
  size = 20
}: {
  item: FileItem
  agentId?: string
  size?: number
}): React.JSX.Element => {
  const folderIconTheme = useAppStore((state) => state.settings.folderIconTheme)
  const canLoadThumbnail =
    Boolean(agentId) &&
    !isDirectoryLike(item) &&
    (item.mimeType.startsWith('image/') || isImageExtension(item.extension))
  const thumbnailKey = canLoadThumbnail && agentId ? thumbnailKeyFor(agentId, item) : null
  const [thumbnail, setThumbnail] = useState<ThumbnailState | null>(() =>
    thumbnailKey && thumbnailCache.has(thumbnailKey)
      ? { key: thumbnailKey, dataUrl: thumbnailCache.get(thumbnailKey) ?? null }
      : null
  )
  const thumbnailDataUrl = thumbnail?.key === thumbnailKey ? thumbnail.dataUrl : null
  const iconStyle = { '--file-icon-size': `${size}px` } as CSSProperties

  useEffect(() => {
    if (!thumbnailKey || !agentId) return undefined

    let cancelled = false
    const commit = (dataUrl: string | null): void => {
      if (!cancelled) setThumbnail({ key: thumbnailKey, dataUrl })
    }
    if (thumbnailCache.has(thumbnailKey)) {
      const cachedThumbnail = thumbnailCache.get(thumbnailKey) ?? null
      void Promise.resolve().then(() => commit(cachedThumbnail))
      return () => {
        cancelled = true
      }
    }

    void loadThumbnail(thumbnailKey, agentId, item.path).then((dataUrl) => {
      thumbnailCache.set(thumbnailKey, dataUrl)
      commit(dataUrl)
    })

    return () => {
      cancelled = true
    }
  }, [agentId, item.path, thumbnailKey])

  if (thumbnailDataUrl) {
    return (
      <span className="file-icon file-icon--thumbnail" style={iconStyle}>
        <img
          className="file-icon__thumbnail"
          src={thumbnailDataUrl}
          alt=""
          aria-hidden="true"
          onError={() => {
            if (thumbnailKey) thumbnailCache.set(thumbnailKey, null)
            setThumbnail(thumbnailKey ? { key: thumbnailKey, dataUrl: null } : null)
          }}
        />
      </span>
    )
  }

  const icon = fileIconKind(item)

  if (icon === 'folder') {
    return (
      <span
        className={`file-icon file-icon--folder file-icon--folder-${folderIconTheme}`}
        style={iconStyle}
      >
        <FolderIconGlyph theme={folderIconTheme} size={size} />
      </span>
    )
  }

  return (
    <span className={`file-icon file-icon--${icon}`} style={iconStyle}>
      <Icon name={icon} size={size} strokeWidth={1.6} />
    </span>
  )
}
