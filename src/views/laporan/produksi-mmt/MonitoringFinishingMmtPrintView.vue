<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatTanggal } from "@/utils/dateFormat";
import {
  monitoringFinishingMmtService,
  type MonitoringFinishingMmtRow,
} from "@/services/laporan/mmt/monitoringFinishingMmtService";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const rows = ref<MonitoringFinishingMmtRow[]>([]);

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
      acc.pcs += Number(r.spk_jumlah || 0);
      acc.meter += Number(r.order_meter || 0);
      acc.seaming += Number(r.jmlseaming || 0);
      acc.mataayam += Number(r.jmlmataayam || 0);
      acc.coly += Number(r.jmlcoly || 0);
      acc.luar += Number(r.cetak_luar || 0);
      acc.kurang += Number(r.jmlkurang || 0);
      acc.sisaSeaming += Number(r.sisa_seaming || 0);
      acc.sisaMataayam += Number(r.sisa_mataayam || 0);
      acc.sisaColy += Number(r.sisa_coly || 0);
      return acc;
    },
    {
      pcs: 0,
      meter: 0,
      seaming: 0,
      mataayam: 0,
      coly: 0,
      luar: 0,
      kurang: 0,
      sisaSeaming: 0,
      sisaMataayam: 0,
      sisaColy: 0,
    },
  );
});

const handlePrint = () => window.print();
const handleClose = () => window.close();

onMounted(async () => {
  try {
    const raw = await monitoringFinishingMmtService.getReport({
      startDate,
      endDate,
    });
    let data = raw.map((r: any) => ({
      ...r,
      spk_perush_kode: r.spk_perush_kode || "-",
      spk_tanggal: r.spk_tanggal || "",
      spk_dateline: r.spk_dateline || "",
      spk_nomor: r.spk_nomor || "",
      spk_nama: r.spk_nama || "-",
      spk_panjang: Number(r.spk_panjang || 0),
      spk_lebar: Number(r.spk_lebar || 0),
      spk_jumlah: Number(r.spk_jumlah || 0),
      order_meter: Number(r.order_meter || 0),
      spk_kain: r.spk_kain || "-",
      jmlseaming: Number(r.jmlseaming || 0),
      jmlmataayam: Number(r.jmlmataayam || 0),
      jmlcoly: Number(r.jmlcoly || 0),
      cetak_luar: Number(r.cetak_luar || 0),
      jmlkurang: Number(r.jmlkurang || 0),
      sisa_seaming: Number(r.sisa_seaming || 0),
      sisa_mataayam: Number(r.sisa_mataayam || 0),
      sisa_coly: Number(r.sisa_coly || 0),
      Tanggal_LHK: r.Tanggal_LHK || "-",
    }));

    if (perusahaan) {
      const k = perusahaan.toLowerCase();
      data = data.filter((d: any) =>
        String(d.spk_perush_kode).toLowerCase().includes(k),
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
    Gagal memuat data laporan monitoring finishing MMT.
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
        <div class="report-title">LAPORAN MONITORING FINISHING MMT</div>
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
            <th rowspan="2">Bahan</th>
            <th colspan="4">Hasil Selesai</th>
            <th rowspan="2">Kurang</th>
            <th colspan="3">Sisa Finishing</th>
            <th rowspan="2">Tgl LHK</th>
          </tr>
          <tr>
            <th>P</th>
            <th>L</th>
            <th>PCS</th>
            <th>Mtr</th>
            <th>Seaming</th>
            <th>M.Ayam</th>
            <th>Coly</th>
            <th>Ext</th>
            <th>Seaming</th>
            <th>M.Ayam</th>
            <th>Coly</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td>{{ r.spk_perush_kode }}</td>
            <td class="text-center">{{ r.spk_tanggal ? formatTanggal(r.spk_tanggal) : '-' }}</td>
            <td class="text-center text-bold text-red">{{ r.spk_dateline ? formatTanggal(r.spk_dateline) : '-' }}</td>
            <td>{{ r.spk_nama }}</td>
            <td class="text-right">{{ fmtNum(r.spk_panjang, 2) }}</td>
            <td class="text-right">{{ fmtNum(r.spk_lebar, 2) }}</td>
            <td class="text-center text-bold">{{ r.spk_nomor }}</td>
            <td class="text-right">{{ fmtNum(r.spk_jumlah) }}</td>
            <td class="text-right">{{ fmtNum(r.order_meter, 2) }}</td>
            <td>{{ r.spk_kain }}</td>
            <td class="text-right">{{ fmtNum(r.jmlseaming) }}</td>
            <td class="text-right">{{ fmtNum(r.jmlmataayam) }}</td>
            <td class="text-right">{{ fmtNum(r.jmlcoly) }}</td>
            <td class="text-right">{{ fmtNum(r.cetak_luar) }}</td>
            <td
              class="text-right text-bold"
              :class="{ 'cell-kurang': (r.jmlkurang || 0) > 0 }"
            >
              {{ fmtNum(r.jmlkurang) }}
            </td>
            <td class="text-right">{{ fmtNum(r.sisa_seaming) }}</td>
            <td class="text-right">{{ fmtNum(r.sisa_mataayam) }}</td>
            <td class="text-right">{{ fmtNum(r.sisa_coly) }}</td>
            <td class="text-center">{{ r.Tanggal_LHK && r.Tanggal_LHK !== '-' ? formatTanggal(r.Tanggal_LHK) : '-' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="8" class="text-right text-bold">TOTAL:</td>
            <td class="text-right text-bold">{{ fmtNum(totals.pcs) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.meter, 2) }}</td>
            <td></td>
            <td class="text-right text-bold">{{ fmtNum(totals.seaming) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.mataayam) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.coly) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.luar) }}</td>
            <td class="text-right text-bold cell-kurang">{{ fmtNum(totals.kurang) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.sisaSeaming) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.sisaMataayam) }}</td>
            <td class="text-right text-bold">{{ fmtNum(totals.sisaColy) }}</td>
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
