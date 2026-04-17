<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

import { computed, reactive, ref } from 'vue'
import AdminShell from '~/components/admin-shell.vue'

type Course = { id: number; title: string; status?: string }
type InviteCourse = { id: number; title: string }

type UserInviteStatus =
  | 'LINK_SENT'
  | 'DECLINED'
  | 'EXPIRED'
  | 'LINK_ACCEPTED'
  | 'REGISTERED'
  | 'ACCESS_GRANTED'

type InviteListItem = {
  id: number
  email: string
  createdAt: string
  expiresAt: string
  status: UserInviteStatus
  courses: InviteCourse[]
}

type CreateInviteResponse = {
  id: number
  email: string
  expiresAt: string
  inviteLink: string
}

type InvitePayload = {
  email: string
  courseIds: number[]
}

type Notification = { type: 'success' | 'error' | 'info' | 'warning'; message: string }

const INVITE_ALREADY_EXISTS_ERROR_CODE = 'INVITE_ALREADY_EXISTS'

const notification = ref<Notification | null>(null)
let notificationTimeout: ReturnType<typeof setTimeout> | null = null

const pushNotification = (payload: Notification) => {
  notification.value = payload
  if (notificationTimeout) clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => {
    notification.value = null
  }, 5000)
}

const getErrorMessage = (error: any, fallback: string): string => {
  const message =
    error?.data?.message ??
    error?.data?.statusMessage ??
    error?.statusMessage ??
    error?.message

  if (typeof message === 'string' && message.trim()) {
    return message
  }
  return fallback
}

const isInviteAlreadyExistsError = (error: any): boolean => {
  const statusCode = Number(error?.statusCode ?? error?.data?.statusCode ?? error?.response?.status ?? 0)
  const code = error?.data?.data?.code ?? error?.data?.code
  const statusMessage = String(error?.data?.statusMessage ?? error?.statusMessage ?? error?.message ?? '')

  return (
    statusCode === 409 &&
    (code === INVITE_ALREADY_EXISTS_ERROR_CODE || statusMessage.includes('Invite already exists for this email'))
  )
}

