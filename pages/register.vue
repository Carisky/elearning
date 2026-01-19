<template>
  <section class="pa-8">
    <v-card elevation="2" class="mx-auto" max-width="560">
      <v-card-title>Rejestracja</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="submitRegister">
          <v-text-field v-model="form.name" label="Imię" />
          <v-text-field v-model="form.email" label="Email" type="email" required />
          <v-text-field v-model="form.password" label="Hasło" type="password" required />
        </v-form>
        <v-alert v-if="error" variant="tonal" dense class="mb-4">{{ error }}</v-alert>
        <v-alert v-if="success" variant="text" dense class="mb-4">{{ success }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" :loading="loading" @click="submitRegister">Zarejestruj</v-btn>
      </v-card-actions>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from '#imports'
const form = reactive({
  name: '',
  email: '',
  password: '',
})
const error = ref('')
const success = ref('')
const loading = ref(false)
const router = useRouter()

const submitRegister = async () => {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    await $fetch('/api/register', {
      method: 'POST',
      body: form,
    })
    success.value = 'Zarejestrowano.'
    form.name = ''
    form.email = ''
    form.password = ''
    router.replace('/')
  } catch (err: any) {
    error.value = err?.data?.message ?? err?.message ?? 'Nie udalo śie zarejestrować'
  } finally {
    loading.value = false
  }
}
</script>
