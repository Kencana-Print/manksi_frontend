<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { IconRuler2 } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import SpandukToleransiFormDialog from "@/components/dialogs/SpandukToleransiFormDialog.vue";
import * as toleransiService from "@/services/spanduk/daftar/toleransiService";
import type {
  ToleransiDetail,
  ToleransiRow,
} from "@/services/spanduk/daftar/toleransiService";

const toast = useToast();

const headers = [
  { title: "KODE", key: "Kode", width: "80px", sortable: true },
  { title: "JENIS", key: "Jenis", width: "80px" },
  { title: "NAMA", key: "Nama", width: "200px" },
  { title: "UKURAN", key: "Ukuran", width: "100px", align: "end" },
  { title: "TOLERANSI", key: "Toleransi", width: "140px", align: "end" },
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
  fetchApi: () => toleransiService.getBrowse(),
});

// --- STATE DIALOG FORM ---
const showDialog = ref(false);
const isNewMode = ref(true);
const selectedData = ref<ToleransiDetail | null>(null);

const handleAdd = () => {
  isNewMode.value = true;
  selectedData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: ToleransiRow) => {
  try {
    selectedData.value = await toleransiService.getById(item.Kode);
    isNewMode.value = false;
    showDialog.value = true;
  } catch (e) {
    toast.error(
      toleransiService.pesanError(e, "Gagal memuat detail data toleransi."),
    );
  }
};

const handleDelete = async (item: ToleransiRow) => {
  try {
    await toleransiService.remove(item.Kode);
    toast.success(`Toleransi kode ${item.Kode} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(toleransiService.pesanError(e, "Gagal menghapus data."));
  }
};
</script>

<template>
  <BaseBrowse
    title="Toleransi Spanduk"
    menu-id="4"
    storage-id="spanduk-toleransi"
    :icon="IconRuler2"
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
    @export="exportToExcel('Data_Toleransi_Spanduk')"
  />

  <SpandukToleransiFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :data="selectedData"
    @saved="fetchData"
  />
</template>
