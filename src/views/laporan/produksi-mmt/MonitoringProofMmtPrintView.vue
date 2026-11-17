<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringProofMmtService,
  type MonitoringProofMmtRow,
} from "@/services/laporan/mmt/monitoringProofMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringProofMmtRow[]>([]);

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
      acc.order += Number(r.jml_order || 0);
      acc.rencana += Number(r.rencana_order || 0);
      acc.proof += Number(r.lprd_jproof || 0);
      acc.lama += Number(r.lama_proof || 0);
      return acc;
    },
    {
      order: 0,
      rencana: 0,
      proof: 0,
      lama: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const raw = await monitoringProofMmtService.getReport({
      startDate,
      endDate,
    });
    rows.value = raw.map((r: any) => ({
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
    isLoaded.value = true;
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state text-error">
    Gagal memuat data laporan monitoring proof MMT.
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
        <div class="report-title">LAPORAN MONITORING PROOF MMT</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 30px">No</th>
            <th rowspan="2">No Memo</th>
            <th rowspan="2">Tgl Memo</th>
            <th rowspan="2">Deadline</th>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2">Jenis Bahan</th>
            <th colspan="2">Ukuran</th>
            <th rowspan="2">Jml Order</th>
            <th rowspan="2">Rencana</th>
            <th rowspan="2">Lokasi</th>
            <th rowspan="2">Mesin</th>
            <th colspan="3">LHK Proof</th>
            <th rowspan="2">Jenis</th>
            <th rowspan="2">Status</th>
            <th rowspan="2">No SPK</th>
            <th rowspan="2">Tgl SPK</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>Jml</th>
            <th>Tgl</th>
            <th>Lama</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="text-bold">{{ r.mspk_nomor }}</td>
            <td class="text-center">{{ r.mspk_tanggal ? formatTanggal(r.mspk_tanggal) : '-' }}</td>
            <td class="text-center text-bold text-red">{{ r.mspk_dateline ? formatTanggal(r.mspk_dateline) : '-' }}</td>
            <td>{{ r.nama_order }}</td>
            <td>{{ r.jenis_bahan }}</td>
            <td class="text-right">{{ fmtNum(r.mspk_panjang, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.mspk_lebar, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.jml_order) }}</td>
            <td class="text-right">{{ fmtNum(r.rencana_order) }}</td>
            <td>{{ r.lokasi_proof }}</td>
            <td>{{ r.mesin_proof }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.lprd_jproof) }}</td>
            <td class="text-center">{{ r.lpr_tanggal ? formatTanggal(r.lpr_tanggal) : '-' }}</td>
            <td class="text-right">{{ fmtNum(r.lama_proof) }}</td>
            <td class="text-center">{{ r.jenis }}</td>
            <td class="text-center text-bold">{{ r.statusmemo }}</td>
            <td class="text-center">{{ r.nomorspk }}</td>
            <td class="text-center">{{ r.spktanggal ? formatTanggal(r.spktanggal) : '-' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="8" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.order) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.rencana) }}</td>
            <td colspan="2"></td>
            <td class="text-right text-bold">{{ fmtNum(totals.proof) }}</td>
            <td></td>
            <td class="text-right text-bold">{{ fmtNum(totals.lama) }}</td>
            <td colspan="4"></td>
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
