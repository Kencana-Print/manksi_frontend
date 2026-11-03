<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="900px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 80vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Bantuan - Pilih PO External (MMT)
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
        <!-- Input Pencarian -->
        <v-text-field
          v-model="searchTerm"
          label="Cari Nomor PO, Supplier..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchAndReload"
        ></v-text-field>

        <!-- Tabel Data -->
        <v-data-table
          :headers="headers"
          :items="poList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1"
          density="compact"
          item-key="Nomor"
          fixed-header
          :items-per-page="15"
        >
          <!-- Custom Slot untuk Status (Opsional, agar user tahu PO mana yang OPEN/PROSES) -->
          <template #item.Status="{ item }">
            <v-chip
              :color="item.Status === 'OPEN' ? 'red' : 'blue'"
              size="x-small"
              label
              text-color="white"
            >
              {{ item.Status }}
            </v-chip>
          </template>

          <!-- Slot Aksi Pilih -->
          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                @click.stop="selectPO(item as PoHeader)"
                variant="tonal"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">
              Tidak ada data Purchase Order External.
            </div>
          </template>

          <template #loading>
            <v-progress-linear
              indeterminate
              color="primary"
            ></v-progress-linear>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api"; // Pastikan axios instance Anda sudah benar
import debounce from "lodash/debounce";
import { useToast } from "vue-toastification";

// --- Interfaces (Sesuai dengan Output Backend getLookupPoForBpb) ---
interface PoHeader {
  Nomor: string; // poe_nomor
  Tanggal: string; // poe_tanggal
  KodeSup: string; // poe_sup
  Supplier: string; // Sup_nama
  Status: string; // OPEN / PROSES
  TotalQtyPO: number;
  TotalQtyBPB: number;
}

interface ApiResponse {
  success: boolean;
  data: PoHeader[];
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", poHeader: PoHeader): void;
}>();

const toast = useToast();

// --- State ---
// Sesuaikan dengan route API yang kita buat sebelumnya
const API_URL = "/mmt/po-external-mmt/lookup-bpb";
const poList = ref<PoHeader[]>([]);
const searchTerm = ref("");
const loading = ref(false);

// --- Konfigurasi Header Tabel ---
const headers = [
  { title: "Nomor PO", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Supplier", key: "Supplier", width: "250px" },
  { title: "Status", key: "Status", width: "100px", align: "center" as const },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "80px",
    align: "center" as const,
  },
];

// --- Logic API ---

const fetchPOData = async (query: string) => {
  loading.value = true;
  try {
    const response = await api.get<ApiResponse>(API_URL, {
      params: { q: query },
    });

    if (response.data.success) {
      poList.value = response.data.data || [];
    }
  } catch (error) {
    const err = error as AxiosError;
    const errorMsg =
      (err.response?.data as any)?.message || "Gagal mengambil daftar PO.";
    toast.error(errorMsg);
    poList.value = [];
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = debounce((val: string) => {
  fetchPOData(val);
}, 400);

const fetchAndReload = () => {
  fetchPOData(searchTerm.value);
};

const selectPO = (poHeader: PoHeader) => {
  emit("select", poHeader);
  emit("close");
};

// --- Watchers ---

watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) {
      searchTerm.value = "";
      fetchAndReload(); // Load data awal saat modal muncul
    }
  },
);

watch(searchTerm, (newVal) => {
  debouncedSearch(newVal);
});
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
}
.desktop-table {
  font-size: 12px;
}
/* Membuat tampilan tabel lebih rapat (compact) mirip Delphi */
.desktop-table :deep(td) {
  height: 32px !important;
  padding: 0 8px !important;
}
.desktop-table :deep(th) {
  height: 35px !important;
  background-color: #eeeeee !important;
  font-weight: bold !important;
}
</style>
