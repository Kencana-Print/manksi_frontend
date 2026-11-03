<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="1200px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 Pencarian Nomor Permintaan Bahan (MMT)
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
        <div class="d-flex align-center ga-4 mb-4 flex-shrink-0">
          <v-text-field
            v-model="filters.startDate"
            type="date"
            label="Dari Tanggal"
            variant="outlined"
            density="compact"
            style="max-width: 150px"
            hide-details
          ></v-text-field>

          <v-text-field
            v-model="filters.endDate"
            type="date"
            label="Sampai Tanggal"
            variant="outlined"
            density="compact"
            style="max-width: 150px"
            hide-details
          ></v-text-field>

          <v-text-field
            v-model="filters.keyword"
            label="Cari Nomor/Keterangan..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            class="flex-grow-1"
            hide-details
            @keyup.enter="fetchPermintaanData"
          ></v-text-field>

          <v-btn color="primary" size="small" @click="fetchPermintaanData">
            Cari
          </v-btn>
        </div>

        <v-data-table
          :headers="headers"
          :items="filteredPermintaanList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1 clickable-row"
          density="compact"
          item-key="Nomor"
          fixed-header
          :items-per-page="20"
          @dblclick:row="handleDoubleClick"
        >
          <template #item.Tanggal="{ item }">
            {{
              item.Tanggal
                ? new Date(item.Tanggal).toLocaleDateString("id-ID")
                : "-"
            }}
          </template>

          <template #item.Keterangan="{ item }">
            <span :title="item.Keterangan">
              {{
                item.Keterangan
                  ? item.Keterangan.substring(0, 50) +
                    (item.Keterangan.length > 50 ? "..." : "")
                  : "-"
              }}
            </span>
          </template>

          <template #item.ACC="{ item }">
            <v-chip :color="item.ACC === 'Y' ? 'success' : 'red'" size="small">
              {{ item.ACC === "Y" ? "ACC" : "Pending" }}
            </v-chip>
          </template>

          <template #item.Status_Proses="{ item }">
            <v-chip
              size="small"
              :color="
                item.Status_Proses === 'OPEN'
                  ? 'success'
                  : item.Status_Proses === 'PROGRESS'
                    ? 'warning'
                    : 'grey'
              "
            >
              {{ item.Status_Proses }}
            </v-chip>
          </template>

          <template #item.actions="{ item }">
            <div class="text-center">
              <v-btn
                color="success"
                size="x-small"
                variant="tonal"
                :disabled="item.Status_Proses === 'CLOSE'"
                @click.stop="selectPermintaan(item as PermintaanItem)"
              >
                Pilih
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-4">
              Tidak ada data Permintaan Bahan ditemukan.
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
import { ref, reactive, watch, computed } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { format, subDays } from "date-fns";

// --- Interfaces ---
interface PermintaanItem {
  Nomor: string;
  Tanggal: string;
  KodeGudang: string;
  NamaGudang: string;
  Keterangan: string;
  ACC: "Y" | "N";
  Status_Proses: "OPEN" | "PROGRESS" | "CLOSE";
}

// --- Props & Emits ---
const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", permintaan: PermintaanItem): void;
}>();

const toast = useToast();

// --- State ---
const API_URL = "/mmt/permintaan-bahan/lookup";
const PermintaanList = ref<PermintaanItem[]>([]);
const loading = ref(false);

const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
const today = format(new Date(), "yyyy-MM-dd");

const filters = reactive({
  startDate: thirtyDaysAgo,
  endDate: today,
  keyword: "",
});

const headers = [
  { title: "Nomor Permintaan", key: "Nomor", width: "200px" },
  { title: "Tanggal", key: "Tanggal", width: "120px" },
  { title: "Gudang Tujuan", key: "NamaGudang", width: "200px" },
  { title: "ACC Status", key: "ACC", width: "100px", align: "center" as const },
  {
    title: "Status Permintaan",
    key: "Status_Proses",
    width: "110px",
    align: "center" as const,
  },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "100px",
    align: "center" as const,
  },
];

const filteredPermintaanList = computed(() => {
  if (!filters.keyword) return PermintaanList.value;
  const search = filters.keyword.toLowerCase();
  return PermintaanList.value.filter((item) => {
    const nomorMatch = item.Nomor.toLowerCase().includes(search);
    const keteranganMatch =
      item.Keterangan && item.Keterangan.toLowerCase().includes(search);
    return nomorMatch || keteranganMatch;
  });
});

// --- API & Logic ---

const fetchPermintaanData = async () => {
  loading.value = true;
  PermintaanList.value = [];
  try {
    const response = await api.get<PermintaanItem[]>(API_URL, {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    PermintaanList.value = response.data || [];
  } catch (error) {
    const err = error as AxiosError;
    toast.error("Gagal memuat daftar Permintaan Bahan.");
    PermintaanList.value = [];
  } finally {
    loading.value = false;
  }
};

const selectPermintaan = (item: PermintaanItem) => {
  if (item.Status_Proses === "CLOSE") {
    toast.warning("Permintaan ini sudah selesai (CLOSE).");
    return;
  }
  if (!item.Nomor) {
    toast.error("Error: Nomor Permintaan kosong.");
    return;
  }
  emit("select", item);
  emit("close");
};

/**
 * Handler Double Click
 */
const handleDoubleClick = (
  _event: MouseEvent,
  { item }: { item: PermintaanItem },
) => {
  selectPermintaan(item);
};

watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      fetchPermintaanData();
    } else {
      PermintaanList.value = [];
      filters.keyword = "";
    }
  },
  { immediate: true },
);

watch([() => filters.startDate, () => filters.endDate], () => {
  if (props.isVisible) {
    fetchPermintaanData();
  }
});
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
  height: 90vh !important;
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
  background-color: #e3f2fd !important;
  font-weight: bold;
  color: #333 !important;
}

/* Penambahan styling untuk efek klik */
.clickable-row :deep(tbody tr):hover {
  cursor: pointer !important;
  background-color: #f5f5f5 !important;
}

.clickable-row :deep(tbody tr):active {
  background-color: #e1f5fe !important;
}

.flex-grow-1 {
  height: 100%;
}
</style>
