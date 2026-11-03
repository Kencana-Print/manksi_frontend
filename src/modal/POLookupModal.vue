<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="900px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 80vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold"
          >Bantuan - Pilih Purchase Order (PO)</v-toolbar-title
        >
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
          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                :color="
                  item.Status === 'OPEN' || item.Status === 'ONPROSES'
                    ? 'success'
                    : 'grey'
                "
                size="x-small"
                @click.stop="selectPO(item as PoHeader)"
                variant="tonal"
                :disabled="item.Status === 'CLOSED' || item.Status === 'CLOSE'"
              >
                {{
                  item.Status === "CLOSED" || item.Status === "CLOSE"
                    ? "Selesai"
                    : "Pilih"
                }}
              </v-btn>
            </div>
          </template>

          <template #item="{ item }">
            <tr
              :class="{
                'row-closed':
                  item.Status === 'CLOSED' || item.Status === 'CLOSE',
                'clickable-row':
                  item.Status !== 'CLOSED' && item.Status !== 'CLOSE',
              }"
              @dblclick="handleDoubleClick(item as PoHeader)"
            >
              <td>{{ item.Nomor }}</td>
              <td>{{ item.Tanggal }}</td>
              <td>{{ item.NamaSupplier }}</td>
              <td>{{ item.NomorRequest }}</td>
              <td>
                <v-chip
                  :color="getStatusColor(item.Status)"
                  size="x-small"
                  label
                >
                  {{ item.Status }}
                </v-chip>
              </td>
              <td class="text-center">
                <v-btn
                  :color="
                    item.Status === 'OPEN' || item.Status === 'ONPROSES'
                      ? 'success'
                      : 'grey'
                  "
                  size="x-small"
                  @click.stop="selectPO(item as PoHeader)"
                  variant="tonal"
                  :disabled="
                    item.Status === 'CLOSED' || item.Status === 'CLOSE'
                  "
                >
                  Pilih
                </v-btn>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center pa-4">Tidak ada data Purchase Order.</div>
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
import { ref, watch, onMounted, defineProps, defineEmits } from "vue";
import axios, { AxiosError } from "axios";
import api from "@/services/api";
import debounce from "lodash/debounce";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface PoHeader {
  Nomor: string;
  Tanggal: string;
  Supplier: string; // Nama Supplier
  NamaSupplier: string; // Tambahkan ini agar konsisten dengan backend
  TotalHarga: number;
  [key: string]: string | number | undefined;
}

interface ApiResponse {
  message: string;
  data: PoHeader[]; // Asumsi array data PO ada di properti 'data'
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
const API_URL = "/mmt/po-bahan-mmt/po/lookup";
const poList = ref<PoHeader[]>([]);
const searchTerm = ref("");
const loading = ref(false);

// --- Konfigurasi Header v-data-table ---
const headers = [
  { title: "Nomor PO", key: "Nomor", width: "180px" },
  { title: "Tanggal", key: "Tanggal", width: "120px" },
  { title: "Nama Supplier", key: "NamaSupplier", width: "400px" },
  { title: "Nomor Permintaan", key: "NomorRequest", width: "150px" },
  { title: "Status", key: "Status", width: "100px" },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "100px",
    align: "center" as const,
  },
];

const handleDoubleClick = (item: PoHeader) => {
  // Cegah pengambilan data jika statusnya CLOSED atau CLOSE
  if (item.Status === "CLOSED" || item.Status === "CLOSE") {
    toast.warning("PO ini sudah selesai/ditutup dan tidak dapat dipilih.");
    return;
  }

  // Jika status OK, panggil fungsi selectPO yang sudah ada
  selectPO(item);
};

// --- Tambahkan helper color di dalam script setup ---
const getStatusColor = (status: string) => {
  switch (status) {
    case "OPEN":
      return "primary";
    case "ONPROSES":
      return "warning";
    case "CLOSED":
    case "CLOSE":
      return "error";
    default:
      return "grey";
  }
};

const fetchPOData = async (query: string) => {
  loading.value = true;
  try {
    const response = await api.get<ApiResponse>(API_URL, {
      params: { q: query },
    });

    const rawData = response.data.data || [];

    // --- LOGIKA SORTING ---
    // Status OPEN/ONPROSES naik ke atas (priority 0), CLOSED/CLOSE turun (priority 1)
    poList.value = rawData.sort((a, b) => {
      const priority = (status: string) =>
        status === "OPEN" || status === "ONPROSES" ? 0 : 1;

      const diff = priority(a.Status as string) - priority(b.Status as string);

      // Jika prioritas sama, urutkan berdasarkan Nomor PO terbaru
      if (diff === 0) {
        return b.Nomor.localeCompare(a.Nomor);
      }
      return diff;
    });
  } catch (error) {
    const err = error as AxiosError;
    toast.error(
      (err.response?.data as any)?.message || "Gagal mengambil daftar PO.",
    );
    poList.value = [];
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = debounce(fetchPOData, 300);

const fetchAndReload = () => {
  // Dipanggil saat enter atau saat modal pertama kali dibuka
  debouncedSearch(searchTerm.value);
};

const selectPO = (poHeader: PoHeader) => {
  emit("select", poHeader); // Mengirim seluruh objek PO header
  emit("close");
};

// --- Watchers & Lifecycle ---

// Watcher untuk memuat ulang data saat modal terlihat
watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) {
      searchTerm.value = ""; // Bersihkan pencarian saat modal dibuka
      fetchAndReload();
    } else {
      // Opsional: Bersihkan list saat ditutup
      poList.value = [];
    }
  },
  { immediate: true },
);

// Watcher untuk memicu debounced search saat user mengetik
watch(searchTerm, (newQuery) => {
  debouncedSearch(newQuery);
});
</script>

<style scoped>
/* Styling menyesuaikan modal Vuetify yang ringkas */
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

.row-closed {
  background-color: #fafafa;
  color: #9e9e9e;
}

/* Membuat baris closed sedikit redup */
.row-closed :deep(td) {
  opacity: 0.7;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

.row-closed {
  background-color: #fafafa;
  color: #9e9e9e;
  cursor: not-allowed; /* Memberi tanda visual bahwa ini tidak bisa diklik */
}
</style>
