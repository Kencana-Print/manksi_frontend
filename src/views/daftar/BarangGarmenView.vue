<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";

import BaseBrowse from "@/components/BaseBrowse.vue";
import ConfirmDeleteDialog from "@/components/dialogs/ConfirmDeleteDialog.vue";
import GarmenBrgFormDialog from "@/components/dialogs/GarmenBrgFormDialog.vue";
import { useToast } from "vue-toastification";

const toast = useToast();
const authStore = useAuthStore();

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

// --- STATE FILTER ---
const selectedJenis = ref("ACCESORIES");
const selectedCabang = ref(authStore.userCabang || "HO-");
const cabangOptions = ref<string[]>([]); // Sekarang dinamis

// --- KONFIGURASI AKSES FILTER (MIGRASI FormCreate DELPHI) ---
// Di Delphi: if (zbagian='ADMIN') or (zbagian='PPIC') or ...
const showFilterAcc = computed(() => {
  const b = authStore.user?.bagian || "";
  return [
    "ADMIN",
    "PPIC",
    "GUDANG",
    "PRODUKSI",
    "POTONG",
    "CETAK",
    "JAHIT",
    "LIPAT",
    "FINANCE",
    "AUDIT",
    "DIREKSI",
    "EDP",
  ].includes(b);
});

const showFilterObat = computed(() => {
  const b = authStore.user?.bagian || "";
  return [
    "ADMIN",
    "PPIC",
    "GUDANG",
    "PRODUKSI",
    "POTONG",
    "CETAK",
    "JAHIT",
    "LIPAT",
    "FINANCE",
    "AUDIT",
    "DIREKSI",
    "EDP",
  ].includes(b);
});

const showFilterSparepart = computed(() => {
  const b = authStore.user?.bagian || "";
  return ["TEKNISI", "IT", "FINANCE", "AUDIT", "DIREKSI", "EDP"].includes(b);
});

const showFilterAtk = computed(() => {
  const b = authStore.user?.bagian || "";
  return ["GA", "FINANCE", "AUDIT", "DIREKSI", "EDP"].includes(b);
});

// Menentukan Default Check (Migrasi rbacc.Checked:=True dll)
onMounted(async () => {
  // 1. Set Default Radio Button
  if (showFilterAcc.value) selectedJenis.value = "ACCESORIES";
  else if (showFilterAtk.value) selectedJenis.value = "ATK/RTK";
  else if (showFilterSparepart.value) selectedJenis.value = "SPAREPART";

  // 2. Fetch Data Cabang
  try {
    const res = await api.get("/master/barang-garmen/lookups/cabang");
    cabangOptions.value = res.data.data.map((c: any) => c.Kode);
  } catch (error) {
    toast.error("Gagal memuat daftar cabang");
    cabangOptions.value = [authStore.userCabang || "HO-"]; // Fallback
  }
});

// --- KONFIGURASI BROWSE ---
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
  menuId: "58",
  immediate: false,
  fetchApi: async () => {
    const res = await api.get("/master/barang-garmen", {
      params: {
        jenis: selectedJenis.value,
        cabang: selectedCabang.value,
      },
    });
    return res.data.data;
  },
});

// Fetch saat filter berubah
watch(
  [selectedJenis, selectedCabang],
  () => {
    fetchData();
  },
  { immediate: true },
);

// --- KONFIGURASI HEADER TABEL ---
const headers = computed(() => {
  const base = [
    { title: "KODE", key: "Kode", width: "100px" },
    { title: "NAMA BARANG", key: "Nama", minWidth: "250px" },
    { title: "KATEGORI", key: "Kategori", width: "120px" },
    { title: "SATUAN", key: "Satuan", width: "80px", align: "center" },
  ];

  if (selectedJenis.value === "ACCESORIES") {
    base.push({ title: "NOTE", key: "Note", width: "150px" });
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

  if (item.Aktif === "N") customClass = "row-pasif";
  else if (Number(item.Safety) !== 0) customClass = "row-safety-alert";

  return { class: customClass };
};

// --- LOGIC HAPUS ---
const showDelete = ref(false);
const itemToDelete = ref<any>(null);
const isDeleting = ref(false);

const confirmDelete = (item: any) => {
  itemToDelete.value = item;
  showDelete.value = true;
};

const executeDelete = async () => {
  isDeleting.value = true;
  try {
    await api.delete(`/master/barang-garmen/${itemToDelete.value.Kode}`);
    toast.success(`Berhasil menghapus data.`);
    showDelete.value = false;
    fetchData();
  } catch (e: any) {
    toast.error("Gagal menghapus data.");
  } finally {
    isDeleting.value = false;
  }
};

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: any) => {
  isNewMode.value = false;
  try {
    const res = await api.get(`/master/barang-garmen/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal mengambil data detail barang");
  }
};
</script>

<template>
  <BaseBrowse
    title="Barang Garmen"
    menu-id="58"
    icon="mdi-tshirt-crew-outline"
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
    @export="exportToExcel(`Data_Garmen_${selectedJenis}`)"
  >
    <template #filter-left>
      <v-radio-group
        v-model="selectedJenis"
        inline
        density="compact"
        hide-details
        class="radio-filter"
      >
        <v-radio
          v-if="showFilterAcc"
          label="ACCESORIES"
          value="ACCESORIES"
          color="primary"
        ></v-radio>
        <v-radio
          v-if="showFilterObat"
          label="OBAT"
          value="OBAT"
          color="primary"
        ></v-radio>
        <v-radio
          v-if="showFilterSparepart"
          label="SPAREPART"
          value="SPAREPART"
          color="primary"
        ></v-radio>
        <v-radio
          v-if="showFilterAtk"
          label="ATK/RTK"
          value="ATK/RTK"
          color="primary"
        ></v-radio>
      </v-radio-group>

      <v-divider vertical class="mx-3 my-2"></v-divider>

      <div class="d-flex align-center">
        <span class="text-caption font-weight-bold mr-2">Cabang:</span>
        <v-select
          v-model="selectedCabang"
          :items="cabangOptions"
          variant="outlined"
          density="compact"
          hide-details
          class="cabang-select"
        ></v-select>
      </div>
    </template>

    <template #filter-right>
      <div class="d-flex align-center bg-white pa-1 px-3 rounded border mr-2">
        <div class="d-flex align-center mr-4">
          <div class="legend-box bg-error mr-2"></div>
          <span class="text-caption font-weight-bold"
            >Safety<>0 (Perlu Order)</span
          >
        </div>
        <div class="d-flex align-center">
          <div class="legend-box bg-red-darken-4 mr-2"></div>
          <span class="text-caption font-weight-bold">Pasif</span>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <GarmenBrgFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    :jenis-garmen="selectedJenis"
    @saved="fetchData"
  />

  <ConfirmDeleteDialog
    v-model="showDelete"
    :item-name="itemToDelete?.Nama"
    :is-loading="isDeleting"
    @confirm="executeDelete"
  />
</template>

<style scoped>
.radio-filter :deep(.v-selection-control) {
  margin-right: 16px;
}
.radio-filter :deep(.v-label) {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.cabang-select {
  width: 100px;
}
.cabang-select :deep(.v-field__input) {
  min-height: 28px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 11px;
}

.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

/* CUSTOM ROW COLORS */
:deep(.row-safety-alert td[data-col="Safety"]) {
  background-color: #f44336 !important;
  color: white !important;
  font-weight: bold;
}
:deep(.row-pasif) {
  color: #b71c1c !important;
}
</style>
