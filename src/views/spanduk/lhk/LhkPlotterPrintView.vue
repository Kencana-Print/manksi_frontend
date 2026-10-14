<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import * as lhkForm from "@/services/spanduk/lhk/lhkPlotterFormService";
import type { LhkPlotterForm } from "@/services/spanduk/lhk/lhkPlotterFormService";

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<LhkPlotterForm | null>(null);

const loadData = async () => {
  try {
    data.value = await lhkForm.getById(String(route.params.nomor));
    setTimeout(() => window.print(), 600);
  } catch (e) {
    toast.error(lhkForm.pesanError(e, "Gagal memuat data cetak."));
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// Tanggal dari server berformat YYYY-MM-DD; dipotong manual agar tidak bergeser zona waktu
const fmtTgl = (v: string | null | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "-";
};

const fmt = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const total = computed(() => {
  const rows = data.value?.Detail ?? [];
  const jumlah = (pilih: (r: (typeof rows)[number]) => number | null) =>
    rows.reduce((s, r) => s + Number(pilih(r) ?? 0), 0);
  return {
    totalMeter: jumlah((r) => r.J_TotalMeter),
    pk: jumlah((r) => r.J_PK),
    mk: jumlah((r) => r.J_MK),
    tinta: jumlah((r) => r.J_Tinta),
  };
});
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <div class="print-page">
      <div class="doc-title">Laporan Hasil Kerja Plotter</div>

      <table class="info">
        <tr>
          <td width="60">Tanggal</td>
          <td>: {{ fmtTgl(data.Tanggal) }}</td>
        </tr>
        <tr>
          <td>Nomor</td>
          <td>: {{ data.Nomor }}</td>
        </tr>
        <tr>
          <td>Lokasi</td>
          <td>: {{ data.Nama_Pabrik || data.Kode_Pabrik || "-" }}</td>
        </tr>
      </table>

      <table class="detail-table">
        <thead>
          <tr>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2" width="52">Jumlah<br />Order (Pcs)</th>
            <th colspan="2">Spesifikasi</th>
            <th rowspan="2" width="86">Nomor SPK</th>
            <th rowspan="2" width="50">Jml<br />Meter</th>
            <th rowspan="2" width="46">Jml<br />Lembar</th>
            <th rowspan="2" width="56">Total<br />Meter</th>
            <th rowspan="2" width="42">Jml<br />PK</th>
            <th rowspan="2" width="42">Jml<br />MK</th>
            <th rowspan="2" width="52">Jml<br />Tinta</th>
            <th rowspan="2" width="90">Keterangan</th>
          </tr>
          <tr>
            <th width="38">P</th>
            <th width="38">L</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in data.Detail" :key="idx">
            <td>{{ r.Nama_SPK }}</td>
            <td class="tr">{{ fmtInt(r.Jumlah_Order) }}</td>
            <td class="tr">{{ fmt(r.Panjang) }}</td>
            <td class="tr">{{ fmt(r.Lebar) }}</td>
            <td class="tc">{{ r.Nomor_SPK }}</td>
            <td class="tr">{{ fmt(r.J_Meter) }}</td>
            <td class="tr">{{ fmtInt(r.J_Lembar) }}</td>
            <td class="tr">{{ fmt(r.J_TotalMeter) }}</td>
            <td class="tr">{{ fmt(r.J_PK) }}</td>
            <td class="tr">{{ fmt(r.J_MK) }}</td>
            <td class="tr">{{ fmt(r.J_Tinta) }}</td>
            <td>{{ r.Keterangan }}</td>
          </tr>
          <tr class="row-total">
            <td colspan="7">Total</td>
            <td class="tr">{{ fmt(total.totalMeter) }}</td>
            <td class="tr">{{ fmt(total.pk) }}</td>
            <td class="tr">{{ fmt(total.mk) }}</td>
            <td class="tr">{{ fmt(total.tinta) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="sign">Mengetahui: 1 <span class="line"></span></div>
        <div class="sign">Mengetahui: 2 <span class="line"></span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-loading {
  padding: 40px;
  text-align: center;
  font-family: sans-serif;
}

.print-container {
  width: 21cm;
  margin: 0 auto;
  background: #525659;
  padding: 20px 0;
}

.print-page {
  width: 21cm;
  min-height: 29.7cm;
  padding: 1cm;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 8pt;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 14pt;
  margin-bottom: 10px;
}

.info {
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 9pt;
}
.info td {
  padding: 1px 0;
  vertical-align: top;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}
.detail-table th,
.detail-table td {
  border: 1px solid black;
  padding: 2px 4px;
}
.detail-table th {
  font-weight: normal;
  text-align: center;
  vertical-align: middle;
}
.detail-table thead {
  display: table-header-group; /* header diulang tiap halaman */
}
.detail-table tr {
  page-break-inside: avoid;
}
.row-total td {
  font-weight: normal;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.print-footer {
  display: flex;
  gap: 60px;
  margin-top: 30px;
  padding-left: 40px;
  font-size: 9pt;
}
.sign .line {
  display: inline-block;
  width: 160px;
  border-bottom: 1px solid black;
}

@media print {
  .print-container {
    width: 100%;
    padding: 0;
    background: none;
  }
  .print-page {
    width: 100%;
    min-height: 0;
    padding: 0;
    box-shadow: none;
  }
  @page {
    size: A4 portrait;
    margin: 1cm;
  }
}
</style>
