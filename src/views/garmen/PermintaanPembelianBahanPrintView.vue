<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  permintaanPembelianBahanService,
  type PermintaanPembelianBahanPrintData,
} from "@/services/garmen/permintaanPembelianBahanService";
import { pesanError } from "@/services/piutang/rekapPembayaranService";

const route = useRoute();
const data = ref<PermintaanPembelianBahanPrintData | null>(null);
const isLoading = ref(true);

// Ada bahan SB: tampilkan Konstruksi/Panjang/Lebar, bukan Setting
const isSpanduk = computed(() =>
  (data.value?.details ?? []).some((d) =>
    String(d.Kode ?? "")
      .toUpperCase()
      .startsWith("SB"),
  ),
);

const fmtUkuran = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ""
    ? ""
    : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });

onMounted(async () => {
  try {
    const res = await permintaanPembelianBahanService.getPrintData(
      String(route.params.nomor),
    );
    data.value = res.data.data;

    // Trigger print otomatis setelah DOM dirender
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error) {
    alert(pesanError(error, "Gagal memuat data cetak."));
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="pa-4 text-center">Memuat dokumen...</div>
  <div v-else-if="data" class="print-container">
    <!-- Dua rangkap atas-bawah -->
    <div v-for="copy in 2" :key="copy" class="print-block">
      <div class="header-area">
        <div class="doc-title">PERMINTAAN PEMBELIAN BAHAN</div>
        <div class="logo-area">
          <img src="/logo.png" alt="Kencana Print" style="height: 30px" />
        </div>
      </div>

      <table class="info-table">
        <tr>
          <td width="90">No.Permintaan</td>
          <td width="10">:</td>
          <td width="200">{{ data.header.Nomor }}</td>
          <td width="60">Cabang</td>
          <td width="10">:</td>
          <td>{{ data.header.Cabang }}</td>
        </tr>
        <tr>
          <td>Tanggal</td>
          <td>:</td>
          <td>{{ data.header.Tanggal }}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>Keterangan</td>
          <td>:</td>
          <td colspan="4">{{ data.header.Keterangan }}</td>
        </tr>
      </table>

      <table class="detail-table">
        <thead>
          <tr>
            <th width="30">No</th>
            <th width="100">Kode</th>
            <th>Nama</th>
            <template v-if="isSpanduk">
              <th width="70">Konstruksi</th>
              <th width="45" class="tr">Panjang</th>
              <th width="45" class="tr">Lebar</th>
            </template>
            <th v-else width="55">Setting</th>
            <th width="50">Satuan</th>
            <th width="70" class="tr">Jumlah</th>
            <th width="120">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in data.details" :key="i">
            <td class="tc">{{ Number(i) + 1 }}</td>
            <td>{{ item.Kode }}</td>
            <td>{{ item.Nama }}</td>
            <template v-if="isSpanduk">
              <td class="tc">{{ item.Konstruksi }}</td>
              <td class="tr">{{ fmtUkuran(item.Panjang) }}</td>
              <td class="tr">{{ fmtUkuran(item.Lebar) }}</td>
            </template>
            <td v-else class="tc">{{ item.Setting }}</td>
            <td class="tc">{{ item.Satuan }}</td>
            <td class="tr fw">{{ fmtUkuran(item.Jumlah) }}</td>
            <td>{{ item.Keterangan }}</td>
          </tr>
        </tbody>
      </table>

      <div class="spacer"></div>

      <div class="ttd-area">
        <div class="ttd-box">
          <div class="ttd-title">Pemohon,</div>
          <div class="ttd-sign">(........................)</div>
          <div class="ttd-name">Admin Gudang</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Mengetahui,</div>
          <div class="ttd-sign">(........................)</div>
          <div class="ttd-name">Kepala Gudang</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  max-width: 210mm;
  margin: 0 auto;
}

.print-block {
  /* (297mm - 2 x margin 10mm) / 2 = 138.5mm; dibulatkan ke bawah agar tidak melompat halaman */
  height: 138mm;
  padding: 10mm 15mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border-bottom: 1px dashed #ccc;
  break-inside: avoid;
  page-break-inside: avoid;
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
