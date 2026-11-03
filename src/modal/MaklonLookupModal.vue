<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="900px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 70vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Cari Nomor Maklon
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
          label="Cari Nomor / Keterangan Maklon..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchMaklonData"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="maklonList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1"
          density="compact"
          item-key="Nomor"
          fixed-header
          :items-per-page="10"
          @dblclick:row="handleRowDoubleClick"
        >
          <template #item.Nomor="{ item }">
            <span class="fw-bold text-blue-darken-4">{{ item.Nomor }}</span>
          </template>

          <template #item.Tanggal="{ item }">
            {{ formatDateCell(item.Tanggal) }}
          </template>

          <template #item.CabTujuan="{ item }">
            <span class="text-center">{{ item.CabTujuan || "-" }}</span>
          </template>

          <template #item.Rencana="{ item }">
            {{ Number(item.Rencana || 0) }}
          </template>

          <template #item.SudahHasil="{ item }">
            {{ Number(item.SudahHasil || 0) }}
          </template>

          <template #item.Status="{ item }">
            <v-chip
              dense
              variant="tonal"
              size="x-small"
              label
              :color="statusColor(item.Status)"
            >
              {{ item.Status }}
            </v-chip>
          </template>

          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                @click.stop="selectMaklon(item as MaklonItem)"
                variant="tonal"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">Tidak ada data maklon ditemukan.</div>
          </template>

          <template #loading>
            <v-progress-linear
              indeterminate
              color="primary"
            ></v-progress-linear>
          </template>
        </v-data-table>

        <div class="text-caption text-grey mt-1">
          * Data tampil sesuai cabang tujuan user yang login.
        </div>
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
import { ref, watch } from "vue";
import { AxiosError } from "axios";
import { format, parseISO, isValid } from "date-fns";
import api from "@/services/api";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface MaklonItem {
  Nomor: string;
  Nama?: string;
  Tanggal?: string;
  CabTujuan?: string;
  Status?: string;
  Rencana?: number;
  SudahHasil?: number;
  Tipe?: string;
  [key: string]: string | number | undefined;
}

interface ApiResponse {
  success: boolean;
  data: MaklonItem[];
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  // Mengembalikan objek maklon lengkap saat dipilih
  (e: "select", maklon: MaklonItem): void;
}>();

const toast = useToast();

// --- State ---
// Endpoint sesuai backend MMT: GET /api/mmt/maklon-barang/lookup
// (server memfilter mkl_cab_tujuan sesuai cabang user yang login)
const API_URL = "/mmt/maklon-barang/lookup";
const maklonList = ref<MaklonItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

// --- Config header v-data-table ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Keterangan", key: "Nama", width: "280px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  {
    title: "Cab. Tujuan",
    key: "CabTujuan",
    width: "100px",
    align: "center" as const,
  },
  {
    title: "Rencana",
    key: "Rencana",
    width: "90px",
    align: "end" as const,
  },
  {
    title: "Sudah Hasil",
    key: "SudahHasil",
    width: "100px",
    align: "end" as const,
  },
  {
    title: "Status",
    key: "Status",
    width: "150px",
    align: "center" as const,
  },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "90px",
    align: "center" as const,
  },
];

// --- Warna chip status (meniru MaklonBarangView maksi) ---
const statusColor = (status?: string): string => {
  switch ((status || "").toUpperCase()) {
    case "DRAFT":
      return "orange";
    case "DIKIRIM":
      return "blue";
    case "SEBAGIAN DIKIRIM":
      return "cyan";
    case "OTW GUDANG":
      return "purple";
    case "DITERIMA SEBAGIAN":
      return "teal";
    case "SELESAI DTF":
    case "SELESAI":
      return "green";
    default:
      return "grey";
  }
};

const formatDateCell = (val?: string): string => {
  if (!val) return "";
  const d = parseISO(String(val));
  return isValid(d) ? format(d, "dd-MM-yyyy") : String(val);
};

// --- API & Logic ---

const fetchMaklonData = async () => {
  loading.value = true;
  try {
    const response = await api.get<ApiResponse>(API_URL, {
      params: { keyword: searchKeyword.value || "" },
    });

    maklonList.value = (response.data?.data || response.data || []) as MaklonItem[];
  } catch (error) {
    const err = error as AxiosError;
    const errorMessage =
      (err.response?.data as { message?: string })?.message ||
      "Gagal memuat daftar Maklon.";
    toast.error(errorMessage);
    maklonList.value = [];
  } finally {
    loading.value = false;
  }
};

// Debounce pencarian server-side
watch(searchKeyword, (val, old) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (val === old) return;
  debounceTimer = setTimeout(fetchMaklonData, 500);
});

const selectMaklon = (maklon: MaklonItem) => {
  if (!maklon.Nomor) {
    toast.error("Error: Nomor Maklon kosong.");
    return;
  }

  // Mengirim objek maklon lengkap ke form pemanggil
  emit("select", maklon);
  emit("close");
};

// Double-click baris tabel = pilih
const handleRowDoubleClick = (
  _event: MouseEvent,
  { item }: { item: any },
) => {
  selectMaklon(item as MaklonItem);
};

// --- Watchers & Lifecycle ---

// Muat data saat modal terlihat
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      searchKeyword.value = ""; // Reset keyword saat modal dibuka
      fetchMaklonData();
    } else {
      maklonList.value = []; // Bersihkan list data saat ditutup
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
}
.desktop-table {
  font-size: 12px;
}
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
