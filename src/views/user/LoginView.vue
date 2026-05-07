<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import { AxiosError } from "axios";
import { useTheme } from "vuetify";
import {
  IconSun,
  IconMoon,
  IconUser,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
} from "@tabler/icons-vue";

// --- IMPORT ASSETS ---
import logoUrl from "@/assets/logo.png"; // Pastikan aset ini ada
import heroImage from "@/assets/login-hero.jpg"; // Pastikan aset ini ada

const toast = useToast();
const router = useRouter();
const theme = useTheme();
const authStore = useAuthStore();

// --- STATE ---
const kodeUser = ref("");
const password = ref("");
const isLoading = ref(false);
const showPassword = ref(false);

// State untuk Dialog Khusus Manksi
const isDefaultPasswordVisible = ref(false);
const specialMessage = ref<string | null>(null);

// Load Tema Tersimpan
onMounted(() => {
  const savedTheme = localStorage.getItem("manksi-theme");
  if (savedTheme) {
    theme.global.name.value = savedTheme;
  }
});

// Toggle Dark Mode
const toggleTheme = () => {
  const newTheme = theme.global.current.value.dark ? "light" : "dark";
  theme.global.name.value = newTheme;
  localStorage.setItem("manksi-theme", newTheme); // Pastikan key-nya 'manksi-theme'
};
// --- LOGIC ---
const handleLogin = async () => {
  if (!kodeUser.value || !password.value) {
    toast.error("User dan Password harus diisi.");
    return;
  }

  isLoading.value = true;
  try {
    const response = await api.post("/auth/login", {
      username: kodeUser.value,
      password: password.value,
    });

    const loginData = response.data;
    authStore.setLoginData(loginData);
    toast.success(loginData.message || "Login berhasil!");

    if (loginData.specialMessage) {
      specialMessage.value = loginData.specialMessage;
      toast.warning(loginData.specialMessage, { timeout: 8000 });
    }

    // LOGIC BARU: Langsung lempar ke Dashboard (Kecuali pakai password 123)
    if (loginData.isDefaultPassword) {
      isDefaultPasswordVisible.value = true;
    } else {
      router.push("/");
    }
  } catch (err) {
    const error = err as AxiosError<{ message: string }>;
    toast.error(
      error.response?.data?.message || "Terjadi kesalahan saat login.",
    );
  } finally {
    isLoading.value = false;
  }
};

const proceedFromDefaultPassword = () => {
  isDefaultPasswordVisible.value = false;
  router.push("/"); // Langsung pindah ke dashboard
};
</script>

