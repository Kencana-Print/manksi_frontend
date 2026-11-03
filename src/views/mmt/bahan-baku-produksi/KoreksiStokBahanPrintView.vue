<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

interface KoreksiDetail {
  NoUrut: number;
  KodeBarang: string;
  SKU: string;
  NamaBarang: string;
  Satuan: string;
  Panjang: number;
  Lebar: number;
  Qty: number;
  System: number;
  Fisik: number;
  Harga: number;
  Nilai: number;
}

interface KoreksiHeader {
  Nomor: string;
  Tanggal: string;
  GudangKode: string;
  Gudang: string;
  TypeKor: number;
  Tipe_Nama: string;
  Keterangan: string;
  Total: number;
}

const route = useRoute();
const header = ref<KoreksiHeader | null>(null);
const details = ref<KoreksiDetail[]>([]);
const isLoading = ref(true);

const fetchPrintData = async (nomor: string) => {
  isLoading.value = true;
  try {
    const res = await api.get(
      `/mmt/bahan-baku-produksi/koreksi-stok/${encodeURIComponent(nomor)}`
    );
    const data = res.data?.data;
    if (data) {
      header.value = data.header;
      details.value = data.details || [];
    }
    document.title = `Print Koreksi Stok - ${nomor}`;
  } catch (error) {
    console.error("Gagal memuat data cetak koreksi:", error);
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
  <div class="kor-print-container">
    <div v-if="isLoading" class="text-center pt-10">Memuat data cetak...</div>

    <div v-else-if="header" class="kor-page">
      <h2 class="form-title">BUKTI KOREKSI PENYESUAIAN STOK (MMT)</h2>

      <div class="header-info">
        <div class="left-column">
          <div class="info-row">
            <span class="label">NO. KOREKSI</span>
            <span class="value">: {{ header.Nomor }}</span>
          </div>
          <div class="info-row">
            <span class="label">TANGGAL</span>
            <span class="value">: {{ header.Tanggal }}</span>
          </div>
          <div class="info-row">
            <span class="label">GUDANG</span>
            <span class="value">: {{ header.GudangKode }} - {{ header.Gudang }}</span>
          </div>
        </div>

        <div class="right-column">
          <div class="info-row">
            <span class="label">TIPE KOREKSI</span>
            <span class="value">: {{ header.Tipe_Nama }}</span>
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
              <th style="width: 18%">KODE BAHAN</th>
              <th style="width: 37%">NAMA BAHAN</th>
              <th style="width: 10%" class="text-center">SATUAN</th>
              <th style="width: 10%" class="text-right">STOK SISTEM</th>
              <th style="width: 10%" class="text-right">STOK FISIK</th>
              <th style="width: 10%" class="text-right">SELISIH</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in details" :key="index">
              <td class="text-center">{{ index + 1 }}</td>
              <td class="font-weight-medium">{{ item.KodeBarang }}</td>
              <td>{{ item.NamaBarang }}</td>
              <td class="text-center">{{ item.Satuan }}</td>
              <td class="text-right text-grey-darken-2">{{ item.System }}</td>
              <td class="text-right">{{ item.Fisik }}</td>
              <td class="text-right font-weight-bold">
                {{ item.Qty > 0 ? `+${item.Qty}` : item.Qty }}
              </td>
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
          <div class="signature-label">Petugas Koreksi,</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Staf Gudang</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Pemeriksa (Audit),</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Staff Audit / Finance</div>
        </div>

        <div class="signature-box">
          <div class="signature-label">Menyetujui,</div>
          <div class="spacer"></div>
          <div class="signer-name">....................</div>
          <div class="signer-role">Kepala Gudang / Manager</div>
        </div>
      </div>
    </div>

    <div v-else class="text-center pt-10 text-grey">
      Data koreksi tidak ditemukan.
    </div>
  </div>
</template>

<style scoped>
.kor-print-container {
  width: 100%;
  min-height: 100vh;
  background-color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  padding: 20px;
  box-sizing: border-box;
}

.kor-page {
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
  .kor-print-container {
    padding: 0;
  }
}
</style>
