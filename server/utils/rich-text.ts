type DeltaPojo = { ops: any[] }

export const normalizeDeltaPojo = (value: any): DeltaPojo | null => {
  if (!value) return null
  if (typeof value === 'object' && Array.isArray(value.ops)) return { ops: value.ops }
  if (typeof value === 'object' && typeof value.body === 'string') {
    return { ops: [{ insert: `${value.body}\n` }] }
  }
  return null
}

export const deltaToPlainText = (delta: any): string => {
  const pojo = normalizeDeltaPojo(delta)
  if (!pojo) return ''

  let out = ''
  for (const op of pojo.ops) {
    const insert = op?.insert
    if (typeof insert === 'string') out += insert
  }

  return out
    .replace(/\s+/g, ' ')
    .trim()
}

