<template>
  <v-dialog
    :model-value="isVisible"
    @update:model-value="emit('close')"
    max-width="1050px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Pencarian SPK (Surat Perintah Kerja)
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
        <!-- SEARCH BAR -->
        <v-text-field
          v-model="searchKeyword"
          label="Cari Nomor atau Nama SPK... (Tekan Enter)"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-3 flex-shrink-0"
          hide-details
          @keyup.enter="fetchSPKData"
          @click:clear="handleClearSearch"
        ></v-text-field>

        <!-- DATA TABLE -->
        <v-data-table
          :headers="headers"
          :items="SPKList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1 clickable-row"
          density="compact"
          item-key="SPK"
          fixed-header
          :items-per-page="20"
          @dblclick:row="handleDoubleClick"
        >
          <template #item.Tanggal="{ item }">
            {{
              resolveItem(item).Tanggal
                ? new Date(resolveItem(item).Tanggal).toLocaleDateString(
                    "id-ID",
                  )
                : "-"
            }}
          </template>

          <template #item.Jumlah="{ item }">
            {{ Number(resolveItem(item).Jumlah || 0).toLocaleString() }}
          </template>

          <template #item.Sudah_Cetak="{ item }">
            {{ Number(resolveItem(item).Sudah_Cetak || 0).toLocaleString() }}
          </template>

          <template #item.Kurang_Cetak="{ item }">
            <span
              :class="
                Number(resolveItem(item).Kurang_Cetak) > 0
                  ? 'text-error font-weight-bold'
                  : ''
              "
            >
              {{ Number(resolveItem(item).Kurang_Cetak || 0).toLocaleString() }}
            </span>
          </template>

          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="primary"
                size="x-small"
                @click.stop="selectSPK(resolveItem(item))"
                variant="flat"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4 text-grey-darken-1">
              Tidak ada data SPK ditemukan.
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

      <v-divider></v-divider>

      <v-card-actions class="d-flex justify-end pa-3 bg-grey-lighten-4">
        <v-btn
          @click="emit('close')"
          color="secondary"
          variant="outlined"
          size="small"
        >
          Tutup [Esc]
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface SPKItem {
  SPK: string;
  Nama: string;
  Tanggal: string;
  Divisi: string | number;
  Jumlah?: number;
  Panjang?: number;
  Lebar?: number;
  Bahan?: string;
  Ukuran?: string;
  Gramasi?: string;
  Kepentingan?: string;
  design_done?: string;
  design_baru?: string;
  Sudah_Cetak?: number;
  Kurang_Cetak?: number;
  [key: string]: any;
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", data: SPKItem): void;
}>();

const toast = useToast();

// Ubah ke lowercase agar aman di semua environment Linux/Windows
const API_URL = "/mmt/spk/lookup";
const SPKList = ref<SPKItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

const headers = [
  { title: "Nomor SPK", key: "SPK", width: "160px" },
  { title: "Nama Proyek/SPK", key: "Nama", width: "350px" },
  { title: "Divisi", key: "Divisi", width: "80px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "Target", key: "Jumlah", width: "90px", align: "end" as const },
  {
    title: "Sdh Cetak",
    key: "Sudah_Cetak",
    width: "90px",
    align: "end" as const,
  },
  {
    title: "Kurang",
    key: "Kurang_Cetak",
    width: "90px",
    align: "end" as const,
  },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "80px",
    align: "center" as const,
  },
];

// Helper untuk mengekstrak objek asli baik dari Vuetify proxy wrapper (item.raw) maupun direct object
const resolveItem = (item: any): SPKItem => {
  return (item?.raw || item) as SPKItem;
};

// --- API Methods ---
const fetchSPKData = async () => {
  loading.value = true;
  try {
    const response = await api.get<{ success: boolean; data: SPKItem[] }>(
      API_URL,
      {
        params: { keyword: searchKeyword.value || "" },
      },
    );

    const allData = response.data.data || response.data || [];
    SPKList.value = Array.isArray(allData) ? allData : [];
  } catch (error) {
    const err = error as AxiosError;
    console.error("Fetch SPK Error:", err);
    toast.error("Gagal memuat daftar SPK.");
    SPKList.value = [];
  } finally {
    loading.value = false;
  }
};

const handleClearSearch = () => {
  searchKeyword.value = "";
  fetchSPKData();
};

const selectSPK = (itemData: any) => {
  const spk = resolveItem(itemData);
  const nomorSpk = spk.SPK || spk.Spk || spk.spk;

  if (!nomorSpk) {
    toast.error("Error: Nomor SPK tidak terdeteksi.");
    return;
  }

  // Kirim SELURUH object SPK apa adanya + inject alias fallback 'Spk'
  // agar semua field (Kepentingan, design_done, design_baru, alokasi) tidak hilang
  emit("select", {
    ...spk,
    Spk: nomorSpk,
    SPK: nomorSpk,
  });

  emit("close");
};

const handleDoubleClick = (_event: MouseEvent, rowData: any) => {
  selectSPK(rowData.item || rowData);
};

// Auto fetch saat modal dibuka
watch(
  () => props.isVisible,
  (val) => {
    if (val) {
      searchKeyword.value = "";
      fetchSPKData();
    } else {
      SPKList.value = [];
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
  height: 34px !important;
}
.desktop-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: bold;
  color: #333 !important;
}

.clickable-row :deep(tbody tr):hover {
  cursor: pointer !important;
  background-color: #f0f4f8 !important;
}

.clickable-row :deep(tbody tr):active {
  background-color: #e3f2fd !important;
}

.flex-grow-1 {
  height: 100%;
}
</style>