const statusLabel = (status: UserInviteStatus): string => {
  switch (status) {
    case 'LINK_SENT':
      return 'wyslano link'
    case 'DECLINED':
      return 'odrzucono'
    case 'EXPIRED':
      return 'link wygasl'
    case 'LINK_ACCEPTED':
      return 'link zaakceptowany'
    case 'REGISTERED':
      return 'zarejestrowano'
    case 'ACCESS_GRANTED':
      return 'przyznano dostep'
    default:
      return status
  }
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

const { data: rawCourses } = useFetch<Course[]>('/api/courses' as any, {
  default: () => [],
})

const courses = computed(() => (rawCourses.value ?? []).map((course) => ({ id: course.id, title: course.title })))

const {
  data: invites,
  pending: invitesPending,
  refresh: refreshInvites,
} = useFetch<InviteListItem[]>('/api/admin/user-invites' as any, {
  default: () => [],
})

const form = reactive({
  email: '',
  courseIds: [] as number[],
})

const createLoading = ref(false)
const deleteLoading = ref(false)
const createdInviteLink = ref<string | null>(null)

const resendWarningDialog = ref(false)
const resendPayload = ref<InvitePayload | null>(null)
const resendEmail = ref<string>('')

const deleteDialog = ref(false)
const inviteToDelete = ref<InviteListItem | null>(null)

const copyInviteLink = async () => {
  if (!createdInviteLink.value) return
  try {
    await navigator.clipboard.writeText(createdInviteLink.value)
    pushNotification({ type: 'success', message: 'Link skopiowany.' })
  } catch {
    pushNotification({ type: 'error', message: 'Nie udalo sie skopiowac linku.' })
  }
}

const sendInvite = async (payload: InvitePayload, allowResend: boolean) => {
  createdInviteLink.value = null
  createLoading.value = true

  try {
    const result = await $fetch<CreateInviteResponse>('/api/admin/user-invites', {
      method: 'POST',
      body: {
        email: payload.email,
        courseIds: payload.courseIds,
        allowResend,
      },
    })

    createdInviteLink.value = result.inviteLink
    pushNotification({ type: 'success', message: 'Zaproszenie utworzone.' })
    form.email = ''
    form.courseIds = []
    resendPayload.value = null
    resendEmail.value = ''
    resendWarningDialog.value = false
    await refreshInvites()
  } catch (error: any) {
    if (!allowResend && isInviteAlreadyExistsError(error)) {
      resendPayload.value = {
        email: payload.email,
        courseIds: [...payload.courseIds],
      }
      resendEmail.value = payload.email.trim().toLowerCase()
      resendWarningDialog.value = true
      return
    }

    pushNotification({
      type: 'error',
      message: getErrorMessage(error, 'Nie udalo sie utworzyc zaproszenia.'),
    })
  } finally {
    createLoading.value = false
  }
}

const createInvite = async () => {
  await sendInvite(
    {
      email: form.email,
      courseIds: [...form.courseIds],
    },
    false,
  )
}

const closeResendWarningDialog = () => {
  if (createLoading.value) return
  resendWarningDialog.value = false
}

const confirmResendInvite = async () => {
  if (!resendPayload.value) return
  await sendInvite(resendPayload.value, true)
}

const openDeleteDialog = (invite: InviteListItem) => {
  inviteToDelete.value = invite
  deleteDialog.value = true
}

const closeDeleteDialog = () => {
  if (deleteLoading.value) return
  deleteDialog.value = false
  inviteToDelete.value = null
}

const deleteInvite = async () => {
  if (!inviteToDelete.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/admin/user-invites/${inviteToDelete.value.id}` as any, {
      method: 'DELETE',
    })

    pushNotification({ type: 'success', message: 'Zaproszenie zostalo usuniete.' })
    closeDeleteDialog()
    await refreshInvites()
  } catch (error: any) {
    pushNotification({
      type: 'error',
      message: getErrorMessage(error, 'Nie udalo sie usunac zaproszenia.'),
    })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="pa-8">
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-alert
              v-if="notification"
              :type="notification.type"
              variant="tonal"
              class="mb-4"
            >
              {{ notification.message }}
            </v-alert>
          </v-col>
        </v-row>

        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="12" md="6">
            <div class="text-h5 font-weight-bold">Zaproszenia uzytkownikow</div>
            <div class="text-body-2 text-medium-emphasis">
              Tworz zaproszenia: email + kursy. Uzytkownik dostaje mail z linkiem do rejestracji.
            </div>
          </v-col>
        </v-row>

        <v-card class="mb-6">
          <v-card-title>Nowe zaproszenie</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  type="email"
                  autocomplete="email"
                  variant="outlined"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="form.courseIds"
                  :items="courses"
                  item-title="title"
                  item-value="id"
                  label="Kursy"
                  multiple
                  chips
                  variant="outlined"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <div class="d-flex align-center justify-space-between mt-4 flex-wrap ga-3">
              <v-btn
                color="primary"
                prepend-icon="mdi-email-send-outline"
                :loading="createLoading"
                :disabled="!form.email.trim() || !form.courseIds.length"
                @click="createInvite"
              >
                Wyslij link
              </v-btn>

              <div v-if="createdInviteLink" class="d-flex align-center ga-2 flex-wrap">
                <v-text-field
                  :model-value="createdInviteLink"
                  label="Link"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="min-width: 300px"
                />
                <v-btn variant="tonal" @click="copyInviteLink">Kopiuj</v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Historia zaproszen</v-card-title>
          <v-card-text>
            <v-progress-linear
              v-if="invitesPending"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <v-table v-if="(invites ?? []).length" density="compact">
              <thead>
                <tr>
                  <th class="text-left">Email</th>
                  <th class="text-left">Kursy</th>
                  <th class="text-left">Status</th>
                  <th class="text-left">Utworzono</th>
                  <th class="text-left">Wygasa</th>
                  <th class="text-left">Akcje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="invite in invites" :key="invite.id">
                  <td>{{ invite.email }}</td>
                  <td>
                    <v-chip
                      v-for="course in invite.courses"
                      :key="course.id"
                      size="x-small"
                      class="me-1"
                    >
                      {{ course.title }}
                    </v-chip>
                    <span v-if="!invite.courses.length" class="text-medium-emphasis">-</span>
                  </td>
                  <td>{{ statusLabel(invite.status) }}</td>
                  <td class="text-medium-emphasis">{{ formatDate(invite.createdAt) }}</td>
                  <td class="text-medium-emphasis">{{ formatDate(invite.expiresAt) }}</td>
                  <td>
                    <v-btn
                      size="small"
                      variant="text"
                      color="error"
                      icon="mdi-delete-outline"
                      :disabled="deleteLoading"
                      @click="openDeleteDialog(invite)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">Brak zaproszen.</v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>

    <v-dialog v-model="resendWarningDialog" max-width="560">
      <v-card>
        <v-card-title class="text-h6">Uwaga</v-card-title>
        <v-card-text>
          Na adres <strong>{{ resendEmail }}</strong> bylo juz wyslane zaproszenie.
          Czy na pewno chcesz wyslac kolejne?
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn
            variant="text"
            :disabled="createLoading"
            @click="closeResendWarningDialog"
          >
            Anuluj
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="createLoading"
            @click="confirmResendInvite"
          >
            Wyslij ponownie
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="560">
      <v-card>
        <v-card-title class="text-h6">Usun zaproszenie</v-card-title>
        <v-card-text>
          Czy na pewno chcesz usunac zaproszenie dla
          <strong>{{ inviteToDelete?.email }}</strong>?
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn
            variant="text"
            :disabled="deleteLoading"
            @click="closeDeleteDialog"
          >
            Anuluj
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteLoading"
            @click="deleteInvite"
          >
            Usun
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AdminShell>
</template>
