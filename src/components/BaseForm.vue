<script setup lang="ts">
import PageLayout from "@/components/PageLayout.vue";
import {
  IconDeviceFloppy,
  IconX,
  IconAlertTriangle,
  IconCircleX,
} from "@tabler/icons-vue";

const props = defineProps<{
  title: string;
  menuId: string;
  icon?: any;
  isLoading?: boolean;
  isSaving?: boolean;
  itemName?: string; // Teks khusus di dialog (Opsional)
}>();

// v-model untuk mengontrol dialog dari parent
const showSaveDialog = defineModel<boolean>("showSaveDialog");
const showCancelDialog = defineModel<boolean>("showCancelDialog");
const showCloseDialog = defineModel<boolean>("showCloseDialog");

const emit = defineEmits([
  "validate-save",
  "confirm-save",
  "confirm-cancel",
  "confirm-close",
]); // <--- TAMBAH confirm-close
</script>

<template>
  <PageLayout :title="title" :icon="icon" :menu-id="menuId" desktop-mode>
    <template #header-actions>
      <v-btn
        size="small"
        color="primary"
        @click="emit('validate-save')"
        :loading="isSaving"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconDeviceFloppy :size="15" :stroke-width="1.7" />
          </span>
        </template>
        Simpan
      </v-btn>
      <v-btn
        size="small"
        variant="outlined"
        class="mx-2"
        @click="showCancelDialog = true"
      >
        Batal
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        color="error"
        @click="showCloseDialog = true"
      >
        <template #prepend>
          <span class="d-flex align-center">
            <IconX :size="15" :stroke-width="2" />
          </span>
        </template>
        Tutup
      </v-btn>
    </template>

    <v-overlay
      :model-value="isLoading"
      class="align-center justify-center"
      persistent
      scroll-strategy="none"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      ></v-progress-circular>
    </v-overlay>

    <div
      :class="[
        'form-grid-container bg-grey-lighten-3',
        $slots['left-column'] &&
        $slots['center-column'] &&
        $slots['right-column']
          ? 'three-column'
          : $slots['left-column'] && $slots['right-column']
            ? 'two-column'
            : !$slots['left-column'] && $slots['right-column']
              ? 'single-column'
              : 'custom-layout',
      ]"
      v-if="!isLoading"
    >
      <template v-if="$slots['left-column'] || $slots['right-column']">
        <aside class="left-column" v-if="$slots['left-column']">
          <slot name="left-column"></slot>
        </aside>
        <main class="center-column" v-if="$slots['center-column']">
          <slot name="center-column"></slot>
        </main>
        <main class="right-column" v-if="$slots['right-column']">
          <slot name="right-column"></slot>
        </main>
      </template>
      <template v-else>
        <main class="full-column"><slot></slot></main>
      </template>
    </div>

    <v-dialog v-model="showSaveDialog" max-width="400px">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 pa-4">Konfirmasi Simpan</v-card-title>
        <v-card-text class="pa-4 pt-0">
          <div class="mb-2">
            Yakin ingin menyimpan pengaturan
            {{ itemName ? `untuk ${itemName}` : "ini" }}?
          </div>
          <slot name="dialog-warning"></slot>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showSaveDialog = false">Batal</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            @click="emit('confirm-save')"
            :loading="isSaving"
            >Ya, Simpan</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCancelDialog" max-width="400px">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 pa-4 d-flex align-center">
          <IconAlertTriangle
            :size="20"
            :stroke-width="1.7"
            color="#f57c00"
            class="mr-2"
          />
          Konfirmasi Reset
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          Yakin ingin mereset form? Perubahan yang belum disimpan akan
          dibatalkan.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCancelDialog = false">Tidak</v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="emit('confirm-cancel')"
            >Ya, Batal</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCloseDialog" max-width="400px">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 pa-4 d-flex align-center">
          <IconCircleX
            :size="20"
            :stroke-width="1.7"
            color="#c62828"
            class="mr-2"
          />
          Konfirmasi Tutup
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          Yakin ingin keluar? Pastikan data sudah disimpan.
        </v-card-text>
        <v-card-actions class="pa-4 border-t">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
          <v-btn color="error" variant="elevated" @click="emit('confirm-close')"
            >Ya, Keluar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </PageLayout>
</template>

<style scoped>
/* Ganti style scoped yang ada */
.form-grid-container :deep(*) {
  font-size: 11px !important;
}
.form-grid-container {
  padding: 12px;
  height: calc(100vh - 180px);
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  overflow: hidden;
}
.form-grid-container.single-column {
  grid-template-columns: 1fr;
}
.form-grid-container.two-column {
  grid-template-columns: 320px 1fr;
}
.form-grid-container.three-column {
  grid-template-columns: 280px 1fr 200px;
}
.form-grid-container.custom-layout {
  display: block;
  padding: 0;
  height: calc(100vh - 120px);
  overflow: hidden;
}

.left-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 12px; /* ← ruang napas di bawah */
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd transparent;
}

.left-column::-webkit-scrollbar {
  width: 4px;
}
.left-column::-webkit-scrollbar-track {
  background: transparent;
}
.left-column::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 2px;
}
.left-column::-webkit-scrollbar-thumb:hover {
  background: #9e9e9e;
}

.right-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.center-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-grow: 1;
}
.full-column {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.desktop-form-section) {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white !important;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
}
:deep(.header-section) {
  border-top: 3px solid #1976d2 !important;
}

/* ── Responsive breakpoints ── */

/* 1600px ke bawah — kolom kiri sedikit lebih kecil */
@media (max-width: 1600px) {
  .form-grid-container.two-column {
    grid-template-columns: 290px 1fr;
  }
  .form-grid-container.three-column {
    grid-template-columns: 260px 1fr 180px;
  }
}

/* 1400px ke bawah */
@media (max-width: 1400px) {
  .form-grid-container.two-column {
    grid-template-columns: 260px 1fr;
  }
  .form-grid-container.three-column {
    grid-template-columns: 240px 1fr 160px;
  }
  .form-grid-container {
    gap: 12px;
    padding: 10px;
  }
}

/* 1280px ke bawah — layout mulai kolaps ke single column */
@media (max-width: 1280px) {
  .form-grid-container.two-column {
    grid-template-columns: 240px 1fr;
  }
  .form-grid-container.three-column {
    grid-template-columns: 220px 1fr;
    /* kolom ketiga wrap ke bawah */
    grid-template-rows: auto auto;
  }
  .form-grid-container.three-column .center-column {
    grid-column: 2;
    grid-row: 1;
  }
  .form-grid-container.three-column .right-column {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

/* 1024px ke bawah — semua stack vertikal */
@media (max-width: 1024px) {
  .form-grid-container,
  .form-grid-container.two-column,
  .form-grid-container.three-column {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
    height: auto;
    min-height: calc(100vh - 180px);
    overflow-y: auto;
    overflow-x: hidden;
  }
  .form-grid-container .left-column,
  .form-grid-container .center-column,
  .form-grid-container .right-column {
    grid-column: 1 !important;
    grid-row: auto !important;
    overflow: visible;
    min-height: unset;
  }
  .right-column {
    overflow: visible;
  }
}
</style>
