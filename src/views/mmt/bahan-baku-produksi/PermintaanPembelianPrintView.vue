<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

interface PengajuanDetail {
  No: number | string;
  SPK: string;
  Jenis: string;
  Keterangan: string;
  Satuan: string;
  QTY: number | string;
}

interface PengajuanPrintData {
  NoPengajuan: string;
  Tanggal: string;
  Kepada: string;
  JenisPengajuan: string;
  Priority: string;
  Keterangan: string;
  Details: PengajuanDetail[];
  Dibuat: string;
  Diketahui: string;
  Status_Acc: string;
}

const route = useRoute();
const printData = ref<PengajuanPrintData | null>(null);
const isLoading = ref(true);

const filteredDetails = computed(() => {
  if (!printData.value || !Array.isArray(printData.value.Details)) return [];
  return printData.value.Details.map((item, index) => ({
    ...item,
    No: index + 1,
  }));
});

const fetchPrintData = async (nomor: string) => {
  isLoading.value = true;
  try {
    const response = await api.get(
      `/mmt/bahan-baku-produksi/permintaan-pembelian/print/${encodeURIComponent(nomor)}`
    );
    printData.value = response.data;
    document.title = `Cetak Permintaan Pembelian - ${nomor}`;
  } catch (error) {
    console.error("Gagal memuat data cetak pengajuan:", error);
  } finally {
    isLoading.value = false;
  }
};

watch(isLoading, (newValue) => {
  if (newValue === false && printData.value) {
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
  <div class="pp-print-container">
    <div v-if="isLoading" class="text-center pt-10">Memuat data cetak...</div>

    <div v-else-if="printData" class="pp-page">
      <h2 class="form-title">FORM PERMINTAAN PEMBELIAN (PERSIAPAN)</h2>

      <div class="header-info">
        <div class="left-column">
          <div class="info-row">
            <span class="label">NO. PERMINTAAN PEMBELIAN</span>
            <span class="value">: {{ printData.NoPengajuan }}</span>
          </div>
          <div class="info-row">
            <span class="label">TANGGAL</span>
            <span class="value">: {{ printData.Tanggal }}</span>
          </div>
          <div class="info-row">
            <span class="label">JENIS</span>
            <span class="value">: {{ printData.JenisPengajuan }}</span>
          </div>
        </div>

        <div class="right-column">
          <div class="info-row">
            <span class="label">PRIORITY</span>
            <span class="value">: {{ printData.Priority }}</span>
          </div>
          <div class="info-row">
            <span class="label">DITUJUKAN KE</span>
            <span class="value">: {{ printData.Kepada || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">KETERANGAN</span>
            <span class="value">: {{ printData.Keterangan || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%">NO</th>
              <th style="width: 18%">NO SPK</th>
              <th style="width: 40%">NAMA BAHAN / BARANG</th>
              <th style="width: 10%" class="text-right">QTY</th>
              <th style="width: 10%" class="text-center">SATUAN</th>
              <th style="width: 17%">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in filteredDetails"
              :key="'item-' + index"
            >
              <td class="text-center">{{ item.No }}</td>
              <td class="text-center">{{ item.SPK || '-' }}</td>
              <td>{{ item.Jenis }}</td>
              <td class="text-right font-weight-bold">{{ item.QTY }}</td>
              <td class="text-center">{{ item.Satuan }}</td>
              <td>{{ item.Keterangan || '-' }}</td>
            </tr>
            <tr
              v-for="i in Math.max(0, 6 - filteredDetails.length)"
              :key="'empty-' + i"
              class="empty-row"
            >
              <td>&nbsp;</td>
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
          <div class="signature-label">Pemohon,</div>
          <div class="spacer"></div>
          <div class="signer-name">{{ printData.Dibuat }}</div>
          <div class="signer-role">Staff / User</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Mengetahui,</div>
          <div class="spacer"></div>
          <div class="signer-name">{{ printData.Diketahui }}</div>
          <div class="signer-role">
            {{ printData.Status_Acc === 'Y' ? 'SPV / Manager (ACC)' : 'SPV / Manager' }}
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center pt-10 text-grey">
      Data Permintaan Pembelian tidak ditemukan.
    </div>
  </div>
</template>

<style scoped>
.pp-print-container {
  width: 100%;
  min-height: 100vh;
  background-color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  padding: 20px;
  box-sizing: border-box;
}

.pp-page {
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
  width: 110px;
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
  padding: 0 40px;
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
  .pp-print-container {
    padding: 0;
  }
}
</style>
