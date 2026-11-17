<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringPaperprintMmtService,
  type MonitoringPaperprintMmtRow,
} from "@/services/laporan/mmt/monitoringPaperprintMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringPaperprintMmtRow[]>([]);

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
const perusahaan = q.perusahaan ? String(q.perusahaan) : "";

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
      acc.pcs += Number(r.ORDER_SPK_PCS || 0);
      acc.meter += Number(r.ORDER_METER || 0);
      acc.luarPcs += Number(r.CETAK_LUAR_PCS || 0);
      acc.luarMtr += Number(r.CETAK_LUAR_MTR || 0);
      acc.cetakPcs += Number(r.JML_CETAK_TOTAL || 0);
      acc.cetakMtr += Number(r.MTR_CETAK_TOTAL || 0);
      acc.kurang += Number(r.KURANG_CETAK || 0);
      return acc;
    },
    {
      pcs: 0,
      meter: 0,
      luarPcs: 0,
      luarMtr: 0,
      cetakPcs: 0,
      cetakMtr: 0,
      kurang: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const raw = await monitoringPaperprintMmtService.getReport({
      startDate,
      endDate,
    });
    let data = raw.map((r: any) => ({
      ...r,
      PERUSH: r.PERUSH || "-",
      NO_SPK: r.NO_SPK || "",
      NAMA_ORDER: r.NAMA_ORDER || "-",
      TGL_SPK: r.TGL_SPK || "",
      DEADLINE: r.DEADLINE || "",
      PANJANG: Number(r.PANJANG || 0),
      LEBAR: Number(r.LEBAR || 0),
      ORDER_SPK_PCS: Number(r.ORDER_SPK_PCS || 0),
      ORDER_METER: Number(r.ORDER_METER || 0),
      CETAK_LUAR_PCS: Number(r.CETAK_LUAR_PCS || 0),
      CETAK_LUAR_MTR: Number(r.CETAK_LUAR_MTR || 0),
      JML_CETAK_TOTAL: Number(r.JML_CETAK_TOTAL || 0),
      MTR_CETAK_TOTAL: Number(r.MTR_CETAK_TOTAL || 0),
      KURANG_CETAK: Number(r.KURANG_CETAK || 0),
      NO_LHK: r.NO_LHK || "-",
      TANGGAL_LHK: r.TANGGAL_LHK || "-",
    }));

    if (perusahaan) {
      const k = perusahaan.toLowerCase();
      data = data.filter((d: any) =>
        String(d.PERUSH).toLowerCase().includes(k),
      );
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
    Gagal memuat data laporan monitoring paperprint MMT.
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
        <div class="report-title">LAPORAN MONITORING PAPERPRINT MMT</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          <span v-if="perusahaan"> · Perusahaan: {{ perusahaan }}</span>
        </div>
        <div class="report-meta">Waktu Cetak: {{ waktuCetak }}</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 30px">No</th>
            <th rowspan="2">Perusahaan</th>
            <th rowspan="2">Tgl SPK</th>
            <th rowspan="2">Deadline</th>
            <th rowspan="2">Nama Order</th>
            <th colspan="2">Ukuran</th>
            <th rowspan="2">No SPK</th>
            <th colspan="2">Order SPK</th>
            <th colspan="2">Cetak Luar</th>
            <th colspan="2">Hasil Cetak</th>
            <th rowspan="2">Kurang</th>
            <th rowspan="2">No LHK</th>
            <th rowspan="2">Tgl LHK</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>PCS</th>
            <th>Mtr</th>
            <th>PCS</th>
            <th>Mtr</th>
            <th>PCS</th>
            <th>Mtr</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td>{{ r.PERUSH }}</td>
            <td class="text-center">{{ r.TGL_SPK ? formatTanggal(r.TGL_SPK) : '-' }}</td>
            <td class="text-center text-bold text-red">{{ r.DEADLINE ? formatTanggal(r.DEADLINE) : '-' }}</td>
            <td>{{ r.NAMA_ORDER }}</td>
            <td class="text-right">{{ fmtNum(r.PANJANG, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.LEBAR, 2) }}</td>
            <td class="text-center text-bold">{{ r.NO_SPK }}</td>
            <td class="text-right">{{ fmtNum(r.ORDER_SPK_PCS) }}</td>
            <td class="text-right">{{ fmtNum(r.ORDER_METER, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.CETAK_LUAR_PCS) }}</td>
            <td class="text-right">{{ fmtNum(r.CETAK_LUAR_MTR, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.JML_CETAK_TOTAL) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.MTR_CETAK_TOTAL, 2) }}</td>
            <td
              class="text-right text-bold"
              :class="{ 'cell-kurang': (r.KURANG_CETAK || 0) > 0 }"
            >
              {{ fmtNum(r.KURANG_CETAK) }}
            </td>
            <td>{{ r.NO_LHK }}</td>
            <td class="text-center">{{ r.TANGGAL_LHK && r.TANGGAL_LHK !== '-' ? formatTanggal(r.TANGGAL_LHK) : '-' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="8" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.pcs) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.meter, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luarPcs) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luarMtr, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.cetakPcs) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.cetakMtr, 2) }}</td>
            <td class="text-right text-bold cell-kurang">{{ fmtNum(totals.kurang) }}</td>
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
