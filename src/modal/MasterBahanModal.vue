<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="1050px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 85vh">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          🔍 {{ titleText }}
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
          :label="searchLabel"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchBahanData"
          autofocus
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="listData"
          :loading="loading"
          hover
          class="desktop-table flex-grow-1 clickable-row"
          density="compact"
          item-key="Kode"
          fixed-header
          :items-per-page="15"
          @dblclick:row="handleDoubleClick"
        >
          <!-- Kolom Kode Barang -->
          <template #item.Kode="{ item }">
            <span class="font-weight-medium">{{ item.Kode }}</span>
          </template>

          <!-- Kolom Barcode Terpisah -->
          <template #item.Barcode="{ item }">
            <span class="font-weight-bold text-indigo">{{
              item.Barcode || "-"
            }}</span>
          </template>

          <template #item.Nama="{ item }">
            <span>{{ item.Nama }}</span>
          </template>

          <template #item.Stok="{ item }">
            <v-chip
              :color="item.Stok && item.Stok > 0 ? 'success' : 'grey-darken-1'"
              size="x-small"
              label
              variant="flat"
            >
              {{ item.Stok?.toLocaleString() || 0 }}
            </v-chip>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              color="primary"
              size="x-small"
              @click.stop="selectBahan(item as MasterBahan)"
              variant="elevated"
              prepend-icon="mdi-check-circle"
            >
              Pilih
            </v-btn>
          </template>

          <template #no-data>
            <div class="text-center pa-10">
              <v-icon size="large" color="grey">mdi-database-off</v-icon>
              <div class="text-grey mt-2">Data tidak ditemukan.</div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn
          @click="emit('close')"
          color="secondary"
          variant="outlined"
          size="small"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { AxiosError } from "axios";
import api from "@/services/api";
import { useToast } from "vue-toastification";

interface MasterBahan {
  Kode: string;
  Barcode: string;
  Nama: string;
  Satuan: string;
  Panjang: number;
  Lebar: number;
  brg_satuan_harga: string;
  Stok?: number;
  Aktif?: string;
}

const props = defineProps<{
  isVisible: boolean;
  mode: "mmt" | "produksi" | "obat";
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", bahan: MasterBahan): void;
}>();

const toast = useToast();

const titleText = computed(() => {
  switch (props.mode) {
    case "produksi":
      return "Pencarian Sisa Produksi (GUDANG GPM)";
    case "obat":
      return "Pencarian Master Tinta / Obat";
    default:
      return "Pencarian Master Bahan MMT";
  }
});

const searchLabel = computed(
  () => "Cari Berdasarkan Kode, Barcode, atau Nama Barang...",
);

const API_URL = computed(() => {
  switch (props.mode) {
    case "obat":
      return "/master/bahan/obat";
    case "produksi":
      return "/master/bahan/mmt/produksi";
    default:
      return "/master/bahan/mmt";
  }
});

const listData = ref<MasterBahan[]>([]);
const searchKeyword = ref("");
const loading = ref(false);

const headers = [
  { title: "Kode Barang", key: "Kode", width: "130px", sortable: true },
  { title: "Barcode", key: "Barcode", width: "140px", sortable: true },
  {
    title: "Nama Barang / Bahan",
    key: "Nama",
    minWidth: "220px",
    sortable: true,
  },
  { title: "Satuan", key: "Satuan", width: "90px" },
  { title: "P (m)", key: "Panjang", width: "80px", align: "end" as const },
  { title: "L (m)", key: "Lebar", width: "80px", align: "end" as const },
  { title: "Stok", key: "Stok", width: "90px", align: "end" as const },
  {
    title: "Aksi",
    key: "actions",
    width: "90px",
    sortable: false,
    align: "center" as const,
  },
];

const fetchBahanData = async () => {
  if (!props.isVisible) return;
  loading.value = true;

  try {
    const response = await api.get<any>(API_URL.value, {
      params: { q: searchKeyword.value, keyword: searchKeyword.value },
    });

    const rawData = response.data.data || response.data || [];

    listData.value = rawData.map((item: any) => ({
      ...item,
      Kode: item.Kode || item.brg_kode || item.sku || "",
      Barcode: item.Barcode || item.mst_barcode || "-",
      Nama: item.Nama || item.brg_nama || item.namaBarang || "",
      Satuan: item.Satuan || item.brg_satuan || "-",
      Panjang: Number(item.Panjang || item.brg_panjang || 0),
      Lebar: Number(item.Lebar || item.brg_lebar || 0),
      Stok: Number(item.Stok || item.brg_stok || 0),
    }));
  } catch (error) {
    const err = error as AxiosError;
    toast.error(
      (err.response?.data as any)?.message || "Gagal mengambil data master.",
    );
    listData.value = [];
  } finally {
    loading.value = false;
  }
};

const selectBahan = (bahan: MasterBahan) => {
  if (!bahan.Kode) return toast.error("Data tidak valid.");
  emit("select", bahan);
  emit("close");
};

const handleDoubleClick = (
  _event: MouseEvent,
  { item }: { item: MasterBahan },
) => {
  selectBahan(item);
};

watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) {
      searchKeyword.value = "";
      fetchBahanData();
    } else {
      listData.value = [];
    }
  },
);
</script>

<style scoped>
.dialog-card {
  font-size: 13px;
}
.desktop-table {
  font-size: 12px;
}
.desktop-table :deep(td) {
  padding: 0 12px !important;
  height: 40px !important;
  border-bottom: 1px solid #eee !important;
}
.desktop-table :deep(thead th) {
  background-color: #f8f9fa !important;
  font-weight: 700 !important;
  color: #333 !important;
  text-transform: uppercase;
  font-size: 11px;
}
.clickable-row :deep(tbody tr):hover {
  cursor: pointer !important;
  background-color: #f1f5f9 !important;
}
</style>
