<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { permintaanPembelianFormService } from "@/services/garmen/permintaanPembelianFormService";

const route = useRoute();
const toast = useToast();

const nomorParam = computed(() => route.params.nomor as string);
const isLoading = ref(true);

const header = ref<any>({});
const items = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await permintaanPembelianFormService.getDetail(
      nomorParam.value,
    );
    const data = res.data.data;
    header.value = data.header;
    items.value = data.items || [];

    // Langsung buka dialog print saat data selesai dimuat
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error) {
    toast.error("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
});

// Format Angka ke Rupiah / Pemisah Ribuan
const num = (val: number | string) => {
  const n = Number(val) || 0;
  return n.toLocaleString("id-ID");
};

// Format Tanggal
const fmtDate = (val: string) => {
  if (!val) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Gabungkan Nama, Spesifikasi, Kegunaan menjadi satu (Sesuai Layout Cetak)
const getNamaLengkap = (item: any) => {
  let res = item.nama || "";
  if (item.ket) res += `\n${item.ket}`;
  if (item.kegunaan) res += `\n${item.kegunaan}`;
  return res;
};

// Menambahkan baris kosong agar tabel minimal punya 15 baris (seperti logika tabel 'tampung' Delphi)
const MIN_ROWS = 15;
const paddedItems = computed(() => {
  const arr = [...items.value];
  while (arr.length < MIN_ROWS) {
    arr.push({ isEmpty: true });
  }
  return arr;
});

const grandTotal = computed(() => {
  return items.value.reduce((sum, curr) => sum + (Number(curr.total) || 0), 0);
});
</script>

<template>
  <div v-if="isLoading" class="loading-state">Menyiapkan dokumen cetak...</div>
  <div v-else class="print-container">
    <!-- HEADER LAPORAN -->
    <div class="report-header">
      <h3 class="report-title">
        FORMULIR PENGAJUAN PERMINTAAN {{ header.mb_jenis }}
      </h3>

      <div class="info-grid">
        <div class="info-col">
          <div class="info-row">
            <span class="info-lbl">No.Pengajuan</span
            ><span class="info-sep">:</span>
            <span class="info-val font-weight-bold">{{ header.mb_nomor }}</span>
          </div>
          <div class="info-row">
            <span class="info-lbl">Tanggal</span><span class="info-sep">:</span>
            <span class="info-val">{{ fmtDate(header.mb_tanggal_fmt) }}</span>
          </div>
          <div class="info-row">
            <span class="info-lbl">Priority</span
            ><span class="info-sep">:</span>
            <span class="info-val">{{ header.mb_priority }}</span>
          </div>
          <div class="info-row">
            <span class="info-lbl">Keterangan</span
            ><span class="info-sep">:</span>
            <span class="info-val">{{ header.mb_ket }}</span>
          </div>
        </div>

        <div class="info-col">
          <div class="info-row">
            <span class="info-lbl">Nama</span><span class="info-sep">:</span>
            <span class="info-val uppercase">{{ header.user_create }}</span>
          </div>
          <div class="info-row">
            <span class="info-lbl">Lokasi</span><span class="info-sep">:</span>
            <span class="info-val uppercase">{{ header.mb_cab }}</span>
          </div>
          <div class="info-row">
            <span class="info-lbl">Bagian</span><span class="info-sep">:</span>
            <span class="info-val uppercase">{{ header.mb_bagian }}</span>
          </div>
          <div class="info-row">
            <span class="info-lbl">Pengajuan ke</span
            ><span class="info-sep">:</span>
            <span class="info-val uppercase">{{ header.mb_mintake }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TABEL DETAIL -->
    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 30px" class="text-center">No</th>
          <th style="text-align: left">Nama/Spesifikasi dan Kegunaan</th>
          <th style="width: 60px" class="text-center">Satuan</th>
          <th style="width: 60px" class="text-center">Qty</th>
          <th style="width: 100px" class="text-right">Nominal</th>
          <th style="width: 120px" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in paddedItems" :key="idx">
          <td class="text-center">{{ item.isEmpty ? "" : idx + 1 }}</td>
          <td style="white-space: pre-wrap">
            {{ item.isEmpty ? "" : getNamaLengkap(item) }}
          </td>
          <td class="text-center">{{ item.isEmpty ? "" : item.satuan }}</td>
          <td class="text-center">
            {{ item.isEmpty ? "" : num(item.jumlah) }}
          </td>
          <td class="text-right">{{ item.isEmpty ? "" : num(item.harga) }}</td>
          <td class="text-right">{{ item.isEmpty ? "" : num(item.total) }}</td>
        </tr>
        <!-- Baris Grand Total -->
        <tr class="total-row">
          <td colspan="5" class="font-weight-bold" style="padding-left: 8px">
            Total
          </td>
          <td class="text-right font-weight-bold">{{ num(grandTotal) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- SIGNATURE BLOCK -->
    <div class="signature-section">
      <table class="sig-table">
        <tr>
          <td>Diajukan Oleh,</td>
          <td>Disetujui Oleh,</td>
          <td>Disetujui Oleh,</td>
        </tr>
        <tr>
          <td class="sig-space">
            ( <span class="uppercase">{{ header.user_create }}</span> )
          </td>
          <td class="sig-space">( ATASAN )</td>
          <td class="sig-space">( KEUANGAN )</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Reset dasar untuk memastikan layout print konsisten */
@import url("https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap");

.print-container {
  width: 100%;
  max-width: 210mm; /* A4 Width */
  margin: 0 auto;
  background: white;
  padding: 15mm;
  font-family: Arial, Helvetica, sans-serif;
  color: black;
  font-size: 11px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 14px;
  font-weight: bold;
}

.uppercase {
  text-transform: uppercase;
}
.font-weight-bold {
  font-weight: bold;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}

/* -- Header Layout -- */
.report-title {
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 20px;
}

.info-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.info-col {
  width: 48%;
}
.info-row {
  display: flex;
  margin-bottom: 4px;
}
.info-lbl {
  width: 90px;
}
.info-sep {
  width: 10px;
}
.info-val {
  flex: 1;
}

/* -- Table Layout -- */
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}
.print-table th,
.print-table td {
  border: 1px solid black;
  padding: 4px 6px;
  vertical-align: top;
}
.print-table th {
  font-weight: bold;
  text-align: center;
}
/* Menetapkan tinggi seragam untuk baris kosong (pengganti tabel tampung) */
.print-table td {
  height: 20px;
}
.total-row td {
  background-color: transparent;
  height: 24px;
  vertical-align: middle;
}

/* -- Signatures -- */
.signature-section {
  width: 70%;
  margin: 0 auto;
  margin-top: 10px;
}
.sig-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
}
.sig-table td {
  border: 1px solid black;
  padding: 5px;
  width: 33.33%;
}
.sig-space {
  height: 70px;
  vertical-align: bottom;
  padding-bottom: 10px;
}

/* Aturan Khusus Saat Diprint ke Kertas */
@media print {
  .no-print {
    display: none !important;
  }
  .print-container {
    padding: 0;
    margin: 0;
    max-width: none;
    width: 100%;
  }
  @page {
    size: A4 portrait;
    margin: 15mm;
  }
}
</style>
