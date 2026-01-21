<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminShell from '~/components/admin-shell.vue'
import CourseWizard from '~/components/admin/course-wizard.vue'

const route = useRoute()
const courseId = computed(() => Number(route.params.id))
</script>

<template>
  <AdminShell>
    <CourseWizard :course-id="courseId" />
  </AdminShell>
</template>

