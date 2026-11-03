<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);

interface DetailItem {
  No: number;
  SPK: string;
  Nama_SPK: string;
  KdBarang: string;
  Bahan: string;
  Kota: string;
  Jumlah: number;
  Harga: number;
  Subtotal: number;
  Keterangan: string;
}

const route = useRoute();
const printHeader = ref<any>(null);
const printDetails = ref<DetailItem[]>([]);
const isLoading = ref(true);

const loadPrintData = async () => {
  const nomor = route.params.nomor;
  if (!nomor) return;
  isLoading.value = true;
  try {
    const res = await api.get(`/mmt/po-external-mmt/print/${encodeURIComponent(String(nomor))}`);
    const data = res.data?.data || res.data;
    if (data) {
      printHeader.value = data.header || data.Header || data;
      printDetails.value = data.details || data.Detail || [];
    }
  } catch (err) {
    console.error("Gagal load cetak PO External:", err);
  } finally {
    isLoading.value = false;
  }
};

const doPrint = () => {
  window.print();
};

onMounted(loadPrintData);
</script>

<template>
  <div class="print-wrapper">
    <div class="no-print actions-bar">
      <v-btn color="primary" size="small" @click="doPrint">Cetak Dokumen</v-btn>
      <v-btn variant="outlined" size="small" @click="$router.back()">Kembali</v-btn>
    </div>

    <div v-if="isLoading" class="pa-8 text-center text-caption">
      Memuat dokumen PO External...
    </div>

    <div v-else-if="printHeader" class="print-page">
      <div class="header-section">
        <div>
          <div class="company-name">MANKSI PRINTING (MMT)</div>
          <div class="company-desc">PO EXTERNAL / MAKLON LUAR</div>
        </div>
        <div class="doc-title-box">
          <div class="doc-title">PURCHASE ORDER EXTERNAL</div>
          <div class="doc-number">No: {{ printHeader.Nomor || printHeader.pe_nomor }}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="info-grid">
        <div class="info-col">
          <table class="info-table">
            <tr>
              <td class="lbl">Tanggal PO</td>
              <td>: {{ printHeader.Tanggal || printHeader.pe_tanggal || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">Deadline</td>
              <td>: {{ printHeader.DateLinePO || printHeader.pe_dateline || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">Cabang</td>
              <td>: {{ printHeader.Cab || printHeader.pe_cab || '-' }}</td>
            </tr>
          </table>
        </div>
        <div class="info-col">
          <table class="info-table">
            <tr>
              <td class="lbl">Supplier</td>
              <td class="font-weight-bold">: {{ printHeader.Supplier || printHeader.Sup_nama || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">No. SPK</td>
              <td>: {{ printHeader.SPK || printHeader.pe_spk || '-' }}</td>
            </tr>
            <tr>
              <td class="lbl">Keterangan</td>
              <td>: {{ printHeader.Keterangan || printHeader.pe_keterangan || '-' }}</td>
            </tr>
          </table>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35px" class="text-center">No</th>
            <th>SPK / Pekerjaan</th>
            <th style="width: 140px">Bahan</th>
            <th style="width: 120px">Kota Alokasi</th>
            <th style="width: 80px" class="text-right">Qty</th>
            <th style="width: 110px" class="text-right">Harga</th>
            <th style="width: 130px" class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(it, idx) in printDetails" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td>{{ it.SPK }} - {{ it.Nama_SPK }}</td>
            <td>{{ it.Bahan }}</td>
            <td>{{ it.Kota }}</td>
            <td class="text-right">{{ fmt(it.Jumlah) }}</td>
            <td class="text-right">{{ fmt(it.Harga) }}</td>
            <td class="text-right font-weight-medium">{{ fmt(it.Subtotal || (it.Jumlah * it.Harga)) }}</td>
          </tr>
          <tr v-if="printDetails.length === 0">
            <td colspan="7" class="text-center pa-2 text-caption">Tidak ada item detail.</td>
          </tr>
        </tbody>
      </table>

      <div class="sign-section">
        <div class="sign-box">
          <div>Dibuat Oleh,</div>
          <div class="sign-space"></div>
          <div>( Purchasing )</div>
        </div>
        <div class="sign-box">
          <div>Mengetahui,</div>
          <div class="sign-space"></div>
          <div>( Manager )</div>
        </div>
        <div class="sign-box">
          <div>Diterima Oleh,</div>
          <div class="sign-space"></div>
          <div>( Rekanan / Vendor )</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-wrapper { background: #f0f0f0; min-height: 100vh; padding: 16px; display: flex; flex-direction: column; align-items: center; }
.actions-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.print-page { background: white; width: 210mm; min-height: 297mm; padding: 15mm; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #212121; }
.header-section { display: flex; justify-content: space-between; align-items: flex-start; }
.company-name { font-size: 15px; font-weight: bold; }
.company-desc { font-size: 10px; color: #555; }
.doc-title-box { text-align: right; }
.doc-title { font-size: 15px; font-weight: bold; color: #1565c0; }
.doc-number { font-size: 12px; font-weight: 600; }
.divider { height: 2px; background: #1565c0; margin: 10px 0 14px 0; }
.info-grid { display: flex; gap: 20px; margin-bottom: 14px; }
.info-col { flex: 1; }
.info-table { width: 100%; border-collapse: collapse; }
.info-table td { padding: 2px 0; }
.info-table td.lbl { width: 85px; color: #666; }
.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.data-table th, .data-table td { border: 1px solid #ccc; padding: 5px 6px; }
.data-table th { background: #e3f2fd; color: #0d47a1; font-weight: 700; }
.sign-section { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
.sign-box { text-align: center; width: 140px; }
.sign-space { height: 55px; }
@media print {
  .no-print { display: none !important; }
  .print-wrapper { background: transparent; padding: 0; }
  .print-page { box-shadow: none; width: 100%; min-height: auto; padding: 0; }
}
</style>
