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
  monitoringLmkpMmtService,
  type MonitoringLmkpMmtRow,
  type LmkpSummary,
} from "@/services/laporan/mmt/monitoringLmkpMmtService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  jenisIndex: "0",
});

const selectedSpk = ref("");
const showSpkPreview = ref(false);
const periodeTampil = ref({ awal: "", akhir: "" });
const summaryData = ref<LmkpSummary>({
  outputPerHari: 0,
  totalWaitingList: 0,
  estimasiSelesaiHari: 0,
});

const jenisOptions = [
  { label: "MT (Mesin Outdoor)", value: "0" },
  { label: "MX (Mesin Tekstil)", value: "1" },
  { label: "PAPERPRINT", value: "2" },
  { label: "SUBLIM (RTR)", value: "3" },
  { label: "MAKLON", value: "4" },
];

const muatData = async (): Promise<MonitoringLmkpMmtRow[]> => {
  const { dtAwal, dtAkhir, jenisIndex } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await monitoringLmkpMmtService.getReport({
    jenisIndex,
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };
  summaryData.value = res.summary;

  return res.data.map((r: any) => ({
    ...r,
    NOMOR: r.NOMOR || "-",
    spk_nama: r.spk_nama || "-",
    spk_tanggal: r.spk_tanggal || "",
    deadline: r.deadline || "",
    PANJANG: Number(r.PANJANG || 0),
    LEBAR: Number(r.LEBAR || 0),
    KAIN: r.KAIN || "-",
    FINISHING: r.FINISHING || "-",
    spk_jumlah: Number(r.spk_jumlah || 0),
    spk_jumlah_kirim: Number(r.spk_jumlah_kirim || 0),
    krg_kirim: Number(r.krg_kirim || 0),
    krg_Cetak: Number(r.krg_Cetak || 0),
    cetak_luarx: Number(r.cetak_luarx || 0),
    krg_Cetak_meter: Number(r.krg_Cetak_meter || 0),
    status: r.status || "-",
  }));
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringLmkpMmtRow>({
    menuId: "5559",
    fetchApi: muatData,
    immediate: false,
  });

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "NOMOR", title: "No. SPK", width: 130, excelWidth: 18 },
  { key: "spk_nama", title: "Nama Order", width: 230, excelWidth: 35 },
  { key: "spk_tanggal", title: "Tgl SPK", width: 95, tipe: "date" },
  { key: "deadline", title: "Deadline", width: 95, tipe: "date" },
  { key: "PANJANG", title: "Panjang", group: "Ukuran", width: 75, tipe: "number" },
  { key: "LEBAR", title: "Lebar", group: "Ukuran", width: 75, tipe: "number" },
  { key: "KAIN", title: "Bahan / Kain", width: 120 },
  { key: "FINISHING", title: "Finishing", width: 110 },
  {
    key: "spk_jumlah",
    title: "Order PCS",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "spk_jumlah_kirim",
    title: "Kirim PCS",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "krg_kirim",
    title: "Krg Kirim",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "krg_Cetak",
    title: "Krg Cetak",
    width: 85,
    tipe: "number",
    total: true,
    sorotPositif: true,
    negativeRed: true,
  },
  {
    key: "cetak_luarx",
    title: "Ctk Luar",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "krg_Cetak_meter",
    title: "Krg Cetak (Mtr)",
    width: 100,
    tipe: "number",
    total: true,
    sorotPositif: true,
  },
  { key: "status", title: "Status", width: 75, align: "center" },
];

const tableRef = ref<LaporanTableApi | null>(null);

const onRowDblClick = (row: MonitoringLmkpMmtRow) => {
  const spk = (row.NOMOR || "").trim();
  if (spk && spk !== "-") {
    selectedSpk.value = spk;
    showSpkPreview.value = true;
  }
};

const bukaPrint = () => {
  const { dtAwal, dtAkhir, jenisIndex } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    jenisIndex,
  });
  window.open(
    `/laporan/produksi-mmt/monitoring-lmkp/print?${p.toString()}`,
    "_blank",
  );
};

const jenisLabel = computed(() => {
  const opt = jenisOptions.find((o) => o.value === filterState.value.jenisIndex);
  return opt ? opt.label : "MT";
});

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan Monitoring LMKP (${jenisLabel.value}) Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return `Laporan Monitoring LMKP - ${jenisLabel.value}`;
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Monitoring_LMKP_MMT_${jenisLabel.value}_${awal}_sd_${akhir}`,
    sheetName: "lmkp_mmt",
    judul: `LAPORAN MONITORING LMKP MMT - ${jenisLabel.value.toUpperCase()}`,
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
    menu-id="5559"
    storage-id="mmt-monitoring-lmkp"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="NOMOR"
    search-placeholder="Cari SPK, order, finishing, kain..."
    satuan="spk"
    @refresh="fetchData"
    @export="onExport"
    @row-dblclick="onRowDblClick"
  >
    <template #extra-actions>
      <div class="d-flex align-center ga-2 mr-3 kpi-summary-box">
        <span class="kpi-label">Output/Hari:</span>
        <span class="kpi-val">{{ summaryData.outputPerHari }}</span>
        <span class="kpi-sep">|</span>
        <span class="kpi-label">Waiting List:</span>
        <span class="kpi-val text-red-darken-2 font-weight-bold">{{ summaryData.totalWaitingList }}</span>
        <span class="kpi-sep">|</span>
        <span class="kpi-label">Est. Selesai:</span>
        <span class="kpi-val text-primary font-weight-bold">{{ summaryData.estimasiSelesaiHari }} Hari</span>
      </div>

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
        <span class="f-label">Kategori</span>
        <select
          v-model="filterState.jenisIndex"
          class="f-inp f-select"
          @change="fetchData"
        >
          <option
            v-for="opt in jenisOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="f-group">
        <span class="f-label">Periode</span>
        <input v-model="filterState.dtAwal" type="date" class="f-inp" />
        <span class="f-sep">s/d</span>
        <input v-model="filterState.dtAkhir" type="date" class="f-inp" />
      </div>

      <div class="d-flex align-center text-grey-darken-1 ga-1 ml-2" style="font-size: 11px">
        <IconInfoCircle :size="14" class="text-info" />
        <span>Double-click baris untuk preview SPK.</span>
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
.f-select {
  height: 28px;
  padding: 0 6px;
}
.kpi-summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
}
.kpi-label {
  color: #64748b;
  font-weight: 500;
}
.kpi-val {
  color: #1e293b;
  font-weight: 600;
}
.kpi-sep {
  color: #cbd5e1;
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
