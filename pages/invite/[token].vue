<script setup lang="ts">
import { computed, ref } from "vue";

type InvitePreview = {
  email: string;
  expiresAt: string;
  status:
    | "LINK_SENT"
    | "DECLINED"
    | "EXPIRED"
    | "LINK_ACCEPTED"
    | "REGISTERED"
    | "ACCESS_GRANTED";
  courses: Array<{ id: number; title: string }>;
};

const route = useRoute();
const token = computed(() => (typeof route.params.token === "string" ? route.params.token : ""));

const loadingAction = ref(false);
const actionMessage = ref("");

const { data: preview, pending, refresh } = useFetch<InvitePreview | null>(
  () => `/api/user-invites/preview?token=${encodeURIComponent(token.value)}` as any,
  { default: () => null },
);

const statusLabel = (status: InvitePreview["status"]) => {
  switch (status) {
    case "LINK_SENT":
      return "Выслано ссылку";
    case "DECLINED":
      return "Отклонено";
    case "EXPIRED":
      return "Ссылка истекла";
    case "LINK_ACCEPTED":
      return "Ссылка принята";
    case "REGISTERED":
      return "Зарегистрирован";
    case "ACCESS_GRANTED":
      return "Доступы выданы";
    default:
      return status;
  }
};

const isBlocked = computed(() => {
  const s = preview.value?.status;
  return s === "DECLINED" || s === "EXPIRED" || s === "ACCESS_GRANTED" || s === "REGISTERED";
});

const accept = async () => {
  if (!token.value) return;
  loadingAction.value = true;
  actionMessage.value = "";
  try {
    await $fetch("/api/user-invites/accept", {
      method: "POST",
      body: { token: token.value },
    });

    await navigateTo({
      path: "/",
      query: {
        login: "1",
        mode: "register",
        invite: token.value,
        redirect: "/my-profile",
      },
    });
  } catch (error: any) {
    actionMessage.value = error?.data?.message ?? error?.message ?? "Не удалось принять приглашение.";
    await refresh();
  } finally {
    loadingAction.value = false;
  }
};

const decline = async () => {
  if (!token.value) return;
  loadingAction.value = true;
  actionMessage.value = "";
  try {
    await $fetch("/api/user-invites/decline", {
      method: "POST",
      body: { token: token.value },
    });
    actionMessage.value = "Приглашение отклонено.";
    await refresh();
  } catch (error: any) {
    actionMessage.value = error?.data?.message ?? error?.message ?? "Не удалось отклонить приглашение.";
  } finally {
    loadingAction.value = false;
  }
};
</script>

<template>
  <section class="pa-10">
    <v-container style="max-width: 860px">
      <v-card>
        <v-card-title>Приглашение</v-card-title>
        <v-card-text>
          <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

          <v-alert v-if="actionMessage" type="info" variant="tonal" class="mb-4">
            {{ actionMessage }}
          </v-alert>

          <template v-if="preview">
            <div class="text-body-1 mb-2">
              Email: <strong>{{ preview.email }}</strong>
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Статус: {{ statusLabel(preview.status) }} · действует до
              {{ new Date(preview.expiresAt).toLocaleString() }}
            </div>

            <div class="text-subtitle-2 mb-2">Курсы</div>
            <v-chip v-for="c in preview.courses" :key="c.id" class="me-2 mb-2">
              {{ c.title }}
            </v-chip>

            <v-alert v-if="isBlocked" type="warning" variant="tonal" class="mt-4">
              Это приглашение недоступно.
            </v-alert>

            <div class="d-flex ga-3 mt-6">
              <v-btn
                color="primary"
                :loading="loadingAction"
                :disabled="isBlocked || !token"
                @click="accept"
              >
                Принять и зарегистрироваться
              </v-btn>
              <v-btn
                color="error"
                variant="tonal"
                :loading="loadingAction"
                :disabled="isBlocked || !token"
                @click="decline"
              >
                Отклонить
              </v-btn>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </v-container>
  </section>
</template>
