<script setup lang="ts">
import { ref, computed } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { IconFlask } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import ObatFormDialog from "@/components/dialogs/ObatFormDialog.vue";

const authStore = useAuthStore();

// --- KONFIGURASI AKSES FINANCE ---
const canViewFinance = computed(() => {
  const b = authStore.user?.bagian || "";
  return !["GUDANG", "PRODUKSI", "POTONG", "JAHIT"].includes(b);
});

// --- KONFIGURASI BROWSE (ID: 24) ---
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
  menuId: "24",
  fetchApi: async () => {
    const res = await api.get("/master/obat");
    return res.data.data;
  },
});

// --- HEADERS DINAMIS ---
const headers = computed(() => {
  const base = [
    { title: "KODE", key: "Kode", width: "100px" },
    { title: "NAMA OBAT", key: "Nama", minWidth: "250px" },
    { title: "SATUAN", key: "Satuan", width: "80px", align: "center" },
  ];

  if (canViewFinance.value) {
    base.push({ title: "SUPPLIER", key: "Supplier", width: "150px" });
    base.push({ title: "HARGA", key: "Harga", width: "100px", align: "right" });
  }

  return [
    ...base,
    { title: "BUFFER", key: "Buffer", width: "80px", align: "right" },
    { title: "STOK", key: "Stok", width: "80px", align: "right" },
    { title: "SAFETY", key: "Safety", width: "80px", align: "right" },
    { title: "AKTIF", key: "Aktif", width: "70px", align: "center" },
  ];
});

// --- PEWARNAAN BARIS ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  let customClass = "";

  if (item.Aktif === "N") customClass += " row-pasif";
  if (Number(item.Safety) !== 0) customClass += " row-safety";

  return { class: customClass.trim() };
};

// --- LOGIKA FORM ---
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
  editData.value = { ...item };
  showDialog.value = true;
};
</script>

<template>
  <BaseBrowse
    title="Master Obat"
    menu-id="24"
    :icon="IconFlask"
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
    @export="exportToExcel('Data_Master_Obat')"
  >
    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <span class="text-caption mr-2">Back Color:</span>
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

  <ObatFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>

<style scoped>
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

/* 1. Baris Pasif: Font Merah */
:deep(.row-pasif) {
  color: #b71c1c !important;
}

/* 2. Kolom Safety (Background Merah) */
:deep(.row-safety td[data-col="Safety"]) {
  background-color: #f44336 !important;
  color: white !important;
  font-weight: bold;
}
</style>
