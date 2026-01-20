export type CartLine = {
  courseId: number
  quantity: number
}

const STORAGE_KEY = 'elearning.cart.v1'

const normalizeLines = (lines: CartLine[]) => {
  const map = new Map<number, CartLine>()
  for (const line of lines) {
    const courseId = Number(line.courseId)
    if (!Number.isFinite(courseId)) continue
    const quantity = Math.max(1, Math.floor(Number(line.quantity ?? 1)))
    map.set(courseId, { courseId, quantity })
  }
  return Array.from(map.values()).sort((a, b) => a.courseId - b.courseId)
}

export const useCart = () => {
  const lines = useState<CartLine[]>('cart.lines', () => [])
  const hydrated = useState<boolean>('cart.hydrated', () => false)
  const authedUserId = useState<number | null>('cart.userId', () => null)

  const count = computed(() => lines.value.reduce((acc, line) => acc + (line.quantity || 0), 0))
  const courseIds = computed(() => lines.value.map((line) => line.courseId))

  const setLines = (next: CartLine[]) => {
    lines.value = normalizeLines(next)
  }

  const hydrateFromStorage = () => {
    if (!process.client || hydrated.value) return
    hydrated.value = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      setLines(parsed)
    } catch {
      // ignore
    }
  }

  const persistToStorage = () => {
    if (!process.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.value))
    } catch {
      // ignore
    }
  }

  const setAuthenticatedUser = (userId: number | null) => {
    authedUserId.value = userId
  }

  const addLocal = (courseId: number) => {
    const existing = lines.value.find((line) => line.courseId === courseId)
    if (existing) return
    setLines([...lines.value, { courseId, quantity: 1 }])
    persistToStorage()
  }

  const removeLocal = (courseId: number) => {
    setLines(lines.value.filter((line) => line.courseId !== courseId))
    persistToStorage()
  }

  const clearLocal = () => {
    setLines([])
    persistToStorage()
  }

  const pullFromServer = async () => {
    if (!authedUserId.value) return
    const payload = await $fetch<{ items: CartLine[] }>('/api/cart')
    setLines(payload.items ?? [])
    persistToStorage()
  }

  const mergeLocalIntoServer = async () => {
    if (!authedUserId.value) return
    if (!lines.value.length) {
      await pullFromServer()
      return
    }
    await $fetch('/api/cart/merge', {
      method: 'POST',
      body: { courseIds: courseIds.value },
    })
    await pullFromServer()
  }

  const addCourse = async (courseId: number) => {
    if (!Number.isFinite(courseId)) return
    if (!authedUserId.value) {
      addLocal(courseId)
      return
    }
    await $fetch('/api/cart/items', { method: 'POST', body: { courseId } })
    await pullFromServer()
  }

  const removeCourse = async (courseId: number) => {
    if (!Number.isFinite(courseId)) return
    if (!authedUserId.value) {
      removeLocal(courseId)
      return
    }
    await $fetch(`/api/cart/items/${courseId}`, { method: 'DELETE' })
    await pullFromServer()
  }

  const clearCart = async () => {
    if (!authedUserId.value) {
      clearLocal()
      return
    }
    await $fetch('/api/cart/clear', { method: 'POST' })
    await pullFromServer()
  }

  return {
    lines,
    count,
    courseIds,
    hydrated,
    hydrateFromStorage,
    persistToStorage,
    setAuthenticatedUser,
    pullFromServer,
    mergeLocalIntoServer,
    addCourse,
    removeCourse,
    clearCart,
  }
}

