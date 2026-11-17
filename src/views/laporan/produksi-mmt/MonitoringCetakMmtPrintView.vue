<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringCetakMmtService,
  type MonitoringCetakMmtRow,
} from "@/services/laporan/mmt/monitoringCetakMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringCetakMmtRow[]>([]);

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
const jenis = q.jenis ? String(q.jenis) : "";

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
      acc.meter += Number(r.ORDER_SPK_METER || 0);
      acc.mt01 += Number(r.PCS_MT01 || 0);
      acc.mt02 += Number(r.PCS_MT02 || 0);
      acc.mt03 += Number(r.PCS_MT03 || 0);
      acc.mt04 += Number(r.PCS_MT04 || 0);
      acc.mt05 += Number(r.PCS_MT05 || 0);
      acc.luar += Number(r.CETAK_LUAR || 0);
      acc.totalPcs += Number(r.JUMLAH_PCS || 0);
      acc.jmt01 += Number(r.METER_MT01 || 0);
      acc.jmt02 += Number(r.METER_MT02 || 0);
      acc.jmt03 += Number(r.METER_MT03 || 0);
      acc.jmt04 += Number(r.METER_MT04 || 0);
      acc.jmt05 += Number(r.METER_MT05 || 0);
      acc.totalMeter += Number(r.JUMLAH_METER || 0);
      acc.kurang += Number(r.KURANG_VARIANT || 0);
      return acc;
    },
    {
      pcs: 0,
      meter: 0,
      mt01: 0,
      mt02: 0,
      mt03: 0,
      mt04: 0,
      mt05: 0,
      luar: 0,
      totalPcs: 0,
      jmt01: 0,
      jmt02: 0,
      jmt03: 0,
      jmt04: 0,
      jmt05: 0,
      totalMeter: 0,
      kurang: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const res = await monitoringCetakMmtService.getReport({
      startDate,
      endDate,
    });
    const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
    let data = raw.map((r: any) => {
      const noSpk = r.NO_SPK || r.noSpk || "";
      let j = "-";
      if (noSpk.length >= 5) j = noSpk.substring(3, 5);
      return {
        ...r,
        PERUSH: r.PERUSH || r.perush || "-",
        TGL_SPK: r.TGL_SPK || r.tglSpk || "",
        DEADLINE: r.DEADLINE || r.deadline || "",
        NAMA_ORDER: r.NAMA_ORDER || r.namaOrder || "-",
        NO_SPK: noSpk,
        PANJANG: Number(r.PANJANG || r.panjang || 0),
        LEBAR: Number(r.LEBAR || r.lebar || 0),
        ORDER_SPK_PCS: Number(r.ORDER_SPK_PCS || r.pcs || 0),
        ORDER_SPK_METER: Number(r.ORDER_SPK_METER || r.order_meter || 0),
        JENIS: r.JENIS || r.jenis || j,
        PCS_MT01: Number(r.PCS_MT01 || r.mt01 || 0),
        PCS_MT02: Number(r.PCS_MT02 || r.mt02 || 0),
        PCS_MT03: Number(r.PCS_MT03 || r.mt03 || 0),
        PCS_MT04: Number(r.PCS_MT04 || r.mt04 || 0),
        PCS_MT05: Number(r.PCS_MT05 || r.mt05 || 0),
        CETAK_LUAR: Number(r.CETAK_LUAR || r.cetak_luar || 0),
        JUMLAH_PCS: Number(r.JUMLAH_PCS || r.total_qty || 0),
        METER_MT01: Number(r.METER_MT01 || r.jmt01 || 0),
        METER_MT02: Number(r.METER_MT02 || r.jmt02 || 0),
        METER_MT03: Number(r.METER_MT03 || r.jmt03 || 0),
        METER_MT04: Number(r.METER_MT04 || r.jmt04 || 0),
        METER_MT05: Number(r.METER_MT05 || r.jmt05 || 0),
        JUMLAH_METER: Number(r.JUMLAH_METER || r.total_meter || 0),
        KURANG_VARIANT: Number(r.KURANG_VARIANT || r.jmlkurang || 0),
        TANGGAL_LHK: r.TANGGAL_LHK || r.tglLhk || "-",
      };
    });

    if (perusahaan) {
      const k = perusahaan.toLowerCase();
      data = data.filter((d: any) => String(d.PERUSH).toLowerCase().includes(k));
    }
    if (jenis && jenis !== "SEMUA") {
      data = data.filter((d: any) => String(d.JENIS).toUpperCase() === jenis.toUpperCase());
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
    Gagal memuat data laporan monitoring cetak MMT.
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
        <div class="report-title">LAPORAN MONITORING CETAK MMT</div>
        <div class="report-sub">
          Periode: {{ formatTanggal(startDate) }} s.d. {{ formatTanggal(endDate) }}
          <span v-if="perusahaan"> · Perusahaan: {{ perusahaan }}</span>
          <span v-if="jenis && jenis !== 'SEMUA'"> · Jenis: {{ jenis }}</span>
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
            <th rowspan="2">Jenis</th>
            <th colspan="7">Hasil Cetak (PCS)</th>
            <th colspan="6">Hasil Cetak (Meter)</th>
            <th rowspan="2">Kurang</th>
            <th rowspan="2">Tgl LHK</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>PCS</th>
            <th>Mtr</th>
            <th>MT01</th>
            <th>MT02</th>
            <th>MT03</th>
            <th>MT04</th>
            <th>MT05</th>
            <th>Luar</th>
            <th>Tot</th>
            <th>MT01</th>
            <th>MT02</th>
            <th>MT03</th>
            <th>MT04</th>
            <th>MT05</th>
            <th>Tot</th>
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
            <td class="text-right">{{ fmtNum(r.ORDER_SPK_METER, 2) }}</td>
            <td class="text-center">{{ r.JENIS }}</td>
            <td class="text-right">{{ fmtNum(r.PCS_MT01) }}</td>
            <td class="text-right">{{ fmtNum(r.PCS_MT02) }}</td>
            <td class="text-right">{{ fmtNum(r.PCS_MT03) }}</td>
            <td class="text-right">{{ fmtNum(r.PCS_MT04) }}</td>
            <td class="text-right">{{ fmtNum(r.PCS_MT05) }}</td>
            <td class="text-right">{{ fmtNum(r.CETAK_LUAR) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.JUMLAH_PCS) }}</td>
            <td class="text-right">{{ fmtNum(r.METER_MT01, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.METER_MT02, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.METER_MT03, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.METER_MT04, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.METER_MT05, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(r.JUMLAH_METER, 2) }}</td>
            <td
              class="text-right text-bold"
              :class="{ 'cell-kurang': (r.KURANG_VARIANT || 0) > 0 }"
            >
              {{ fmtNum(r.KURANG_VARIANT) }}
            </td>
            <td class="text-center">{{ r.TANGGAL_LHK && r.TANGGAL_LHK !== '-' ? formatTanggal(r.TANGGAL_LHK) : '-' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="8" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.pcs) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.meter, 2) }}</td>
            <td></td>
            <td class="text-right text-bold">{{ fmtNum(totals.mt01) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.mt02) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.mt03) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.mt04) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.mt05) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luar) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.totalPcs) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.jmt01, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.jmt02, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.jmt03, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.jmt04, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.jmt05, 2) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.totalMeter, 2) }}</td>
            <td class="text-right text-bold cell-kurang">{{ fmtNum(totals.kurang) }}</td>
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