<template>
  <v-container fluid class="pa-0 fill-height login-wrapper">
    <v-row no-gutters class="fill-height">
      <v-col cols="12" md="6" lg="7" class="d-none d-md-block hero-container">
        <div class="image-wrapper">
          <v-img
            :src="heroImage"
            cover
            class="fill-height zoom-effect"
            alt="Login Background"
          >
            <template #placeholder>
              <div
                class="d-flex align-center justify-center fill-height bg-grey-lighten-4"
              >
                <v-progress-circular
                  indeterminate
                  color="primary"
                ></v-progress-circular>
              </div>
            </template>
            <div
              class="hero-overlay"
              :class="{ 'dark-overlay': theme.global.current.value.dark }"
            ></div>
          </v-img>
        </div>
      </v-col>

      <v-col
        cols="12"
        md="6"
        lg="5"
        class="d-flex flex-column position-relative form-side bg-surface transition-colors"
      >
        <v-btn
          icon
          variant="tonal"
          size="small"
          class="theme-toggle-btn"
          @click="toggleTheme"
          :color="
            theme.global.current.value.dark
              ? 'yellow-lighten-3'
              : 'blue-grey-darken-2'
          "
        >
          <IconSun v-if="theme.global.current.value.dark" :size="18" />
          <IconMoon v-else :size="18" />
          <v-tooltip activator="parent" location="left">Ganti Tema</v-tooltip>
        </v-btn>

        <div class="brand-header pt-8 pr-8 text-right w-100 fade-in-down">
          <div class="d-inline-flex align-center gap-3 hover-scale">
            <img :src="logoUrl" alt="Manksi Logo" height="32" class="mr-2" />
            <h3
              class="text-h6 font-weight-bold tracking-wide transition-colors"
              :class="
                theme.global.current.value.dark
                  ? 'text-white'
                  : 'text-grey-darken-4'
              "
              :style="{ fontFamily: 'Roboto, sans-serif' }"
            ></h3>
          </div>
        </div>

        <div
          class="flex-grow-1 d-flex align-center justify-center pa-6 pa-md-16 fade-in-up"
        >
          <div class="w-100" style="max-width: 400px">
            <div class="mb-10">
              <h2
                class="text-h4 font-weight-bold mb-2 transition-colors"
                :class="
                  theme.global.current.value.dark
                    ? 'text-white'
                    : 'text-grey-darken-4'
                "
              >
                Welcome Back!
              </h2>
              <p
                class="text-body-1 opacity-80 transition-colors"
                :class="
                  theme.global.current.value.dark
                    ? 'text-grey-lighten-1'
                    : 'text-grey-darken-1'
                "
              >
                Masuk untuk Melanjutkan ke Aplikasi Manksi.
              </p>
            </div>

            <v-form @submit.prevent="handleLogin">
              <div class="mb-5 input-group">
                <label
                  class="text-caption font-weight-bold mb-1 d-block text-uppercase ls-1 transition-colors"
                  :class="
                    theme.global.current.value.dark
                      ? 'text-grey-lighten-2'
                      : 'text-grey-darken-2'
                  "
                >
                  User ID
                </label>
                <v-text-field
                  v-model="kodeUser"
                  placeholder="Masukkan Kode User"
                  variant="outlined"
                  color="primary"
                  density="compact"
                  hide-details
                  class="custom-input"
                  autofocus
                >
                  <template #prepend-inner
                    ><IconUser :size="16" :stroke-width="1.7"
                  /></template>
                </v-text-field>
              </div>

              <div class="mb-8 input-group" style="animation-delay: 0.1s">
                <div class="d-flex justify-space-between align-center mb-1">
                  <label
                    class="text-caption font-weight-bold d-block text-uppercase ls-1 transition-colors"
                    :class="
                      theme.global.current.value.dark
                        ? 'text-grey-lighten-2'
                        : 'text-grey-darken-2'
                    "
                  >
                    Password
                  </label>
                </div>
                <v-text-field
                  v-model="password"
                  placeholder="Masukkan Password"
                  :type="showPassword ? 'text' : 'password'"
                  variant="outlined"
                  color="primary"
                  density="compact"
                  hide-details
                  class="custom-input"
                >
                  <template #prepend-inner
                    ><IconLock :size="16" :stroke-width="1.7"
                  /></template>
                  <template #append-inner>
                    <component
                      :is="showPassword ? IconEye : IconEyeOff"
                      :size="16"
                      :stroke-width="1.7"
                      style="cursor: pointer"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </v-text-field>
              </div>

              <v-btn
                type="submit"
                block
                color="primary"
                size="large"
                height="50"
                class="text-body-1 font-weight-bold mb-4 elevation-4 btn-hover-effect"
                :loading="isLoading"
              >
                Login Sekarang
              </v-btn>
            </v-form>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="isDefaultPasswordVisible" persistent max-width="400px">
      <v-card>
        <v-card-title class="bg-warning text-white d-flex align-center">
          <IconAlertTriangle :size="18" :stroke-width="1.7" class="mr-2" />
          Peringatan Keamanan
        </v-card-title>
        <v-card-text class="pt-4">
          Password User masih standar (sama dengan username atau '123').
          Silahkan Ganti Password Anda di menu Pengaturan setelah masuk.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="proceedFromDefaultPassword"
            >Mengerti</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
/* UTAMA: Transisi Warna Halus */
.transition-colors {
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.login-wrapper {
  height: 100vh;
  overflow: hidden;
  background-color: rgb(var(--v-theme-background));
}

/* HERO IMAGE */
.hero-container {
  position: relative;
  background-color: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.image-wrapper {
  height: 100%;
  width: 100%;
}

.zoom-effect {
  transition: transform 10s ease;
}

.hero-container:hover .zoom-effect {
  transform: scale(1.05);
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transition: background-color 0.3s ease;
}

.dark-overlay {
  background-color: rgba(0, 0, 0, 0.4);
}

/* INPUT FIELD STYLING (THEME AWARE) */
.custom-input {
  transition: all 0.3s ease;
}

.custom-input :deep(.v-field__outline__start),
.custom-input :deep(.v-field__outline__end),
.custom-input :deep(.v-field__outline__notch) {
  border-color: rgba(var(--v-theme-on-surface), 0.3) !important;
  transition: border-color 0.3s ease;
}

.custom-input:hover :deep(.v-field__outline__start),
.custom-input:hover :deep(.v-field__outline__end),
.custom-input:hover :deep(.v-field__outline__notch) {
  border-color: rgba(var(--v-theme-on-surface), 0.6) !important;
}

.custom-input :deep(.v-field--focused .v-field__outline__start),
.custom-input :deep(.v-field--focused .v-field__outline__end),
.custom-input :deep(.v-field--focused .v-field__outline__notch) {
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px;
}

/* POSISI TOMBOL TOGGLE (KANAN BAWAH) */
.theme-toggle-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 20;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.theme-toggle-btn:hover {
  opacity: 1;
  transform: rotate(15deg);
}

/* TYPOGRAPHY & ANIMATION */
.tracking-wide {
  letter-spacing: 0.05em;
}
.ls-1 {
  letter-spacing: 1px;
}

.btn-hover-effect:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(var(--v-theme-primary), 0.3) !important;
}

.hover-scale {
  transition: transform 0.3s ease;
}
.hover-scale:hover {
  transform: scale(1.02);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
}
.fade-in-down {
  animation: fadeInDown 0.8s ease-out forwards;
}

.input-group {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

.input-group:nth-child(1) {
  animation-delay: 0.2s;
}
.input-group:nth-child(2) {
  animation-delay: 0.3s;
}
</style>
