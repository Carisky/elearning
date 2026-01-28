<script setup lang="ts">
definePageMeta({ middleware: "admin" });

import { computed, reactive, ref } from "vue";
import AdminShell from "~/components/admin-shell.vue";

type Course = { id: number; title: string; status?: string };
type InviteCourse = { id: number; title: string };

type UserInviteStatus =
  | "LINK_SENT"
  | "DECLINED"
  | "EXPIRED"
  | "LINK_ACCEPTED"
  | "REGISTERED"
  | "ACCESS_GRANTED";

type InviteListItem = {
  id: number;
  email: string;
  createdAt: string;
  expiresAt: string;
  status: UserInviteStatus;
  courses: InviteCourse[];
};

type CreateInviteResponse = {
  id: number;
  email: string;
  expiresAt: string;
  inviteLink: string;
};

type Notification = { type: "success" | "error" | "info"; message: string };

const notification = ref<Notification | null>(null);
let notificationTimeout: ReturnType<typeof setTimeout> | null = null;
const pushNotification = (payload: Notification) => {
  notification.value = payload;
  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => (notification.value = null), 5000);
};

const statusLabel = (status: UserInviteStatus): string => {
  switch (status) {
    case "LINK_SENT":
      return "wysłano link";
    case "DECLINED":
      return "odrzucono";
    case "EXPIRED":
      return "link wygasł";
    case "LINK_ACCEPTED":
      return "link zaakceptowany";
    case "REGISTERED":
      return "zarejestrowano";
    case "ACCESS_GRANTED":
      return "przyznano dostęp";
    default:
      return status;
  }
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();

const { data: rawCourses } = useFetch<Course[]>("/api/courses" as any, {
  default: () => [],
});
const courses = computed(() =>
  (rawCourses.value ?? []).map((c) => ({ id: c.id, title: c.title })),
);

const {
  data: invites,
  pending: invitesPending,
  refresh: refreshInvites,
} = useFetch<InviteListItem[]>("/api/admin/user-invites" as any, {
  default: () => [],
});

const form = reactive({
  email: "",
  courseIds: [] as number[],
});
const createLoading = ref(false);
const createdInviteLink = ref<string | null>(null);

const copyInviteLink = async () => {
  if (!createdInviteLink.value) return;
  try {
    await navigator.clipboard.writeText(createdInviteLink.value);
    pushNotification({ type: "success", message: "Link skopiowany." });
  } catch {
    pushNotification({
      type: "error",
      message: "Nie udało się skopiować linku.",
    });
  }
};

const createInvite = async () => {
  createdInviteLink.value = null;
  createLoading.value = true;
  try {
    const result = await $fetch<CreateInviteResponse>("/api/admin/user-invites", {
      method: "POST",
      body: {
        email: form.email,
        courseIds: form.courseIds,
      },
    });

    createdInviteLink.value = result.inviteLink;
    pushNotification({ type: "success", message: "Zaproszenie utworzone." });
    form.email = "";
    form.courseIds = [];
    await refreshInvites();
  } catch (error: any) {
    pushNotification({
      type: "error",
      message:
        error?.data?.message ?? error?.message ?? "Nie udało się utworzyć zaproszenia.",
    });
  } finally {
    createLoading.value = false;
  }
};
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
            <div class="text-h5 font-weight-bold">Zaproszenia użytkowników</div>
            <div class="text-body-2 text-medium-emphasis">
              Twórz zaproszenia: email + kursy. Użytkownik dostaje mail z linkiem do rejestracji.
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

            <div class="d-flex align-center justify-space-between mt-4">
              <v-btn
                color="primary"
                prepend-icon="mdi-email-send-outline"
                :loading="createLoading"
                :disabled="!form.email || !form.courseIds.length"
                @click="createInvite"
              >
                Wyślij link
              </v-btn>

              <div v-if="createdInviteLink" class="d-flex align-center ga-2">
                <v-text-field
                  :model-value="createdInviteLink"
                  label="Link"
                  density="compact"
                  variant="outlined"
                  hide-details
                  readonly
                  style="min-width: 420px"
                />
                <v-btn variant="tonal" @click="copyInviteLink">Kopiuj</v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Historia zaproszeń</v-card-title>
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
                </tr>
              </thead>
              <tbody>
                <tr v-for="invite in invites" :key="invite.id">
                  <td>{{ invite.email }}</td>
                  <td>
                    <v-chip
                      v-for="c in invite.courses"
                      :key="c.id"
                      size="x-small"
                      class="me-1"
                    >
                      {{ c.title }}
                    </v-chip>
                    <span v-if="!invite.courses.length" class="text-medium-emphasis">
                      —
                    </span>
                  </td>
                  <td>{{ statusLabel(invite.status) }}</td>
                  <td class="text-medium-emphasis">{{ formatDate(invite.createdAt) }}</td>
                  <td class="text-medium-emphasis">{{ formatDate(invite.expiresAt) }}</td>
                </tr>
              </tbody>
            </v-table>

            <v-alert v-else variant="tonal" type="info">Brak zaproszeń.</v-alert>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </AdminShell>
</template>
