<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconChecks } from "@tabler/icons-vue";
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
  { title: "No. Penjadwalan", key: "Nomor", width: "160px" },
  { title: "Tgl Awal", key: "TglAwal", width: "110px", align: "center" },
  { title: "Tgl Akhir", key: "TglAkhir", width: "110px", align: "center" },
  { title: "Cabang", key: "Cabang", width: "90px", align: "center" },
  { title: "Jumlah SO", key: "JumlahSO", width: "100px", align: "end" },
  { title: "Jumlah MAP", key: "JumlahMap", width: "100px", align: "end" },
  { title: "Close", key: "Close", width: "80px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
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
  menuId: "5519",
  fetchApi: async () => {
    const res = await api.get("/mmt/komitmen-kirim/browse", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Komitmen Kirim MMT"
    menu-id="5519"
    :icon="IconChecks"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Komitmen_Kirim_MMT')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" @change="fetchData" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" @change="fetchData" />
      </div>
    </template>

    <template #item.TglAwal="{ item }">
      {{ formatTanggal((item.raw || item).TglAwal) }}
    </template>
    <template #item.TglAkhir="{ item }">
      {{ formatTanggal((item.raw || item).TglAkhir) }}
    </template>
    <template #item.Close="{ item }">
      <v-chip
        size="x-small"
        :color="(item.raw || item).Close === 'Y' ? 'grey-darken-1' : 'success'"
        class="font-weight-bold"
      >
        {{ (item.raw || item).Close === 'Y' ? 'CLOSE' : 'OPEN' }}
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
