<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  laporanSpkMmtService,
  type LaporanSpkMmtRow,
} from "@/services/laporan/mmt/laporanSpkMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<LaporanSpkMmtRow[]>([]);

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
const status = q.status ? String(q.status) : "";

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
      acc.orderPcs += Number(r.spk_jumlah || 0);
      acc.mt01 += Number(r.mt01 || 0);
      acc.mt02 += Number(r.mt02 || 0);
      acc.mt03 += Number(r.mt03 || 0);
      acc.mt04 += Number(r.mt04 || 0);
      acc.mt05 += Number(r.mt05 || 0);
      acc.jmlCetak += Number(r.JML_CETAK || 0);
      acc.mCetak += Number(r.M_CETAK || 0);
      acc.seaming += Number(r.JML_seaming || 0);
      acc.mataayam += Number(r.JML_mataayam || 0);
      acc.coly += Number(r.JML_coly || 0);
      acc.jadi += Number(r.JML_JADI || 0);
      acc.kirimPcs += Number(r.JML_KIRIM || 0);
      acc.kirimMeter += Number(r.JML_meter_KIRIM || 0);
      return acc;
    },
    {
      orderPcs: 0,
      mt01: 0,
      mt02: 0,
      mt03: 0,
      mt04: 0,
      mt05: 0,
      jmlCetak: 0,
      mCetak: 0,
      seaming: 0,
      mataayam: 0,
      coly: 0,
      jadi: 0,
      kirimPcs: 0,
      kirimMeter: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await laporanSpkMmtService.getReport({
      startDate,
      endDate,
    });
    const raw = Array.isArray(res.data)
      ? res.data
      : (res.data as any)?.data || [];

    let data = raw.map((r: any) => ({
      ...r,
      PANJANG: Number(r.PANJANG || 0),
      LEBAR: Number(r.LEBAR || 0),
      spk_jumlah: Number(r.spk_jumlah || 0),
      mt01: Number(r.mt01 || 0),
      mt02: Number(r.mt02 || 0),
      mt03: Number(r.mt03 || 0),
      mt04: Number(r.mt04 || 0),
      mt05: Number(r.mt05 || 0),
      JML_CETAK: Number(r.JML_CETAK || 0),
      M_CETAK: Number(r.M_CETAK || 0),
      JML_seaming: Number(r.JML_seaming || 0),
      JML_mataayam: Number(r.JML_mataayam || 0),
      JML_coly: Number(r.JML_coly || 0),
      JML_JADI: Number(r.JML_JADI || 0),
      JML_KIRIM: Number(r.JML_KIRIM || 0),
      JML_meter_KIRIM: Number(r.JML_meter_KIRIM || 0),
    }));

    if (status && status !== "SEMUA") {
      data = data.filter((d: any) => String(d.status || "").toUpperCase() === status.toUpperCase());
    }

    rows.value = data;
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data Laporan SPK MMT.
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
        <div class="report-title">LAPORAN SPK MMT</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          <span v-if="status && status !== 'SEMUA'"> · Status: {{ status }}</span>
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px">No</th>
            <th rowspan="2">No SPK</th>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2">Tgl SPK</th>
            <th rowspan="2">Deadline</th>
            <th rowspan="2">Div</th>
            <th rowspan="2">Jenis Order</th>
            <th rowspan="2">Status</th>
            <th colspan="2">Ukuran</th>
            <th rowspan="2">Bahan</th>
            <th rowspan="2">Order (PCS)</th>
            <th colspan="5">Mesin</th>
            <th colspan="2">Total Cetak</th>
            <th colspan="3">Finishing</th>
            <th rowspan="2">Brg Jadi</th>
            <th colspan="2">Kirim</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>MT01</th>
            <th>MT02</th>
            <th>MT03</th>
            <th>MT04</th>
            <th>MT05</th>
            <th>PCS</th>
            <th>M2</th>
            <th>Seam</th>
            <th>Mata</th>
            <th>Coly</th>
            <th>PCS</th>
            <th>M2</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="font-bold">{{ r.NOMOR }}</td>
            <td>{{ r.spk_nama }}</td>
            <td class="text-center">{{ r.spk_tanggal ? formatTanggal(r.spk_tanggal) : '-' }}</td>
            <td class="text-center text-red font-bold">{{ r.deadline ? formatTanggal(r.deadline) : '-' }}</td>
            <td class="text-center">{{ r.DIVISI }}</td>
            <td>{{ r.jo_nama }}</td>
            <td class="text-center">{{ r.status }}</td>
            <td class="text-right">{{ fmtNum(r.PANJANG, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.LEBAR, 2) }}</td>
            <td>{{ r.KAIN || '-' }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.spk_jumlah) }}</td>
            <td class="text-right">{{ fmtNum(r.mt01) }}</td>
            <td class="text-right">{{ fmtNum(r.mt02) }}</td>
            <td class="text-right">{{ fmtNum(r.mt03) }}</td>
            <td class="text-right">{{ fmtNum(r.mt04) }}</td>
            <td class="text-right">{{ fmtNum(r.mt05) }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.JML_CETAK) }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.M_CETAK, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.JML_seaming) }}</td>
            <td class="text-right">{{ fmtNum(r.JML_mataayam) }}</td>
            <td class="text-right">{{ fmtNum(r.JML_coly) }}</td>
            <td class="text-right font-bold">{{ fmtNum(r.JML_JADI) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(r.JML_KIRIM) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(r.JML_meter_KIRIM, 2) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="11" class="text-right font-bold">TOTAL:</td>
            <td class="text-right font-bold">{{ fmtNum(totals.orderPcs) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mt01) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mt02) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mt03) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mt04) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mt05) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.jmlCetak) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mCetak, 2) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.seaming) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.mataayam) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.coly) }}</td>
            <td class="text-right font-bold">{{ fmtNum(totals.jadi) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(totals.kirimPcs) }}</td>
            <td class="text-right font-bold bg-highlight">{{ fmtNum(totals.kirimMeter, 2) }}</td>
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
  font-size: 9.5px;
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
