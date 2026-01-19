<script setup>
const { data: me } = await useFetch('/api/me', { default: null })
if (me?.role === 'ADMIN') {
  await navigateTo('/admin')
}
</script>

<template>
  <div class="text-center pa-8">
    <p>
      main page
    </p>
  </div>
</template>
