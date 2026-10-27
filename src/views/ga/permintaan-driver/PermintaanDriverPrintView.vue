<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { permintaanDriverService } from "@/services/ga/permintaanDriverService";
import logoImg from "@/assets/logo.png";
import { IconPrinter, IconX } from "@tabler/icons-vue";

const route = useRoute();
const nomor = decodeURIComponent(String(route.params.nomor || ""));

const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref("");
const header = ref<any>({});
const items = ref<any[]>([]);

const formatTanggalCetak = (dStr: string) => {
  if (!dStr) return "";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  const day = String(d.getDate()).padStart(2, "0");
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
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const handlePrint = () => {
  window.print();
};

const handleClose = () => {
  window.close();
};

const fetchData = async () => {
  try {
    isLoading.value = true;
    const res = await permintaanDriverService.getById(nomor);
    const d = res.data.data;
    if (!d) throw new Error("Data tidak ditemukan");
    header.value = d;
    items.value = d.items || [];
    isLoading.value = false;

    // Otomatis munculkan dialog print setelah tampilan selesai render
    setTimeout(() => {
      window.print();
    }, 600);
  } catch (err: any) {
    isError.value = true;
    errorMessage.value =
      err.response?.data?.message || err.message || "Gagal memuat data cetak.";
    isLoading.value = false;
  }
};

onMounted(() => {
  document.title = `Surat Jalan - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-page-wrapper">
    <!-- Bar Aksi Tombol Cetak & Tutup (Sembunyi saat dicetak) -->
    <div class="no-print print-toolbar">
      <div class="toolbar-title">
        Dokumen Surat Jalan: <strong>{{ nomor }}</strong>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-print" @click="handlePrint">
          <IconPrinter :size="16" class="mr-1" /> Cetak ke Printer
        </button>
        <button class="btn btn-close" @click="handleClose">
          <IconX :size="16" class="mr-1" /> Tutup
        </button>
      </div>
    </div>

    <!-- State Loading -->
    <div v-if="isLoading" class="state-message">
      <div class="spinner"></div>
      <div>Memuat dokumen Surat Jalan...</div>
    </div>

    <!-- State Error -->
    <div v-else-if="isError" class="state-message error">
      <div><strong>Terjadi Kesalahan:</strong> {{ errorMessage }}</div>
      <button class="btn btn-retry" @click="fetchData">Muat Ulang</button>
    </div>

    <!-- Tampilan Dokumen Cetak Persis Sesuai Gambar / FastReport sjdriver.fr3 -->
    <div v-else class="print-sheet">
      <!-- Kop Dokumen: Judul di Tengah, Logo di Kanan Atas -->
      <div class="kop-section">
        <div class="kop-left-spacer"></div>
        <div class="kop-center">
          <h1 class="document-title">SURAT JALAN</h1>
        </div>
        <div class="kop-right">
          <img :src="logoImg" alt="Kencana Print Logo" class="brand-logo" />
        </div>
      </div>

      <!-- Informasi Header Dokumen -->
      <div class="meta-section">
        <table class="meta-table">
          <tbody>
            <tr>
              <td class="meta-label">Nomor</td>
              <td class="meta-colon">:</td>
              <td class="meta-val font-weight-bold">{{ header.nomor }}</td>
            </tr>
            <tr>
              <td class="meta-label">Tanggal</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ formatTanggalCetak(header.tanggal) }}</td>
            </tr>
            <tr>
              <td class="meta-label">Pengambilan</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ header.pengambilan || "-" }}</td>
            </tr>
            <tr>
              <td class="meta-label">Customer</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ header.customer || "-" }}</td>
            </tr>
            <tr>
              <td class="meta-label">PIC</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ header.pic || "-" }}</td>
            </tr>
            <tr>
              <td class="meta-label align-top">Uraian</td>
              <td class="meta-colon align-top">:</td>
              <td class="meta-val align-top">{{ header.uraian || "-" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tabel Rincian Barang / Dokumen -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-spk">Spk</th>
            <th class="col-keterangan">Keterangan</th>
            <th class="col-penerima">Penerima</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in items" :key="idx">
            <td class="cell-no">{{ idx + 1 }}</td>
            <td class="cell-spk">{{ item.SPK || "—" }}</td>
            <td class="cell-ket">{{ item.Keterangan || "—" }}</td>
            <td class="cell-penerima">{{ item.Penerima || item.SPK || "—" }}</td>
          </tr>
          <tr v-if="!items || items.length === 0">
            <td colspan="4" class="cell-empty">Tidak ada rincian barang/dokumen.</td>
          </tr>
        </tbody>
      </table>

      <!-- Tanda Tangan: Dibuat Oleh, Driver, Diterima Oleh -->
      <div class="signature-section">
        <div class="sig-col">
          <div class="sig-title">Dibuat Oleh,</div>
          <div class="sig-name">
            (&nbsp;&nbsp;{{ (header.userPeminta || "ADMIN").toUpperCase() }}&nbsp;&nbsp;)
          </div>
        </div>

        <div class="sig-col">
          <div class="sig-title">Driver,</div>
          <div class="sig-name">
            (&nbsp;&nbsp;{{ (header.driver || "").toUpperCase() || "              " }}&nbsp;&nbsp;)
          </div>
        </div>

        <div class="sig-col">
          <div class="sig-title">Diterima Oleh,</div>
          <div class="sig-name">
            (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Reset & Container ── */
.print-page-wrapper {
  min-height: 100vh;
  background-color: #e5e7eb;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  box-sizing: border-box;
}

/* ── Toolbar No-Print ── */
.print-toolbar {
  width: 100%;
  max-width: 820px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 18px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.toolbar-title {
  font-size: 14px;
  color: #374151;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 15px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-print {
  background-color: #1565c0;
  color: #ffffff;
}

.btn-print:hover {
  background-color: #0d47a1;
}

.btn-close {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-close:hover {
  background-color: #e5e7eb;
}

.btn-retry {
  margin-top: 10px;
  background-color: #dc2626;
  color: #ffffff;
}

/* ── Status Messages ── */
.state-message {
  padding: 50px;
  text-align: center;
  font-size: 15px;
  color: #4b5563;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.state-message.error {
  color: #b91c1c;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 4px solid #cbd5e1;
  border-top-color: #1565c0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Kertas Dokumen Cetak Sesuai Contoh Gambar ── */
.print-sheet {
  width: 100%;
  max-width: 820px;
  min-height: 520px;
  background-color: #ffffff;
  padding: 30px 40px 40px 40px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

/* ── Kop Section ── */
.kop-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.kop-left-spacer {
  width: 160px;
}

.kop-center {
  flex: 1;
  text-align: center;
  padding-top: 25px;
}

.document-title {
  margin: 0;
  font-size: 21px;
  font-weight: bold;
  letter-spacing: 0.8px;
  text-decoration: underline;
  text-underline-offset: 4px;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
}

.kop-right {
  width: 180px;
  display: flex;
  justify-content: flex-end;
}

.brand-logo {
  max-width: 170px;
  height: auto;
  object-fit: contain;
}

/* ── Metadata Info ── */
.meta-section {
  margin-bottom: 20px;
}

.meta-table {
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.6;
  font-family: Arial, Helvetica, sans-serif;
}

.meta-label {
  width: 110px;
  font-weight: 500;
  color: #000;
  padding: 2px 0;
  vertical-align: top;
}

.meta-colon {
  width: 20px;
  text-align: center;
  color: #000;
  padding: 2px 0;
  vertical-align: top;
}

.meta-val {
  color: #000;
  padding: 2px 0;
  vertical-align: top;
}

.align-top {
  vertical-align: top !important;
}

/* ── Tabel Items Persis Gambar ── */
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  margin-bottom: 24px;
  font-size: 13.5px;
  font-family: Arial, Helvetica, sans-serif;
}

.items-table th,
.items-table td {
  border: 1px solid #000000;
  padding: 4px 8px;
  color: #000;
}

.items-table th {
  font-weight: 600;
  text-align: left;
  background-color: #ffffff;
}

.col-no {
  width: 40px;
  text-align: left;
}

.col-spk {
  width: 190px;
}

.col-keterangan {
  width: auto;
}

.col-penerima {
  width: 220px;
}

.cell-no {
  text-align: left;
  vertical-align: top;
}

.cell-spk {
  vertical-align: top;
}

.cell-ket {
  vertical-align: top;
}

.cell-penerima {
  vertical-align: top;
}

.cell-empty {
  text-align: center;
  padding: 12px;
  font-style: italic;
  color: #666;
}

/* ── Tanda Tangan Persis Gambar ── */
.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 26px;
  padding: 0 10px;
  font-size: 13.5px;
  font-family: Arial, Helvetica, sans-serif;
}

.sig-col {
  width: 28%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.sig-title {
  font-weight: normal;
  color: #000;
  margin-bottom: 60px;
}

.sig-name {
  color: #000;
  font-weight: 500;
  white-space: nowrap;
}

/* ── Aturan Cetak / Printer ── */
@media print {
  @page {
    size: auto;
    margin: 8mm 12mm;
  }

  body,
  html {
    background-color: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .print-page-wrapper {
    background-color: #ffffff !important;
    padding: 0 !important;
    min-height: auto !important;
  }

  .print-toolbar,
  .no-print {
    display: none !important;
  }

  .print-sheet {
    max-width: 100% !important;
    width: 100% !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .items-table th,
  .items-table td {
    border: 1px solid #000000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
