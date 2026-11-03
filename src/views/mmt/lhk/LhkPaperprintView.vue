<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconFileText } from "@tabler/icons-vue";
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
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Shift", key: "Shift", width: "70px", align: "center" },
  { title: "Mesin", key: "Mesin", width: "90px", align: "center" },
  { title: "Gudang", key: "Nama_Gudang", width: "150px" },
  { title: "Nomor SPK", key: "NomorSPK", width: "150px" },
  { title: "Nama Order", key: "NamaOrder", minWidth: "180px" },
  { title: "Kode Bahan", key: "Kode_Bahan", width: "110px" },
  { title: "Nama Bahan", key: "Nama_Bahan", minWidth: "160px" },
  { title: "Lengkap", key: "Lengkap", width: "90px", align: "center" },
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
  menuId: "5513",
  fetchApi: async () => {
    const res = await api.get("/mmt/lhk/paperprint", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});
</script>

<template>
  <BaseBrowse
    title="LHK Paperprint"
    menu-id="5506"
    :icon="IconFileText"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('LHK_Paperprint')"
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

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Status === 'POSTED' ? 'success' : 'warning'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Status || "DRAFT" }}
      </v-chip>
    </template>

    <template #item.Lengkap="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Lengkap === 'Y' ? 'success' : 'error'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Lengkap === "Y" ? "LENGKAP" : "BELUM" }}
      </v-chip>
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
