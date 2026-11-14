<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const route = useRoute();
const router = useRouter();

interface TekstilHeader {
  Nomor: string;
  Shift: number;
  Tanggal: string;
  Mesin: string;
  Gudang: string;
  Operator: string;
  Kode_Bahan: string;
  Nama_Bahan: string;
  Barcode_Roll?: string;
  Panjang_Awal?: number;
  Panjang_BS?: number;
  Lebar_BS?: number;
  Sisa_Panjang_Manual?: number;
  Status?: string;
}

interface TekstilDetail {
  urut?: number;
  Nomor_SPK: string;
  Nama_SPK: string;
  Jumlah_SPK: number;
  Panjang: number;
  Lebar: number;
  Orientasi?: string;
  Pad?: number;
  Tile?: number;
  Cetak_1?: number;
  Cetak_2?: number;
  Cetak_3?: number;
  Cetak_4?: number;
  Cetak_5?: number;
  Cetak_6?: number;
  Cetak_7?: number;
  Jml_Cetak: number;
  Kurang_Cetak?: number;
}

const header = ref<TekstilHeader | null>(null);
const details = ref<TekstilDetail[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");

const loadData = async () => {
  const nomor = route.params.nomor;
  if (!nomor) {
    errorMessage.value = "Nomor LHK Tekstil tidak ditentukan.";
    isLoading.value = false;
    return;
  }
  try {
    isLoading.value = true;
    const res = await api.get(`/mmt/lhk-tekstil-mmt/${encodeURIComponent(String(nomor))}`);
    const data = res.data?.data || res.data;
    header.value = data.header || null;
    details.value = data.details || [];
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || "Gagal memuat data cetak LHK Tekstil.";
  } finally {
    isLoading.value = false;
  }
};

const doPrint = () => {
  window.print();
};

const goBack = () => {
  router.push("/mmt/lhk/tekstil");
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="print-container">
    <!-- Action Toolbar (Hidden during print) -->
    <div class="no-print toolbar mb-4">
      <v-btn color="primary" size="small" class="mr-2" @click="doPrint">
        <v-icon start size="16">mdi-printer</v-icon> Cetak Dokumen
      </v-btn>
      <v-btn variant="outlined" size="small" @click="goBack">
        <v-icon start size="16">mdi-arrow-left</v-icon> Kembali
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center pa-8 text-caption text-grey">
      Memuat dokumen LHK Tekstil...
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="text-center pa-8 text-error font-weight-bold">
      {{ errorMessage }}
    </div>

    <!-- Content to Print -->
    <div v-else-if="header" class="print-sheet">
      <!-- Kop Dokumen -->
      <div class="kop-header">
        <div class="kop-brand">
          <div class="brand-title">KENCANA PRINT - DIVISI MMT</div>
          <div class="brand-subtitle">LAPORAN HASIL KERJA (LHK) PRODUKSI TEKSTIL</div>
        </div>
        <div class="kop-meta">
          <table class="meta-table">
            <tr>
              <td class="lbl">No. LHK</td>
              <td class="sep">:</td>
              <td class="val font-weight-bold">{{ header.Nomor }}</td>
            </tr>
            <tr>
              <td class="lbl">Tanggal</td>
              <td class="sep">:</td>
              <td class="val">{{ formatTanggal(header.Tanggal) }}</td>
            </tr>
            <tr>
              <td class="lbl">Shift</td>
              <td class="sep">:</td>
              <td class="val">{{ header.Shift }}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="divider mb-3"></div>

      <!-- Informasi Header LHK -->
      <div class="header-info-grid mb-3">
        <table class="info-table">
          <tr>
            <td class="lbl" style="width: 120px">Mesin</td>
            <td class="sep">:</td>
            <td class="val">{{ header.Mesin || "-" }}</td>
            <td class="lbl" style="width: 120px">Operator</td>
            <td class="sep">:</td>
            <td class="val">{{ header.Operator || "-" }}</td>
          </tr>
          <tr>
            <td class="lbl">Gudang</td>
            <td class="sep">:</td>
            <td class="val">{{ header.Gudang || "GPM" }}</td>
            <td class="lbl">Bahan</td>
            <td class="sep">:</td>
            <td class="val">{{ header.Nama_Bahan || header.Kode_Bahan || "-" }}</td>
          </tr>
          <tr>
            <td class="lbl">Barcode Rol</td>
            <td class="sep">:</td>
            <td class="val">{{ header.Barcode_Roll || "-" }}</td>
            <td class="lbl">Panjang Awal</td>
            <td class="sep">:</td>
            <td class="val">{{ Number(header.Panjang_Awal || 0).toFixed(2) }} M</td>
          </tr>
        </table>
      </div>

      <!-- Tabel Detail Pekerjaan Tekstil -->
      <table class="detail-print-table mb-4">
        <thead>
          <tr>
            <th style="width: 30px">No</th>
            <th style="width: 130px">No. SPK</th>
            <th>Nama Pekerjaan / SPK</th>
            <th style="width: 80px">Ukuran (M)</th>
            <th style="width: 60px">Order</th>
            <th style="width: 40px">C1</th>
            <th style="width: 40px">C2</th>
            <th style="width: 40px">C3</th>
            <th style="width: 40px">C4</th>
            <th style="width: 40px">C5</th>
            <th style="width: 40px">C6</th>
            <th style="width: 40px">C7</th>
            <th style="width: 65px">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in details" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="font-weight-bold">{{ item.Nomor_SPK }}</td>
            <td>{{ item.Nama_SPK }}</td>
            <td class="text-center">{{ Number(item.Panjang || 0).toFixed(2) }}x{{ Number(item.Lebar || 0).toFixed(2) }}</td>
            <td class="text-right">{{ item.Jumlah_SPK }}</td>
            <td class="text-center">{{ item.Cetak_1 || 0 }}</td>
            <td class="text-center">{{ item.Cetak_2 || 0 }}</td>
            <td class="text-center">{{ item.Cetak_3 || 0 }}</td>
            <td class="text-center">{{ item.Cetak_4 || 0 }}</td>
            <td class="text-center">{{ item.Cetak_5 || 0 }}</td>
            <td class="text-center">{{ item.Cetak_6 || 0 }}</td>
            <td class="text-center">{{ item.Cetak_7 || 0 }}</td>
            <td class="text-right font-weight-bold">{{ item.Jml_Cetak }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-weight-bold">
            <td colspan="4" class="text-right">Total Produksi:</td>
            <td class="text-right">
              {{ details.reduce((sum, d) => sum + (Number(d.Jumlah_SPK) || 0), 0) }}
            </td>
            <td colspan="7"></td>
            <td class="text-right">
              {{ details.reduce((sum, d) => sum + (Number(d.Jml_Cetak) || 0), 0) }}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Tanda Tangan -->
      <div class="ttd-section mt-6">
        <div class="ttd-box">
          <div class="ttd-title">Dibuat Oleh,</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( {{ header.Operator || "Operator" }} )</div>
          <div class="ttd-role">Operator Mesin</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Diperiksa Oleh,</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( ............................. )</div>
          <div class="ttd-role">Admin Produksi</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Disetujui Oleh,</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">( ............................. )</div>
          <div class="ttd-role">Kepala Bagian Tekstil</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.print-sheet {
  background: #ffffff;
  max-width: 210mm;
  margin: 0 auto;
  padding: 15mm;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000000;
}
.kop-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.brand-title {
  font-size: 15px;
  font-weight: bold;
}
.brand-subtitle {
  font-size: 12px;
  font-weight: bold;
  color: #333333;
}
.meta-table td,
.info-table td {
  padding: 2px 4px;
}
.lbl {
  color: #555555;
}
.sep {
  width: 10px;
}
.divider {
  border-bottom: 2px solid #000000;
  margin-top: 6px;
}
.detail-print-table {
  width: 100%;
  border-collapse: collapse;
}
.detail-print-table th,
.detail-print-table td {
  border: 1px solid #000000;
  padding: 4px;
}
.detail-print-table th {
  background-color: #f0f0f0;
  text-align: center;
  font-weight: bold;
}
.ttd-section {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}
.ttd-box {
  width: 28%;
  text-align: center;
}
.ttd-space {
  height: 50px;
}
.ttd-name {
  font-weight: bold;
}
.ttd-role {
  font-size: 10px;
  color: #666666;
}
@media print {
  .no-print {
    display: none !important;
  }
  .print-container {
    padding: 0;
    background: none;
  }
  .print-sheet {
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }
}
</style>
