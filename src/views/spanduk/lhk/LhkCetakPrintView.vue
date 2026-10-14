<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import * as lhkForm from "@/services/spanduk/lhk/lhkCetakFormService";
import type { LhkCetakForm } from "@/services/spanduk/lhk/lhkCetakFormService";

const route = useRoute();
const toast = useToast();
const isLoading = ref(true);
const data = ref<LhkCetakForm | null>(null);

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
  Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const rows = computed(() => data.value?.Detail ?? []);

const totalCetak = computed(() =>
  rows.value.reduce((a, r) => a + (Number(r.Qty_Cetak) || 0), 0),
);
const totalPlangkan = computed(() =>
  rows.value.reduce((a, r) => a + (Number(r.Jml_Plangkan) || 0), 0),
);
</script>

<template>
  <div v-if="isLoading" class="print-loading">Memuat dokumen...</div>

  <div v-else-if="data" class="print-container">
    <div class="print-page">
      <div class="doc-title">Laporan Hasil Kerja Cetak</div>

      <div class="head">
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

        <table class="info kary">
          <tr>
            <td width="90">Kary. Borongan</td>
            <td class="tr" width="40">: {{ fmtInt(data.Kar_Borongan) }}</td>
          </tr>
          <tr>
            <td>Kary. Harian</td>
            <td class="tr">: {{ fmtInt(data.Kar_Harian) }}</td>
          </tr>
        </table>
      </div>

      <table class="detail-table">
        <thead>
          <tr>
            <th rowspan="2">Nama Order</th>
            <th rowspan="2" width="62">Jumlah<br />Order (Pcs)</th>
            <th colspan="2">Spesifikasi</th>
            <th rowspan="2" width="105">Nomor SPK</th>
            <th rowspan="2" width="62">J. Cetak<br />(Pcs)</th>
            <th rowspan="2" width="62">Jumlah<br />Plangkan</th>
          </tr>
          <tr>
            <th width="38">P</th>
            <th width="38">L</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in rows" :key="idx">
            <td>{{ r.Nama_SPK }}</td>
            <td class="tr">{{ fmtInt(r.Jumlah_Order) }}</td>
            <td class="tr">{{ fmt(r.Panjang) }}</td>
            <td class="tr">{{ fmt(r.Lebar) }}</td>
            <td class="tc">{{ r.Nomor_SPK }}</td>
            <td class="tr">{{ fmtInt(r.Qty_Cetak) }}</td>
            <td class="tr">{{ fmtInt(r.Jml_Plangkan) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="tr fw">Total</td>
            <td class="tr fw">{{ fmtInt(totalCetak) }}</td>
            <td class="tr fw">{{ fmtInt(totalPlangkan) }}</td>
          </tr>
        </tfoot>
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
  box-sizing: border-box;
}

.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 14pt;
  margin-bottom: 10px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.info {
  border-collapse: collapse;
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
.detail-table tfoot {
  display: table-row-group; /* total tidak diulang di tiap halaman */
}
.detail-table tr {
  page-break-inside: avoid;
}

.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: bold;
}

.print-footer {
  display: flex;
  gap: 40px;
  margin-top: 30px;
  padding-left: 20px;
  font-size: 9pt;
  page-break-inside: avoid;
}
.sign .line {
  display: inline-block;
  width: 130px;
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
