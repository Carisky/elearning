import { describe, expect, it } from 'vitest'
import {
  countActiveCourseFilters,
  createDefaultCourseFilters,
  filterAndSortCourses,
} from '../utils/course-filters'

const courses = [
  {
    id: 1,
    title: 'Spedycja podstawy',
    priceCents: 20000,
    isFeatured: true,
    createdAt: '2026-01-01T10:00:00.000Z',
    category: { id: 10, title: 'Spedycja' },
  },
  {
    id: 2,
    title: 'Obsługa celna',
    priceCents: 10000,
    isFeatured: false,
    createdAt: '2026-02-01T10:00:00.000Z',
    category: { id: 20, title: 'Cło' },
  },
  {
    id: 3,
    title: 'Logistyka kolejowa',
    priceCents: 30000,
    isFeatured: true,
    createdAt: '2026-03-01T10:00:00.000Z',
    category: { id: 10, title: 'Spedycja' },
  },
]

describe('course filters', () => {
  it('filters by category, bestseller flag, and price range', () => {
    const result = filterAndSortCourses(courses, {
      ...createDefaultCourseFilters(),
      categoryId: 10,
      bestsellersOnly: true,
      minPrice: '150',
      maxPrice: '250',
    })

    expect(result.map((course) => course.id)).toEqual([1])
  })

  it('sorts by price and newest date', () => {
    expect(
      filterAndSortCourses(courses, {
        ...createDefaultCourseFilters(),
        sort: 'price_asc',
      }).map((course) => course.id),
    ).toEqual([2, 1, 3])

    expect(
      filterAndSortCourses(courses, {
        ...createDefaultCourseFilters(),
        sort: 'price_desc',
      }).map((course) => course.id),
    ).toEqual([3, 1, 2])

    expect(
      filterAndSortCourses(courses, {
        ...createDefaultCourseFilters(),
        sort: 'newest',
      }).map((course) => course.id),
    ).toEqual([3, 2, 1])
  })

  it('keeps default ordering and counts only active filters', () => {
    const filters = createDefaultCourseFilters()

    expect(filterAndSortCourses(courses, filters).map((course) => course.id)).toEqual([1, 2, 3])
    expect(countActiveCourseFilters(filters)).toBe(0)
    expect(
      countActiveCourseFilters({
        ...filters,
        categoryId: 10,
        bestsellersOnly: true,
        minPrice: '100',
        maxPrice: '400',
        sort: 'newest',
      }),
    ).toBe(5)
  })
})
