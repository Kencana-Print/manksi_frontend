<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconClipboardCheck } from "@tabler/icons-vue";
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
  { title: "Nomor", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" },
  { title: "Gudang", key: "Gudang", minWidth: "160px" },
  { title: "Tipe", key: "Tipe_Nama", width: "130px", align: "center" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
  { title: "Pengaju", key: "Pengaju", width: "120px" },
  { title: "Approver", key: "Approver", width: "120px" },
  { title: "Tgl Acc", key: "TglAcc", width: "140px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
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
  menuId: "5525",
  fetchApi: async () => {
    const res = await api.get("/mmt/pengajuan-koreksi-stok", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Pengajuan Koreksi Stok"
    menu-id="5525"
    :icon="IconClipboardCheck"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:start-date="startDate"
    v-model:end-date="endDate"
    :show-date-filter="true"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Pengajuan_Koreksi_Stok')"
  >
    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.TglAcc="{ item }">
      {{ formatTanggal((item.raw || item).TglAcc) }}
    </template>
  </BaseBrowse>
</template>
