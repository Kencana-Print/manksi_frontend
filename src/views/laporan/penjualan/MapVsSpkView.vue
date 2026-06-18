<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mapVsSpkService } from "@/services/laporan/penjualan/mapVsSpkService";
import api from "@/services/api";
import { IconClipboardList } from "@tabler/icons-vue";

// ── UTILITAS EXPORT EXCELJS ──
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const menuId = "308";

// ── SETUP FILTER ──
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .substring(0, 10);
const todayString = today.toISOString().substring(0, 10);

const filters = ref({
  startDate: firstDayOfMonth,
  endDate: todayString,
  divisi: "0",
});

const divisiOptions = ref<any[]>([]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { kode: "0", nama: "ALL" },
      ...res.data.data.map((d: any) => ({
        kode: d.kode,
        nama: `${d.kode} - ${d.nama}`,
      })),
    ];
  } catch {
    divisiOptions.value = [{ kode: "0", nama: "ALL" }];
  }
};

// ── BROWSE HOOK ──
const headers = [
  { title: "Nomor MAP", key: "Nomor", width: "160px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px", align: "center" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Nama Pekerjaan", key: "Nama", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", width: "100px" },
  { title: "Jenis", key: "Jenis", width: "80px", align: "center" },
  { title: "Kain", key: "Kain", minWidth: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "80px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "80px", align: "right" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "Sales", key: "Sales", width: "110px" },
  { title: "No. Penawaran", key: "No_Penawaran", width: "160px" },
  { title: "No. SPK", key: "SPK", width: "160px" },
  { title: "Nama SPK", key: "Nama_SPK", minWidth: "220px" },
  { title: "Harga", key: "Harga", width: "110px", align: "right" },
  { title: "Jml Order", key: "Jumlah_Order", width: "100px", align: "right" },
  { title: "Nilai", key: "Nilai", width: "130px", align: "right" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await mapVsSpkService.getBrowse(filters.value);
    return res.data.data;
  },
  immediate: false,
});

onMounted(async () => {
  await loadDivisi();
  fetchData();
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.divisi,
  ],
  fetchData,
);

// ── EXPORT EXCEL ──
const isExporting = ref(false);
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;
  try {
    const excelCols: ExcelColumn[] = [
      { header: "Nomor MAP", key: "Nomor", width: 22 },
      { header: "Tanggal MAP", key: "Tanggal", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 15 },
      { header: "Customer", key: "NamaCustomer", width: 35 },
      { header: "Nama Pekerjaan", key: "Nama", width: 35 },
      { header: "Ukuran", key: "Ukuran", width: 15 },
      { header: "Jenis", key: "Jenis", width: 10, align: "center" },
      { header: "Kain", key: "Kain", width: 25 },
      {
        header: "Jml MAP",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jml Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Sales", key: "Sales", width: 20 },
      { header: "No. Penawaran", key: "No_Penawaran", width: 22 },
      { header: "No. SPK", key: "SPK", width: 22 },
      { header: "Nama SPK", key: "Nama_SPK", width: 35 },
      {
        header: "Harga",
        key: "Harga",
        width: 15,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jml Order",
        key: "Jumlah_Order",
        width: 15,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Total Nilai",
        key: "Nilai",
        width: 20,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    // Konversi nilai string ke Number agar format Excel numFmt bisa mendeteksi sebagai angka
    const rowsData = items.value.map((r: any) => ({
      ...r,
      Jumlah: Number(r.Jumlah) || 0,
      Kirim: Number(r.Kirim) || 0,
      Harga: Number(r.Harga) || 0,
      Jumlah_Order: Number(r.Jumlah_Order) || 0,
      Nilai: Number(r.Nilai) || 0,
    }));

    await exportExcelSingle(
      `Laporan_MAP_vs_SPK_${filters.value.startDate}_sd_${filters.value.endDate}.xlsx`,
      "Data MAP vs SPK",
      excelCols,
      rowsData,
      `LAPORAN MAP vs SPK (${filters.value.startDate} s/d ${filters.value.endDate})`,
    );
  } catch (error) {
    toast.error("Gagal melakukan export data ke Excel.");
  } finally {
    isExporting.value = false;
  }
};

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));
</script>

<template>
  <BaseBrowse
    title="Laporan MAP vs SPK"
    :menu-id="menuId"
    :icon="IconClipboardList"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    v-model:filter-state="filters"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filters.divisi" class="f-select">
          <option
            v-for="opt in divisiOptions"
            :key="opt.kode"
            :value="opt.kode"
          >
            {{ opt.nama }}
          </option>
        </select>
      </div>
    </template>

    <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
    <template #item.Kirim="{ item }">
      <span class="text-primary">{{ fmtNum(item.Kirim) }}</span>
    </template>
    <template #item.Harga="{ item }">{{ fmtNum(item.Harga) }}</template>
    <template #item.Jumlah_Order="{ item }">
      <span class="font-weight-bold">{{ fmtNum(item.Jumlah_Order) }}</span>
    </template>
    <template #item.Nilai="{ item }">
      <span class="font-weight-bold text-success">{{
        fmtNum(item.Nilai)
      }}</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── UI Filter Standar ── */
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
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus,
.f-select:focus {
  border-color: #1565c0;
}
.f-select {
  font-weight: 600;
  min-width: 140px;
}
</style>
