<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { IconFlask } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import SpandukBahanPenolongFormDialog from "@/components/dialogs/SpandukBahanPenolongFormDialog.vue";
import * as bahanPenolongService from "@/services/spanduk/daftar/bahanPenolongService";
import type {
  BahanPenolongDetail,
  BahanPenolongRow,
} from "@/services/spanduk/daftar/bahanPenolongService";

const toast = useToast();

const headers = [
  { title: "KODE", key: "Kode", width: "120px", sortable: true },
  { title: "NAMA BARANG", key: "Nama", width: "280px" },
  { title: "GUDANG", key: "Gudang", width: "130px" },
  { title: "DIVISI", key: "Divisi", width: "90px" },
  { title: "KATEGORI", key: "Kategori", width: "140px" },
  { title: "JENIS", key: "Jenis", width: "110px" },
  { title: "SUPPLIER", key: "Supplier", width: "200px" },
  { title: "KONSTRUKSI", key: "Konstruksi", width: "100px" },
  { title: "PANJANG", key: "Panjang", width: "80px", align: "right" },
  { title: "LEBAR", key: "Lebar", width: "70px", align: "right" },
  { title: "SATUAN", key: "Satuan", width: "70px", align: "center" },
  { title: "STATUS", key: "Status", width: "80px", align: "center" },
  { title: "STOK", key: "Stok", width: "90px", align: "right" },
];

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
  menuId: "4",
  fetchApi: () => bahanPenolongService.getBrowse(),
});

// --- STATE DIALOG FORM ---
const showDialog = ref(false);
const isNewMode = ref(true);
const selectedData = ref<BahanPenolongDetail | null>(null);

const handleAdd = () => {
  isNewMode.value = true;
  selectedData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: BahanPenolongRow) => {
  try {
    selectedData.value = await bahanPenolongService.getById(item.Kode);
    isNewMode.value = false;
    showDialog.value = true;
  } catch (e) {
    toast.error(
      bahanPenolongService.pesanError(e, "Gagal memuat detail data bahan."),
    );
  }
};

const handleDelete = async (item: BahanPenolongRow) => {
  try {
    await bahanPenolongService.remove(item.Kode);
    toast.success(`Bahan ${item.Nama} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(bahanPenolongService.pesanError(e, "Gagal menghapus data."));
  }
};
</script>

<template>
  <BaseBrowse
    title="Bahan Penolong Spanduk"
    menu-id="4"
    storage-id="spanduk-bahan-penolong"
    :icon="IconFlask"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Bahan_Penolong_Spanduk')"
  />

  <SpandukBahanPenolongFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :data="selectedData"
    @saved="fetchData"
  />
</template>
