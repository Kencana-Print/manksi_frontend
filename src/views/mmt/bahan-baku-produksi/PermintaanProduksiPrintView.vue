<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

interface DetailItem {
  kode?: string;
  nama?: string;
  Nama_Bahan?: string;
  satuan?: string;
  jumlah?: number;
  qtyMinta?: number;
  komponen?: string;
  ket?: string;
}

interface HeaderData {
  Nomor?: string;
  min_nomor?: string;
  Tanggal?: string;
  min_tanggal?: string;
  Kategori?: string;
  Nomor_SPK?: string;
  spk_nama?: string;
  namaspk?: string;
  Keterangan?: string;
  GudangKode?: string;
  min_cab?: string;
}

const route = useRoute();
const header = ref<HeaderData | null>(null);
const details = ref<DetailItem[]>([]);
const isLoading = ref(true);

const fetchPrintData = async (nomor: string) => {
  isLoading.value = true;
  try {
    const res = await api.get(
      `/mmt/bahan-baku-produksi/permintaan-produksi/${encodeURIComponent(nomor)}`
    );
    const data = res.data?.data;
    if (data) {
      header.value = data.header || data;
      details.value = data.details || data.Details || [];
    }
    document.title = `Print Permintaan Produksi - ${nomor}`;
  } catch (error) {
    console.error("Gagal memuat data cetak permintaan produksi:", error);
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
      <h2 class="form-title">FORM PERMINTAAN BAHAN PRODUKSI (SPK)</h2>

      <div class="header-info">
        <div class="left-column">
          <div class="info-row">
            <span class="label">NO. TRANSAKSI</span>
            <span class="value">: {{ header.Nomor || header.min_nomor }}</span>
          </div>
          <div class="info-row">
            <span class="label">TANGGAL</span>
            <span class="value">: {{ header.Tanggal || header.min_tanggal }}</span>
          </div>
          <div class="info-row">
            <span class="label">KATEGORI</span>
            <span class="value">: {{ header.Kategori || 'MMT/TEKSTIL' }}</span>
          </div>
        </div>

        <div class="right-column">
          <div class="info-row">
            <span class="label">NO. SPK</span>
            <span class="value">: {{ header.Nomor_SPK || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">NAMA SPK</span>
            <span class="value">: {{ header.spk_nama || header.namaspk || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">ALASAN</span>
            <span class="value">: {{ header.Keterangan || 'BARU' }}</span>
          </div>
        </div>
      </div>

      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%">NO</th>
              <th style="width: 18%">KODE BAHAN</th>
              <th style="width: 37%">NAMA BAHAN</th>
              <th style="width: 10%" class="text-right">JUMLAH</th>
              <th style="width: 10%" class="text-center">SATUAN</th>
              <th style="width: 10%">KOMPONEN</th>
              <th style="width: 10%">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in details" :key="index">
              <td class="text-center">{{ index + 1 }}</td>
              <td class="font-weight-medium">{{ item.kode }}</td>
              <td>{{ item.nama || item.Nama_Bahan }}</td>
              <td class="text-right font-weight-bold">{{ item.jumlah || item.qtyMinta || 0 }}</td>
              <td class="text-center">{{ item.satuan || 'ROLL' }}</td>
              <td>{{ item.komponen || 'BODY' }}</td>
              <td>{{ item.ket || '-' }}</td>
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
          <div class="signature-label">Pemohon (Produksi),</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Operator / Staf</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Pemberi (Gudang Bahan),</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Petugas Gudang</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Mengetahui,</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">SPV Produksi</div>
        </div>
      </div>
    </div>

    <div v-else class="text-center pt-10 text-grey">
      Data permintaan tidak ditemukan.
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
