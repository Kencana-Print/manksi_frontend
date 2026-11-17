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
  monitoringProofMmtService,
  type MonitoringProofMmtRow,
} from "@/services/laporan/mmt/monitoringProofMmtService";

const toast = useToast();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sekarang = new Date();
const filterState = ref({
  dtAwal: ymd(new Date(sekarang.getFullYear(), sekarang.getMonth(), 1)),
  dtAkhir: ymd(sekarang),
});

const periodeTampil = ref({ awal: "", akhir: "" });

const muatData = async (): Promise<MonitoringProofMmtRow[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const raw = await monitoringProofMmtService.getReport({
    startDate: dtAwal,
    endDate: dtAkhir,
  });

  periodeTampil.value = { awal: dtAwal, akhir: dtAkhir };

  return raw.map((r: any) => ({
    ...r,
    mspk_nomor: r.mspk_nomor || "",
    mspk_tanggal: r.mspk_tanggal || "",
    mspk_dateline: r.mspk_dateline || "",
    nama_order: r.nama_order || "-",
    mspk_panjang: Number(r.mspk_panjang || 0),
    mspk_lebar: Number(r.mspk_lebar || 0),
    jml_order: Number(r.jml_order || 0),
    rencana_order: Number(r.rencana_order || 0),
    lokasi_proof: r.lokasi_proof || "-",
    mesin_proof: r.mesin_proof || "-",
    jenis_bahan: r.jenis_bahan || "-",
    lprd_jproof: Number(r.lprd_jproof || 0),
    lpr_tanggal: r.lpr_tanggal || "",
    jenis: r.jenis || "-",
    lama_proof: Number(r.lama_proof || 0),
    nomorspk: r.nomorspk || "-",
    spktanggal: r.spktanggal || "",
    statusmemo: r.statusmemo || "-",
    keterangan: r.keterangan || "",
  }));
};

const { items, isLoading, canExport, fetchData } =
  useBrowse<MonitoringProofMmtRow>({
    menuId: "5555",
    fetchApi: muatData,
    immediate: false,
  });

onMounted(() => fetchData());

const kolom: LaporanKolom[] = [
  { key: "mspk_nomor", title: "No Memo Proof", width: 130, excelWidth: 18 },
  { key: "mspk_tanggal", title: "Tgl Memo", width: 95, tipe: "date" },
  { key: "mspk_dateline", title: "Deadline", width: 95, tipe: "date" },
  { key: "nama_order", title: "Nama Order", width: 220, excelWidth: 35 },
  { key: "jenis_bahan", title: "Jenis Bahan", width: 120 },
  { key: "mspk_panjang", title: "Panjang", group: "Ukuran", width: 75, tipe: "number" },
  { key: "mspk_lebar", title: "Lebar", group: "Ukuran", width: 75, tipe: "number" },
  {
    key: "jml_order",
    title: "Jml Order",
    width: 80,
    tipe: "number",
    total: true,
  },
  {
    key: "rencana_order",
    title: "Rencana Order",
    width: 95,
    tipe: "number",
    total: true,
  },
  { key: "lokasi_proof", title: "Lokasi", width: 90 },
  { key: "mesin_proof", title: "Mesin", width: 90 },
  {
    key: "lprd_jproof",
    title: "Jml Proof",
    group: "LHK Proof",
    width: 80,
    tipe: "number",
    total: true,
  },
  { key: "lpr_tanggal", title: "Tgl LHK", group: "LHK Proof", width: 95, tipe: "date" },
  {
    key: "lama_proof",
    title: "Lama (Mnt)",
    group: "LHK Proof",
    width: 80,
    tipe: "number",
    total: true,
  },
  { key: "jenis", title: "Jenis", width: 75, align: "center" },
  { key: "statusmemo", title: "Status", width: 75, align: "center" },
  { key: "nomorspk", title: "No SPK Jadi", width: 130 },
  { key: "spktanggal", title: "Tgl SPK", width: 95, tipe: "date" },
  { key: "keterangan", title: "Keterangan", width: 180, excelWidth: 30 },
];

const tableRef = ref<LaporanTableApi | null>(null);

const bukaPrint = () => {
  const { dtAwal, dtAkhir } = filterState.value;
  const p = new URLSearchParams({
    startDate: dtAwal,
    endDate: dtAkhir,
  });
  window.open(
    `/laporan/produksi-mmt/monitoring-proof/print?${p.toString()}`,
    "_blank",
  );
};

const judulLaporan = computed(() => {
  if (periodeTampil.value.awal && periodeTampil.value.akhir) {
    return `Laporan Monitoring Proof MMT Periode ${formatTanggal(periodeTampil.value.awal)} s/d ${formatTanggal(periodeTampil.value.akhir)}`;
  }
  return "Laporan Monitoring Proof MMT";
});

const onExport = () => {
  const { awal, akhir } = periodeTampil.value;
  return tableRef.value?.exportToExcel({
    fileName: `Monitoring_Proof_MMT_${awal}_sd_${akhir}`,
    sheetName: "proof_mmt",
    judul: "LAPORAN MONITORING PROOF MMT",
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
    menu-id="5555"
    storage-id="mmt-monitoring-proof"
    :columns="kolom"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    row-key="mspk_nomor"
    search-placeholder="Cari memo proof, order, bahan..."
    satuan="memo"
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
