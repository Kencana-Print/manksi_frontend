<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  pemakaianBahanMmtService,
  type PemakaianBahanMmtRow,
} from "@/services/laporan/mmt/pemakaianBahanMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<PemakaianBahanMmtRow[]>([]);

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
const tipeLhk = q.tipeLhk ? String(q.tipeLhk) : "ALL";

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
    (acc, r) => {
      acc.orderPcs += Number(r.orderPcs || 0);
      acc.orderLuas += Number(r.orderLuas || 0);
      acc.hasilQty += Number(r.hasilQty || 0);
      acc.hasilLuas += Number(r.hasilLuas || 0);
      acc.ambilLuas += Number(r.ambilLuas || 0);
      acc.sisaBisaPakaiLuas += Number(r.sisaBisaPakaiLuas || 0);
      acc.sisaRongsokLuas += Number(r.sisaRongsokLuas || 0);
      acc.aktualLuasPakai += Number(r.aktualLuasPakai || 0);
      acc.totalWasteM2 += Number(r.totalWasteM2 || 0);
      return acc;
    },
    {
      orderPcs: 0,
      orderLuas: 0,
      hasilQty: 0,
      hasilLuas: 0,
      ambilLuas: 0,
      sisaBisaPakaiLuas: 0,
      sisaRongsokLuas: 0,
      aktualLuasPakai: 0,
      totalWasteM2: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await pemakaianBahanMmtService.getReport({
      startDate,
      endDate,
      tipeLhk,
    });
    rows.value = Array.isArray(res.data) ? res.data : [];
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data Lap. Pemakaian Bahan.
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
        <div class="report-title">LAPORAN PEMAKAIAN BAHAN & KONSUMSI TINTA (MMT)</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          <span v-if="tipeLhk && tipeLhk !== 'ALL'"> · Tipe LHK: {{ tipeLhk }}</span>
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px">No</th>
            <th rowspan="2">Tgl</th>
            <th rowspan="2">Shift</th>
            <th rowspan="2">Tipe</th>
            <th rowspan="2">Mesin</th>
            <th rowspan="2">No SPK</th>
            <th rowspan="2">Nama Order</th>
            <th colspan="2">Ukuran</th>
            <th colspan="2">Order SPK</th>
            <th colspan="2">Hasil Cetak</th>
            <th colspan="3">Ambil Bahan</th>
            <th colspan="3">Sisa Bisa Pakai</th>
            <th colspan="3">Sisa Rongsok</th>
            <th rowspan="2">Aktual Pakai (M2)</th>
            <th colspan="2">Waste</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>PCS</th>
            <th>M2</th>
            <th>PCS</th>
            <th>M2</th>
            <th>P</th>
            <th>L</th>
            <th>M2</th>
            <th>P</th>
            <th>L</th>
            <th>M2</th>
            <th>P</th>
            <th>L</th>
            <th>M2</th>
            <th>M2</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="text-center">{{ r.tgl ? formatTanggal(r.tgl) : '-' }}</td>
            <td class="text-center">{{ r.shift || '-' }}</td>
            <td class="text-center">{{ r.tipeLhk || '-' }}</td>
            <td class="text-center font-bold">{{ r.kodeMesin || '-' }}</td>
            <td>{{ r.noSpk }}</td>
            <td>{{ r.namaOrder }}</td>
            <td class="text-right">{{ fmtNum(r.p, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.l, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.orderPcs) }}</td>
            <td class="text-right">{{ fmtNum(r.orderLuas, 2) }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.hasilQty) }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.hasilLuas, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.ambilP, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.ambilL, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.ambilLuas, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.sisaBisaPakaiP, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.sisaBisaPakaiL, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.sisaBisaPakaiLuas, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.sisaRongsokP, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.sisaRongsokL, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.sisaRongsokLuas, 2) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(r.aktualLuasPakai, 2) }}</td>
            <td class="text-right text-red font-bold">{{ fmtNum(r.totalWasteM2, 2) }}</td>
            <td class="text-right text-red font-bold">{{ fmtNum(r.totalWastePersen, 2) }}%</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="9" class="text-right font-bold">TOTAL:</td>
            <td class="text-right font-bold">{{ fmtNum(totals.orderPcs) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.orderLuas, 2) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.hasilQty) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.hasilLuas, 2) }}</td>
            <td colspan="2"></td>
            <td class="text-right font-bold">{{ fmtNum(totals.ambilLuas, 2) }}</td>
            <td colspan="2"></td>
            <td class="text-right font-bold">{{ fmtNum(totals.sisaBisaPakaiLuas, 2) }}</td>
            <td colspan="2"></td>
            <td class="text-right font-bold">{{ fmtNum(totals.sisaRongsokLuas, 2) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(totals.aktualLuasPakai, 2) }}</td>
            <td class="text-right font-bold text-red">{{ fmtNum(totals.totalWasteM2, 2) }}</td>
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
  font-size: 9px;
}
.report-table th,
.report-table td {
  border: 1px solid #999;
  padding: 2.5px 3.5px;
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
.text-red {
  color: #c62828;
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
    size: landscape;
    margin: 8mm 6mm;
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
