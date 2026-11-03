<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { IconPrinter, IconArrowLeft } from "@tabler/icons-vue";
import api from "@/services/api";

const route = useRoute();
const router = useRouter();

interface PrintHeader {
  Nomor: string;
  Tanggal: string;
  TglPengiriman: string;
  KeteranganHeader: string;
  Note?: string;
  IsAcc: "Y" | "N" | string;
  IsPpn: number;
  PpnRate: number;
  SubTotal: number;
  TotalPpn: number;
  GrandTotal: number;
  NamaSupplier: string;
  AlamatSupplier: string;
  KotaSupplier: string;
  AlamatPabrik?: string;
  AlamatPbrik?: string;
  Pemesan?: string;
  NamaPerusahaan: string;
  AlamatPerusahaan: string;
  NPWPPerusahaan: string;
}

interface PrintDetail {
  NoUrut: number;
  Kode: string;
  Deskripsi: string;
  Panjang?: number;
  Lebar?: number;
  Quantity: number;
  Satuan: string;
  UnitPrice: number;
  Diskon?: number;
  Total: number;
}

const printHeader = ref<PrintHeader | null>(null);
const printDetails = ref<PrintDetail[]>([]);
const isLoading = ref(true);
const orientation = ref<"portrait" | "landscape">("portrait");

