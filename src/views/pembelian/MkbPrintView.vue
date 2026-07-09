<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { mkbFormService } from "@/services/pembelian/mkbFormService";

const route = useRoute();
const toast = useToast();

// Decode URL parameter agar %2F kembali menjadi /
const nomorMkb = computed(() => {
  const val = route.query.nomor as string;
  return val ? decodeURIComponent(val) : "";
});

const isLoading = ref(true);
const header = ref<any>({});
const details = ref<any[]>([]);

onMounted(async () => {
  if (!nomorMkb.value) {
    toast.error("Nomor MKB tidak ditemukan.");
    return;
  }

  try {
    const res = await mkbFormService.getPrintData(nomorMkb.value);
    header.value = res.data.data.header;
    details.value = res.data.data.details;

    // Auto print setelah render selesai (delay 500ms)
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (error) {
    toast.error("Gagal memuat data cetak MKB.");
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const numFmt = (val: any) =>
  Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
</script>

<template>
  <div v-if="isLoading" class="d-flex justify-center align-center h-screen">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </div>

  <div v-else class="print-page">
    <div
      v-for="copy in 2"
      :key="copy"
      class="mkb-copy"
      :class="{ 'dashed-divider': copy === 1 }"
    >
      <div class="header-title">
        M E M O &nbsp; K E B U T U H A N &nbsp; B A H A N
      </div>

      <div class="header-info">
        <div class="info-left">
          <div class="info-row">
            <span class="lbl">Nomor</span><span class="colon">:</span>
            <span class="val">{{ header.Nomor }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Tanggal</span><span class="colon">:</span>
            <span class="val">{{ header.Tanggal }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Keterangan</span><span class="colon">:</span>
            <span class="val">{{ header.Keterangan }}</span>
          </div>
        </div>
        <div class="info-right">
          <div class="info-row">
            <span class="lbl">No SO</span><span class="colon">:</span>
            <span class="val">{{ header.NoSPK }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Nama</span><span class="colon">:</span>
            <span class="val">{{ header.NamaSpk }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Jumlah</span><span class="colon">:</span>
            <span class="val">{{ header.JumlahSpk }}</span>
          </div>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 30px">No</th>
            <th style="width: 120px">Kode</th>
            <th>Nama</th>
            <th style="width: 60px">Satuan</th>
            <th style="width: 80px">Gramasi</th>
            <th style="width: 80px" class="tr">Jumlah</th>
            <th style="width: 80px" class="tr">Ready</th>
            <th style="width: 80px" class="tr">Jumlah PO</th>
            <th style="width: 150px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in details" :key="idx">
            <td class="tc">{{ idx + 1 }}</td>
            <td>{{ item.KodeBahan }}</td>
            <td>{{ item.NamaBahan }}</td>
            <td>{{ item.Satuan }}</td>
            <td>{{ item.Gramasi }}</td>
            <td class="tr">{{ numFmt(item.Jumlah) }}</td>
            <td class="tr">{{ numFmt(item.Ready) }}</td>
            <td class="tr">{{ numFmt(item.JumlahPO) }}</td>
            <td>{{ item.KeteranganBahan }}</td>
          </tr>
        </tbody>
      </table>

      <div class="signature-area">
        <div class="sig-box">
          <div class="sig-title">Dibuat Oleh,</div>
          <div class="sig-space"></div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Mengetahui,</div>
          <div class="sig-space"></div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Kepala Gudang,</div>
          <div class="sig-space"></div>
        </div>
        <div class="sig-box" style="border-right: none">
          <div class="sig-title">Disetujui,</div>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pengaturan halaman full tanpa margin berlebih */
.print-page {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #000;
  max-width: 210mm; /* Lebar A4 */
  margin: 0 auto;
  background: white;
  padding: 10px;
}

/* Layout Memo */
.mkb-copy {
  padding: 15px 0;
  height: 140mm; /* Setengah tinggi A4 */
  box-sizing: border-box;
}
/* Pembatas antar rangkap */
.dashed-divider {
  border-bottom: 1px dashed #000;
  margin-bottom: 15px;
}

.header-title {
  text-align: center;
  font-size: 16px;
  letter-spacing: 2px;
  margin-bottom: 20px;
}

.header-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}
.info-row {
  display: flex;
  margin-bottom: 3px;
}
.lbl {
  width: 80px;
}
.colon {
  width: 15px;
  text-align: center;
}
.val {
  flex: 1;
  font-weight: 500;
}
.info-left {
  width: 45%;
}
.info-right {
  width: 50%;
}

/* Tabel */
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0;
}
.print-table th,
.print-table td {
  border: 1px solid #000;
  padding: 4px 6px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

/* Kolom TTD - Terpisah dan Garis Putus-putus */
.signature-area {
  display: flex;
  margin-top: 15px; /* Jarak agar terpisah dari tabel */
  border: 1px dashed #000; /* Garis luar putus-putus */
}
.sig-box {
  flex: 1;
  border-right: 1px dashed #000; /* Garis pembatas antar kolom putus-putus */
  text-align: center;
  padding-top: 5px;
}
.sig-title {
  font-size: 11px;
}
.sig-space {
  height: 60px;
}

/* SETTINGAN SAAT DIPRINT OLEH BROWSER */
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  body {
    background: white;
    margin: 0;
  }
  .print-page {
    box-shadow: none;
    margin: 0;
    padding: 0;
    max-width: 100%;
  }
  .mkb-copy {
    page-break-inside: avoid;
  }
}
</style>
