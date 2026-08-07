export interface SemanticVersion {
  major: number
  minor: number
  patch: number
  prerelease: string[]
}

const semanticVersionPattern =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export const parseSemanticVersion = (value: string): SemanticVersion | null => {
  const match = value.match(semanticVersionPattern)
  if (!match) return null

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? []
  }
}

const compareIdentifier = (left: string, right: string): number => {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null

  if (leftNumber !== null && rightNumber !== null) return Math.sign(leftNumber - rightNumber)
  if (leftNumber !== null) return -1
  if (rightNumber !== null) return 1
  if (left === right) return 0
  return left < right ? -1 : 1
}

export const compareSemanticVersions = (leftValue: string, rightValue: string): number => {
  const left = parseSemanticVersion(leftValue)
  const right = parseSemanticVersion(rightValue)
  if (!left || !right) throw new Error('Invalid semantic version.')

  for (const field of ['major', 'minor', 'patch'] as const) {
    if (left[field] !== right[field]) return Math.sign(left[field] - right[field])
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0
  if (left.prerelease.length === 0) return 1
  if (right.prerelease.length === 0) return -1

  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.prerelease[index]
    const rightIdentifier = right.prerelease[index]
    if (leftIdentifier === undefined) return -1
    if (rightIdentifier === undefined) return 1

    const comparison = compareIdentifier(leftIdentifier, rightIdentifier)
    if (comparison !== 0) return comparison
  }

  return 0
}