const formatRupiah = (val: number | string | null | undefined, decimals = 0) => {
  if (val === null || val === undefined || val === "") return "Rp 0";
  const num = Number(val);
  if (isNaN(num)) return "Rp 0";
  return (
    "Rp " +
    num.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
};

const formatQty = (val: number | string | null | undefined) => {
  if (val === null || val === undefined || val === "") return "0";
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num % 1 !== 0
    ? num.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : num.toLocaleString("id-ID");
};

const injectPrintStyle = () => {
  const oldStyle = document.getElementById("po-dynamic-print-style");
  if (oldStyle) oldStyle.remove();

  const isLand = orientation.value === "landscape";
  const styleEl = document.createElement("style");
  styleEl.id = "po-dynamic-print-style";
  styleEl.innerHTML = `
    @page {
      size: ${isLand ? "297mm 210mm" : "210mm 297mm"};
      margin: 8mm;
    }
  `;
  document.head.appendChild(styleEl);
};

const setOrientation = async (mode: "portrait" | "landscape") => {
  orientation.value = mode;
  injectPrintStyle();
  await nextTick();
};

const loadPrintData = async () => {
  const nomor = route.params.nomor;
  if (!nomor) return;
  isLoading.value = true;
  try {
    const res = await api.get(`/mmt/po-bahan-mmt/print/${encodeURIComponent(String(nomor))}`);
    const data = res.data;
    if (data) {
      printHeader.value = data.Header || data.header || data;
      printDetails.value = data.Detail || data.details || data.detail || [];
      document.title = `PO - ${printHeader.value?.Nomor || nomor}`;
    }
  } catch (err) {
    console.error("Gagal load data cetak PO Bahan MMT:", err);
  } finally {
    isLoading.value = false;
  }
};

const doPrint = () => {
  injectPrintStyle();
  nextTick(() => {
    setTimeout(() => {
      window.print();
    }, 200);
  });
};

onMounted(async () => {
  injectPrintStyle();
  await loadPrintData();
});
</script>

<template>
  <div class="print-wrapper">
    <!-- Bar Kontrol Navigasi & Cetak Standar Manksi -->
    <div class="no-print actions-bar">
      <div class="orientation-selector">
        <span class="control-label">Format Kertas:</span>
        <button
          type="button"
          :class="['btn-orientasi', { active: orientation === 'portrait' }]"
          @click="setOrientation('portrait')"
        >
          📄 Portrait (Tegak)
        </button>
        <button
          type="button"
          :class="['btn-orientasi', { active: orientation === 'landscape' }]"
          @click="setOrientation('landscape')"
        >
          📑 Landscape (Mendatar)
        </button>
      </div>

      <div class="action-buttons">
        <v-btn color="primary" size="small" variant="elevated" @click="doPrint">
          <IconPrinter :size="15" class="mr-1" /> Cetak Dokumen
        </v-btn>
        <v-btn variant="outlined" size="small" color="secondary" @click="router.back()">
          <IconArrowLeft :size="15" class="mr-1" /> Kembali
        </v-btn>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      Memuat dokumen Purchase Order...
    </div>

    <!-- Area Kertas Cetak Standar Manksi Web -->
    <div v-else-if="printHeader" :class="['print-page', orientation]">
      <!-- Kop Dokumen -->
      <header class="header-section">
        <div class="company-info">
          <h1 class="company-name">{{ printHeader.NamaPerusahaan || 'CV. KENCANA PRINT' }}</h1>
          <div class="company-address">
            {{ printHeader.AlamatPerusahaan || 'Padokan, RT. 04 / RW. 04, Sawahan, Ngemplak, Boyolali' }}
          </div>
          <div class="company-phone">Telp 0271-740634 Fax 0271-740634</div>
          <div class="company-npwp">NPWP: {{ printHeader.NPWPPerusahaan || '02.765.779.0-527.000' }}</div>
        </div>

        <div class="doc-meta-box">
          <h2 class="doc-title">PURCHASE ORDER</h2>
          <div class="meta-row">
            <span class="meta-lbl">Date</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">{{ printHeader.Tanggal }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-lbl">P.O. Number</span>
            <span class="meta-sep">:</span>
            <span class="meta-val font-weight-bold">{{ printHeader.Nomor }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-lbl">Order F</span>
            <span class="meta-sep">:</span>
            <span class="meta-val">P5</span>
          </div>
        </div>
      </header>

      <div class="divider"></div>

      <!-- Kotak Vendor (Supplier) Sesuai Sistem MMT -->
      <section class="vendor-box">
        <div class="vendor-title">Vendor</div>
        <div class="vendor-content">
          <div class="vendor-name">{{ printHeader.NamaSupplier || '-' }}</div>
          <div class="vendor-detail">{{ printHeader.AlamatSupplier || '-' }}</div>
          <div class="vendor-detail">{{ printHeader.KotaSupplier || 'SOLO' }}</div>
        </div>
      </section>

      <!-- Tabel Rincian Barang (Items Table) -->
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35px" class="tc">No</th>
            <th style="width: 130px">Code</th>
            <th>Product Name / Description</th>
            <th style="width: 100px" class="tr">Quantity</th>
            <th style="width: 110px" class="tr">Unit Price</th>
            <th style="width: 130px" class="tr">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in printDetails" :key="idx">
            <td class="tc">{{ idx + 1 }}</td>
            <td class="font-mono">{{ item.Kode }}</td>
            <td>
              <span class="product-desc">{{ item.Deskripsi }}</span>
              <span v-if="item.Panjang && item.Lebar" class="dimension-tag">
                ({{ item.Panjang }} * {{ item.Lebar }})
              </span>
            </td>
            <td class="tr font-weight-medium">
              {{ formatQty(item.Quantity) }} {{ item.Satuan }}
            </td>
            <td class="tr">{{ formatRupiah(item.UnitPrice) }}</td>
            <td class="tr font-weight-bold">{{ formatRupiah(item.Total) }}</td>
          </tr>

          <!-- Baris kosong minimal agar proporsional di cetakan A4 -->
          <tr
            v-for="i in Math.max(0, 4 - printDetails.length)"
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

      <!-- Area Ringkasan Bawah: Notes & Total Summary Box -->
      <div class="summary-area">
        <!-- Kotak Notes and Instructions Sesuai Sistem MMT -->
        <div class="notes-wrapper">
          <div class="notes-box">
            <div class="notes-title">Notes and Instructions:</div>
            <ul class="notes-list">
              <li>Maksimal Pengiriman Jam 14.00 WIB</li>
              <li v-if="printHeader.IsPpn === 1">
                Harga Include PPN {{ printHeader.PpnRate || 11 }}%
              </li>
              <li v-else>Non-PPN</li>
              <li>Include Pengiriman ke CV. Kencana Print Jeron</li>
              <li>Pengiriman tgl: <b>{{ printHeader.TglPengiriman || '-' }}</b></li>
            </ul>
            <div class="delivery-address">
              <strong>Alamat pengiriman di:</strong><br />
              {{
                printHeader.AlamatPabrik ||
                printHeader.AlamatPbrik ||
                "CV Kencana Print Jeron RT01 RW03 Demen, Jeron, Nogosari Boyolali, Jawa Tengah"
              }}
            </div>
          </div>

          <!-- Watermark Status ACC Jika Belum Disetujui Manager -->
          <div v-if="printHeader.IsAcc !== 'Y'" class="watermark-draft">
            * DRAFT / BELUM DI-ACC OLEH MANAGER *
          </div>
        </div>

        <!-- Kotak Total Summary Sesuai Sistem MMT -->
        <div class="totals-wrapper">
          <table class="totals-table">
            <tr>
              <td class="total-lbl">SUBTOTAL</td>
              <td class="total-val">{{ formatRupiah(printHeader.SubTotal) }}</td>
            </tr>
            <tr v-if="printHeader.IsPpn === 1">
              <td class="total-lbl">PPN {{ printHeader.PpnRate || 11 }}%</td>
              <td class="total-val">{{ formatRupiah(printHeader.TotalPpn) }}</td>
            </tr>
            <tr class="grand-total-row">
              <td class="total-lbl font-weight-bold">TOTAL</td>
              <td class="total-val font-weight-bold grand-total-amount">
                {{ formatRupiah(printHeader.GrandTotal) }}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Area Tanda Tangan Sesuai Standar Cetak Sistem MMT -->
      <footer class="signature-section">
        <div class="sign-card">
          <div class="sign-space"></div>
          <div class="sign-name">{{ printHeader.Pemesan || "Lia" }}</div>
          <div class="sign-title">Purchasing</div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.print-wrapper {
  background: #eaedf2;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 210mm;
  max-width: 100%;
  margin-bottom: 14px;
}

.orientation-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.btn-orientasi {
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  color: #334155;
  transition: all 0.2s;
}

.btn-orientasi.active {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.loading-state {
  background: white;
  padding: 40px;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Area Halaman Cetak Standar Manksi Web */
.print-page {
  background: white;
  padding: 12mm 14mm;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  font-size: 11px;
  color: #1e293b;
  box-sizing: border-box;
}

.print-page.portrait {
  width: 210mm;
  min-height: 297mm;
}

.print-page.landscape {
  width: 297mm;
  min-height: 210mm;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.company-name {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.5px;
  margin: 0 0 2px 0;
}

.company-address,
.company-phone,
.company-npwp {
  font-size: 10px;
  color: #475569;
  line-height: 1.35;
}

.doc-meta-box {
  text-align: right;
  min-width: 180px;
}

.doc-title {
  font-size: 16px;
  font-weight: 800;
  color: #1565c0;
  letter-spacing: 0.8px;
  margin: 0 0 6px 0;
}

.meta-row {
  display: flex;
  justify-content: flex-end;
  font-size: 11px;
  line-height: 1.4;
}

.meta-lbl {
  width: 75px;
  text-align: left;
  color: #64748b;
}

.meta-sep {
  margin: 0 4px;
  color: #64748b;
}

.meta-val {
  min-width: 100px;
  text-align: right;
  color: #0f172a;
}

.divider {
  height: 2px;
  background: #1565c0;
  margin: 8px 0 12px 0;
}

/* Vendor Section */
.vendor-box {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
}

.vendor-title {
  background: #f1f5f9;
  font-weight: 700;
  font-size: 11px;
  color: #1e293b;
  padding: 3px 8px;
  border-bottom: 1px solid #cbd5e1;
}

.vendor-content {
  padding: 6px 8px;
  line-height: 1.35;
}

.vendor-name {
  font-weight: 700;
  font-size: 11px;
  color: #0f172a;
}

.vendor-detail {
  font-size: 10.5px;
  color: #475569;
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.data-table th,
.data-table td {
  border: 1px solid #cbd5e1;
  padding: 5px 6px;
  font-size: 10.5px;
}

.data-table th {
  background: #f8fafc;
  color: #0f172a;
  font-weight: 700;
  text-align: left;
}

.tc {
  text-align: center;
}

.tr {
  text-align: right;
}

.font-mono {
  font-family: Consolas, monospace;
  font-size: 10px;
}

.dimension-tag {
  color: #64748b;
  font-size: 9.5px;
  margin-left: 4px;
}

.empty-row td {
  height: 22px;
}

/* Summary Area */
.summary-area {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.notes-wrapper {
  flex: 1;
}

.notes-box {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 8px 10px;
  background: #fafafa;
  font-size: 10px;
  line-height: 1.4;
}

.notes-title {
  font-weight: 700;
  color: #334155;
  margin-bottom: 4px;
}

.notes-list {
  margin: 0 0 6px 14px;
  padding: 0;
  color: #475569;
}

.delivery-address {
  margin-top: 4px;
  color: #334155;
  border-top: 1px dashed #cbd5e1;
  padding-top: 4px;
}

.watermark-draft {
  margin-top: 6px;
  color: #dc2626;
  font-weight: 700;
  font-size: 10.5px;
  letter-spacing: 0.5px;
}

.totals-wrapper {
  width: 260px;
}

.totals-table {
  width: 100%;
  border-collapse: collapse;
}

.totals-table td {
  padding: 4px 6px;
  font-size: 11px;
}

.total-lbl {
  color: #64748b;
}

.total-val {
  text-align: right;
  color: #0f172a;
}

.grand-total-row {
  border-top: 2px solid #cbd5e1;
  border-bottom: 2px solid #cbd5e1;
  background: #f8fafc;
}

.grand-total-amount {
  font-size: 12px;
  color: #1565c0;
}

/* Signatures Sesuai Sistem MMT */
.signature-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-right: 24px;
}

.sign-card {
  width: 150px;
  text-align: center;
}

.sign-space {
  height: 48px;
}

.sign-name {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  border-top: 1px solid #0f172a;
  padding-top: 3px;
}

.sign-title {
  font-size: 10px;
  color: #64748b;
  margin-top: 1px;
}

/* Media Print */
@media print {
  .no-print {
    display: none !important;
  }

  .print-wrapper {
    background: transparent;
    padding: 0;
  }

  .print-page {
    box-shadow: none;
    padding: 0;
    margin: 0;
    width: 100% !important;
    min-height: auto !important;
  }
}
</style>
