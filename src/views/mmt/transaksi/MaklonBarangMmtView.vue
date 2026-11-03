<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconPackage } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

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
  { title: "No. Maklon", key: "mkl_nomor", width: "160px" },
  { title: "Tanggal", key: "mkl_tanggal", width: "110px", align: "center" },
  { title: "Deadline", key: "mkl_deadline", width: "110px", align: "center" },
  { title: "Cabang Asal", key: "NamaCabAsal", width: "150px" },
  { title: "Cabang Tujuan", key: "NamaCabTujuan", width: "150px" },
  { title: "Status", key: "mkl_status", width: "120px", align: "center" },
  { title: "Jml Item", key: "JmlItem", width: "90px", align: "end" },
  { title: "Total Kirim", key: "TotalKirim", width: "100px", align: "end" },
  { title: "Total Terima", key: "TotalTerima", width: "100px", align: "end" },
  { title: "Total BS", key: "TotalBs", width: "90px", align: "end" },
  { title: "Keterangan", key: "mkl_keterangan", minWidth: "180px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5516",
  fetchApi: async () => {
    const res = await api.get("/mmt/maklon/barang/browse", {
      params: { startDate: startDate.value, endDate: endDate.value, semuaCabang: true },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Maklon Barang MMT"
    menu-id="5516"
    :icon="IconPackage"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Maklon_Barang_MMT')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" @change="fetchData" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" @change="fetchData" />
      </div>
    </template>

    <template #item.mkl_tanggal="{ item }">
      {{ formatTanggal((item.raw || item).mkl_tanggal) }}
    </template>
    <template #item.mkl_deadline="{ item }">
      {{ formatTanggal((item.raw || item).mkl_deadline) }}
    </template>

    <template #item.mkl_status="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).mkl_status === 'SELESAI' ? 'success' : 'warning'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).mkl_status || "OPEN" }}
      </v-chip>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group { display: flex; align-items: center; gap: 4px; }
.filter-label { font-size: 11px; font-weight: 600; color: #555; margin-right: 2px; }
.filter-sep { font-size: 11px; color: #777; }
.date-inp { height: 26px; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; font-size: 11px; background: white; color: #212121; }
</style>
