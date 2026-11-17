<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringLmkpMmtService,
  type MonitoringLmkpMmtRow,
  type LmkpSummary,
} from "@/services/laporan/mmt/monitoringLmkpMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringLmkpMmtRow[]>([]);
const summary = ref<LmkpSummary>({
  outputPerHari: 0,
  totalWaitingList: 0,
  estimasiSelesaiHari: 0,
});

const pad2 = (n: number) => String(n).padStart(2, "0");
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const getAwalBulan = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
};

const q = route.query;
const startDate = String(q.startDate || getAwalBulan());
const endDate = String(q.endDate || getLocalDate());
const jenisIndex = String(q.jenisIndex || "0");

const jenisLabelMap: Record<string, string> = {
  "0": "MT (Mesin Outdoor)",
  "1": "MX (Mesin Tekstil)",
  "2": "PAPERPRINT",
  "3": "SUBLIM (RTR)",
  "4": "MAKLON",
};

const waktuCetak = computed(() => {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
});

const fmtNum = (v: number | undefined, dec = 0) => {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(Number(v) || 0);
};

const totals = computed(() => {
  return rows.value.reduce(
    (acc, r: any) => {
      acc.order += Number(r.spk_jumlah || 0);
      acc.kirim += Number(r.spk_jumlah_kirim || 0);
      acc.krgKirim += Number(r.krg_kirim || 0);
      acc.krgCetak += Number(r.krg_Cetak || 0);
      acc.luar += Number(r.cetak_luarx || 0);
      acc.krgCetakMtr += Number(r.krg_Cetak_meter || 0);
      return acc;
    },
    { order: 0, kirim: 0, krgKirim: 0, krgCetak: 0, luar: 0, krgCetakMtr: 0 },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await monitoringLmkpMmtService.getReport({
      jenisIndex,
      startDate,
      endDate,
    });
    summary.value = res.summary;
    rows.value = res.data.map((r: any) => ({
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
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data laporan kekurangan produksi (LMKP) MMT.
  </div>
  <div v-else-if="!isLoaded" class="loading-state">
    Mempersiapkan dokumen cetak...
  </div>
  <div v-else class="print-container">
    <div class="no-print print-actions">
      <button class="btn-action btn-print" @click="handlePrint">
        <IconPrinter :size="16" />
        <span>Cetak</span>
      </button>
      <button class="btn-action btn-close" @click="handleClose">
        <IconX :size="16" />
        <span>Tutup</span>
      </button>
    </div>

    <div class="print-page">
      <div class="report-header">
        <div class="report-title">
          LAPORAN MONITORING LMKP MMT — {{ jenisLabelMap[jenisIndex] || jenisIndex }}
        </div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          · Output/Hari: <strong>{{ summary.outputPerHari }}</strong>
          · Total Waiting List: <strong>{{ summary.totalWaitingList }}</strong>
          · Estimasi Selesai: <strong>{{ summary.estimasiSelesaiHari }} Hari</strong>
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 30px">No</th>
            <th rowspan="2">No. SPK</th>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2">Tgl SPK</th>
            <th rowspan="2">Deadline</th>
            <th colspan="2">Ukuran</th>
            <th rowspan="2">Bahan</th>
            <th rowspan="2">Finishing</th>
            <th rowspan="2">Order</th>
            <th rowspan="2">Kirim</th>
            <th rowspan="2">Krg Kirim</th>
            <th rowspan="2">Krg Cetak</th>
            <th rowspan="2">Ctk Luar</th>
            <th rowspan="2">Krg Cetak (Mtr)</th>
            <th rowspan="2">Status</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="text-bold">{{ r.NOMOR }}</td>
            <td>{{ r.spk_nama }}</td>
            <td class="text-center">{{ r.spk_tanggal ? formatTanggal(r.spk_tanggal) : '-' }}</td>
            <td class="text-center text-bold text-red">{{ r.deadline ? formatTanggal(r.deadline) : '-' }}</td>
            <td class="text-right">{{ fmtNum(r.PANJANG, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.LEBAR, 2) }}</td>
            <td>{{ r.KAIN }}</td>
            <td>{{ r.FINISHING }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.spk_jumlah) }}</td>
            <td class="text-right">{{ fmtNum(r.spk_jumlah_kirim) }}</td>
            <td class="text-right">{{ fmtNum(r.krg_kirim) }}</td>
            <td
              class="text-right text-bold"
              :class="{ 'cell-kurang': (r.krg_Cetak || 0) > 0 }"
            >
              {{ fmtNum(r.krg_Cetak) }}
            </td>
            <td class="text-right">{{ fmtNum(r.cetak_luarx) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.krg_Cetak_meter, 2) }}</td>
            <td class="text-center">{{ r.status }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="9" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.order) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.kirim) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.krgKirim) }}</td>
            <td class="text-right text-bold cell-kurang">{{ fmtNum(totals.krgCetak) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luar) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.krgCetakMtr, 2) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.print-container {
  padding: 12px;
  background: #f7f7f7;
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
}
.no-print {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #ccc;
  background: white;
}
.btn-print {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}
.btn-close {
  background: #616161;
  color: white;
  border-color: #616161;
}
.print-page {
  background: white;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.report-header {
  border-bottom: 2px solid #333;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.report-title {
  font-size: 15px;
  font-weight: bold;
}
.report-sub {
  font-size: 11px;
  color: #444;
  margin-top: 2px;
}
.report-meta {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.report-table th,
.report-table td {
  border: 1px solid #999;
  padding: 3px 4px;
}
.report-table th {
  background: #f0f0f0;
  font-weight: bold;
  text-align: center;
}
.tfoot-row td {
  background: #f4f4f4;
  border-top: 2px solid #333;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.text-bold {
  font-weight: bold;
}
.text-red {
  color: #c62828;
}
.cell-kurang {
  background-color: #ffebee !important;
  color: #c62828 !important;
}
.loading-state {
  padding: 24px;
  text-align: center;
  font-size: 13px;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 6mm;
  }
  .no-print {
    display: none !important;
  }
  .print-container {
    padding: 0;
    background: white;
    min-height: auto;
  }
  .print-page {
    box-shadow: none;
    padding: 0;
  }
}
</style>
