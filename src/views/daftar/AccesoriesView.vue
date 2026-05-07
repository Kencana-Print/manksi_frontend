<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import GarmenBrgFormDialog from "@/components/dialogs/GarmenBrgFormDialog.vue";
import { IconPaperclip } from "@tabler/icons-vue";

// ID 30 untuk Master Accesories
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "30",
  fetchApi: async () => {
    const res = await api.get("/master/accesories");
    return res.data.data;
  },
});

// Sesuai referensi Delphi, kolom yang ditampilkan
const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA", key: "Nama", minWidth: "250px" },
  { title: "SATUAN", key: "Satuan", width: "80px", align: "center" },
  { title: "BUFFER", key: "Buffer", width: "80px", align: "right" },
  { title: "STOK", key: "Stok", width: "80px", align: "right" },
  {
    title: "SAFETY",
    key: "Safety",
    width: "80px",
    align: "right",
    // Tambahkan class dinamis ke sel (td) ini
    cellProps: (data: any) => ({
      class:
        Number(data.item.Safety) !== 0
          ? "bg-red text-white font-weight-bold"
          : "",
    }),
  },
  {
    title: "TAMBAHAN",
    key: "Tambahan",
    width: "80px",
    align: "center",
    // Tambahkan class dinamis ke sel (td) ini
    cellProps: (data: any) => ({
      class:
        data.item.Tambahan === "Y" ? "bg-blue text-white font-weight-bold" : "",
    }),
  },
  { title: "NOTE", key: "Note", width: "150px" },
  { title: "AKTIF", key: "Aktif", width: "70px", align: "center" },
];

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: any) => {
  isNewMode.value = false;
  try {
    // Panggil API spesifik Accesories untuk ambil detail (termasuk join lookup)
    const res = await api.get(`/master/accesories/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    // Error handling (toast global)
  }
};

// --- LOGIKA PEWARNAAN BARIS ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  // Kita hanya perlu mewarnai font menjadi merah jika pasif
  if (item.Aktif === "N")
    return { class: "text-red-darken-4 font-weight-bold" };
  return {};
};
</script>

<template>
  <BaseBrowse
    title="Master Accesories"
    menu-id="30"
    :icon="IconPaperclip"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="exportToExcel('Data_Master_Accesories')"
  >
    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <span class="text-caption mr-2">Back Color:</span>
        <div class="d-flex align-center mr-4">
          <div class="legend-box bg-blue mr-1"></div>
          <span class="text-caption font-weight-bold">Tambahan</span>
        </div>
        <div class="d-flex align-center mr-4">
          <div class="legend-box bg-red mr-1"></div>
          <span class="text-caption font-weight-bold"
            >Safety<>0 (Perlu Order)</span
          >
        </div>

        <v-divider vertical class="mx-2"></v-divider>

        <span class="text-caption mr-2">Font:</span>
        <div class="d-flex align-center">
          <div class="legend-box bg-red-darken-4 mr-1"></div>
          <span class="text-caption font-weight-bold text-red-darken-4"
            >Pasif</span
          >
        </div>
      </div>
    </template>
  </BaseBrowse>

  <GarmenBrgFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    jenis-garmen="ACCESORIES"
    @saved="fetchData"
  />
</template>

<style scoped>
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

/* CUSTOM ROW COLORS (Menargetkan kolom spesifik seperti di Delphi) */
/* 1. Baris Pasif: Font Merah */
:deep(.row-pasif) {
  color: #b71c1c !important;
}

/* 2. Kolom Tambahan = Y: Background Biru */
:deep(.row-tambahan td[data-col="Tambahan"]) {
  background-color: #1976d2 !important;
  color: white !important;
  font-weight: bold;
}

/* 3. Kolom Safety <> 0: Background Merah */
:deep(.row-safety td[data-col="Safety"]) {
  background-color: #f44336 !important;
  color: white !important;
  font-weight: bold;
}
</style>
