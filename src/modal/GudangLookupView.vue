<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="700px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 60vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Pencarian Gudang
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          @click="emit('close')"
          variant="text"
          size="small"
        ></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
        <v-text-field
          v-model="searchKeyword"
          label="Cari Kode atau Nama Gudang..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchGudangData"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="filteredGudangList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1"
          density="compact"
          item-key="Kode"
          fixed-header
          :items-per-page="10"
        >
          <template #item.Kode="{ item }">{{ item.Kode }}</template>
          <template #item.Nama="{ item }">{{ item.Nama }}</template>

          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                @click.stop="selectGudang(item as GudangItem)"
                variant="tonal"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">Tidak ada data gudang ditemukan.</div>
          </template>

          <template #loading>
            <v-progress-linear
              indeterminate
              color="primary"
            ></v-progress-linear>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions class="d-flex justify-end">
        <v-btn @click="emit('close')" color="secondary" variant="flat"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, computed } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";

// --- Interfaces ---
interface GudangItem {
  Kode: string;
  Nama: string;
  [key: string]: string | number | undefined;
}

interface ApiResponse {
  success: boolean;
  data: GudangItem[];
}

// --- Props & Emits ---
// GABUNGKAN SEMUA PROP DI SINI
const props = defineProps<{
  isVisible: boolean;
  mode: "all" | "jadi"; // Menentukan filter (Semua atau Gudang Jadi saja)
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", gudang: GudangItem): void;
}>();

const toast = useToast();
const authStore = useAuthStore();
const user = authStore.user;

// --- State ---
const API_URL = "/mmt/lookup/gudang";
const gudangList = ref<GudangItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

// --- Konfigurasi Header ---
const headers = [
  { title: "Kode", key: "Kode", width: "150px" },
  { title: "Nama Gudang", key: "Nama", width: "350px" },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "100px",
    align: "center" as const,
  },
];

// --- Computed Filter (Client Side Search) ---
const filteredGudangList = computed(() => {
  if (!searchKeyword.value) return gudangList.value;
  const keyword = searchKeyword.value.toLowerCase();
  return gudangList.value.filter(
    (g) =>
      g.Kode.toLowerCase().includes(keyword) ||
      g.Nama.toLowerCase().includes(keyword),
  );
});

// --- API Logic ---
// --- Bagian script di GudangLookupView.vue ---
const fetchGudangData = async () => {
  loading.value = true;
  try {
    const response = await api.get("/mmt/lookup/gudang", {
      params: {
        mode: props.mode, // Mengambil props 'jadi' yang dikirim dari parent
        divisi: user?.divisi, // Mengambil divisi dari store
      },
    });
    // Menyesuaikan dengan struktur response backend Anda
    gudangList.value = response.data.data || response.data || [];
  } catch (error) {
    toast.error("Gagal memuat daftar gudang di modal");
  } finally {
    loading.value = false;
  }
};

const selectGudang = (gudang: GudangItem) => {
  if (!gudang.Kode) {
    toast.error("Error: Kode Gudang kosong.");
    return;
  }
  emit("select", gudang);
  emit("close");
};

// --- Watchers ---
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      searchKeyword.value = "";
      fetchGudangData();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
/* Styling disesuaikan dengan Vuetify 3 */
.dialog-card {
  font-size: 13px;
}
.desktop-table {
  font-size: 12px;
}
/* Mengatur padding dan tinggi baris/header agar lebih ringkas */
.desktop-table :deep(td),
.desktop-table :deep(th) {
  padding: 0 8px !important;
  height: 35px !important;
}
.desktop-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: bold;
  color: #333 !important;
}
.flex-grow-1 {
  height: 100%;
}
</style>
