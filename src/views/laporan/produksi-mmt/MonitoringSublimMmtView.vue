<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import LaporanTable from "@/components/laporan/LaporanTable.vue";
import type {
  LaporanKolom,
  LaporanTableApi,
} from "@/components/laporan/laporanTypes";
import SpkPreviewDialog from "@/components/laporan/SpkPreviewDialog.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import { useBrowse } from "@/composables/useBrowse";
import { formatTanggal } from "@/utils/dateFormat";
import { IconPrinter, IconSearch, IconX, IconInfoCircle } from "@tabler/icons-vue";
import {
  monitoringSublimMmtService,
  type MonitoringSublimMmtRow,
} from "@/services/laporan/mmt/monitoringSublimMmtService";

const toast = useToast();

interface PerusahaanPilihan {
  perush_kode: string;
  perush_nama: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
  perusahaanKode: "",
  perusahaanNama: "",
});
const showPerusahaan = ref(false);

const selectedSpk = ref("");
const showSpkPreview = ref(false);

const onPerusahaanDipilih = (p: PerusahaanPilihan) => {
  filterState.value = {
    ...filterState.value,
    perusahaanKode: p.perush_kode,
    perusahaanNama: p.perush_nama,
  };
};

const kosongkanPerusahaan = () => {
  filterState.value = {
    ...filterState.value,
    perusahaanKode: "",
    perusahaanNama: "",
  };
};

const periodeTampil = ref({ awal: "", akhir: "" });

const muatData = async (): Promise<MonitoringSublimMmtRow[]> => {
  const { dtAwal, dtAkhir, perusahaanKode } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const raw = await monitoringSublimMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  let data = raw.map((r: any) => ({
    ...r,
    PERUSH: r.PERUSH || "-",
    NO_SPK: r.NO_SPK || "",
    NAMA_ORDER: r.NAMA_ORDER || "-",
    TGL_SPK: r.TGL_SPK || "",
    DEADLINE: r.DEADLINE || "",
    PANJANG: Number(r.PANJANG || 0),
    LEBAR: Number(r.LEBAR || 0),
    ORDER_SPK_PCS: Number(r.ORDER_SPK_PCS || 0),
    ORDER_METER: Number(r.ORDER_METER || 0),
    JML_SUBLIM_TOTAL: Number(r.JML_SUBLIM_TOTAL || 0),
    MTR_SUBLIM_TOTAL: Number(r.MTR_SUBLIM_TOTAL || 0),
    KURANG_SUBLIM: Number(r.KURANG_SUBLIM || 0),
    NO_LHK: r.NO_LHK || "-",
    TANGGAL_LHK: r.TANGGAL_LHK || "-",
  }));

  if (perusahaanKode) {
    const k = perusahaanKode.toLowerCase();
    data = data.filter((d: any) => String(d.PERUSH).toLowerCase().includes(k));
  }

  return data;
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringSublimMmtRow>({
    menuId: "5554",
    fetchApi: muatData,
    immediate: false,
  });

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "PERUSH", title: "Perusahaan", width: 110, excelWidth: 15 },
  { key: "TGL_SPK", title: "Tgl SPK", width: 95, tipe: "date" },
  { key: "DEADLINE", title: "Deadline", width: 95, tipe: "date" },
  { key: "NAMA_ORDER", title: "Nama Order", width: 240, excelWidth: 40 },
  { key: "PANJANG", title: "Panjang", group: "Ukuran", width: 75, tipe: "number" },
  { key: "LEBAR", title: "Lebar", group: "Ukuran", width: 75, tipe: "number" },
  { key: "NO_SPK", title: "No SPK", width: 130, excelWidth: 18 },
  {
    key: "ORDER_SPK_PCS",
    title: "PCS",
    group: "Order SPK",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "ORDER_METER",
    title: "Meter",
    group: "Order SPK",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "JML_SUBLIM_TOTAL",
    title: "PCS",
    group: "Hasil Sublim",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "MTR_SUBLIM_TOTAL",
    title: "Meter",
    group: "Hasil Sublim",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "KURANG_SUBLIM",
    title: "Kurang",
    width: 80,
    tipe: "number",
    total: true,
    sorotPositif: true,
    negativeRed: true,
  },
  { key: "NO_LHK", title: "No LHK", width: 120 },
  { key: "TANGGAL_LHK", title: "Tgl LHK", width: 95, tipe: "date" },
];

const tableRef = ref<LaporanTableApi | null>(null);

const onRowDblClick = (row: MonitoringSublimMmtRow) => {
  const spk = (row.NO_SPK || "").trim();
  if (spk && spk !== "-") {
    selectedSpk.value = spk;
    showSpkPreview.value = true;
  }
};

const bukaPrint = () => {
  const { dtAwal, dtAkhir, perusahaanKode } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    ...(perusahaanKode ? { perusahaan: perusahaanKode } : {}),
  });
  window.open(
    `/laporan/produksi-mmt/monitoring-sublim/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan Monitoring Sublim / RTR Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan Monitoring Sublim / RTR";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Monitoring_Sublim_RTR_MMT_${awal}_sd_${akhir}`,
    sheetName: "sublim_rtr_mmt",
    judul: "LAPORAN MONITORING SUBLIM / RTR MMT",
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
    menu-id="5554"
    storage-id="mmt-monitoring-sublim"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="NO_SPK"
    search-placeholder="Cari SPK, perusahaan, order..."
    satuan="spk"
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

      <div class="f-group">
        <span class="f-label">Perusahaan</span>
        <input
          :value="filterState.perusahaanKode"
          readonly
          class="f-inp f-kode"
          placeholder="SEMUA"
          @click="showPerusahaan = true"
        />
        <button
          type="button"
          class="f-ic"
          title="Pilih perusahaan"
          @click="showPerusahaan = true"
        >
          <IconSearch :size="14" :stroke-width="1.8" />
        </button>
        <input
          :value="filterState.perusahaanNama"
          readonly
          class="f-inp f-nama"
          placeholder="Semua Perusahaan"
        />
        <button
          v-if="filterState.perusahaanKode"
          type="button"
          class="f-ic"
          title="Kosongkan perusahaan"
          @click="kosongkanPerusahaan"
        >
          <IconX :size="14" :stroke-width="1.8" />
        </button>
      </div>

      <div class="d-flex align-center text-grey-darken-1 ga-1 ml-2" style="font-size: 11px">
        <IconInfoCircle :size="14" class="text-info" />
        <span>Double-click baris untuk preview SPK.</span>
      </div>

      <PerusahaanSearchModal
        v-model="showPerusahaan"
        @selected="onPerusahaanDipilih"
      />
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
.f-kode {
  width: 75px;
  cursor: pointer;
}
.f-nama {
  width: 170px;
}
.f-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  color: #444;
}
.f-ic:hover {
  background: #e9e9e9;
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
