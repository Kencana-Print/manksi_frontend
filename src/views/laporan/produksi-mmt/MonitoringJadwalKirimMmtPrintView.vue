<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringJadwalKirimMmtService,
  type MonitoringJadwalKirimMmtRow,
} from "@/services/laporan/mmt/monitoringJadwalKirimMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringJadwalKirimMmtRow[]>([]);

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
    (acc, r: any) => {
      acc.jumlah += Number(r.Jumlah || 0);
      acc.meter += Number(r.Jumlah_Meter || 0);
      acc.realisasi += Number(r.Realisasi || 0);
      acc.selisih += Number(r.Selisih_Jumlah || 0);
      acc.koli += Number(r.Koli || 0);
      acc.luar += Number(r.JmlCetakLuar || 0);
      return acc;
    },
    { jumlah: 0, meter: 0, realisasi: 0, selisih: 0, koli: 0, luar: 0 },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const raw = await monitoringJadwalKirimMmtService.getReport({
      startDate,
      endDate,
    });
    rows.value = raw.map((r: any) => ({
      ...r,
      Nomor: r.Nomor || "-",
      Gudang: r.Nama_Gudang || r.Gudang || "-",
      Tanggal: r.Tanggal || "",
      No_SPK: r.No_SPK || "-",
      Nama_Spk: r.Nama_Spk || "-",
      Panjang: Number(r.Panjang || 0),
      Lebar: Number(r.Lebar || 0),
      Kain: r.Kain || "-",
      Jumlah: Number(r.Jumlah || 0),
      Jumlah_Meter: Number(r.Jumlah_Meter || 0),
      Koli: Number(r.Koli || 0),
      Realisasi: Number(r.Realisasi || 0),
      Koli_Realisasi: Number(r.Koli_Realisasi || 0),
      Selisih_Jumlah: Number(r.Selisih_Jumlah || 0),
      Selisih_Koli: Number(r.Selisih_Koli || 0),
      JmlCetakLuar: Number(r.JmlCetakLuar || 0),
      Sup: r.sup_nama || r.Sup || "-",
      usr_create: r.usr_create || "-",
      details: Array.isArray(r.details) ? r.details : [],
    }));
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data laporan monitoring jadwal kirim MMT.
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
        <div class="report-title">LAPORAN JADWAL KIRIM GUDANG (WH-010)</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 30px">No</th>
            <th rowspan="2">No. Kirim</th>
            <th rowspan="2">No. SPK</th>
            <th rowspan="2">Nama SPK</th>
            <th rowspan="2">Tanggal</th>
            <th rowspan="2">Gudang</th>
            <th rowspan="2">Kain</th>
            <th colspan="2">Ukuran</th>
            <th colspan="2">Order</th>
            <th colspan="2">Pengiriman</th>
            <th rowspan="2">Koli</th>
            <th rowspan="2">Ctk Luar</th>
            <th rowspan="2">Supplier</th>
            <th rowspan="2">User</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>PCS</th>
            <th>Mtr</th>
            <th>Realisasi</th>
            <th>Selisih</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(r, idx) in rows" :key="idx">
            <tr class="master-row">
              <td class="text-center">{{ idx + 1 }}</td>
              <td class="text-bold">{{ r.Nomor }}</td>
              <td class="text-bold">{{ r.No_SPK }}</td>
              <td>{{ r.Nama_Spk }}</td>
              <td class="text-center">{{ r.Tanggal ? formatTanggal(r.Tanggal) : '-' }}</td>
              <td>{{ r.Gudang }}</td>
              <td>{{ r.Kain }}</td>
              <td class="text-right">{{ fmtNum(r.Panjang, 2) }}</td>
              <td class="text-right">{{ fmtNum(r.Lebar, 2) }}</td>
              <td class="text-right text-bold">{{ fmtNum(r.Jumlah) }}</td>
              <td class="text-right">{{ fmtNum(r.Jumlah_Meter, 2) }}</td>
              <td class="text-right text-bold">{{ fmtNum(r.Realisasi) }}</td>
              <td
                class="text-right text-bold"
                :class="{ 'text-red': (r.Selisih_Jumlah || 0) < 0 }"
              >
                {{ fmtNum(r.Selisih_Jumlah) }}
              </td>
              <td class="text-right">{{ fmtNum(r.Koli) }}</td>
              <td class="text-right">{{ fmtNum(r.JmlCetakLuar) }}</td>
              <td>{{ r.Sup }}</td>
              <td class="text-center">{{ r.usr_create }}</td>
            </tr>
            <!-- Detail Rincian Kiriman (Jika ada) -->
            <tr v-if="r.details && r.details.length > 0" class="detail-nested-row">
              <td></td>
              <td colspan="16" class="pa-1">
                <table class="detail-sub-table">
                  <thead>
                    <tr>
                      <th style="width: 40px">Urut</th>
                      <th>Kota</th>
                      <th>Uraian / Ukuran</th>
                      <th>Size</th>
                      <th>Jumlah</th>
                      <th>Koli</th>
                      <th>Jam Ready</th>
                      <th>No. SJ</th>
                      <th>Realisasi</th>
                      <th>Ekspedisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(dtl, didx) in r.details" :key="didx">
                      <td class="text-center">{{ dtl.No_urut }}</td>
                      <td>{{ dtl.Kota }}</td>
                      <td>{{ dtl.Uraian }}</td>
                      <td class="text-center">{{ dtl.Size }}</td>
                      <td class="text-right">{{ fmtNum(dtl.Jumlah) }}</td>
                      <td class="text-right">{{ fmtNum(dtl.Koli) }}</td>
                      <td class="text-center">{{ dtl['Jam Brg Ready'] || '-' }}</td>
                      <td class="text-center">{{ dtl['Nomor SJ'] || '-' }}</td>
                      <td class="text-right">{{ fmtNum(dtl['Realisasi Kirim']) }}</td>
                      <td>{{ dtl.Expedisi || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="9" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.jumlah) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.meter, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.realisasi) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.selisih) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.koli) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luar) }}</td>
            <td colspan="2"></td>
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
.master-row {
  background: #fff;
}
.detail-nested-row td {
  background: #f9f9f9;
  padding: 4px 6px;
}
.detail-sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
  background: white;
}
.detail-sub-table th,
.detail-sub-table td {
  border: 1px solid #bbb;
  padding: 2px 4px;
}
.detail-sub-table th {
  background: #e0f2f1;
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
