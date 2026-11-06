<script setup lang="ts">
import { ref, computed } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { IconBox } from "@tabler/icons-vue";

// Components
import BaseBrowse from "@/components/BaseBrowse.vue";
import MasterBahanFormDialog from "@/components/dialogs/MasterBahanFormDialog.vue";

const toast = useToast();

// 2. Logic Fetching menggunakan Composable
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "11",
  fetchApi: async () => {
    const response = await api.get("/master/bahan");
    return response.data.data;
  },
});

// 1. Konfigurasi Header (kolom mengikuti tipe bahan yang tampil)
interface BahanRow {
  Kode: string;
  Tipe: "GARMEN" | "SPANDUK";
}

const rows = computed(() => (items.value ?? []) as BahanRow[]);
const adaSpanduk = computed(() => rows.value.some((r) => r.Tipe === "SPANDUK"));
const adaGarmen = computed(
  () => rows.value.some((r) => r.Tipe === "GARMEN") || !adaSpanduk.value,
);

const headers = computed(() => [
  { title: "KODE", key: "Kode", width: "100px", sortable: true },
  { title: "NAMA", key: "Nama", width: "300px" },
  { title: "SATUAN", key: "Satuan", width: "70px", align: "center" },
  ...(adaGarmen.value
    ? [
        { title: "WARNA", key: "Warna", width: "120px" },
        { title: "GRAMASI", key: "Gramasi", width: "80px" },
        { title: "SETTING", key: "Setting", width: "70px" },
      ]
    : []),
  ...(adaSpanduk.value
    ? [
        { title: "KONSTRUKSI", key: "Konstruksi", width: "90px" },
        { title: "PANJANG", key: "Panjang", width: "80px", align: "end" },
        { title: "LEBAR", key: "Lebar", width: "80px", align: "end" },
      ]
    : []),
  { title: "DEADSTOCK", key: "DeadStock", width: "80px", align: "center" },
  { title: "BUFFER", key: "Buffer", width: "80px", align: "right" },
  { title: "STOK", key: "Stok", width: "80px", align: "right" },
  { title: "SAFETY", key: "Safety", width: "80px", align: "right" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "150px" },
]);

const fmtUkuran = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ""
    ? ""
    : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// 3. Logic Pewarnaan Baris (DeadStock = Merah)
const rowPropsFn = (data: any) => {
  const item = data.item;
  return {
    class: item.DeadStock === "YA" ? "row-dead-stock" : "",
  };
};

// --- STATE DIALOG FORM ---
const showDialog = ref(false);
const isNewMode = ref(true);
const selectedBahanData = ref(null);

// --- STATE DIALOG HAPUS ---
const isDeleting = ref(false);

// 4. Action Handlers
const handleAdd = () => {
  isNewMode.value = true;
  selectedBahanData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: any) => {
  isNewMode.value = false;
  try {
    // Ambil detail lengkap berdasarkan Kode
    const res = await api.get(`/master/bahan/${item.Kode}`);
    selectedBahanData.value = res.data.data;
    showDialog.value = true;
  } catch (e) {
    toast.error("Gagal memuat detail data bahan.");
  }
};

const handleDelete = async (item: any) => {
  isDeleting.value = true;

  try {
    await api.delete(`/master/bahan/${item.Kode}`);

    toast.success(`Bahan ${item.Nama} berhasil dihapus.`);
    fetchData();
  } catch (e: any) {
    const pesanError = e.response?.data?.message || "Gagal menghapus data.";

    toast.error(pesanError);
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Bahan"
    menu-id="11"
    :icon="IconBox"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Master_Bahan')"
  >
    <template #filter-right-prepend>
      <div class="d-flex align-center mr-6">
        <div class="dead-stock-box mr-2"></div>
        <span class="text-dead-stock font-weight-bold">= DEAD STOCK</span>
      </div>

      <v-checkbox
        label="Sembunyikan Stok Kosong"
        density="compact"
        hide-details
        class="mt-0 pt-0 mr-4"
      ></v-checkbox>
    </template>

    <template #item.Panjang="{ value }">{{ fmtUkuran(value) }}</template>
    <template #item.Lebar="{ value }">{{ fmtUkuran(value) }}</template>

    <template #item.DeadStock="{ value }">
      <v-chip
        v-if="value === 'YA'"
        color="error"
        size="x-small"
        label
        variant="flat"
      >
        DEAD
      </v-chip>
    </template>
  </BaseBrowse>

  <MasterBahanFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :bahan-data="selectedBahanData"
    @saved="fetchData"
  />
</template>

<style scoped>
/* 1. Warna Legend & Baris Dead Stock */
.text-dead-stock {
  color: #d32f2f;
  font-size: 11px;
}
.dead-stock-box {
  width: 14px;
  height: 14px;
  background-color: #d32f2f;
  border-radius: 2px;
}

/* 2. Style Baris Dead Stock */
:deep(.row-dead-stock) {
  color: #d32f2f !important;
  font-weight: bold;
}

/* 3. Highlight Selection Fix */
:deep(.v-data-table__selected.row-dead-stock),
:deep(.v-data-table__selected) {
  background-color: #bbdefb !important;
  color: #0d47a1 !important;
}

:deep(tbody tr:hover) {
  background-color: #eeeeee !important;
}
</style>
