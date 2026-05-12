# Canva Platform Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the concrete Canva-requested platform updates: checkout note persistence, course filters, admin users/statistics, login modal behavior, and footer branding.

**Architecture:** Keep controllers thin and put reusable business rules in small utilities. Persist checkout comments on `Order.customerNote`. Add admin endpoints and pages using the existing Nuxt/Vuetify patterns.

**Tech Stack:** Nuxt 4, Vue 3, Vuetify 3, TypeScript, Nitro/h3, Prisma 7, PostgreSQL, Vitest.

---

### Task 1: Checkout Customer Note

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260512090000_add_order_customer_note/migration.sql`
- Modify: `server/api/checkout.post.ts`
- Test: `test/api.min.spec.ts`

- [x] Add a failing API test that posts `customerNote` during checkout and asserts `prisma.order.customerNote`.
- [x] Run `npm run test -- test/api.min.spec.ts` and confirm the test fails because the field does not exist or is not saved.
- [x] Add nullable `customerNote String?` to `Order`, add migration SQL, and save a trimmed note up to 2000 characters.
- [x] Run tests again and confirm the checkout note test passes.

### Task 2: Course Filtering Rules

**Files:**
- Create: `utils/course-filters.ts`
- Create: `test/course-filters.spec.ts`
- Modify: `pages/courses/index.vue`

- [x] Add failing unit tests for category, bestseller, price range, default sort, price sort, newest sort, and reset-ready defaults.
- [x] Run `npm run test -- test/course-filters.spec.ts` and confirm failures.
- [x] Implement `filterAndSortCourses`, `countActiveCourseFilters`, and default filter state in `utils/course-filters.ts`.
- [x] Update `/courses` to use the utility and show the Canva filter labels.
- [x] Run the unit test.

### Task 3: Admin Users And Statistics

**Files:**
- Create: `server/api/admin/stats.get.ts`
- Modify: `components/admin-shell.vue`
- Modify: `pages/admin/index.vue`
- Create: `pages/admin/users/index.vue`
- Test: `test/api.min.spec.ts`

- [x] Add failing API tests for `/api/admin/stats` and admin-visible `/api/users` fields.
- [x] Run the API tests and confirm `/api/admin/stats` fails.
- [x] Implement stats with Prisma counts and latest order totals.
- [x] Add admin navigation item and Vuetify pages for dashboard and users table.
- [x] Run API tests.

### Task 4: Login Dialog And Branding

**Files:**
- Modify: `layouts/default.vue`
- Modify: `components/site-footer.vue`
- Modify: `pages/buy.vue`

- [x] Remove `persistent` from the login `v-dialog` so outside click closes it.
- [x] Make the buy-page login CTA open login mode only.
- [x] Add the checkout customer note textarea.
- [x] Update footer text/contact structure to Akademia TSL / TSL Silesia branding.
- [x] Run `npm run build` after all changes.

