<template>
  <div>
    <!-- Dialog Utama Lookup LHK Paperprint -->
    <v-dialog
      :model-value="isVisible"
      @update:modelValue="emit('close')"
      max-width="1200px"
      persistent
    >
      <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
        <!-- Header Toolbar -->
        <v-toolbar color="indigo-darken-2" density="compact">
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            📄 Pencarian Data LHK Paperprint (Untuk Sublim)
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            @click="emit('close')"
            variant="text"
            size="small"
          ></v-btn>
        </v-toolbar>

        <!-- Body Content -->
        <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
          <!-- Filter Area -->
          <v-row class="flex-shrink-0 mb-2">
            <v-col cols="12" sm="3" md="2">
              <v-text-field
                v-model="startDate"
                label="Mulai Tanggal"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="3" md="2">
              <v-text-field
                v-model="endDate"
                label="Sampai Tanggal"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="8">
              <v-text-field
                v-model="searchKeyword"
                label="Cari Nomor SPK, LHK Paperprint, atau Nama..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                @keyup.enter="fetchPaperprintData"
              >
                <template #append-inner>
                  <v-btn
                    color="indigo"
                    size="small"
                    variant="flat"
                    class="mt-n1 mb-n1"
                    @click="fetchPaperprintData"
                  >
                    Cari
                  </v-btn>
                </template>
              </v-text-field>
            </v-col>
          </v-row>

          <!-- Table Area -->
          <v-data-table
            :headers="headers"
            :items="LhkList"
            :loading="loading"
            hover
            class="desktop-table flex-grow-1 clickable-row border rounded"
            density="compact"
            item-key="Nomor_Paperprint"
            fixed-header
            :items-per-page="20"
            @click:row="handleRowClick"
          >
            <template #item.Nomor_Paperprint="{ item }">
              <span class="font-weight-bold text-indigo-darken-3">{{
                item.Nomor_Paperprint
              }}</span>
            </template>

            <template #item.Nomor_SPK="{ item }">
              <v-chip
                color="primary"
                size="x-small"
                label
                class="font-weight-medium"
              >
                {{ item.Nomor_SPK }}
              </v-chip>
            </template>

            <template #item.Komponen="{ item }">
              <span class="font-weight-bold text-teal-darken-3">{{
                item.Komponen
              }}</span>
            </template>

            <template #item.Poi_Size="{ item }">
              <v-chip color="blue-grey" size="x-small" variant="flat">
                {{ item.Poi_Size || "-" }}
              </v-chip>
            </template>

            <template #item.Dimensi="{ item }">
              {{ item.Panjang }}M x {{ item.Lebar }}M
            </template>

            <template #item.Total_Meter="{ item }">
              <span class="font-weight-bold"
                >{{ Number(item.Total_Meter).toFixed(2) }} M²</span
              >
            </template>

            <template #item.actions="{ item }">
              <div class="text-center">
                <v-btn
                  color="indigo"
                  size="x-small"
                  @click.stop="confirmSelection(item as PaperprintItem)"
                  variant="flat"
                >
                  Pilih
                </v-btn>
              </div>
            </template>

            <template #no-data>
              <div class="text-center pa-4 text-grey-darken-1">
                Data LHK Paperprint tidak ditemukan untuk rentang tanggal ini.
              </div>
            </template>

            <template #loading>
              <v-progress-linear
                indeterminate
                color="indigo"
              ></v-progress-linear>
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions
          class="d-flex justify-end border-top pa-3 bg-grey-lighten-4"
        >
          <v-btn
            @click="emit('close')"
            color="secondary"
            variant="outlined"
            size="small"
          >
            Tutup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";

interface PaperprintItem {
  Nomor_Paperprint: string;
  Tanggal: string;
  Shift: number;
  Nomor_SPK: string;
  Nama_SPK: string;
  Panjang: number;
  Lebar: number;
  Jumlah: number;
  Total_Meter: number;
  Nama_Bahan: string;
  Komponen: string;
  Poi_Nomor: string;
  Poi_Size: string;
}

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", payload: { mode: string; data: any[] }): void;
}>();

const toast = useToast();

// Sesuaikan URL ini dengan routing yang Anda buat di backend (misal: /api/lhk-paperprint/lookup/paperprint)
const API_URL = "/mmt/lhk-paperprint/lookup/paperprint";

