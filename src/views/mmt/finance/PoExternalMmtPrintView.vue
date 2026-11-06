<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { format, parseISO, isValid } from "date-fns";
import { IconPrinter, IconArrowLeft } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();

const nomorPo = String(route.params.nomor || "");
const isLoading = ref(true);
const poHeader = ref<any>({});
const poCustomItems = ref<any[]>([]);
const poAlokasi = ref<any[]>([]);

const fmt = (v: number | string) => {
  if (!v) return "0";
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(v) || 0));
};

const safeFormatDate = (d: string) => {
  if (!d) return "-";
  try {
    const parsed = parseISO(d.substring(0, 10));
    return isValid(parsed) ? format(parsed, "dd MMM yyyy") : d;
  } catch {
    return d;
  }
};

const loadPrintData = async () => {
  if (!nomorPo) return;
  isLoading.value = true;
  try {
    const res = await api.get(`/mmt/po-external-mmt/print/${encodeURIComponent(nomorPo)}`);
    const data = res.data?.data || res.data || {};
    poHeader.value = data.header || {};
    poCustomItems.value = data.items || data.custom || [];
    poAlokasi.value = data.alokasi || [];
  } catch (err) {
    console.error("Gagal load data cetak PO External:", err);
  } finally {
    isLoading.value = false;
  }
};

// Item Pesanan: jika ada detail custom tampilkan custom, bila tidak ambil dari header SPK
const displayItems = computed(() => {
  const h = poHeader.value;
  if (Array.isArray(poCustomItems.value) && poCustomItems.value.length > 0) {
    return poCustomItems.value.map((c: any) => ({
      nama: c.poed_nama || c.nama || h.spk_nama || "-",
      bahan: h.spk_kain || "-",
      ukuran: (c.poed_panjang && c.poed_lebar)
        ? `${c.poed_panjang} x ${c.poed_lebar}`
        : (h.spk_ukuran || "-"),
      finishing: h.poe_finishing || "-",
      jumlah: Number(c.poed_jumlah || c.jumlah || 0),
      harga: Number(c.poed_harga || c.harga || 0),
      subtotal: Number(c.poed_total || c.total || 0),
    }));
  }

  if (h && (h.poe_nomor || h.poe_jumlah)) {
    return [
      {
        nama: h.spk_nama || "-",
        bahan: h.spk_kain || "-",
        ukuran: h.spk_ukuran || (h.spk_panjang && h.spk_lebar ? `${h.spk_panjang} x ${h.spk_lebar}` : "-"),
        finishing: h.poe_finishing || "-",
        jumlah: Number(h.poe_jumlah || 0),
        harga: Number(h.poe_tarif || 0),
        subtotal: Number(h.poe_total || 0),
      },
    ];
  }

  return [];
});

const totalQty = computed(() =>
  displayItems.value.reduce((sum, item) => sum + Number(item.jumlah || 0), 0)
);

const grandTotal = computed(() =>
  displayItems.value.reduce(
    (sum, item) => sum + Number(item.subtotal || item.jumlah * item.harga || 0),
    0
  )
);

// Alokasi Chunks per 10 baris (replika Delphi Print Layout)
const alokasiPerColumn = 10;
const alokasiChunks = computed(() => {
  const list = poAlokasi.value || [];
  const chunks: any[][] = [];
  for (let i = 0; i < list.length; i += alokasiPerColumn) {
    chunks.push(list.slice(i, i + alokasiPerColumn));
  }
  return chunks;
});

const alokasiRowCount = computed(() =>
  Math.max(1, ...alokasiChunks.value.map((chunk) => chunk.length))
);

const doPrint = () => {
  window.print();
};

onMounted(loadPrintData);
</script>

