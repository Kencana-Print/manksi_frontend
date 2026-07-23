<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { useAuthStore } from "@/stores/authStore";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { monitoringKekuranganProduksiJahitService } from "@/services/laporan/produksi-garmen/monitoringKekuranganProduksiJahitService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconAlertTriangle, IconFileSpreadsheet } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "961"; // parent: Laporan Produksi Garmen

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));

const userCab = authStore.user?.cabang || "";
const cab = ref(userCab && ["P01", "P04"].includes(userCab) ? userCab : "P04");

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await monitoringKekuranganProduksiJahitService.getBrowse(
      dtAwal.value,
      cab.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, cab], fetchData);

const headers = [
  { title: "SPK", key: "Spk", width: "130px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Nama", key: "Nama", minWidth: "260px" },
  { title: "Jml SPK", key: "JmlSpk", width: "80px", align: "center" },
  { title: "Lhk A", key: "LhkA", width: "60px", align: "center" },
  { title: "Lhk B", key: "LhkB", width: "60px", align: "center" },
  { title: "Lhk C", key: "LhkC", width: "60px", align: "center" },
  { title: "Lhk D", key: "LhkD", width: "60px", align: "center" },
  { title: "Lhk E", key: "LhkE", width: "60px", align: "center" },
  { title: "Lhk F", key: "LhkF", width: "60px", align: "center" },
  { title: "Lhk G", key: "LhkG", width: "60px", align: "center" },
  { title: "Lhk H", key: "LhkH", width: "60px", align: "center" },
  { title: "Lhk I", key: "LhkI", width: "60px", align: "center" },
  { title: "Lhk J", key: "LhkJ", width: "60px", align: "center" },
  { title: "Lhk K", key: "LhkK", width: "60px", align: "center" },
  { title: "Other", key: "Other", width: "70px", align: "center" },
  { title: "Total LHK", key: "TotalLhk", width: "90px", align: "center" },
  { title: "CMT", key: "Cmt", width: "70px", align: "center" },
  { title: "Outstanding", key: "Outstanding", width: "100px", align: "center" },
];

const numFmt = (v: any) => Number(v || 0).toLocaleString("id-ID");

const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  const columns: ExcelColumn[] = [
    { header: "SPK", key: "Spk", width: 16 },
    { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
    { header: "Dateline", key: "Dateline", width: 12, align: "center" },
    { header: "Cab", key: "Cab", width: 8 },
    { header: "Divisi", key: "Divisi", width: 10 },
    { header: "Nama", key: "Nama", width: 32 },
    {
      header: "Jml SPK",
      key: "JmlSpk",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    { header: "Lhk A", key: "LhkA", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk B", key: "LhkB", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk C", key: "LhkC", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk D", key: "LhkD", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk E", key: "LhkE", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk F", key: "LhkF", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk G", key: "LhkG", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk H", key: "LhkH", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk I", key: "LhkI", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk J", key: "LhkJ", width: 8, align: "right", numFmt: "#,##0" },
    { header: "Lhk K", key: "LhkK", width: 8, align: "right", numFmt: "#,##0" },
    {
      header: "Other",
      key: "Other",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Total LHK",
      key: "TotalLhk",
      width: 12,
      align: "right",
      numFmt: "#,##0",
    },
    { header: "CMT", key: "Cmt", width: 10, align: "right", numFmt: "#,##0" },
    {
      header: "Outstanding",
      key: "Outstanding",
      width: 14,
      align: "right",
      numFmt: "#,##0",
    },
  ];
  await exportExcelSingle(
    `Monitoring_Kekurangan_Produksi_Jahit_${dtAwal.value}.xlsx`,
    "Monitoring Kekurangan Produksi Jahit",
    columns,
    list,
    `Laporan Monitoring Kekurangan Produksi (Jahit/Line) — Divisi Garmen ${cab.value}`,
  );
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Monitoring Kekurangan Produksi (Jahit/Line)"
    :menu-id="menuId"
    :icon="IconAlertTriangle"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Spk"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">SPK dari Tanggal</span>
        <input type="date" v-model="dtAwal" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Workshop</span>
        <select v-model="cab" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn v-if="canExport" size="small" color="green" @click="onExport">
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.JmlSpk="{ item }">{{ numFmt(item.JmlSpk) }}</template>
    <template #item.LhkA="{ item }">{{ numFmt(item.LhkA) }}</template>
    <template #item.LhkB="{ item }">{{ numFmt(item.LhkB) }}</template>
    <template #item.LhkC="{ item }">{{ numFmt(item.LhkC) }}</template>
    <template #item.LhkD="{ item }">{{ numFmt(item.LhkD) }}</template>
    <template #item.LhkE="{ item }">{{ numFmt(item.LhkE) }}</template>
    <template #item.LhkF="{ item }">{{ numFmt(item.LhkF) }}</template>
    <template #item.LhkG="{ item }">{{ numFmt(item.LhkG) }}</template>
    <template #item.LhkH="{ item }">{{ numFmt(item.LhkH) }}</template>
    <template #item.LhkI="{ item }">{{ numFmt(item.LhkI) }}</template>
    <template #item.LhkJ="{ item }">{{ numFmt(item.LhkJ) }}</template>
    <template #item.LhkK="{ item }">{{ numFmt(item.LhkK) }}</template>
    <template #item.Other="{ item }">{{ numFmt(item.Other) }}</template>
    <template #item.TotalLhk="{ item }">{{ numFmt(item.TotalLhk) }}</template>
    <template #item.Cmt="{ item }">{{ numFmt(item.Cmt) }}</template>
    <template #item.Outstanding="{ item }">
      <span :class="{ 'text-outstanding': Number(item.Outstanding) > 0 }">{{
        numFmt(item.Outstanding)
      }}</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.text-outstanding {
  color: #c62828;
  font-weight: 700;
}
</style>
