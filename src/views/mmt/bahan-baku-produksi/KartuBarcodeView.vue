<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconReportAnalytics } from "@tabler/icons-vue";
import api from "@/services/api";

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
  { title: "Kode Bahan", key: "KODE", width: "130px" },
  { title: "Nama Bahan", key: "NAMA", minWidth: "220px" },
  { title: "Kategori", key: "KATEGORI", width: "120px" },
  { title: "Satuan", key: "SATUAN", width: "80px", align: "center" as const },
  { title: "Stok Awal", key: "STOK_AWAL", width: "100px", align: "end" as const },
  { title: "Terima", key: "TERIMA", width: "100px", align: "end" as const },
  { title: "Retur", key: "RETUR", width: "100px", align: "end" as const },
  { title: "Koreksi", key: "KOREKSI", width: "100px", align: "end" as const },
  { title: "Mutasi", key: "MUTASI", width: "100px", align: "end" as const },
  { title: "Produksi", key: "PRODUKSI", width: "100px", align: "end" as const },
  { title: "Retur Prod", key: "RET_PRODUKSI", width: "100px", align: "end" as const },
  { title: "Stok Akhir", key: "STOK_AKHIR", width: "110px", align: "end" as const },
];

const {
  items,
  isLoading,
  selected,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5542",
  fetchApi: async () => {
    const res = await api.get("/mmt/bahan-baku-produksi/barcode/kartu-stok", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Kartu Barcode"
    menu-id="5542"
    item-value="KODE"
    :icon="IconReportAnalytics"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Kartu_Stok_Bahan_MMT')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input
          type="date"
          v-model="startDate"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s/d</span>
        <input
          type="date"
          v-model="endDate"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-right: 2px;
}
.filter-sep {
  font-size: 11px;
  color: #777;
}
.date-inp {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  background: white;
  color: #212121;
}
</style>
