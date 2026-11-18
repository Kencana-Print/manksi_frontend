<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringBsMmtService,
  type MonitoringBsMmtRow,
} from "@/services/laporan/mmt/monitoringBsMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringBsMmtRow[]>([]);

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
const type = q.type ? String(q.type) : "ALL";

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
      acc.qty += Number(r.Jumlah_BS || 0);
      acc.luas += Number(r.Luas_BS_M2 || 0);
      return acc;
    },
    { qty: 0, luas: 0 },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await monitoringBsMmtService.getReport({
      startDate,
      endDate,
      type: type !== "ALL" ? type : undefined,
    });
    rows.value = (res.data || []).map((r: any) => ({
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
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data laporan monitoring barang sisa (BS) MMT.
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
        <div class="report-title">LAPORAN BS & AFAL PRODUKSI MMT</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          <span v-if="type && type !== 'ALL'"> · Modul: {{ type }}</span>
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 30px">No</th>
            <th rowspan="2">Modul / Divisi</th>
            <th rowspan="2">No LHK</th>
            <th rowspan="2">Tanggal</th>
            <th rowspan="2">Operator</th>
            <th rowspan="2">Mesin</th>
            <th rowspan="2">Kode Bahan</th>
            <th rowspan="2">Nama Bahan / SPK</th>
            <th rowspan="2">Barcode</th>
            <th colspan="2">Dimensi BS</th>
            <th rowspan="2">Qty BS</th>
            <th rowspan="2">Luas (m²)</th>
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
            <td>{{ r.Modul }}</td>
            <td class="text-bold">{{ r.Nomor_LHK }}</td>
            <td class="text-center">{{ r.Tanggal ? formatTanggal(r.Tanggal) : '-' }}</td>
            <td>{{ r.Operator }}</td>
            <td>{{ r.Mesin }}</td>
            <td>{{ r.Brg_Kode }}</td>
            <td>{{ r.Brg_Nama }}</td>
            <td class="text-center">{{ r.Barcode }}</td>
            <td class="text-right">{{ fmtNum(r.Panjang_BS, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.Lebar_BS, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.Jumlah_BS) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.Luas_BS_M2, 2) }}</td>
            <td class="text-center">{{ r.Status }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="11" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.qty) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luas, 2) }}</td>
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
