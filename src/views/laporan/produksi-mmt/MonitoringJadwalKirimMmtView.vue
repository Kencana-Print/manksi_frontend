<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import SpkPreviewDialog from "@/components/laporan/SpkPreviewDialog.vue";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter, IconInfoCircle } from "@tabler/icons-vue";
import {
  monitoringJadwalKirimMmtService,
  type MonitoringJadwalKirimMmtRow,
} from "@/services/laporan/mmt/monitoringJadwalKirimMmtService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
});

const selectedSpk = ref("");
const showSpkPreview = ref(false);
const periodeTampil = ref({ awal: "", akhir: "" });

const muatData = async (): Promise<MonitoringJadwalKirimMmtRow[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const raw = await monitoringJadwalKirimMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  return raw.map((r: any) => ({
    ...r,
    Nomor: r.Nomor || "-",
    Gudang: r.Nama_Gudang || r.Gudang || "-",
    Tanggal: r.Tanggal || "",
    No_SPK: r.No_SPK || "-",
    Nama_Spk: r.Nama_Spk || "-",
    Panjang: Number(r.Panjang || 0),
    Lebar: Number(r.Lebar || 0),
    Kain: r.Kain || "-",
    Jumlah: Number(r.Jumlah || 0),
    Jumlah_Meter: Number(r.Jumlah_Meter || 0),
    Koli: Number(r.Koli || 0),
    Realisasi: Number(r.Realisasi || 0),
    Koli_Realisasi: Number(r.Koli_Realisasi || 0),
    Selisih_Jumlah: Number(r.Selisih_Jumlah || 0),
    Selisih_Koli: Number(r.Selisih_Koli || 0),
    JmlCetakLuar: Number(r.JmlCetakLuar || 0),
    Sup: r.sup_nama || r.Sup || "-",
    usr_create: r.usr_create || "-",
    details: Array.isArray(r.details) ? r.details : [],
  }));
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringJadwalKirimMmtRow>({
    menuId: "5558",
    fetchApi: muatData,
    immediate: false,
  });

onMounted(() => fetchData());

const masterKolom: LaporanKolom[] = [
  { key: "Nomor", title: "No. Kirim", width: 130, excelWidth: 18 },
  { key: "No_SPK", title: "No. SPK", width: 130, excelWidth: 18 },
  { key: "Nama_Spk", title: "Nama Order", width: 220, excelWidth: 35 },
  { key: "Tanggal", title: "Tanggal", width: 95, tipe: "date" },
  { key: "Gudang", title: "Gudang", width: 110 },
  { key: "Kain", title: "Kain / Bahan", width: 120 },
  { key: "Panjang", title: "Panjang", group: "Ukuran", width: 75, tipe: "number" },
  { key: "Lebar", title: "Lebar", group: "Ukuran", width: 75, tipe: "number" },
  {
    key: "Jumlah",
    title: "PCS",
    group: "Order",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "Jumlah_Meter",
    title: "Meter",
    group: "Order",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "Realisasi",
    title: "Realisasi",
    group: "Pengiriman",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "Selisih_Jumlah",
    title: "Selisih",
    group: "Pengiriman",
    width: 80,
    tipe: "number",
    total: true,
    negativeRed: true,
  },
  {
    key: "Koli",
    title: "Koli",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "JmlCetakLuar",
    title: "Ctk Luar",
    width: 80,
    tipe: "number",
    total: true,
  },
  { key: "Sup", title: "Supplier", width: 140 },
  { key: "usr_create", title: "User", width: 85, align: "center" },
];

const detailKolom: LaporanKolom[] = [
  { key: "No_urut", title: "Urut", width: 50, align: "center" },
  { key: "Kota", title: "Kota", width: 120 },
  { key: "Uraian", title: "Uraian / Ukuran", width: 220 },
  { key: "Size", title: "Size", width: 70, align: "center" },
  { key: "Jumlah", title: "Jumlah", width: 80, tipe: "number", total: true },
  { key: "Koli", title: "Koli", width: 70, tipe: "number", total: true },
  { key: "Jam Input", title: "Jam Input", width: 90, align: "center" },
  { key: "Jam Brg Ready", title: "Jam Ready", width: 90, align: "center" },
  { key: "Nomor SJ", title: "No. SJ", width: 120 },
  { key: "Realisasi Kirim", title: "Realisasi", width: 80, tipe: "number", total: true },
  { key: "Jam_Kirim", title: "Jam Kirim", width: 85, align: "center" },
  { key: "Jam_Ambil", title: "Jam Ambil", width: 85, align: "center" },
  { key: "Expedisi", title: "Ekspedisi", width: 140 },
];

const tableRef = ref<LaporanTableApi | null>(null);

const onRowDblClick = (row: MonitoringJadwalKirimMmtRow) => {
  const spk = (row.No_SPK || "").trim();
  if (spk && spk !== "-") {
    selectedSpk.value = spk;
    showSpkPreview.value = true;
  }
};

const bukaPrint = () => {
  const { dtAwal, dtAkhir } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
  });
  window.open(
    `/laporan/produksi-mmt/monitoring-jadwal-kirim/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan Jadwal Kirim Gudang (WH-010) Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan Jadwal Kirim Gudang (WH-010)";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Laporan_Jadwal_Kirim_WH010_${awal}_sd_${akhir}`,
    sheetName: "jadwalkirim_wh010",
    judul: "LAPORAN JADWAL KIRIM GUDANG (WH-010)",
    periode:
      awal && akhir
        ? `Periode: ${formatTanggal(awal)} s.d ${formatTanggal(akhir)}`
        : undefined,
  });
};
</script>

<template>
  <LaporanTable
    ref="tableRef"
    v-model:filter-state="filterState"
    :title="judulLaporan"
    menu-id="5558"
    storage-id="mmt-monitoring-jadwal-kirim"
    :columns="masterKolom"
    :detail-columns="detailKolom"
    detail-key="details"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="Nomor"
    search-placeholder="Cari no. kirim, SPK, order, supplier..."
    satuan="kiriman"
    @refresh="fetchData"
    @export="onExport"
    @row-dblclick="onRowDblClick"
  >
    <template #extra-actions>
      <button
        type="button"
        class="lap-btn lap-btn-print"
        title="Buka halaman cetak laporan"
        @click="bukaPrint"
      >
        <IconPrinter :size="14" :stroke-width="1.8" />
        <span>Cetak</span>
      </button>
    </template>

    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input v-model="filterState.dtAwal" type="date" class="f-inp" />
        <span class="f-sep">s/d</span>
        <input v-model="filterState.dtAkhir" type="date" class="f-inp" />
      </div>

      <div class="d-flex align-center text-grey-darken-1 ga-1 ml-2" style="font-size: 11px">
        <IconInfoCircle :size="14" class="text-info" />
        <span>Klik tanda panah di baris untuk membuka rincian barang ready & ekspedisi.</span>
      </div>
    </template>
  </LaporanTable>

  <SpkPreviewDialog
    v-model="showSpkPreview"
    :no-spk="selectedSpk"
  />
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
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.lap-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
  color: #333;
}
.lap-btn-print:hover {
  background: #f0f7ff;
  border-color: #1976d2;
  color: #1976d2;
}
</style>
