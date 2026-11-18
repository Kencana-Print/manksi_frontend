<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  laporanLhkService,
  type LhkRekapMesinRow,
} from "@/services/laporan/mmt/laporanLhkService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<LhkRekapMesinRow[]>([]);

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
const kategori = q.kategori ? String(q.kategori) : "ALL";

const selectedDaysCount = computed(() => {
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
});

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

const calculatePercent = (val: any, max: any) => {
  const v = Number(val) || 0;
  const m = Number(max) || 0;
  if (m === 0) return 0;
  return Math.round((v / m) * 100);
};

const totals = computed(() => {
  return rows.value.reduce(
    (acc, r) => {
      acc.spk += Number(r.Jml_SPK || 0);
      acc.pcs += Number(r.Total_Pcs || 0);
      acc.meter += Number(r.Total_Meter || 0);
      acc.kapasitas += Number(r.Kapasitas || 0) * selectedDaysCount.value;
      return acc;
    },
    { spk: 0, pcs: 0, meter: 0, kapasitas: 0 },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await laporanLhkService.getRekap({
      startDate,
      endDate,
    });
    let list = res.data?.data?.rekapMesin || [];
    if (kategori && kategori !== "ALL") {
      list = list.filter((item) => item.Kategori === kategori);
    }
    rows.value = list;
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data Laporan LHK.
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
        <div class="report-title">LAPORAN REKAP LHK PRODUKSI (MMT)</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          <span v-if="kategori && kategori !== 'ALL'"> · Kategori: {{ kategori }}</span>
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 35px">No</th>
            <th>Mesin</th>
            <th>Kategori</th>
            <th>Kapasitas ({{ selectedDaysCount }} hr) (M²)</th>
            <th>Jumlah SPK</th>
            <th>Total PCS</th>
            <th>Total Meter (M²)</th>
            <th>Load (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="font-bold">{{ r.Mesin }}</td>
            <td class="text-center">{{ r.Kategori }}</td>
            <td class="text-right">{{ fmtNum(Number(r.Kapasitas || 0) * selectedDaysCount, 0) }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.Jml_SPK) }}</td>
            <td class="text-right">{{ fmtNum(r.Total_Pcs) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(r.Total_Meter, 2) }}</td>
            <td class="text-center font-bold">
              {{ calculatePercent(r.Total_Meter, Number(r.Kapasitas || 0) * selectedDaysCount) }}%
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="3" class="text-right font-bold">GRAND TOTAL:</td>
            <td class="text-right font-bold">{{ fmtNum(totals.kapasitas, 0) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.spk) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.pcs) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(totals.meter, 2) }}</td>
            <td class="text-center font-bold">
              {{ calculatePercent(totals.meter, totals.kapasitas) }}%
            </td>
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
  font-size: 11px;
}
.report-table th,
.report-table td {
  border: 1px solid #999;
  padding: 5px 8px;
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
.bg-highlight {
  background: #eef5ff;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.font-bold {
  font-weight: bold;
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 14px;
  color: #666;
}
.text-error {
  color: #c62828;
}

@media print {
  @page {
    size: portrait;
    margin: 10mm;
  }
  body {
    background: white;
  }
  .print-container {
    padding: 0;
    background: white;
  }
  .print-page {
    box-shadow: none;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
}
</style>