<template>
  <div class="print-wrapper">
    <!-- Bar Aksi (Hidden saat cetak) -->
    <div class="no-print actions-bar">
      <v-btn
        variant="outlined"
        size="small"
        @click="router.back()"
      >
        <template #prepend>
          <IconArrowLeft :size="16" />
        </template>
        Kembali
      </v-btn>
      <v-btn
        color="primary"
        size="small"
        @click="doPrint"
      >
        <template #prepend>
          <IconPrinter :size="16" />
        </template>
        Cetak Dokumen
      </v-btn>
    </div>

    <div v-if="isLoading" class="loading-state">
      <v-progress-circular indeterminate size="28" color="primary" class="mb-2" />
      <div>Memuat dokumen cetak PO External...</div>
    </div>

    <!-- Lembar Cetak Kertas -->
    <div
      v-else-if="poHeader"
      class="print-page"
      :class="{ 'landscape-mode': poAlokasi && poAlokasi.length > 0 }"
    >
      <!-- HEADER PERUSAHAAN & DOKUMEN -->
      <div class="header-section">
        <div class="company-info">
          <div class="company-title">CV. KENCANA PRINT</div>
          <div class="company-address">
            Padakan, RT. 04 / RW. 04, Sawahan, Ngemplak, Boyolali<br />
            Telp. 0271-740634 Fax. 0271-740634
          </div>
        </div>
        <div class="doc-meta-box">
          <div class="document-title">PURCHASE ORDER</div>
          <table class="meta-table">
            <tr>
              <td class="meta-lbl">Date</td>
              <td>: {{ safeFormatDate(poHeader.poe_tanggal) }}</td>
            </tr>
            <tr>
              <td class="meta-lbl">Dateline</td>
              <td>: {{ safeFormatDate(poHeader.poe_dateline) }}</td>
            </tr>
            <tr>
              <td class="meta-lbl">P.O. Number</td>
              <td class="font-weight-bold">: {{ poHeader.poe_nomor }}</td>
            </tr>
            <tr>
              <td class="meta-lbl">Ref SPK / ID</td>
              <td>: {{ poHeader.poe_spk_nomor || "-" }}</td>
            </tr>
            <tr>
              <td class="meta-lbl">Cabang</td>
              <td>: {{ poHeader.poe_cab || "-" }}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- KOTAK VENDOR / SUPPLIER -->
      <div class="vendor-box">
        <div class="vendor-tag">VENDORS / SUPPLIER</div>
        <div class="vendor-body">
          <div class="vendor-name">{{ poHeader.Sup_nama || "-" }}</div>
          <div class="vendor-detail">
            {{ poHeader.Sup_alamat || "" }}
            {{ poHeader.Sup_kota ? ` - ${poHeader.Sup_kota}` : "" }}
          </div>
        </div>
      </div>

      <!-- TABEL UTAMA PESANAN -->
      <table class="print-table mb-3">
        <thead>
          <tr>
            <th style="width: 35px" class="text-center">No.</th>
            <th>Nama Pesanan / Pekerjaan</th>
            <th style="width: 120px" class="text-center">Bahan</th>
            <th style="width: 90px" class="text-center">Ukuran</th>
            <th style="width: 120px">Finishing</th>
            <th style="width: 80px" class="text-end">Jumlah</th>
            <th style="width: 110px" class="text-end">Harga</th>
            <th style="width: 130px" class="text-end">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in displayItems" :key="idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td class="font-weight-medium">{{ item.nama }}</td>
            <td class="text-center">{{ item.bahan }}</td>
            <td class="text-center">{{ item.ukuran }}</td>
            <td>{{ item.finishing }}</td>
            <td class="text-end font-weight-bold">{{ fmt(item.jumlah) }}</td>
            <td class="text-end">{{ fmt(item.harga) }}</td>
            <td class="text-end font-weight-bold">{{ fmt(item.subtotal) }}</td>
          </tr>
          <tr v-if="displayItems.length === 0">
            <td colspan="8" class="text-center py-3 text-grey">Tidak ada item pesanan.</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="footer-row font-weight-bold">
            <td colspan="5" class="text-end">TOTAL QTY:</td>
            <td class="text-end font-weight-bold">{{ fmt(totalQty) }} PCS</td>
            <td class="text-end">GRAND TOTAL:</td>
            <td class="text-end grand-total-cell font-weight-bold">{{ fmt(grandTotal) }}</td>
          </tr>
        </tfoot>
      </table>

      <!-- TABEL RINCIAN ALOKASI KOTA (CHUNK PER 10 BARIS) -->
      <div v-if="poAlokasi && poAlokasi.length > 0" class="alokasi-section mb-3">
        <div class="alokasi-title font-weight-bold mb-1">ALOKASI PENGIRIMAN:</div>
        <table class="print-table alokasi-table">
          <thead>
            <tr>
              <template v-for="(chunk, ci) in alokasiChunks" :key="'h-' + ci">
                <th class="col-no" :class="{ 'chunk-border': ci > 0 }">No.</th>
                <th>Kota / Tujuan</th>
                <th class="col-qty text-end">Jumlah</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rowIdx in alokasiRowCount" :key="'r-' + rowIdx">
              <template v-for="(chunk, ci) in alokasiChunks" :key="'c-' + ci">
                <template v-if="chunk[rowIdx - 1]">
                  <td class="text-center col-no" :class="{ 'chunk-border': ci > 0 }">
                    {{ (rowIdx - 1) + ci * alokasiPerColumn + 1 }}
                  </td>
                  <td>{{ chunk[rowIdx - 1].poeda_kota }}</td>
                  <td class="text-end font-weight-medium">
                    {{ fmt(chunk[rowIdx - 1].poeda_jumlah) }}
                  </td>
                </template>
                <template v-else>
                  <td class="col-no" :class="{ 'chunk-border': ci > 0 }"></td>
                  <td></td>
                  <td></td>
                </template>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- CATATAN / KETERANGAN -->
      <div class="notes-box mb-4">
        <div class="notes-title">Catatan / Keterangan:</div>
        <div class="notes-content">{{ poHeader.poe_ket || "Dateline pengiriman sesuai ketentuan." }}</div>
      </div>

      <!-- TANDA TANGAN -->
      <div class="sign-section">
        <div class="sign-box">
          <div class="sign-title">Hormat Kami,</div>
          <div class="sign-sub">CV. Kencana Print</div>
          <div class="sign-space"></div>
          <div class="sign-name">( Purchasing / Admin )</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Menyetujui / Rekanan,</div>
          <div class="sign-sub uppercase">{{ poHeader.Sup_nama || "VENDOR" }}</div>
          <div class="sign-space"></div>
          <div class="sign-name">{{ poHeader.Sup_nama ? `( ${poHeader.Sup_nama} )` : "( ____________________ )" }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-wrapper {
  background: #525659;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actions-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.loading-state {
  background: white;
  padding: 40px;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  color: #555;
}

/* ── LEMBAR CETAK ── */
.print-page {
  background: white;
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 15mm;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 9.5pt;
  color: #111;
  box-sizing: border-box;
}

.print-page.landscape-mode {
  width: 297mm;
  min-height: 210mm;
}

/* ── HEADER PERUSAHAAN ── */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.company-title {
  font-size: 14pt;
  font-weight: 800;
  color: #0b2f5c;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.company-address {
  font-size: 8pt;
  color: #555;
  line-height: 1.35;
}

.doc-meta-box {
  text-align: right;
}

.document-title {
  font-size: 16pt;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.meta-table {
  border-collapse: collapse;
  font-size: 8.5pt;
  margin-left: auto;
}

.meta-table td {
  padding: 1px 3px;
}

.meta-lbl {
  color: #64748b;
  text-align: right;
  padding-right: 4px;
}

/* ── VENDOR BOX ── */
.vendor-box {
  width: 320px;
  margin-bottom: 12px;
}

.vendor-tag {
  background: #0b2f5c;
  color: white;
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  display: inline-block;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.vendor-body {
  border: 1px solid #0b2f5c;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 0 4px 4px 4px;
}

.vendor-name {
  font-weight: 700;
  font-size: 9.5pt;
  color: #0f172a;
}

.vendor-detail {
  font-size: 8pt;
  color: #475569;
}

/* ── DATA TABLES ── */
.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
}

.print-table th,
.print-table td {
  border: 1px solid #cbd5e1;
  padding: 5px 8px;
}

.print-table th {
  background: #f1f5f9;
  color: #1e293b;
  font-weight: 700;
  font-size: 8pt;
  text-transform: uppercase;
}

.footer-row {
  background: #f8fafc;
}

.grand-total-cell {
  color: #0b2f5c;
  font-size: 9pt;
}

/* ── ALOKASI TABLE ── */
.alokasi-title {
  font-size: 8pt;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.alokasi-table th {
  background: #f8fafc;
  padding: 4px 6px;
}

.alokasi-table td {
  padding: 3px 6px;
}

.col-no {
  width: 30px;
}

.col-qty {
  width: 80px;
}

.chunk-border {
  border-left: 2px solid #94a3b8 !important;
}

/* ── CATATAN ── */
.notes-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 8.5pt;
}

.notes-title {
  font-weight: 700;
  font-size: 7.5pt;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.notes-content {
  color: #1e293b;
  white-space: pre-line;
}

/* ── TANDA TANGAN ── */
.sign-section {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding: 0 40px;
}

.sign-box {
  text-align: center;
  width: 200px;
}

.sign-title {
  font-size: 8.5pt;
  font-weight: 600;
}

.sign-sub {
  font-size: 8.5pt;
  font-weight: 700;
}

.sign-space {
  height: 55px;
}

.sign-name {
  font-size: 8.5pt;
  font-weight: 600;
  border-bottom: 1px solid #333;
  display: inline-block;
  padding-bottom: 2px;
}

/* ── MEDIA PRINT ── */
@media print {
  .no-print {
    display: none !important;
  }
  .print-wrapper {
    background: transparent !important;
    padding: 0 !important;
    min-height: auto !important;
  }
  .print-page {
    box-shadow: none !important;
    width: 100% !important;
    min-height: auto !important;
    padding: 8mm !important;
  }
}
</style>
