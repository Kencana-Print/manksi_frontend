<template>
  <v-dialog
    :model-value="dialogState"
    @update:model-value="handleDialogClose"
    max-width="1200px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          <v-icon start>mdi-file-find</v-icon> Pilih SPK untuk Jadwal Kirim
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          @click="closeModal"
          variant="text"
          size="small"
        ></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
        <v-row dense class="mb-2 flex-shrink-0">
          <v-col cols="12" md="7">
            <v-text-field
              v-model="searchKeyword"
              label="Cari Nomor SPK, Nama Item, atau Alokasi..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @keyup.enter="fetchSPKData"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-center">
            <v-checkbox
              v-model="filterSisa"
              label="Hanya Sisa Saldo > 0"
              density="compact"
              hide-details
              color="primary"
            ></v-checkbox>
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center justify-end">
            <v-btn
              color="primary"
              variant="flat"
              block
              density="compact"
              @click="fetchSPKData"
              :loading="loading"
            >
              Cari
            </v-btn>
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="filteredSPKList"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1 clickable-row"
          density="compact"
          item-key="SPK"
          fixed-header
          :items-per-page="50"
          @dblclick:row="handleDoubleClick"
        >
          <template #item.Tanggal="{ item }">
            {{ formatTanggal(item.Tanggal) }}
          </template>

          <template #item.Alokasi="{ item }">
            <span class="font-weight-medium text-blue-grey-darken-3">
              {{ item.Alokasi || "-" }}
            </span>
          </template>

          <template #item.Tipe_SPK="{ item }">
            <v-chip
              :color="
                item.Tipe_SPK === 'REGULER'
                  ? 'blue-darken-2'
                  : 'purple-darken-2'
              "
              size="x-small"
              variant="flat"
              class="text-uppercase font-weight-bold"
            >
              {{ item.Tipe_SPK }}
            </v-chip>
          </template>

          <template #item.Belum_Kirim="{ item }">
            <v-chip
              :color="
                item.Belum_Kirim > 0 ? 'orange-darken-3' : 'grey-lighten-1'
              "
              size="x-small"
              variant="flat"
              class="font-weight-bold"
            >
              {{ item.Belum_Kirim }}
            </v-chip>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              color="primary"
              size="x-small"
              @click.stop="selectSPK(item as SPKItem)"
              variant="tonal"
              prepend-icon="mdi-check"
            >
              Pilih
            </v-btn>
          </template>

          <template #no-data>
            <div class="text-center pa-4 text-grey">
              Data SPK tidak ditemukan atau belum ACC PIN.
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-3">
        <v-spacer></v-spacer>
        <v-btn @click="closeModal" color="secondary" variant="text"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";

export interface AlokasiDetail {
  urut: number;
  kota: string;
  alamat: string;
  person: string;
  hp: string;
  jumlah: number;
}

export interface SPKItem {
  SPK: string;
  Nama: string;
  Tanggal: string;
  Ukuran: string;
  Bahan: string;
  Total_Order: number;
  Sudah_Kirim: number;
  Belum_Kirim: number;
  Tipe_SPK: string;
  Ngedit: string;
  Alokasi?: string;
  alokasi_list?: AlokasiDetail[];
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    isVisible?: boolean;
    show?: boolean;
    modelValue?: boolean;
  }>(),
  {
    isVisible: false,
    show: false,
    modelValue: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:modelValue", value: boolean): void;
  (e: "update:isVisible", value: boolean): void;
  (e: "update:show", value: boolean): void;
  (e: "select", data: SPKItem): void;
}>();

const toast = useToast();
const loading = ref(false);
const searchKeyword = ref("");
const filterSisa = ref(true);
const SPKList = ref<SPKItem[]>([]);

const dialogState = computed(
  () => props.isVisible || props.show || props.modelValue,
);

// 2. Tambahkan kolom Alokasi / Kota Tujuan ke header
const headers = [
  { title: "Nomor SPK", key: "SPK", width: "130px" },
  { title: "Nama SPK / Item", key: "Nama", width: "240px" },
  { title: "Kota / Alokasi", key: "Alokasi", width: "150px" },
  { title: "Tgl SPK", key: "Tanggal", width: "100px" },
  { title: "Material", key: "Bahan", width: "110px" },
  { title: "Order", key: "Total_Order", width: "80px", align: "end" as const },
  {
    title: "Sdh Jdwl",
    key: "Sudah_Kirim",
    width: "80px",
    align: "end" as const,
  },
  { title: "Sisa", key: "Belum_Kirim", width: "80px", align: "end" as const },
  { title: "Tipe", key: "Tipe_SPK", width: "85px", align: "center" as const },
  {
    title: "Aksi",
    key: "actions",
    sortable: false,
    width: "90px",
    align: "center" as const,
  },
];

const filteredSPKList = computed(() => {
  if (filterSisa.value) {
    return SPKList.value.filter((item) => Number(item.Belum_Kirim) > 0);
  }
  return SPKList.value;
});

const formatTanggal = (val: string) => {
  if (!val) return "-";
  const d = new Date(val);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const fetchSPKData = async () => {
  loading.value = true;
  try {
    const response = await api.get("/mmt/spk/lookup-jadwal", {
      params: { keyword: searchKeyword.value },
    });
    SPKList.value = response.data.data || response.data || [];
  } catch (error) {
    toast.error("Gagal memuat daftar SPK.");
  } finally {
    loading.value = false;
  }
};

const closeModal = () => {
  emit("close");
  emit("update:modelValue", false);
  emit("update:isVisible", false);
  emit("update:show", false);
};

const handleDialogClose = (val: boolean) => {
  if (!val) closeModal();
};

const selectSPK = (item: SPKItem) => {
  emit("select", item);
  closeModal();
};

const handleDoubleClick = (_event: any, { item }: any) => {
  selectSPK(item);
};

watch(
  dialogState,
  (val) => {
    if (val) {
      searchKeyword.value = "";
      fetchSPKData();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.desktop-table :deep(thead th) {
  background-color: #1976d2 !important;
  color: white !important;
  font-weight: bold !important;
  font-size: 12px !important;
  height: 45px !important;
  border-bottom: 2px solid #1565c0 !important;
}

.desktop-table :deep(td) {
  height: 38px !important;
  font-size: 11.5px;
}

.clickable-row :deep(tbody tr):hover {
  cursor: pointer;
  background-color: #e3f2fd !important;
}

.desktop-table :deep(.v-table__wrapper) {
  scrollbar-width: thin;
  scrollbar-color: #bdc3c7 transparent;
}

.dialog-card {
  border-radius: 8px;
  overflow: hidden;
}
</style>
