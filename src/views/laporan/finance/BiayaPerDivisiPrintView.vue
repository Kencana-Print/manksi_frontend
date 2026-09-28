<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { biayaPerDivisiService } from "@/services/laporan/finance/biayaPerDivisiService";
import { formatTanggal } from "@/utils/dateFormat";
import logoUrl from "@/assets/logo.png";

const route = useRoute();

const isLoading = ref(true);
const error = ref("");
const reportData = ref<any>(null);
const startDate = ref("");
const endDate = ref("");

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

onMounted(async () => {
  try {
    const cckode = String(route.query.cckode || "");
    startDate.value = String(route.query.startDate || "");
    endDate.value = String(route.query.endDate || "");

    if (!cckode || !startDate.value || !endDate.value) {
      error.value = "Parameter laporan tidak lengkap.";
      return;
    }

    const res = await biayaPerDivisiService.getBiayaPerDivisi(
      cckode,
      startDate.value,
      endDate.value,
    );
    reportData.value = res.data.data;
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message ?? "Gagal memuat data.";
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="print-page">
    <div v-if="isLoading" class="loading">Memuat data...</div>
    <div v-else-if="error" class="loading">{{ error }}</div>

    <template v-else-if="reportData">
      <div class="page-header">
        <div class="company-info">
          <img :src="logoUrl" alt="Logo" class="logo" />
        </div>
        <div class="doc-title-wrap">
          <div class="doc-title">LAPORAN BIAYA PER DIVISI</div>
          <div class="doc-sub">
            DIVISI : {{ reportData.divisi.nama.toUpperCase() }}
          </div>
          <div class="doc-sub">
            Periode {{ formatTanggal(startDate) }} s/d
            {{ formatTanggal(endDate) }}
          </div>
        </div>
      </div>

      <div v-if="!reportData.akunList.length" class="empty-state">
        Tidak ada data biaya untuk divisi dan periode ini.
      </div>

      <table v-else class="report-table">
        <thead>
          <tr>
            <th class="col-akun">AKUN BIAYA</th>
            <th class="col-pengajuan">No. Pengajuan</th>
            <th class="col-tgl">Tanggal</th>
            <th class="col-bkk">No. BKK/BBK</th>
            <th class="col-tgl">Tanggal</th>
            <th class="col-dcc">Detail CC</th>
            <th class="col-nominal">Nominal</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="akun in reportData.akunList" :key="akun.rekKode">
            <tr class="row-akun-header">
              <td class="nama-akun">{{ akun.namaAkun }}</td>
              <td colspan="5"></td>
              <td class="tr total-nominal">{{ numFmt(akun.totalNominal) }}</td>
            </tr>
            <tr v-for="(d, i) in akun.detail" :key="i" class="row-detail">
              <td class="detail-label">{{ d.uraian || "-" }}</td>
              <td>{{ d.noPengajuan || "-" }}</td>
              <td class="tc">{{ formatTanggal(d.tanggalPengajuan) }}</td>
              <td>{{ d.noBkkBbk }}</td>
              <td class="tc">{{ formatTanggal(d.tanggalBkkBbk) }}</td>
              <td>{{ d.detailCC || "-" }}</td>
              <td class="tr">{{ numFmt(d.nominal) }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="row-grand-total">
            <td colspan="6" class="tr">GRAND TOTAL</td>
            <td class="tr">{{ numFmt(reportData.grandTotal) }}</td>
          </tr>
        </tfoot>
      </table>
    </template>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #666;
}
.print-page {
  width: 297mm;
  margin: 0 auto;
  padding: 12mm 14mm;
  font-family: Arial, sans-serif;
  font-size: 10.5pt;
  color: #000;
  background: white;
}
.page-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
  border-bottom: 2px solid #1565c0;
  padding-bottom: 10px;
}
.logo {
  height: 42px;
  object-fit: contain;
}
.doc-title-wrap {
  flex: 1;
}
.doc-title {
  font-size: 13pt;
  font-weight: bold;
  color: #0d47a1;
}
.doc-sub {
  font-size: 10pt;
  color: #374151;
  margin-top: 2px;
}
.empty-state {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 30px;
}
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  table-layout: fixed;
}
.report-table th {
  text-align: left;
  font-size: 9pt;
  font-weight: bold;
  color: #374151;
  padding: 5px 6px;
  border-bottom: 2px solid #1565c0;
  white-space: nowrap;
}
.col-akun {
  width: 20%;
}
.col-pengajuan {
  width: 12%;
}
.col-tgl {
  width: 9%;
}
.col-bkk {
  width: 13%;
}
.col-dcc {
  width: 13%;
}
.col-nominal {
  width: 11%;
  text-align: right;
}

.row-akun-header td {
  font-weight: bold;
  color: #0d47a1;
  padding: 7px 6px 4px;
  border-top: 1px solid #e0e0e0;
  break-inside: avoid;
  break-after: avoid;
}
.nama-akun {
  text-transform: uppercase;
}
.total-nominal {
  color: #0d47a1;
  font-weight: bold;
}
.row-detail td {
  padding: 2px 6px;
  color: #374151;
  border-bottom: 1px solid #f5f5f5;
}
.detail-label {
  padding-left: 14px;
  color: #1565c0;
}
.row-grand-total td {
  padding: 7px 6px;
  border-top: 2px solid #1565c0;
  font-weight: bold;
  font-size: 11pt;
  color: #0d47a1;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 10mm;
  }
  .print-page {
    width: 100%;
    padding: 0;
    margin: 0;
  }
}
</style>