const LhkList = ref<PaperprintItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

// Setup Tanggal Default (7 hari terakhir hingga hari ini)
const today = new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(today.getDate() - 7);

const startDate = ref(sevenDaysAgo.toISOString().split("T")[0]);
const endDate = ref(today.toISOString().split("T")[0]);

const headers = [
  { title: "No. LHK Paperprint", key: "Nomor_Paperprint", width: "160px" },
  { title: "Nomor SPK", key: "Nomor_SPK", width: "140px" },
  { title: "Nama Order", key: "Nama_SPK", width: "200px" },
  { title: "Komponen", key: "Komponen", width: "150px" },
  { title: "Size", key: "Poi_Size", width: "80px", align: "center" as const },
  { title: "Bahan", key: "Nama_Bahan", width: "150px" },
  { title: "P x L", key: "Dimensi", width: "100px", align: "center" as const },
  { title: "Qty", key: "Jumlah", width: "70px", align: "center" as const },
  {
    title: "Total Luas",
    key: "Total_Meter",
    width: "100px",
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

const fetchPaperprintData = async () => {
  if (!startDate.value || !endDate.value) {
    toast.warning("Harap isi rentang tanggal terlebih dahulu.");
    return;
  }

  loading.value = true;
  try {
    const response = await api.get<
      { success: boolean; data: PaperprintItem[] } | PaperprintItem[]
    >(API_URL, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        search: searchKeyword.value,
      },
    });

    // Handle response baik jika dibungkus {data: ...} atau array langsung
    LhkList.value = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  } catch (error) {
    const err = error as AxiosError;
    console.error("Fetch Lookup Paperprint Error:", err);
    toast.error("Gagal memuat data LHK Paperprint. Periksa koneksi ke server.");
    LhkList.value = [];
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (
  _event: MouseEvent,
  { item }: { item: PaperprintItem },
) => {
  confirmSelection(item);
};

const confirmSelection = (item: PaperprintItem) => {
  // Mapping data Paperprint ke format Detail Sublim (Supaya format JSON-nya mirip dengan Lookup SPK lama)
  const mappedPayload = {
    ...item,
    // Kompatibilitas SPK
    SPK: item.Nomor_SPK,
    spk_nomor: item.Nomor_SPK,
    Nama: item.Nama_SPK,
    spk_nama: item.Nama_SPK,

    // Kompatibilitas Size & Komponen
    Size: item.Poi_Size,
    poid_size: item.Poi_Size,
    poi_nomor: item.Poi_Nomor,
    Nama_Komponen: item.Komponen,
    lsbd_komponen: item.Komponen,

    // Kompatibilitas Ukuran & Qty
    Panjang: item.Panjang,
    spk_panjang: item.Panjang,
    Lebar: item.Lebar,
    spk_lebar: item.Lebar,
    jumlah_sublim: item.Jumlah,
    spk_jmlorder: item.Jumlah_Order || item.Jumlah,
    Jumlah_Order: item.Jumlah_Order || item.Jumlah,
    Sudah_Cetak: item.Sudah_Cetak || 0,
    sudah_cetak: item.Sudah_Cetak || 0,

    // Referensi asal usul data
    lhk_asal: item.Nomor_Paperprint,
    Bahan_Awal: item.Total_Meter,
  };

  emit("select", { mode: "PAPERPRINT", data: [mappedPayload] });
  emit("close");
};

// Panggil API saat dialog dibuka
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      // searchKeyword.value = ""; // (Opsional) reset keyword saat buka
      fetchPaperprintData();
    } else {
      LhkList.value = [];
    }
  },
  { immediate: false },
);
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
}
.border-top {
  border-top: 1px solid #e0e0e0;
}
.desktop-table {
  font-size: 12px;
}
.desktop-table :deep(td),
.desktop-table :deep(th) {
  padding: 0 8px !important;
  height: 38px !important;
}
.desktop-table :deep(thead th) {
  background-color: #f8f9fa !important;
  font-weight: bold;
  color: #2c3e50 !important;
}
.clickable-row :deep(tbody tr):hover {
  cursor: pointer !important;
  background-color: #edf2f7 !important;
}
.clickable-row :deep(tbody tr):active {
  background-color: #e2e8f0 !important;
}
.flex-grow-1 {
  height: 100%;
}
</style>
