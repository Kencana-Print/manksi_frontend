<template>
  <component :is="layout">
    <router-view />
  </component>

  <v-snackbar v-model="needRefresh" :timeout="-1" location="bottom">
    Versi baru tersedia.
    <template #actions>
      <v-btn variant="text" @click="updateServiceWorker(true)">Update</v-btn>
      <v-btn variant="text" @click="needRefresh = false">Nanti</v-btn>
    </template>
  </v-snackbar>

  <v-snackbar v-model="offlineReady" timeout="4000" location="bottom">
    Aplikasi siap dipakai offline.
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import BlankLayout from "@/layouts/BlankLayout.vue";
import { usePwaUpdate } from "@/composables/usePwaUpdate";

const route = useRoute();

// Mapping layout berdasarkan nama yang ada di meta.layout router
const layouts: any = {
  DefaultLayout,
  BlankLayout,
};

// Default ke DefaultLayout jika tidak ditentukan di router
const layout = computed(() => {
  const layoutName = route.meta.layout as string;
  return layouts[layoutName] || DefaultLayout;
});

const { needRefresh, offlineReady, updateServiceWorker } = usePwaUpdate();
</script>
