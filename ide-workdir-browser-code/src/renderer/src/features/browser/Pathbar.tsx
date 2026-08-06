import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@renderer/components/ui/Icon'
import { useAppStore } from '@renderer/store/app-store'

interface PathSegment {
  label: string
  path: string
  navigable: boolean
}

type SegmentPresence = 'stable' | 'entering' | 'exiting' | 'replacing'

interface AnimatedPathSegment extends PathSegment {
  presence: SegmentPresence
}

interface AnimatedSegmentState {
  sourceSegments: PathSegment[]
  renderedSegments: AnimatedPathSegment[]
  hasInitialized: boolean
}

const PRESENCE_ANIMATION_FALLBACK_MS = 180

const toStableSegments = (segments: PathSegment[]): AnimatedPathSegment[] =>
  segments.map((segment) => ({ ...segment, presence: 'stable' }))

const sameSegments = (previous: PathSegment[], next: PathSegment[]): boolean =>
  previous.length === next.length &&
  previous.every(
    (segment, index) =>
      segment.path === next[index].path &&
      segment.label === next[index].label &&
      segment.navigable === next[index].navigable
  )

const sharedPrefixLength = (previous: PathSegment[], next: PathSegment[]): number => {
  const length = Math.min(previous.length, next.length)
  let index = 0
  while (index < length && previous[index].path === next[index].path) index += 1
  return index
}

const parseCssDuration = (duration: string): number | null => {
  const value = duration.trim()
  if (!value) return null

  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) return null
  if (value.endsWith('ms')) return amount
  if (value.endsWith('s')) return amount * 1000
  return null
}

const presenceAnimationDuration = (): number => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 1
  const duration = getComputedStyle(document.documentElement).getPropertyValue(
    '--motion-presence-duration'
  )
  return parseCssDuration(duration) ?? PRESENCE_ANIMATION_FALLBACK_MS
}

const presenceClassName = (presence: SegmentPresence): string => {
  if (presence === 'entering') return 'motion-presence-enter'
  if (presence === 'exiting') return 'motion-presence-exit'
  if (presence === 'replacing') return 'motion-presence-replace'
  return ''
}

const isSameLevelReplacement = (
  previousSegments: PathSegment[],
  nextSegments: PathSegment[],
  sharedLength: number
): boolean =>
  previousSegments.length === nextSegments.length && sharedLength === nextSegments.length - 1

const animateSegments = (
  previousSegments: PathSegment[],
  nextSegments: PathSegment[]
): AnimatedPathSegment[] => {
  const sharedLength = sharedPrefixLength(previousSegments, nextSegments)
  const commonSegments = nextSegments.slice(0, sharedLength).map((segment) => ({
    ...segment,
    presence: 'stable' as const
  }))
  if (isSameLevelReplacement(previousSegments, nextSegments, sharedLength)) {
    return [
      ...commonSegments,
      {
        ...nextSegments[sharedLength],
        presence: 'replacing' as const
      }
    ]
  }

  const exitingSegments = previousSegments.slice(sharedLength).map((segment) => ({
    ...segment,
    presence: 'exiting' as const
  }))
  const enteringSegments = nextSegments.slice(sharedLength).map((segment) => ({
    ...segment,
    presence: 'entering' as const
  }))

  return [...commonSegments, ...exitingSegments, ...enteringSegments]
}

const createAnimatedSegmentState = (
  currentState: AnimatedSegmentState,
  segments: PathSegment[]
): AnimatedSegmentState => {
  if (!currentState.hasInitialized) {
    return {
      sourceSegments: segments,
      renderedSegments: toStableSegments(segments),
      hasInitialized: segments.length > 0
    }
  }

  return {
    sourceSegments: segments,
    renderedSegments: animateSegments(currentState.sourceSegments, segments),
    hasInitialized: true
  }
}

const useAnimatedSegments = (segments: PathSegment[]): AnimatedPathSegment[] => {
  const [segmentState, setSegmentState] = useState<AnimatedSegmentState>({
    sourceSegments: segments,
    renderedSegments: toStableSegments(segments),
    hasInitialized: segments.length > 0
  })

  let currentSegmentState = segmentState
  if (!sameSegments(segmentState.sourceSegments, segments)) {
    currentSegmentState = createAnimatedSegmentState(segmentState, segments)
    setSegmentState(currentSegmentState)
  }

  const renderedSegments = currentSegmentState.renderedSegments

  useEffect(() => {
    if (!renderedSegments.some((segment) => segment.presence !== 'stable')) return

    const timer = window.setTimeout(() => {
      setSegmentState((currentState) => ({
        ...currentState,
        renderedSegments: toStableSegments(currentState.sourceSegments)
      }))
    }, presenceAnimationDuration())

    return () => window.clearTimeout(timer)
  }, [renderedSegments])

  return renderedSegments
}

export const Pathbar = (): React.JSX.Element => {
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const workspace = useAppStore((state) => state.workspaces[activeAgentId])
  const rootPath = useAppStore(
    (state) => state.agents.find((agent) => agent.id === activeAgentId)?.resolvedWorkdir
  )
  const navigate = useAppStore((state) => state.navigate)
  const pathRef = useRef<HTMLElement>(null)
  const currentPath =
    workspace?.viewMode === 'column'
      ? (workspace.columnActivePath ?? workspace.currentPath)
      : workspace?.currentPath

  const segments = useMemo<PathSegment[]>(() => {
    if (!currentPath) return []
    return currentPath
      .split('/')
      .filter(Boolean)
      .map((label, index, allSegments) => {
        const path = `/${allSegments.slice(0, index + 1).join('/')}`
        return {
          label,
          path,
          navigable: Boolean(rootPath && (path === rootPath || path.startsWith(`${rootPath}/`)))
        }
      })
  }, [currentPath, rootPath])
  const renderedSegments = useAnimatedSegments(segments)

  useEffect(() => {
    const pathbar = pathRef.current
    if (pathbar) pathbar.scrollTo({ left: pathbar.scrollWidth })
  }, [currentPath])

  return (
    <nav ref={pathRef} className="pathbar" aria-label="当前位置" title={currentPath}>
      <span className="pathbar__root is-disabled">
        <Icon name="hard-drive" size={13} />
        <span>Macintosh HD</span>
      </span>
      {renderedSegments.map((segment) => {
        const isExiting = segment.presence === 'exiting'
        const isCurrent = !isExiting && segment.path === currentPath
        const disabled = isExiting || !segment.navigable || isCurrent
        const segmentClassName = ['pathbar__segment', presenceClassName(segment.presence)]
          .filter(Boolean)
          .join(' ')
        return (
          <span className={segmentClassName} key={segment.path} aria-hidden={isExiting}>
            <Icon name="chevron-right" size={11} />
            <button
              type="button"
              className={disabled ? 'is-disabled' : ''}
              disabled={disabled}
              aria-current={isCurrent ? 'location' : undefined}
              onClick={() => void navigate(segment.path)}
            >
              <Icon name="folder" size={13} />
              <span>{segment.label}</span>
            </button>
          </span>
        )
      })}
    </nav>
  )
}
