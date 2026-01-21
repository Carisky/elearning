<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import AdminShell from '~/components/admin-shell.vue'
import CourseWizard from '~/components/admin/course-wizard.vue'
</script>

<template>
  <AdminShell>
    <CourseWizard />
  </AdminShell>
</template>

