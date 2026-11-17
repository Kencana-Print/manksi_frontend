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
  monitoringCetakMmtService,
  type MonitoringCetakMmtRow,
} from "@/services/laporan/mmt/monitoringCetakMmtService";

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
  jenis: "SEMUA",
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

const muatData = async (): Promise<MonitoringCetakMmtRow[]> => {
  const { dtAwal, dtAkhir, perusahaanKode, jenis } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const res = await monitoringCetakMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  let data = raw.map((r: any) => {
    const noSpk = r.NO_SPK || r.noSpk || "";
    let extractedJenis = "-";
    if (noSpk.length >= 5) {
      extractedJenis = noSpk.substring(3, 5);
    }
    return {
      ...r,
      PERUSH: r.PERUSH || r.perush || "-",
      TGL_SPK: r.TGL_SPK || r.tglSpk || "",
      DEADLINE: r.DEADLINE || r.deadline || "",
      NAMA_ORDER: r.NAMA_ORDER || r.namaOrder || "-",
      NO_SPK: noSpk,
      PANJANG: Number(r.PANJANG || r.panjang || 0),
      LEBAR: Number(r.LEBAR || r.lebar || 0),
      ORDER_SPK_PCS: Number(r.ORDER_SPK_PCS || r.pcs || 0),
      ORDER_SPK_METER: Number(r.ORDER_SPK_METER || r.order_meter || 0),
      JENIS: r.JENIS || r.jenis || extractedJenis,
      PCS_MT01: Number(r.PCS_MT01 || r.mt01 || 0),
      PCS_MT02: Number(r.PCS_MT02 || r.mt02 || 0),
      PCS_MT03: Number(r.PCS_MT03 || r.mt03 || 0),
      PCS_MT04: Number(r.PCS_MT04 || r.mt04 || 0),
      PCS_MT05: Number(r.PCS_MT05 || r.mt05 || 0),
      CETAK_LUAR: Number(r.CETAK_LUAR || r.cetak_luar || 0),
      JUMLAH_PCS: Number(r.JUMLAH_PCS || r.total_qty || 0),
      METER_MT01: Number(r.METER_MT01 || r.jmt01 || 0),
      METER_MT02: Number(r.METER_MT02 || r.jmt02 || 0),
      METER_MT03: Number(r.METER_MT03 || r.jmt03 || 0),
      METER_MT04: Number(r.METER_MT04 || r.jmt04 || 0),
      METER_MT05: Number(r.METER_MT05 || r.jmt05 || 0),
      JUMLAH_METER: Number(r.JUMLAH_METER || r.total_meter || 0),
      KURANG_VARIANT: Number(r.KURANG_VARIANT || r.jmlkurang || 0),
      TANGGAL_LHK: r.TANGGAL_LHK || r.tglLhk || "-",
    };
  });

  if (perusahaanKode) {
    const k = perusahaanKode.toLowerCase();
    data = data.filter((d: any) => String(d.PERUSH).toLowerCase().includes(k));
  }
  if (jenis && jenis !== "SEMUA") {
    data = data.filter((d: any) => String(d.JENIS).toUpperCase() === jenis.toUpperCase());
  }

  return data;
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringCetakMmtRow>({
    menuId: "5551",
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
    key: "ORDER_SPK_METER",
    title: "Meter",
    group: "Order SPK",
    width: 85,
    tipe: "number",
    total: true,
  },
  { key: "JENIS", title: "Jenis", width: 65, align: "center" },
  {
    key: "PCS_MT01",
    title: "MT01",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "PCS_MT02",
    title: "MT02",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "PCS_MT03",
    title: "MT03",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "PCS_MT04",
    title: "MT04",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "PCS_MT05",
    title: "MT05",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "CETAK_LUAR",
    title: "Luar",
    group: "Hasil Cetak (PCS)",
    width: 70,
    tipe: "number",
    total: true,
  },
  {
    key: "JUMLAH_PCS",
    title: "Total PCS",
    group: "Hasil Cetak (PCS)",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "METER_MT01",
    title: "MT01",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "METER_MT02",
    title: "MT02",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "METER_MT03",
    title: "MT03",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "METER_MT04",
    title: "MT04",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "METER_MT05",
    title: "MT05",
    group: "Hasil Cetak (Meter)",
    width: 75,
    tipe: "number",
    total: true,
  },
  {
    key: "JUMLAH_METER",
    title: "Total Meter",
    group: "Hasil Cetak (Meter)",
    width: 85,
    tipe: "number",
    total: true,
  },
  {
    key: "KURANG_VARIANT",
    title: "Kurang",
    width: 80,
    tipe: "number",
    total: true,
    sorotPositif: true,
    negativeRed: true,
  },
  { key: "TANGGAL_LHK", title: "Tgl LHK", width: 95, tipe: "date" },
];

const tableRef = ref<LaporanTableApi | null>(null);

const onRowDblClick = (row: MonitoringCetakMmtRow) => {
  const spk = (row.NO_SPK || row.noSpk || "").trim();
  if (spk && spk !== "-") {
    selectedSpk.value = spk;
    showSpkPreview.value = true;
  }
};

const bukaPrint = () => {
  const { dtAwal, dtAkhir, perusahaanKode, jenis } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
    ...(perusahaanKode ? { perusahaan: perusahaanKode } : {}),
    ...(jenis && jenis !== "SEMUA" ? { jenis } : {}),
  });
  window.open(
    `/laporan/produksi-mmt/monitoring-cetak/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan Monitoring Cetak MMT Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan Monitoring Cetak MMT";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Monitoring_Cetak_MMT_${awal}_sd_${akhir}`,
    sheetName: "cetak_mmt",
    judul: "LAPORAN MONITORING CETAK MMT",
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
    menu-id="5551"
    storage-id="mmt-monitoring-cetak"
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

      <div class="f-group">
        <span class="f-label">Jenis</span>
        <select v-model="filterState.jenis" class="f-inp f-select">
          <option value="SEMUA">SEMUA</option>
          <option value="MT">MT (Outdoor)</option>
          <option value="IN">IN (Indoor)</option>
          <option value="UV">UV</option>
          <option value="DT">DTF</option>
        </select>
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
.f-select {
  height: 28px;
  padding: 0 6px;
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
