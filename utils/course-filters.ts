export const courseSortOptions = ['default', 'price_asc', 'price_desc', 'newest'] as const

export type CourseSortOption = (typeof courseSortOptions)[number]

export type CourseFilterState = {
  categoryId: number | null
  bestsellersOnly: boolean
  minPrice: string
  maxPrice: string
  sort: CourseSortOption
}

export type FilterableCourse = {
  priceCents?: number | null
  isFeatured?: boolean | null
  createdAt?: string | Date | null
  category?: { id: number } | null
}

export const createDefaultCourseFilters = (): CourseFilterState => ({
  categoryId: null,
  bestsellersOnly: false,
  minPrice: '',
  maxPrice: '',
  sort: 'default',
})

const toPriceCents = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const amount = Number(trimmed)
  if (!Number.isFinite(amount)) return null

  return Math.round(amount * 100)
}

const toTimestamp = (value: string | Date | null | undefined): number => {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const countActiveCourseFilters = (filters: CourseFilterState): number => {
  let count = 0
  if (filters.categoryId !== null) count++
  if (filters.bestsellersOnly) count++
  if (filters.minPrice.trim()) count++
  if (filters.maxPrice.trim()) count++
  if (filters.sort !== 'default') count++
  return count
}

export const filterAndSortCourses = <T extends FilterableCourse>(
  courses: readonly T[],
  filters: CourseFilterState,
): T[] => {
  const minPriceCents = toPriceCents(filters.minPrice)
  const maxPriceCents = toPriceCents(filters.maxPrice)

  const filtered = courses.filter((course) => {
    if (filters.categoryId !== null && course.category?.id !== filters.categoryId) return false
    if (filters.bestsellersOnly && course.isFeatured !== true) return false

    const priceCents = course.priceCents ?? 0
    if (minPriceCents !== null && priceCents < minPriceCents) return false
    if (maxPriceCents !== null && priceCents > maxPriceCents) return false

    return true
  })

  if (filters.sort === 'price_asc') {
    return filtered.sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))
  }

  if (filters.sort === 'price_desc') {
    return filtered.sort((a, b) => (b.priceCents ?? 0) - (a.priceCents ?? 0))
  }

  if (filters.sort === 'newest') {
    return filtered.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
  }

  return filtered
}
