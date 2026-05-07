<script setup lang="ts">
import { onMounted } from "vue";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/stores/authStore";
import Navbar from "@/components/Navbar.vue";
import { IconUserCircle, IconMoon, IconSun } from "@tabler/icons-vue";

// 1. Import properti version dari package.json dan beri alias appVersion
// CATATAN PATH:
// - Jika file ini adalah App.vue (berada di folder src), gunakan "../package.json"
// - Jika file ini berada di folder src/layouts/, gunakan "../../package.json"
import { version as appVersion } from "../../package.json";

const theme = useTheme();
const authStore = useAuthStore();

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
  localStorage.setItem("manksi-theme", theme.global.name.value);
};

onMounted(() => {
  const savedTheme = localStorage.getItem("manksi-theme");
  if (savedTheme) {
    theme.global.name.value = savedTheme;
  }
});
</script>

<template>
  <v-app>
    <Navbar />

    <v-main style="background-color: #f8f9fa">
      <router-view />
    </v-main>

    <v-footer
      app
      class="pa-2"
      style="font-size: 11px; border-top: 1px solid #e0e0e0; height: 32px"
    >
      <div class="d-flex align-center">
        <IconUserCircle
          :size="14"
          :stroke-width="1.5"
          class="mr-2"
          style="opacity: 0.6"
        />
        <strong>{{ authStore.userName }}</strong>
        <span class="mx-2 text-disabled">|</span>
        <span>{{ authStore.userCabang }} - {{ authStore.user?.bagian }}</span>
      </div>
      <v-spacer></v-spacer>

      <v-btn
        icon
        variant="text"
        size="x-small"
        class="mr-3"
        @click="toggleTheme"
      >
        <IconMoon
          v-if="theme.global.current.value.dark"
          :size="16"
          :stroke-width="1.5"
        />
        <IconSun v-else :size="16" :stroke-width="1.5" />
      </v-btn>

      <!-- 2. Tambahkan appVersion di sini -->
      <div class="text-medium-emphasis">
        v{{ appVersion }} &copy; 2026 IT Kencana
      </div>
    </v-footer>
  </v-app>
</template>
