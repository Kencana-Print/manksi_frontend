<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";

const route = useRoute();
const toast = useToast();

const printData = ref<any>(null);

const num = (val: any) =>
  Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

onMounted(async () => {
  try {
    const nomor = route.params.nomor as string;
    // Panggil API Print
    const res = await api.get(
      `/garmen/bahan-baku/realisasi-minta-form/print/${encodeURIComponent(nomor)}`,
    );
    printData.value = res.data.data;

    // Auto-print setelah rendering selesai
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error: any) {
    toast.error("Gagal memuat data cetak.");
  }
});
</script>

<template>
  <div class="print-container" v-if="printData">
    <!-- Looping 2x untuk format salinan ganda (Atas & Bawah) -->
    <div class="print-section" v-for="copy in 2" :key="copy">
      <!-- HEADER -->
      <div class="header-wrap">
        <div class="header-logo">
          <!-- Sesuaikan path logo dengan project Anda -->
          <img
            src="@/assets/logo.png"
            alt="Kencana Print"
            onerror="this.style.display = 'none'"
          />
        </div>
        <div class="header-title">REALISASI PERMINTAAN BAHAN</div>
      </div>

      <div class="info-wrap">
        <table class="info-table">
          <tr>
            <td width="70">No.Realisasi</td>
            <td width="5">:</td>
            <td width="150">{{ printData.header.promin_nomor }}</td>
            <td width="60">No.Minta</td>
            <td width="5">:</td>
            <td width="150">{{ printData.header.promin_minta }}</td>
            <td width="50">Tujuan</td>
            <td width="5">:</td>
            <td>{{ printData.header.tujuan }}</td>
          </tr>
          <tr>
            <td>Tanggal</td>
            <td>:</td>
            <td>{{ printData.header.tgl_realisasi }}</td>
            <td>Tanggal</td>
            <td>:</td>
            <td colspan="4">{{ printData.header.tgl_minta }}</td>
          </tr>
          <tr>
            <td>SPK</td>
            <td>:</td>
            <td colspan="7">
              {{ printData.header.promin_spk_nomor }} -
              {{ printData.header.spk_nama }}
            </td>
          </tr>
          <tr>
            <td>Keterangan</td>
            <td>:</td>
            <td colspan="7">{{ printData.header.promin_keterangan }}</td>
          </tr>
        </table>

        <!-- Info Barcode di sudut kanan atas -->
        <div class="barcode-info">
          <div v-for="b in printData.barcodes" :key="b.barcode">
            {{ b.barcode }} : {{ num(b.qty) }}
          </div>
          <div class="font-weight-bold mt-1">
            Total: {{ num(printData.totalBarcode) }}
          </div>
        </div>
      </div>

      <!-- TABEL BARANG -->
      <table class="item-table mt-2">
        <thead>
          <tr>
            <th width="30">No</th>
            <th width="120">Kode</th>
            <th>Nama</th>
            <th width="60">Satuan</th>
            <th width="80" class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in printData.details" :key="idx">
            <td class="text-center">{{ Number(idx) + 1 }}</td>
            <td>{{ item.kode }}</td>
            <td>{{ item.nama }}</td>
            <td class="text-center">{{ item.satuan }}</td>
            <td class="text-right">{{ num(item.jumlah) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- TANDA TANGAN -->
      <div class="signature-wrap mt-8">
        <table class="sig-table">
          <tr>
            <th>Diserahkan Oleh</th>
            <th>Diterima,</th>
            <th>Checkers,</th>
            <th>Kepala Gudang,</th>
          </tr>
          <tr>
            <td class="sig-space"></td>
            <td class="sig-space"></td>
            <td class="sig-space"></td>
            <td class="sig-space"></td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pengaturan Kertas Print */
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.print-container {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  background: white;
  color: black;
  font-family: Arial, sans-serif;
  font-size: 11px;
}

.print-section {
  height: 148mm; /* Setengah A4 */
  padding: 10mm 15mm;
  box-sizing: border-box;
  page-break-inside: avoid;
  position: relative;
}

.header-wrap {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
.header-logo img {
  height: 35px;
}
.header-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 1px;
}

.info-wrap {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.info-table td {
  padding: 2px 0;
  vertical-align: top;
}
.barcode-info {
  font-size: 10px;
  text-align: right;
  line-height: 1.3;
}

.item-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  border-top: 2px solid black;
  border-bottom: 2px solid black;
}
.item-table th {
  border-bottom: 1px solid black;
  padding: 4px;
  text-align: left;
}
.item-table td {
  padding: 4px;
}

.signature-wrap {
  width: 100%;
}
.sig-table {
  width: 100%;
  border-collapse: collapse;
}
.sig-table th,
.sig-table td {
  border: 1px solid black;
  text-align: left;
  vertical-align: top;
  padding: 4px 6px;
  width: 25%;
  font-weight: normal;
}
.sig-space {
  height: 70px;
}
</style>
