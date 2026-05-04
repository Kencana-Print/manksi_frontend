<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const data = ref<any[]>([]);

onMounted(async () => {
  try {
    // Tambahkan encodeURIComponent di sini agar '/' tidak dianggap folder oleh Axios
    const nomorEncoded = encodeURIComponent(route.params.nomor as string);

    const res = await api.get(
      `/garmen/bahan-baku/retur-bahan/form/print/${nomorEncoded}`,
    );

    data.value = res.data.data;
    setTimeout(() => window.print(), 500);
  } catch (e) {
    console.error("Gagal load data cetak", e);
  }
});
</script>

<template>
  <div class="print-container" v-if="data.length > 0">
    <!-- Loop 2 kali untuk 2 rangkap (Atas & Bawah) -->
    <div v-for="i in 2" :key="i" class="print-section">
      <div class="report-header">
        <h2 class="title">Retur Material</h2>
        <div class="header-info">
          <div class="left-info">
            <div class="row">
              <span class="label">Nomor</span>: {{ data[0].proret_nomor }}
            </div>
            <div class="row">
              <span class="label">Tanggal</span>: {{ data[0].proret_tanggal }}
            </div>
            <div class="row">
              <span class="label">Keterangan</span>:
              {{ data[0].proret_keterangan }}
            </div>
          </div>
          <div class="right-info">
            <div class="row">
              <span class="label">Gudang Tujuan</span>: {{ data[0].tujuan }}
            </div>
            <div class="row">
              <span class="label">Gudang Produksi</span>: {{ data[0].dari }}
            </div>
          </div>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th width="80">Kode</th>
            <th>Nama</th>
            <th width="60">Satuan</th>
            <th width="70">Jumlah</th>
            <th>No.Permintaan & SPK</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in data" :key="index">
            <td class="text-center">{{ index + 1 }}</td>
            <td>{{ item.kode }}</td>
            <td>{{ item.nama }}</td>
            <td class="text-center">{{ item.satuan }}</td>
            <td class="text-right">{{ Number(item.jumlah).toFixed(2) }}</td>
            <td>{{ item.referensi }}</td>
            <td>{{ item.ket_detail }}</td>
          </tr>
        </tbody>
      </table>

      <div class="report-footer">
        <div class="signature-box">
          <div class="sig-title">Diserahkan Oleh</div>
          <div class="sig-line"></div>
        </div>
        <div class="signature-box">
          <div class="sig-title">Diterima,</div>
          <div class="sig-line"></div>
        </div>
        <div class="signature-box">
          <div class="sig-title">Checkers,</div>
          <div class="sig-line"></div>
        </div>
        <div class="signature-box">
          <div class="sig-title">Kepala Gudang,</div>
          <div class="sig-line"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-container {
  font-family: "Arial", sans-serif;
  font-size: 11px;
  padding: 20px;
}
.print-section {
  height: 48%;
  border-bottom: 1px dashed #ccc;
  margin-bottom: 40px;
  padding-bottom: 20px;
}
.print-section:last-child {
  border-bottom: none;
}

.title {
  text-align: center;
  text-decoration: underline;
  margin-bottom: 15px;
}
.header-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.label {
  display: inline-block;
  width: 100px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}
.report-table th,
.report-table td {
  border: 1px solid black;
  padding: 4px;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}

.report-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
.signature-box {
  width: 22%;
  text-align: center;
}
.sig-title {
  height: 20px;
  border-bottom: 1px solid black;
  margin-bottom: 40px;
}
.sig-line {
  border-bottom: 1px dashed black;
}

@media print {
  @page {
    size: A4;
    margin: 0;
  }
  .print-container {
    padding: 1cm;
  }
}
</style>
