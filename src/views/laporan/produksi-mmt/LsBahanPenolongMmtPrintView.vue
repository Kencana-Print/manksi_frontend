<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  lsBahanPenolongService,
  type LsBahanPenolongRow,
} from "@/services/laporan/mmt/lsBahanPenolongService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<LsBahanPenolongRow[]>([]);

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
      acc.sawal_q += Number(r.stok_awal_q || 0);
      acc.sawal_m += Number(r.stok_awal_m || 0);
      acc.terima_q += Number(r.terima_q || 0);
      acc.terima_m += Number(r.terima_m || 0);
      acc.keluar_q += Number(r.keluar_q || 0);
      acc.keluar_m += Number(r.keluar_m || 0);
      acc.retur_q += Number(r.retur_q || 0);
      acc.retur_m += Number(r.retur_m || 0);
      acc.sakhir_q += Number(r.stok_akhir_q || 0);
      acc.sakhir_m += Number(r.stok_akhir_m || 0);
      return acc;
    },
    {
      sawal_q: 0,
      sawal_m: 0,
      terima_q: 0,
      terima_m: 0,
      keluar_q: 0,
      keluar_m: 0,
      retur_q: 0,
      retur_m: 0,
      sakhir_q: 0,
      sakhir_m: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await lsBahanPenolongService.getReport({
      startDate,
      endDate,
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
    Gagal memuat data LS Bahan Penolong.
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
        <div class="report-title">LAPORAN STOK BAHAN PENOLONG (MMT)</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px">No</th>
            <th rowspan="2">Kode</th>
            <th rowspan="2">Nama Bahan</th>
            <th rowspan="2">Jenis</th>
            <th rowspan="2">Status</th>
            <th colspan="3">Spesifikasi</th>
            <th colspan="2">Stok Awal</th>
            <th colspan="2">Terima</th>
            <th colspan="2">Keluar</th>
            <th colspan="2">Retur / Sisa</th>
            <th colspan="2">Stok Akhir</th>
          </tr>
          <tr>
            <th>Lebar</th>
            <th>Panjang</th>
            <th>M2</th>
            <th>Roll</th>
            <th>M2</th>
            <th>Roll</th>
            <th>M2</th>
            <th>Roll</th>
            <th>M2</th>
            <th>Roll</th>
            <th>M2</th>
            <th>Roll</th>
            <th>M2</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td>{{ r.kode }}</td>
            <td>{{ r.Nama }}</td>
            <td>{{ r.jb_nama || '-' }}</td>
            <td class="text-center">{{ r.status || '-' }}</td>
            <td class="text-right">{{ fmtNum(r.Lebar, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.Panjang, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.m2, 2) }}</td>
            <td class="text-center font-bold">{{ fmtNum(r.stok_awal_q) }}</td>
            <td class="text-right">{{ fmtNum(r.stok_awal_m, 2) }}</td>
            <td class="text-center">{{ fmtNum(r.terima_q) }}</td>
            <td class="text-right">{{ fmtNum(r.terima_m, 2) }}</td>
            <td class="text-center">{{ fmtNum(r.keluar_q) }}</td>
            <td class="text-right">{{ fmtNum(r.keluar_m, 2) }}</td>
            <td class="text-center">{{ fmtNum(r.retur_q) }}</td>
            <td class="text-right">{{ fmtNum(r.retur_m, 2) }}</td>
            <td class="text-center font-bold bg-highlight">{{ fmtNum(r.stok_akhir_q) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(r.stok_akhir_m, 2) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="8" class="text-right font-bold">TOTAL:</td>
            <td class="text-center font-bold">{{ fmtNum(totals.sawal_q) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.sawal_m, 2) }}</td>
            <td class="text-center font-bold">{{ fmtNum(totals.terima_q) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.terima_m, 2) }}</td>
            <td class="text-center font-bold">{{ fmtNum(totals.keluar_q) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.keluar_m, 2) }}</td>
            <td class="text-center font-bold">{{ fmtNum(totals.retur_q) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.retur_m, 2) }}</td>
            <td class="text-center font-bold bg-highlight">{{ fmtNum(totals.sakhir_q) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(totals.sakhir_m, 2) }}</td>
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
  padding: 3px 5px;
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
