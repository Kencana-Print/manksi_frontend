<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

interface DetailItem {
  sku?: string;
  barcode?: string;
  nama?: string;
  qty?: number;
  satuan?: string;
  spk?: string;
  keterangan?: string;
}

interface HeaderData {
  Nomor?: string;
  Tanggal?: string;
  GudangKode?: string;
  NamaGudang?: string;
  LokasiProduksi?: string;
  Permintaan?: string;
  Keterangan?: string;
}

const route = useRoute();
const header = ref<HeaderData | null>(null);
const details = ref<DetailItem[]>([]);
const isLoading = ref(true);

const fetchPrintData = async (nomor: string) => {
  isLoading.value = true;
  try {
    const res = await api.get(
      `/mmt/bahan-baku-produksi/realisasi-produksi/${encodeURIComponent(nomor)}`
    );
    const data = res.data?.data;
    if (data) {
      header.value = data.header || data;
      details.value = data.details || [];
    }
    document.title = `Print Realisasi Produksi - ${nomor}`;
  } catch (error) {
    console.error("Gagal memuat data cetak realisasi:", error);
  } finally {
    isLoading.value = false;
  }
};

watch(isLoading, (newValue) => {
  if (newValue === false && header.value) {
    nextTick(() => {
      setTimeout(() => {
        window.print();
      }, 600);
    });
  }
});

onMounted(() => {
  const nomor = route.params.nomor as string;
  if (nomor) fetchPrintData(nomor);
});
</script>

<template>
  <div class="print-container">
    <div v-if="isLoading" class="text-center pt-10">Memuat data cetak...</div>

    <div v-else-if="header" class="print-page">
      <h2 class="form-title">BUKTI REALISASI PRODUKSI (MMT)</h2>

      <div class="header-info">
        <div class="left-column">
          <div class="info-row">
            <span class="label">NO. REALISASI</span>
            <span class="value">: {{ header.Nomor }}</span>
          </div>
          <div class="info-row">
            <span class="label">TANGGAL</span>
            <span class="value">: {{ header.Tanggal }}</span>
          </div>
          <div class="info-row">
            <span class="label">GUDANG ASAL</span>
            <span class="value">: {{ header.GudangKode }} - {{ header.NamaGudang || '' }}</span>
          </div>
        </div>

        <div class="right-column">
          <div class="info-row">
            <span class="label">LOKASI PRODUKSI</span>
            <span class="value">: {{ header.LokasiProduksi || 'GPM' }}</span>
          </div>
          <div class="info-row">
            <span class="label">REF. PERMINTAAN</span>
            <span class="value">: {{ header.Permintaan || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">KETERANGAN</span>
            <span class="value">: {{ header.Keterangan || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%">NO</th>
              <th style="width: 20%">BARCODE ROL</th>
              <th style="width: 15%">KODE BAHAN</th>
              <th style="width: 32%">NAMA BAHAN</th>
              <th style="width: 10%" class="text-right">QTY KELUAR</th>
              <th style="width: 8%" class="text-center">SATUAN</th>
              <th style="width: 10%">NO SPK</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in details" :key="index">
              <td class="text-center">{{ index + 1 }}</td>
              <td class="font-weight-medium">{{ item.barcode || '-' }}</td>
              <td>{{ item.sku }}</td>
              <td>{{ item.nama }}</td>
              <td class="text-right font-weight-bold">{{ item.qty }}</td>
              <td class="text-center">{{ item.satuan || 'ROLL' }}</td>
              <td class="text-center">{{ item.spk || '-' }}</td>
            </tr>
            <tr
              v-for="i in Math.max(0, 6 - details.length)"
              :key="'empty-' + i"
              class="empty-row"
            >
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="signature-footer">
        <div class="signature-box">
          <div class="signature-label">Petugas Gudang Bahan,</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Pemberi Bahan</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Operator / Penerima,</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Produksi</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Mengetahui,</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Kepala Gudang / SPV</div>
        </div>
      </div>
    </div>

    <div v-else class="text-center pt-10 text-grey">
      Data realisasi tidak ditemukan.
    </div>
  </div>
</template>

<style scoped>
.print-container {
  width: 100%;
  min-height: 100vh;
  background-color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  padding: 20px;
  box-sizing: border-box;
}

.print-page {
  max-width: 800px;
  margin: 0 auto;
}

.form-title {
  text-align: center;
  font-size: 15px;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 20px;
}

.header-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 11px;
}

.left-column,
.right-column {
  width: 48%;
}

.info-row {
  display: flex;
  margin-bottom: 4px;
}

.label {
  width: 120px;
  font-weight: 600;
}

.value {
  flex: 1;
}

.items-table-wrapper {
  margin-bottom: 30px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.items-table th,
.items-table td {
  border: 1px solid #000;
  padding: 5px 6px;
}

.items-table th {
  background-color: #f2f2f2;
  font-weight: bold;
  text-align: center;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.font-weight-bold {
  font-weight: bold;
}

.signature-footer {
  display: flex;
  justify-content: space-between;
  padding: 0 30px;
}

.signature-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 160px;
  font-size: 11px;
}

.signature-label {
  font-weight: bold;
  margin-bottom: 10px;
}

.spacer {
  height: 50px;
}

.signer-name {
  font-weight: bold;
  text-decoration: underline;
}

.signer-role {
  font-size: 10px;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 15mm 10mm;
  }
  .print-container {
    padding: 0;
  }
}
</style>
