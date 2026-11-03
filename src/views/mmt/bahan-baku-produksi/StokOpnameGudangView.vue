<script setup lang="ts">
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconChecklist } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const headers = [
  { title: "Session ID", key: "opn_session_id", width: "160px" },
  { title: "Gudang", key: "opn_gdg_kode", width: "120px", align: "center" },
  { title: "Tanggal", key: "opn_tanggal", width: "140px", align: "center" },
  { title: "Status", key: "opn_status", width: "120px", align: "center" },
  { title: "User Input", key: "user_create", width: "140px" },
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
  menuId: "5526",
  fetchApi: async () => {
    const res = await api.get("/mmt/stok-opname");
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Stok Opname Gudang"
    menu-id="5526"
    :icon="IconChecklist"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Stok_Opname_Gudang')"
  >
    <template #item.opn_tanggal="{ item }">
      {{ formatTanggal((item.raw || item).opn_tanggal) }}
    </template>
  </BaseBrowse>
</template>
