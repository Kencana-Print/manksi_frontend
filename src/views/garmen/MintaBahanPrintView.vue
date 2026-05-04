<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { mintaBahanFormService } from "@/services/garmen/mintaBahanFormService";

const route = useRoute();
const data = ref<any>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const res = await mintaBahanFormService.getPrintData(
      route.params.nomor as string,
    );
    data.value = res.data.data;

    // Trigger Print otomatis setelah DOM dirender
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error) {
    console.error(error);
    alert("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="pa-4 text-center">Memuat dokumen...</div>
  <div v-else class="print-container">
    <!-- Lakukan perulangan 2 kali untuk rangkap atas-bawah -->
    <div v-for="copy in 2" :key="copy" class="print-block">
      <!-- Header Area -->
      <div class="header-area">
        <div class="doc-title">PERMINTAAN BAHAN</div>
        <div class="logo-area">
          <img src="/logo.png" alt="Kencana Print" style="height: 30px" />
        </div>
      </div>

      <!-- Info Area -->
      <table class="info-table">
        <tr>
          <td width="90">No.Permintaan</td>
          <td width="10">:</td>
          <td width="200">{{ data.header.Nomor }}</td>
          <td width="60">Cabang</td>
          <td width="10">:</td>
          <td>{{ data.header.Cabang }} {{ data.header.Divisi }}</td>
        </tr>
        <tr>
          <td>Tanggal</td>
          <td>:</td>
          <td>{{ data.header.Tanggal }}</td>
          <td>SPK</td>
          <td>:</td>
          <td>{{ data.header.SpkNomor }}</td>
        </tr>
        <tr>
          <td>Keterangan</td>
          <td>:</td>
          <td>{{ data.header.Keterangan }}</td>
          <td></td>
          <td></td>
          <td class="spk-name">{{ data.header.SpkNama }}</td>
        </tr>
      </table>

      <!-- Detail Barang -->
      <table class="detail-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th width="100">Kode</th>
            <th>Nama</th>
            <th width="50">Satuan</th>
            <th width="70" class="tr">Jumlah</th>
            <th width="100">Komponen</th>
            <th width="120">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in data.details" :key="i">
            <td class="tc">{{ Number(i) + 1 }}</td>
            <td>{{ item.Kode }}</td>
            <td>{{ item.Nama }}</td>
            <td class="tc">{{ item.Satuan }}</td>
            <td class="tr fw">
              {{ Number(item.Jumlah).toLocaleString("id-ID") }}
            </td>
            <td>{{ item.Komponen }}</td>
            <td>{{ item.Keterangan }}</td>
          </tr>
        </tbody>
      </table>

      <div class="spacer"></div>

      <!-- TTD Area -->
      <div class="ttd-area">
        <div class="ttd-box">
          <div class="ttd-title">Pemohon,</div>
          <div class="ttd-sign">(........................)</div>
          <div class="ttd-name">Spv/Admin</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Menyetujui,</div>
          <div class="ttd-sign">(........................)</div>
          <div class="ttd-name">Kepala Gudang</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Diserahkan,</div>
          <div class="ttd-sign">(........................)</div>
          <div class="ttd-name">Helper Gudang</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Diterima,</div>
          <div class="ttd-sign">(........................)</div>
          <div class="ttd-name">Helper Cutting</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS khusus cetak */
@media print {
  @page {
    margin: 10mm;
    size: A4 portrait;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.print-container {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: #000;
  background: white;
  width: 100%;
  max-width: 210mm; /* A4 width */
  margin: 0 auto;
}

.print-block {
  height: 140mm; /* Setengah kertas A4 */
  padding: 10mm 15mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border-bottom: 1px dashed #ccc;
}
.print-block:last-child {
  border-bottom: none;
}

.header-area {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}
.doc-title {
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 1px;
}

.info-table {
  width: 100%;
  margin-bottom: 10px;
  line-height: 1.4;
}
.info-table td {
  vertical-align: top;
}
.spk-name {
  font-weight: bold;
  text-transform: uppercase;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 4px 6px;
}
.detail-table th {
  text-align: left;
  background-color: #f5f5f5 !important;
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

.spacer {
  flex-grow: 1;
}

.ttd-area {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  border-top: 1px solid #000;
  padding-top: 10px;
}
.ttd-box {
  width: 20%;
  text-align: center;
}
.ttd-title {
  margin-bottom: 40px;
}
.ttd-name {
  font-size: 10px;
  margin-top: 5px;
}
</style>
