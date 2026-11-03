<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="800px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 65vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Pencarian Mesin Cetak MMT
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
          label="Cari Kode, Nama Mesin, atau Keterangan..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchMesinData"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="filteredMesinList"
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
          <template #item.Keterangan="{ item }">{{ item.Keterangan }}</template>

          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                @click.stop="selectMesin(item as MesinItem)"
                variant="tonal"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">Tidak ada data mesin ditemukan.</div>
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
import axios, { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface MesinItem {
  Kode: string;
  Nama: string;
  Keterangan: string; // msn_note
  [key: string]: string | number | undefined;
}

interface ApiResponse {
  success: boolean;
  data: MesinItem[];
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  // Mengembalikan objek MesinItem lengkap saat dipilih
  (e: "select", mesin: MesinItem): void;
}>();

const toast = useToast();

// --- State ---
// Endpoint yang sesuai dengan backend Node.js/Express lookup service
// (GET /api/v1/lookup/mesin)
const API_URL = "/mmt/lookup/mesin";
const mesinList = ref<MesinItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

// --- Konfigurasi Header v-data-table ---
const headers = [
  { title: "Kode", key: "Kode", width: "150px" },
  { title: "Nama Mesin", key: "Nama", width: "300px" },
  { title: "Keterangan", key: "Keterangan", width: "250px" },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "100px",
    align: "center" as const,
  },
];

// --- Computed untuk Filter Sisi Klien ---
// Mengingat backend lookup tidak selalu support pencarian kompleks, kita filter di klien.
const filteredMesinList = computed(() => {
  if (!searchKeyword.value) {
    return mesinList.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return mesinList.value.filter(
    (m) =>
      m.Kode.toLowerCase().includes(keyword) ||
      m.Nama.toLowerCase().includes(keyword) ||
      (m.Keterangan && m.Keterangan.toLowerCase().includes(keyword))
  );
});

// --- API & Logic ---

const fetchMesinData = async () => {
  loading.value = true;
  try {
    // Panggil endpoint GET /api/v1/lookup/mesin
    const response = await api.get<ApiResponse>(API_URL);

    mesinList.value = response.data.data || [];
  } catch (error) {
    const err = error as AxiosError;
    const errorMessage =
      (err.response?.data as { message?: string })?.message ||
      "Gagal memuat daftar Mesin.";
    toast.error(errorMessage);
    mesinList.value = [];
  } finally {
    loading.value = false;
  }
};

const selectMesin = (mesin: MesinItem) => {
  if (!mesin.Kode) {
    toast.error("Error: Kode Mesin kosong.");
    return;
  }

  // Mengirim objek mesin lengkap ke form pemanggil
  emit("select", mesin);
  emit("close");
};

// --- Watchers & Lifecycle ---

// Muat data saat modal terlihat
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      searchKeyword.value = ""; // Reset keyword saat modal dibuka
      fetchMesinData();
    } else {
      mesinList.value = []; // Bersihkan list data saat ditutup
    }
  },
  { immediate: true }
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
