<script setup lang="ts">
import { computed } from "vue";

// 1. Definisikan Props
const props = defineProps<{
  modelValue: boolean; // v-model untuk buka/tutup
  itemName?: string; // Nama item yang mau dihapus (misal: "Bahan SPANDEX")
  isLoading?: boolean; // Status loading saat tombol hapus diklik
}>();

// 2. Definisikan Emits
const emit = defineEmits(["update:modelValue", "confirm"]);

// Computed untuk sinkronisasi v-model
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const handleConfirm = () => {
  emit("confirm");
};
</script>

<template>
  <v-dialog v-model="dialogVisible" max-width="400px" persistent>
    <v-card class="confirm-dialog-card rounded-lg">
      <v-card-title class="d-flex align-center pa-4 bg-error-lighten-5">
        <v-icon color="error" class="mr-2">mdi-alert-circle-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold text-error">
          Konfirmasi Hapus
        </span>
      </v-card-title>

      <v-card-text class="pa-5 pt-4">
        <div class="text-body-2 mb-1">
          Apakah Anda yakin ingin menghapus data ini?
        </div>
        <div
          v-if="itemName"
          class="text-body-2 font-weight-black text-decoration-underline"
        >
          {{ itemName }}
        </div>
        <div class="text-caption text-grey-darken-1 mt-3">
          Tindakan ini tidak dapat dibatalkan.
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-3 bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          class="font-weight-bold"
          @click="dialogVisible = false"
          :disabled="isLoading"
        >
          Batal
        </v-btn>
        <v-btn
          color="error"
          variant="elevated"
          class="font-weight-bold px-6"
          @click="handleConfirm"
          :loading="isLoading"
        >
          Ya, Hapus
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Menjaga standar font 11px di Manksi Web */
.confirm-dialog-card :deep(*) {
  font-size: 11px !important;
}

/* Judul sedikit lebih besar agar tegas */
.confirm-dialog-card :deep(.text-subtitle-1) {
  font-size: 13px !important;
}

.bg-error-lighten-5 {
  background-color: #ffebee;
}
</style>
