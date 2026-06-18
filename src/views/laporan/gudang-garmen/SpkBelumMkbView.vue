<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkBelumMkbService } from "@/services/laporan/gudang-garmen/spkBelumMkbService";
import { IconFileAlert } from "@tabler/icons-vue";

// Import utility Excel baru Anda
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const menuId = "510";

// Default awal bulan
const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const filterState = ref({
  startDate: getStartOfMonth(),
});

// Kolom tabel di layar (sesuai referensi Delphi)
const headers = [
  { title: "No. SPK", key: "SPK", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "Div", key: "Divisi", width: "60px", align: "center" },
  { title: "Tipe", key: "Tipe", width: "100px" },
  { title: "Cabang", key: "spk_cab", width: "80px", align: "center" },
  { title: "Workshop", key: "Workshop", width: "120px" },
  { title: "Nama Pekerjaan / SPK", key: "NamaSpk", minWidth: "250px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Ukuran", key: "ukuran", width: "120px" },
  { title: "Kain", key: "Kain", minWidth: "150px" },
  { title: "Finishing", key: "Finishing", minWidth: "150px" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkBelumMkbService.getBrowse(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

// ── CUSTOM EXPORT MENGGUNAKAN exportExcelSingle ──
const isExporting = ref(false);

const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExporting.value = true;

  try {
    // 1. Definisikan susunan & lebar kolom Excel
    const excelCols: ExcelColumn[] = [
      { header: "No. SPK", key: "SPK", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 10, align: "center" },
      { header: "Tipe", key: "Tipe", width: 15 },
      { header: "Cabang", key: "spk_cab", width: 12, align: "center" },
      { header: "Workshop", key: "Workshop", width: 18 },
      { header: "Nama SPK", key: "NamaSpk", width: 45 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Ukuran", key: "ukuran", width: 15 },
      { header: "Kain", key: "Kain", width: 25 },
      { header: "Finishing", key: "Finishing", width: 25 },
    ];

    // 2. Format baris data (pastikan angka dikonversi jadi Number agar format Excel jalan)
    const rowsData = items.value.map((r: any) => ({
      ...r,
      Jumlah: Number(r.Jumlah) || 0,
    }));

    // 3. Panggil utilitas exportExcelSingle
    await exportExcelSingle(
      `Laporan_SPK_Belum_MKB_${filterState.value.startDate}.xlsx`,
      "SPK Belum MKB",
      excelCols,
      rowsData,
      `DAFTAR SPK BELUM ADA MKB (Mulai Tanggal: ${filterState.value.startDate.split("-").reverse().join("/")})`,
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
    title="Laporan SPK Belum Ada MKB"
    :menu-id="menuId"
    :icon="IconFileAlert"
    :headers="headers"
    :items="items ?? []"
    item-value="SPK"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    :can-export="canExport"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">SPK Mulai Tgl</span>
        <input
          type="date"
          v-model="filterState.startDate"
          class="f-date"
          @change="fetchData"
        />
      </div>
      <div class="f-divider" />
    </template>

    <template #item.Jumlah="{ item }">
      <span class="font-weight-bold text-primary">{{
        fmtNum(item.Jumlah)
      }}</span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── UI Filter Standar ── */
.f-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}
</style>
