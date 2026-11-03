<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const route = useRoute();
const router = useRouter();

interface LhkHeader {
  Nomor: string;
  Shift: number;
  Tanggal: string;
  Mesin: string;
  Gudang: string;
  Operator: string;
  Kode_bahan: string;
  Nama_bahan: string;
  Barcode: string;
  Status: string;
  PanjangBS?: number;
  LebarBS?: number;
  PanjangAfal?: number;
  LebarAfal?: number;
}

interface LhkDetail {
  urut: number;
  nomor_spk: string;
  nama_spk: string;
  qty_order: number;
  spk_panjang: number;
  spk_lebar: number;
  cetak1: number;
  cetak2: number;
  cetak3: number;
  cetak4: number;
  cetak5: number;
  cetak6: number;
  cetak7: number;
  totalcetak: number;
  cetakmeter: number;
  kurang_cetak: number;
  sudah_cetak_sebelumnya: number;
}

const header = ref<LhkHeader | null>(null);
const details = ref<LhkDetail[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");

const loadData = async () => {
  const nomor = route.params.nomor;
  if (!nomor) {
    errorMessage.value = "Nomor LHK tidak ditentukan.";
    isLoading.value = false;
    return;
  }
  try {
    isLoading.value = true;
    const res = await api.get("/mmt/lhk/mesin-cetak/details", {
      params: { nomor: String(nomor) },
    });
    const data = res.data?.data || res.data;
    header.value = data.header || null;
    details.value = data.details || [];
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || "Gagal memuat data cetak LHK.";
  } finally {
    isLoading.value = false;
  }
};

const doPrint = () => {
  window.print();
};

const goBack = () => {
  router.push("/mmt/lhk/mesin-cetak");
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
      Memuat dokumen LHK Cetak Mesin...
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
          <div class="brand-subtitle">LAPORAN HASIL KERJA (LHK) MESIN CETAK</div>
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
              <td class="lbl">Status</td>
              <td class="sep">:</td>
              <td class="val font-weight-bold">{{ header.Status || 'DRAFT' }}</td>
            </tr>
          </table>
        </div>
      </div>

      <hr class="divider" />

      <!-- Info Mesin & Material -->
      <div class="info-grid">
        <div class="info-box">
          <table class="info-table">
            <tr>
              <td class="lbl">Mesin</td>
              <td class="sep">:</td>
              <td class="val font-weight-bold">{{ header.Mesin || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">Operator</td>
              <td class="sep">:</td>
              <td class="val">{{ header.Operator || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">Shift</td>
              <td class="sep">:</td>
              <td class="val">{{ header.Shift || '1' }}</td>
            </tr>
          </table>
        </div>
        <div class="info-box">
          <table class="info-table">
            <tr>
              <td class="lbl">Bahan Baku</td>
              <td class="sep">:</td>
              <td class="val">{{ header.Kode_bahan }} - {{ header.Nama_bahan || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">Barcode Roll</td>
              <td class="sep">:</td>
              <td class="val">{{ header.Barcode || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">BS / Afal</td>
              <td class="sep">:</td>
              <td class="val">
                BS: {{ header.PanjangBS || 0 }}m x {{ header.LebarBS || 0 }}m | 
                Afal: {{ header.PanjangAfal || 0 }}m x {{ header.LebarAfal || 0 }}m
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Tabel Rincian Detail Cetak -->
      <table class="table-data mt-3">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th style="width: 130px;">No SPK</th>
            <th>Nama Order / SPK</th>
            <th style="width: 85px;">Ukuran (PxL)</th>
            <th style="width: 65px;">Order</th>
            <th style="width: 65px;">Sdh Ctk</th>
            <th style="width: 35px;">1</th>
            <th style="width: 35px;">2</th>
            <th style="width: 35px;">3</th>
            <th style="width: 35px;">4</th>
            <th style="width: 35px;">5</th>
            <th style="width: 35px;">6</th>
            <th style="width: 35px;">7</th>
            <th style="width: 70px;">Total Ctk</th>
            <th style="width: 75px;">Meter Ctk</th>
            <th style="width: 65px;">Kurang</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, idx) in details" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="font-weight-bold">{{ d.nomor_spk }}</td>
            <td>{{ d.nama_spk }}</td>
            <td class="text-center">{{ d.spk_panjang }} x {{ d.spk_lebar }}</td>
            <td class="text-end">{{ d.qty_order }}</td>
            <td class="text-end">{{ d.sudah_cetak_sebelumnya }}</td>
            <td class="text-center">{{ d.cetak1 || '-' }}</td>
            <td class="text-center">{{ d.cetak2 || '-' }}</td>
            <td class="text-center">{{ d.cetak3 || '-' }}</td>
            <td class="text-center">{{ d.cetak4 || '-' }}</td>
            <td class="text-center">{{ d.cetak5 || '-' }}</td>
            <td class="text-center">{{ d.cetak6 || '-' }}</td>
            <td class="text-center">{{ d.cetak7 || '-' }}</td>
            <td class="text-end font-weight-bold">{{ d.totalcetak }}</td>
            <td class="text-end font-weight-bold">{{ Number(d.cetakmeter || 0).toFixed(2) }}m</td>
            <td class="text-end">{{ d.kurang_cetak }}</td>
          </tr>
          <tr v-if="details.length === 0">
            <td colspan="16" class="text-center py-4 text-grey">Tidak ada rincian pengerjaan LHK.</td>
          </tr>
        </tbody>
        <tfoot v-if="details.length > 0">
          <tr class="total-row">
            <td colspan="4" class="text-end font-weight-bold">TOTAL :</td>
            <td class="text-end font-weight-bold">
              {{ details.reduce((s, it) => s + Number(it.qty_order || 0), 0) }}
            </td>
            <td></td>
            <td colspan="7"></td>
            <td class="text-end font-weight-bold">
              {{ details.reduce((s, it) => s + Number(it.totalcetak || 0), 0) }}
            </td>
            <td class="text-end font-weight-bold">
              {{ details.reduce((s, it) => s + Number(it.cetakmeter || 0), 0).toFixed(2) }}m
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- Kolom Tanda Tangan -->
      <div class="ttd-grid mt-6">
        <div class="ttd-box">
          <div class="ttd-title">Operator Cetak</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">({{ header.Operator || '................................' }})</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Kepala Shift / Leader</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">(................................)</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Supervisor Produksi</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">(................................)</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-title">Verifikator / Admin LHK</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">(................................)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-container {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}
.toolbar {
  display: flex;
  align-items: center;
}
.print-sheet {
  background: white;
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  color: #111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 11px;
}
.kop-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.brand-title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.brand-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #333;
  margin-top: 2px;
}
.meta-table, .info-table {
  border-collapse: collapse;
}
.meta-table td, .info-table td {
  padding: 2px 4px;
  font-size: 11px;
}
.lbl {
  color: #555;
  width: 75px;
}
.sep {
  width: 8px;
}
.divider {
  border: none;
  border-top: 1.5px solid #222;
  margin: 10px 0;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: #fafafa;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.table-data {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.table-data th, .table-data td {
  border: 1px solid #bbb;
  padding: 4px 6px;
}
.table-data th {
  background: #f0f0f0;
  font-weight: 700;
  text-align: center;
}
.total-row {
  background: #fafafa;
}
.ttd-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  text-align: center;
}
.ttd-title {
  font-weight: 600;
  font-size: 11px;
}
.ttd-space {
  height: 60px;
}
.ttd-name {
  font-size: 11px;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
  body {
    background: white !important;
  }
  .print-container {
    padding: 0 !important;
    background: white !important;
  }
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
}
</style>

