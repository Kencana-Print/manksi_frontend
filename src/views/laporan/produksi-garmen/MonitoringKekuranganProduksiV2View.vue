<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { monitoringKekuranganProduksiV2Service } from "@/services/laporan/produksi-garmen/monitoringKekuranganProduksiV2Service";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconAlertTriangle, IconFileSpreadsheet } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "556";

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
    const res = await monitoringKekuranganProduksiV2Service.getBrowse(
      dtAwal.value,
      cab.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, cab], fetchData);

const headers = [
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Finishing", key: "Finishing", minWidth: "180px" },
  {
    title: "Identifikasi",
    key: "Identifikasi",
    width: "90px",
    align: "center",
  },
  { title: "Jml SPK", key: "JmlSPK", width: "80px", align: "center" },
  { title: "Potong", key: "Potong", width: "80px", align: "center" },
  { title: "Cetak", key: "Cetak", width: "80px", align: "center" },
  { title: "Bordir", key: "Bordir", width: "80px", align: "center" },
  { title: "Jahit", key: "Jahit", width: "80px", align: "center" },
  { title: "Lipat", key: "Lipat", width: "80px", align: "center" },
];

const numFmt = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const spk = typeof v === "object" ? v.SPK : v;
    if (!spk || detailData.value[spk]) continue;
    detailLoading.value[spk] = true;
    try {
      const res = await monitoringKekuranganProduksiV2Service.getDetail(spk);
      detailData.value[spk] = res.data.data || [];
    } catch {
      detailData.value[spk] = [];
    } finally {
      detailLoading.value[spk] = false;
    }
  }
};

// ── Export flat ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  const columns: ExcelColumn[] = [
    { header: "SPK", key: "SPK", width: 16 },
    { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
    { header: "Dateline", key: "Dateline", width: 12, align: "center" },
    { header: "Cab", key: "Cab", width: 8 },
    { header: "Divisi", key: "Divisi", width: 10 },
    { header: "Tipe", key: "Tipe", width: 10 },
    { header: "Nama", key: "Nama", width: 30 },
    { header: "Finishing", key: "Finishing", width: 24 },
    { header: "Identifikasi", key: "Identifikasi", width: 12, align: "center" },
    {
      header: "Jml SPK",
      key: "JmlSPK",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Potong",
      key: "Potong",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Cetak",
      key: "Cetak",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Bordir",
      key: "Bordir",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Jahit",
      key: "Jahit",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    {
      header: "Lipat",
      key: "Lipat",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
  ];
  await exportExcelSingle(
    `Monitoring_Kekurangan_Produksi_v2_${dtAwal.value}.xlsx`,
    "Monitoring Kekurangan Produksi v2",
    columns,
    list,
    `Laporan Monitoring Kekurangan Produksi v2 — Divisi Garmen ${cab.value}`,
  );
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Laporan Monitoring Kekurangan Produksi v2"
    :menu-id="menuId"
    :icon="IconAlertTriangle"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="SPK"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">SPK dari Tanggal</span>
        <input type="date" v-model="dtAwal" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Cabang</span>
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
    <template #item.JmlSPK="{ item }">{{ numFmt(item.JmlSPK) }}</template>
    <template #item.Potong="{ item }">
      <span :class="{ 'text-kurang': Number(item.Potong) > 0 }">{{
        numFmt(item.Potong)
      }}</span>
    </template>
    <template #item.Cetak="{ item }">
      <span :class="{ 'text-kurang': Number(item.Cetak) > 0 }">{{
        numFmt(item.Cetak)
      }}</span>
    </template>
    <template #item.Bordir="{ item }">
      <span :class="{ 'text-kurang': Number(item.Bordir) > 0 }">{{
        numFmt(item.Bordir)
      }}</span>
    </template>
    <template #item.Jahit="{ item }">
      <span :class="{ 'text-kurang': Number(item.Jahit) > 0 }">{{
        numFmt(item.Jahit)
      }}</span>
    </template>
    <template #item.Lipat="{ item }">
      <span :class="{ 'text-kurang': Number(item.Lipat) > 0 }">{{
        numFmt(item.Lipat)
      }}</span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.SPK]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 90px">Lini</th>
              <th style="width: 100px">Kode</th>
              <th style="min-width: 180px">Komponen</th>
              <th style="width: 85px" class="tr">Jml SPK</th>
              <th style="width: 85px" class="tr">Mutasi</th>
              <th style="width: 85px" class="tr">Kurang</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, i) in detailData[item.SPK]"
              :key="i"
              :class="{ 'row-kurang': Number(d.Kurang) > 0 }"
            >
              <td class="font-weight-bold text-primary">{{ d.Lini }}</td>
              <td>{{ d.Kode }}</td>
              <td>{{ d.Komponen }}</td>
              <td class="tr">{{ numFmt(d.JmlSpk) }}</td>
              <td class="tr">{{ numFmt(d.Mutasi) }}</td>
              <td class="tr">{{ numFmt(d.Kurang) }}</td>
            </tr>
            <tr v-if="!detailData[item.SPK]?.length">
              <td colspan="6" class="empty-row">Tidak ada rincian komponen.</td>
            </tr>
          </tbody>
        </table>
      </div>
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
.text-kurang {
  color: #c62828;
  font-weight: 700;
}
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #555;
}
.dtl-table {
  width: 100%;
  max-width: 600px;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  overflow: hidden;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.row-kurang td {
  color: #c62828;
  font-weight: 600;
}
.tr {
  text-align: right;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
