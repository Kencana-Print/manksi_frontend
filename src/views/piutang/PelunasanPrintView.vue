<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { pelunasanFormService } from "@/services/piutang/pelunasanFormService";

const route = useRoute();
const toast = useToast();

const nomorUrl = route.params.nomor as string;

const printData = ref<any>(null);
const isLoading = ref(true);

const fetchData = async () => {
  try {
    const res = await pelunasanFormService.getPrintData(nomorUrl);
    printData.value = res.data.data;

    // Tunda sedikit agar font/DOM selesai me-render sebelum dialog print muncul
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (e: any) {
    toast.error("Gagal menarik data cetak.");
  } finally {
    isLoading.value = false;
  }
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(Number(val) || 0));

onMounted(() => {
  document.title = `Print Pelunasan - ${nomorUrl}`;
  fetchData();
});
</script>

<template>
  <div
    v-if="isLoading"
    class="d-flex align-center justify-center h-screen bg-white"
  >
    <v-progress-circular indeterminate color="primary" size="48" />
  </div>

  <div v-else class="print-wrapper">
    <div class="print-page">
      <div class="company-header">
        <div>{{ printData.header.PerusahaanNama }}</div>
        <div>{{ printData.header.PerusahaanAlamat }}</div>
        <div v-if="printData.header.PerusahaanTelp">
          {{ printData.header.PerusahaanTelp }}
        </div>
      </div>

      <div class="report-title">P E L U N A S A N &nbsp; P I U T A N G</div>

      <table class="info-table">
        <tr>
          <td style="width: 100px">Nomor</td>
          <td style="width: 15px">:</td>
          <td>{{ printData.header.Nomor }}</td>
        </tr>
        <tr>
          <td>Tanggal</td>
          <td>:</td>
          <td>{{ printData.header.Tanggal }}</td>
        </tr>
        <tr>
          <td>Keterangan</td>
          <td>:</td>
          <td>{{ printData.header.Keterangan }}</td>
        </tr>
      </table>

      <table class="grid-table">
        <thead>
          <tr>
            <th style="width: 40px">No.</th>
            <th style="width: 150px">Nota</th>
            <th style="width: 150px">No Bukti</th>
            <th style="width: 120px; text-align: right">Nilai</th>
            <th style="width: 180px">Keterangan</th>
            <th>Customer</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in printData.details" :key="idx">
            <td>{{ Number(idx) + 1 }}</td>
            <td>{{ item.Nota }}</td>
            <td>{{ item.NoBukti || "-" }}</td>
            <td style="text-align: right">{{ fmtNum(item.Nilai) }}</td>
            <td>{{ item.Keterangan || "PELUNASAN" }}</td>
            <td>{{ item.Customer }}</td>
          </tr>
        </tbody>
      </table>

      <div class="divider-line"></div>

      <div class="signature-area">
        <div class="sig-box">
          <div>Dibuat Oleh,</div>
          <div class="sig-line">(________________)</div>
        </div>
        <div class="sig-box">
          <div>Diterima Oleh,</div>
          <div class="sig-line">(________________)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-wrapper {
  background-color: #525659;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.print-page {
  background-color: white;
  width: 210mm;
  min-height: 140mm;
  padding: 15mm;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
  color: black;
  line-height: 1.2;
}

.company-header {
  margin-bottom: 15px;
  font-weight: bold;
}
.report-title {
  text-align: center;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 15px;
  letter-spacing: 1px;
}
.info-table {
  width: 100%;
  margin-bottom: 15px;
  border: none;
}
.info-table td {
  vertical-align: top;
  padding: 1px 0;
}

.grid-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 40px;
  border: 1px solid black;
}
.grid-table th {
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  padding: 5px 8px;
  text-align: left;
  font-weight: normal;
}
.grid-table th:last-child {
  border-right: none;
}
.grid-table td {
  padding: 5px 8px;
  vertical-align: top;
}

.divider-line {
  border-top: 1px solid black;
  margin-bottom: 5px;
}
.signature-area {
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
}
.sig-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 200px;
}
.sig-line {
  margin-top: 60px;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  .print-wrapper {
    background: white;
    padding: 0;
  }
  .print-page {
    width: 100%;
    margin: 0;
    padding: 15mm;
    box-shadow: none;
  }
}
</style>
