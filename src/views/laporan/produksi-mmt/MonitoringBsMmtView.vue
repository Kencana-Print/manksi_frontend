<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter } from "@tabler/icons-vue";
import {
  monitoringBsMmtService,
  type MonitoringBsMmtRow,
  type MonitoringBsMmtSummary,
} from "@/services/laporan/mmt/monitoringBsMmtService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  type: "ALL",
});

const periodeTampil = ref({ awal: "", akhir: "" });
const summaryData = ref<MonitoringBsMmtSummary | null>(null);

const muatData = async (): Promise<MonitoringBsMmtRow[]> => {
  const { dtAwal, dtAkhir, type } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await monitoringBsMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
    type: type !== "ALL" ? type : undefined,
  });

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };
  summaryData.value = res.summary || null;

  return (res.data || []).map((r: any) => ({
    ...r,
    Modul: r.Modul || "-",
    Nomor_LHK: r.Nomor_LHK || "-",
    Tanggal: r.Tanggal || "",
    Operator: r.Operator || "-",
    Mesin: r.Mesin || "-",
    Brg_Kode: r.Brg_Kode || "-",
    Brg_Nama: r.Brg_Nama || "-",
    Barcode: r.Barcode || "-",
    Panjang_BS: Number(r.Panjang_BS || 0),
    Lebar_BS: Number(r.Lebar_BS || 0),
    Jumlah_BS: Number(r.Jumlah_BS || 0),
    Luas_BS_M2: Number(r.Luas_BS_M2 || 0),
    Status: r.Status || "-",
  }));
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringBsMmtRow>({
    menuId: "5557",
    fetchApi: muatData,
    immediate: false,
  });

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "Modul", title: "Divisi / Modul", width: 140, excelWidth: 20 },
  { key: "Nomor_LHK", title: "No LHK", width: 130, excelWidth: 18 },
  { key: "Tanggal", title: "Tanggal", width: 95, tipe: "date" },
  { key: "Operator", title: "Operator", width: 120 },
  { key: "Mesin", title: "Mesin", width: 110 },
  { key: "Brg_Kode", title: "Kode Bahan", width: 110 },
  { key: "Brg_Nama", title: "Nama Bahan / SPK", width: 240, excelWidth: 40 },
  { key: "Barcode", title: "Barcode", width: 110 },
  { key: "Panjang_BS", title: "Panjang", group: "Dimensi BS", width: 75, tipe: "number" },
  { key: "Lebar_BS", title: "Lebar", group: "Dimensi BS", width: 75, tipe: "number" },
  {
    key: "Jumlah_BS",
    title: "Qty BS",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "Luas_BS_M2",
    title: "Luas (m²)",
    width: 90,
    tipe: "number",
    total: true,
  },
  { key: "Status", title: "Status", width: 85, align: "center" },
];

const tableRef = ref<LaporanTableApi | null>(null);

const bukaPrint = () => {
  const { dtAwal, dtAkhir, type } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    ...(type && type !== "ALL" ? { type } : {}),
  });
  window.open(
    `/laporan/produksi-mmt/monitoring-bs/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan BS & Afal Produksi Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan BS & Afal Produksi";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Laporan_BS_Afal_Produksi_${awal}_sd_${akhir}`,
    sheetName: "bs_afal_mmt",
    judul: "LAPORAN BS & AFAL PRODUKSI MMT",
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
    menu-id="5557"
    storage-id="mmt-monitoring-bs"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="Nomor_LHK"
    search-placeholder="Cari LHK, bahan, operator, mesin..."
    satuan="baris"
    @refresh="fetchData"
    @export="onExport"
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

      <div class="f-group">
        <span class="f-label">Tipe LHK</span>
        <select v-model="filterState.type" class="f-inp f-select">
          <option value="ALL">SEMUA MODUL</option>
          <option value="MMT">Mesin Cetak MMT</option>
          <option value="TEKSTIL">Mesin Tekstil</option>
          <option value="FINISHING">Finishing MMT</option>
          <option value="PAPERPRINT">Paperprint / Sublim Paper</option>
          <option value="SUBLIM">Sublim RTR</option>
        </select>
      </div>
    </template>
  </LaporanTable>
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
.f-select {
  height: 28px;
  padding: 0 6px;
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
