<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="1000px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Pencarian Memo SPK (Internal)
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
          label="Cari Nomor atau Nama Memo SPK..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchMemoData"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="memoList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1 clickable-row"
          density="compact"
          item-key="SPK"
          fixed-header
          :items-per-page="20"
          @dblclick:row="handleDoubleClick"
        >
          <template #item.SPK="{ item }">{{ item.SPK }}</template>
          <template #item.Nama="{ item }">{{ item.Nama }}</template>
          <template #item.Tanggal="{ item }">
            {{
              item.Tanggal
                ? new Date(item.Tanggal).toLocaleDateString("id-ID")
                : "-"
            }}
          </template>
          <template #item.Divisi="{ item }">{{ item.Divisi }}</template>

          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                @click.stop="selectMemo(item as MemoItem)"
                variant="tonal"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">
              Tidak ada data Memo SPK ditemukan.
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
import api from "@/services/api";
import { useToast } from "vue-toastification";

// --- Interfaces ---
interface MemoItem {
  SPK: string; // Alias mspk_nomor dari backend
  Nama: string; // Alias mspk_nama
  Tanggal: string; // Alias mspk_tanggal
  Divisi: string; // Alias mspk_divisi
  Jumlah: number; // Alias mspk_rencana_order
  Panjang?: number;
  Lebar?: number;
  Bahan?: string;
  Gramasi?: string;
  Sudah_Cetak: number;
  Kurang_Cetak: number;
  [key: string]: any;
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", data: any): void;
}>();

const toast = useToast();

// --- State ---
// Mengarah ke endpoint khusus lookup memo yang baru dibuat
const API_URL = "/mmt/SPK/lookup-memo";
const memoList = ref<MemoItem[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

const headers = [
  { title: "Nomor Memo", key: "SPK", width: "200px" },
  { title: "Nama Proyek / Keterangan", key: "Nama", width: "450px" },
  { title: "Tanggal", key: "Tanggal", width: "120px" },
  {
    title: "Rencana Order",
    key: "Jumlah",
    width: "110px",
    align: "end" as const,
  },
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
    width: "100px",
    align: "center" as const,
  },
];

// --- API & Logic ---

const fetchMemoData = async () => {
  loading.value = true;
  try {
    const response = await api.get<{ success: boolean; data: any }>(API_URL, {
      params: { keyword: searchKeyword.value },
    });

    const rawData = response.data.data;
    let allData: MemoItem[] = [];

    if (rawData) {
      if (Array.isArray(rawData)) {
        // Jika backend mengembalikan banyak data (Array)
        allData = rawData;
      } else if (typeof rawData === "object" && rawData.SPK) {
        // JIKA BACKEND MENGEMBALIKAN OBJEK TUNGGAL (Sesuai JSON response Anda)
        allData = [rawData];
      }
    }

    // Ambil maksimal 200 data untuk menjaga performa rendering datatable
    memoList.value = !searchKeyword.value ? allData.slice(0, 200) : allData;
  } catch (error) {
    const err = error as AxiosError;
    console.error("Fetch Memo SPK Error:", err);
    toast.error("Gagal memuat daftar Memo SPK. Periksa koneksi backend.");
    memoList.value = [];
  } finally {
    loading.value = false;
  }
};

const selectMemo = (memo: MemoItem) => {
  if (!memo.SPK) {
    toast.error("Error: Nomor Memo SPK kosong.");
    return;
  }

  // Lengkapi properti yang dikirim agar selaras dengan form BAST MMT
  emit("select", {
    SPK: memo.SPK,
    Nama: memo.Nama,
    Nama2: memo.Nama2, // [DITAMBAHKAN]
    Tanggal: memo.Tanggal,
    Panjang: memo.Panjang,
    Lebar: memo.Lebar,
    Divisi: memo.Divisi,
    Bahan: memo.Bahan,
    Gramasi: memo.Gramasi,
    Finishing: memo.Finishing,
    Pesan: memo.Pesan,
    Jumlah: memo.Jumlah,
    Ukuran: memo.Ukuran,
    Cabang: memo.Cabang,
    Workshop: memo.Workshop,
    Sublim: memo.Sublim,
    Sudah_Cetak: memo.Sudah_Cetak || 0,
    Kurang_Cetak: memo.Kurang_Cetak || 0,
    Tipe_SPK: memo.Tipe_SPK || "MEMO",
  });

  emit("close");
};

/**
 * Handler untuk double click pada baris tabel
 */
const handleDoubleClick = (
  _event: MouseEvent,
  { item }: { item: MemoItem },
) => {
  selectMemo(item);
};

watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      searchKeyword.value = "";
      fetchMemoData();
    } else {
      memoList.value = [];
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

/* Styling hover dan pointer */
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
