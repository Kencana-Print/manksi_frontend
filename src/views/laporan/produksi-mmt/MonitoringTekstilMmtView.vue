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
  monitoringTekstilMmtService,
  type MonitoringTekstilMmtRow,
} from "@/services/laporan/mmt/monitoringTekstilMmtService";

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

const muatData = async (): Promise<MonitoringTekstilMmtRow[]> => {
  const { dtAwal, dtAkhir, perusahaanKode } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await monitoringTekstilMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  let data = raw.map((r: any) => ({
    ...r,
    spk_perush_kode: r.spk_perush_kode || "-",
    spk_tanggal: r.spk_tanggal || "",
    spk_dateline: r.spk_dateline || "",
    spk_nomor: r.spk_nomor || "",
    spk_nama: r.spk_nama || "-",
    spk_panjang: Number(r.spk_panjang || 0),
    spk_lebar: Number(r.spk_lebar || 0),
    spk_jumlah: Number(r.spk_jumlah || 0),
    order_meter: Number(r.order_meter || 0),
    spk_kain: r.spk_kain || "-",
    jmlkurang: Number(r.jmlkurang || 0),
    mx01: Number(r.mx01 || 0),
    mx02: Number(r.mx02 || 0),
    mx03: Number(r.mx03 || 0),
    jmlcetak: Number(r.jmlcetak || 0),
    jmx01: Number(r.jmx01 || 0),
    jmx02: Number(r.jmx02 || 0),
    jmx03: Number(r.jmx03 || 0),
    cetak_meter: Number(r.cetak_meter || 0),
    Tanggal_LHK: r.Tanggal_LHK || "-",
  }));

  if (perusahaanKode) {
    const k = perusahaanKode.toLowerCase();
    data = data.filter((d: any) =>
      String(d.spk_perush_kode).toLowerCase().includes(k),
    );
  }

  return data;
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringTekstilMmtRow>({
    menuId: "5552",
    fetchApi: muatData,
    immediate: false,
  });

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "spk_perush_kode", title: "Perusahaan", width: 110, excelWidth: 15 },
  { key: "spk_tanggal", title: "Tgl SPK", width: 95, tipe: "date" },
  { key: "spk_dateline", title: "Deadline", width: 95, tipe: "date" },
  { key: "spk_nama", title: "Nama Order", width: 240, excelWidth: 40 },
  { key: "spk_panjang", title: "Panjang", group: "Ukuran", width: 75, tipe: "number" },
  { key: "spk_lebar", title: "Lebar", group: "Ukuran", width: 75, tipe: "number" },
  { key: "spk_nomor", title: "No SPK", width: 130, excelWidth: 18 },
  {
    key: "spk_jumlah",
    title: "PCS",
    group: "Order SPK",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "order_meter",
    title: "Meter",
    group: "Order SPK",
    width: 85,
    tipe: "number",
    total: true,
  },
  { key: "spk_kain", title: "Jenis Kain", width: 130, excelWidth: 20 },
  {
    key: "jmlkurang",
    title: "Kurang",
    width: 80,
    tipe: "number",
    total: true,
    sorotPositif: true,
    negativeRed: true,
  },
  {
    key: "mx01",
    title: "MX01",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "mx02",
    title: "MX02",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "mx03",
    title: "MX03",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "jmlcetak",
    title: "Total PCS",
    group: "Hasil Cetak (PCS)",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "jmx01",
    title: "MX01",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "jmx02",
    title: "MX02",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "jmx03",
    title: "MX03",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "cetak_meter",
    title: "Total Meter",
    group: "Hasil Cetak (Meter)",
    width: 85,
    tipe: "number",
    total: true,
  },
  { key: "Tanggal_LHK", title: "Tgl LHK", width: 95, tipe: "date" },
];

const tableRef = ref<LaporanTableApi | null>(null);

const onRowDblClick = (row: MonitoringTekstilMmtRow) => {
  const spk = (row.spk_nomor || "").trim();
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
    `/laporan/produksi-mmt/monitoring-tekstil/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan Monitoring Tekstil MMT Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan Monitoring Tekstil MMT";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Monitoring_Tekstil_MMT_${awal}_sd_${akhir}`,
    sheetName: "tekstil_mmt",
    judul: "LAPORAN MONITORING TEKSTIL MMT",
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
    menu-id="5552"
    storage-id="mmt-monitoring-tekstil"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="spk_nomor"
    search-placeholder="Cari SPK, order, jenis kain..."
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
