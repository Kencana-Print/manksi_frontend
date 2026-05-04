<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";

// Components
import BaseBrowse from "@/components/BaseBrowse.vue";
import MasterBahanFormDialog from "@/components/dialogs/MasterBahanFormDialog.vue";
import ConfirmDeleteDialog from "@/components/dialogs/ConfirmDeleteDialog.vue";

const toast = useToast();

// 1. Konfigurasi Header
const headers = [
  { title: "KODE", key: "Kode", width: "100px", sortable: true },
  { title: "NAMA", key: "Nama", width: "300px" },
  { title: "SATUAN", key: "Satuan", width: "70px", align: "center" },
  { title: "WARNA", key: "Warna", width: "120px" },
  { title: "GRAMASI", key: "Gramasi", width: "80px" },
  { title: "SETTING", key: "Setting", width: "70px" },
  { title: "DEADSTOCK", key: "DeadStock", width: "80px", align: "center" },
  { title: "BUFFER", key: "Buffer", width: "80px", align: "right" },
  { title: "STOK", key: "Stok", width: "80px", align: "right" },
  { title: "SAFETY", key: "Safety", width: "80px", align: "right" },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "150px" },
];

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
const showDelete = ref(false);
const itemToDelete = ref<any>(null);
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

const confirmDelete = (item: any) => {
  itemToDelete.value = item;
  showDelete.value = true;
};

const executeDelete = async () => {
  isDeleting.value = true;
  try {
    await api.delete(`/master/bahan/${itemToDelete.value.Kode}`);
    toast.success(`Bahan ${itemToDelete.value.Nama} berhasil dihapus.`);
    showDelete.value = false;
    fetchData(); // Refresh tabel
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus data.");
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Bahan"
    menu-id="11"
    icon="mdi-texture"
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
    @delete="confirmDelete"
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

  <ConfirmDeleteDialog
    v-model="showDelete"
    :item-name="`Bahan ${itemToDelete?.Nama}`"
    :is-loading="isDeleting"
    @confirm="executeDelete"
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
