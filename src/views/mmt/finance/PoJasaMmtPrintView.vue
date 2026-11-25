<template>
  <div class="print-page-container">
    <!-- Tombol Aksi Cetak / Kembali (Hidden saat print) -->
    <div class="print-actions d-print-none mb-4">
      <v-btn
        color="grey-darken-1"
        variant="outlined"
        prepend-icon="mdi-arrow-left"
        @click="router.back()"
      >
        Kembali
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi-printer" @click="handlePrint">
        Cetak Dokumen PO Jasa
      </v-btn>
    </div>

    <!-- Area Kertas Cetak -->
    <div
      id="print-area"
      class="print-sheet"
      :class="{ 'landscape-mode': poAlokasi && poAlokasi.length > 0 }"
    >
      <!-- Header Perusahaan & Judul -->
      <div class="header-section d-flex justify-space-between align-start mb-4">
        <div class="company-info">
          <h2 class="company-title">CV. KENCANA PRINT</h2>
          <p class="company-address">
            Padakan, RT. 04 / RW. 04, Sawahan<br />
            Ngemplak, Boyolali<br />
            Telp. 0271-740634 Fax. 0271-740634
          </p>
        </div>
        <div class="text-right">
          <h1 class="document-title">PO JASA MMT (MAKLON)</h1>
          <table class="header-meta-table mt-1">
            <tr>
              <td>Date</td>
              <td>: {{ safeFormatDate(poData.poe_tanggal) }}</td>
            </tr>
            <tr>
              <td>Dateline</td>
              <td>: {{ safeFormatDate(poData.poe_dateline) }}</td>
            </tr>
            <tr>
              <td>P.O. Jasa No.</td>
              <td class="font-weight-bold">: {{ poData.poe_nomor }}</td>
            </tr>
            <tr>
              <td>Ref SPK / ID</td>
              <td>: {{ poData.poe_spk_nomor || "-" }}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Informasi Vendor Rekanan -->
      <div class="vendor-section mb-4">
        <div class="vendor-box-title">REKANAN / VENDOR JASA</div>
        <div class="vendor-content pa-2">
          <div class="font-weight-bold text-subtitle-2">
            {{ poData.Sup_nama }}
          </div>
          <div class="text-body-2 text-grey-darken-3">
            {{ poData.Sup_alamat || "" }}
            {{ poData.Sup_kota ? `- ` + poData.Sup_kota : "" }}
          </div>
        </div>
      </div>

      <!-- TABEL 1: Pekerjaan Jasa MMT -->
      <div class="main-layout-content mb-4">
        <div class="section-heading font-weight-bold mb-1">
          1. RINCIAN PEKERJAAN JASA MMT:
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 30px">No.</th>
              <th style="width: 240px">Nama Pekerjaan / Pesanan</th>
              <th style="width: 85px">Bahan SPK</th>
              <th style="width: 75px">Ukuran</th>
              <th style="width: 100px">Finishing</th>
              <th style="width: 80px">Jumlah</th>
              <th style="width: 70px">Desain</th>
              <th style="width: 85px">Tarif Jasa</th>
              <th style="width: 105px">Subtotal Jasa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in poItems" :key="index">
              <td class="text-center">{{ index + 1 }}</td>
              <td>
                <div class="font-weight-bold">{{ item.NamaPesanan }}</div>
              </td>
              <td class="text-center">{{ item.Bahan }}</td>
              <td class="text-center">{{ item.Ukuran }}</td>
              <td>{{ item.Finishing }}</td>
              <td class="text-right font-weight-medium">
                {{ formatNumber(item.Jumlah) }} {{ item.Satuan }}
              </td>
              <td class="text-center align-middle">
                <div class="design-img-container">
                  <img
                    v-if="resolvedImageUrl"
                    :src="resolvedImageUrl"
                    class="design-thumb"
                    alt="Desain"
                  />
                  <span
                    v-else-if="!isLoadingImage"
                    class="text-caption text-grey"
                    >-</span
                  >
                  <span v-else class="text-caption text-primary"
                    >Memuat...</span
                  >
                </div>
              </td>
              <td class="text-right">{{ formatRupiah(item.Harga) }}</td>
              <td class="text-right font-weight-medium">
                {{ formatRupiah(item.TotalSub) }}
              </td>
            </tr>
            <tr v-if="poItems.length === 0">
              <td colspan="9" class="text-center py-4 text-grey">
                Tidak ada data rincian pekerjaan jasa.
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-weight-bold table-footer-row">
              <td colspan="5" class="text-right">TOTAL QTY JASA:</td>
              <td class="text-right">{{ formatNumber(totalQty) }} PCS</td>
              <td colspan="2" class="text-right">TOTAL JASA:</td>
              <td class="text-right text-primary">
                {{ formatRupiah(totalJasa) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- TABEL 2: Ketentuan Penggunaan & Pengembalian Bahan Sendiri -->
      <div v-if="poBahan && poBahan.length > 0" class="bahan-section mb-4">
        <div class="section-heading font-weight-bold mb-1 d-flex justify-space-between align-center">
          <span>2. KETENTUAN PENGGUNAAN BAHAN (BAHAN SENDIRI):</span>
          <span class="text-caption text-grey-darken-2 font-weight-regular">
            * Selisih bahan yang tidak kembali akan dipotongkan dari tagihan
          </span>
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 30px">No.</th>
              <th style="width: 120px">Kode Bahan</th>
              <th>Nama Bahan</th>
              <th style="width: 60px">Satuan</th>
              <th style="width: 90px">Est. SPK</th>
              <th style="width: 90px">Bahan Keluar</th>
              <th style="width: 90px">Bahan Kembali</th>
              <th style="width: 80px">Selisih</th>
              <th style="width: 110px">Potongan Tagihan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, bi) in poBahan" :key="'b-' + bi">
              <td class="text-center">{{ bi + 1 }}</td>
              <td class="font-monospace">{{ b.poeb_kode || b.kode || "-" }}</td>
              <td class="font-weight-medium">{{ b.poeb_nama || b.nama || "-" }}</td>
              <td class="text-center">{{ b.poeb_satuan || b.satuan || "m²" }}</td>
              <td class="text-right">{{ formatNumber(b.poeb_est_pakai || b.estPakai || 0) }}</td>
              <td class="text-right">{{ formatNumber(b.poeb_qty_keluar || b.qtyKeluar || 0) }}</td>
              <td class="text-right">{{ formatNumber(b.poeb_qty_kembali || b.qtyKembali || 0) }}</td>
              <td class="text-right font-weight-bold" :class="Number(b.poeb_selisih || b.selisih || 0) > 0 ? 'text-red-darken-3' : ''">
                {{ formatNumber(b.poeb_selisih || b.selisih || 0) }}
              </td>
              <td class="text-right font-weight-bold" :class="Number(b.poeb_potongan || b.nilaiPotongan || 0) > 0 ? 'text-red-darken-3' : ''">
                {{ Number(b.poeb_potongan || b.nilaiPotongan || 0) > 0 ? '- ' + formatRupiah(b.poeb_potongan || b.nilaiPotongan) : 'Rp 0' }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-weight-bold table-footer-row">
              <td colspan="8" class="text-right">TOTAL POTONGAN BAHAN:</td>
              <td class="text-right text-red-darken-3">
                - {{ formatRupiah(totalPotonganBahan) }}
              </td>
            </tr>
            <tr class="font-weight-bold grand-total-row">
              <td colspan="8" class="text-right text-subtitle-2">GRAND TOTAL TAGIHAN BERSIH:</td>
              <td class="text-right text-primary text-subtitle-2">
                {{ formatRupiah(grandTotalBersih) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Tabel Alokasi Pengiriman -->
      <div
        v-if="poAlokasi && poAlokasi.length > 0"
        class="alokasi-section mb-4"
      >
        <div class="alokasi-title font-weight-bold mb-1">
          3. ALOKASI PENGIRIMAN:
        </div>
        <table class="print-table alokasi-table">
          <thead>
            <tr>
              <template v-for="(chunk, ci) in alokasiChunks" :key="'h-' + ci">
                <th class="col-no" :class="{ 'chunk-start': ci > 0 }">No.</th>
                <th>Kota / Tujuan</th>
                <th class="col-jml">Jumlah</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rowIdx in alokasiRowCount" :key="'r-' + rowIdx">
              <template v-for="(chunk, ci) in alokasiChunks" :key="'c-' + ci">
                <template v-if="chunk[rowIdx - 1]">
                  <td
                    class="text-center col-no"
                    :class="{ 'chunk-start': ci > 0 }"
                  >
                    {{ (rowIdx - 1) + ci * alokasiPerColumn + 1 }}
                  </td>
                  <td>{{ chunk[rowIdx - 1].poeda_kota }}</td>
                  <td class="text-right font-weight-medium">
                    {{ formatNumber(chunk[rowIdx - 1].poeda_jumlah) }}
                  </td>
                </template>
                <template v-else>
                  <td class="col-no" :class="{ 'chunk-start': ci > 0 }"></td>
                  <td></td>
                  <td></td>
                </template>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bagian Catatan / NB -->
      <div class="nb-section pa-3 mb-6">
        <div
          class="font-weight-bold mb-1 text-uppercase text-caption text-grey-darken-2"
        >
          Ketentuan & Catatan :
        </div>
        <div class="text-body-2" style="white-space: pre-line">
          {{ poData.poe_ket || "Bahan yang dikirim merupakan milik CV. Kencana Print. Rekanan wajib mengembalikan sisa bahan dan barang jadi secara utuh sesuai jumlah SPK. Selisih bahan yang tidak dapat dipertanggungjawabkan akan langsung dipotong dari total tagihan jasa." }}
        </div>
      </div>

      <!-- Bagian Tanda Tangan -->
      <div class="signature-section mt-8">
        <table class="signature-table">
          <tr>
            <td class="text-center" style="width: 50%">
              <div class="font-weight-bold mb-1">Pemberi Kerja,</div>
              <div class="font-weight-bold">CV. Kencana Print</div>
            </td>
            <td class="text-center" style="width: 50%">
              <div class="font-weight-bold mb-1">Rekanan Vendor Jasa,</div>
              <div class="font-weight-bold uppercase">
                {{ poData.Sup_nama || "VENDOR" }}
              </div>
            </td>
          </tr>
          <tr>
            <td style="height: 65px"></td>
            <td></td>
          </tr>
          <tr>
            <td class="text-center font-weight-bold">
              <span class="text-decoration-underline">{{
                poData.user_create || "Bagian Operasional / MMT"
              }}</span>
            </td>
            <td class="text-center font-weight-bold">
              <span class="text-decoration-underline">{{
                poData.Sup_nama
                  ? "( " + poData.Sup_nama + " )"
                  : "____________________"
              }}</span>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format, parseISO, isValid } from "date-fns";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const nomorPo = route.params.nomor as string;

// State Data Cetak
const poData = ref<any>({});
const poAlokasi = ref<any[]>([]);
const poBahan = ref<any[]>([]);
const resolvedImageUrl = ref("");
const isLoadingImage = ref(false);

const getBaseUrl = () => {
  const rawBase = api.defaults.baseURL || import.meta.env.VITE_API_URL || "";
  return rawBase.replace(/\/api\/?$/, "");
};

const resolveDesignImage = () => {
  const spkNomor = poData.value.poe_spk_nomor || "";
  if (!spkNomor && !poData.value.poe_nomor) {
    resolvedImageUrl.value = "";
    return;
  }

  const base = getBaseUrl();
  const cab = poData.value.poe_cab || "HO-";
  const nomor = spkNomor || poData.value.poe_nomor;
  const mapNomor = poData.value.spk_memo || "";

  const candidates: string[] = [];

  if (mapNomor) {
    candidates.push(
      `${base}/images/${cab}/map/${encodeURIComponent(mapNomor)}.jpg`,
      `/file-gambar/map/${encodeURIComponent(mapNomor)}.jpg`,
      `${base}/images/${cab}/${encodeURIComponent(mapNomor)}.jpg`
    );
  }

  candidates.push(
    `${base}/images/${cab}/${encodeURIComponent(nomor)}.jpg`,
    `/file-gambar/${encodeURIComponent(nomor)}.jpg`
  );

  isLoadingImage.value = true;
  resolvedImageUrl.value = "";

  const tryNext = (idx: number) => {
    if (idx >= candidates.length) {
      isLoadingImage.value = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolvedImageUrl.value = candidates[idx];
      isLoadingImage.value = false;
    };
    img.onerror = () => tryNext(idx + 1);
    img.src = candidates[idx];
  };
  tryNext(0);
};

const fetchPrintData = async () => {
  try {
    const res = await api.get(`/mmt/po-jasa-mmt/print/${nomorPo}`);
    poData.value = res.data.header || {};
    poAlokasi.value = res.data.alokasi || [];
    poBahan.value = res.data.bahanList || res.data.bahan || [];
    resolveDesignImage();
  } catch (err) {
    toast.error("Gagal memuat data cetak PO Jasa.");
  }
};

const poItems = computed(() => {
  if (!poData.value || !poData.value.poe_nomor) return [];

  return [
    {
      NamaPesanan: poData.value.spk_nama || "-",
      Bahan: poData.value.spk_kain || "-",
      Ukuran: poData.value.spk_ukuran || "-",
      Finishing: poData.value.poe_finishing || "-",
      Jumlah: poData.value.poe_jumlah || 0,
      Satuan: "PCS",
      Harga: poData.value.poe_tarif || 0,
      TotalSub: poData.value.poe_total || 0,
    },
  ];
});

const totalQty = computed(() => {
  return poItems.value.reduce((sum, item) => sum + Number(item.Jumlah || 0), 0);
});

const totalJasa = computed(() => {
  return poItems.value.reduce(
    (sum, item) => sum + Number(item.TotalSub || item.Jumlah * item.Harga || 0),
    0
  );
});

const totalPotonganBahan = computed(() => {
  if (poData.value.poe_potongan_bahan !== undefined) {
    return Number(poData.value.poe_potongan_bahan || 0);
  }
  return poBahan.value.reduce(
    (sum, b) => sum + Number(b.poeb_potongan || b.nilaiPotongan || 0),
    0
  );
});

const grandTotalBersih = computed(() => {
  if (poData.value.poe_total_bersih !== undefined) {
    return Number(poData.value.poe_total_bersih || 0);
  }
  return Math.max(0, totalJasa.value - totalPotonganBahan.value);
});

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

const handlePrint = () => {
  window.print();
};

const safeFormatDate = (d: string) =>
  d && isValid(parseISO(d)) ? format(parseISO(d), "dd MMM yyyy") : d || "-";

const formatRupiah = (v: number | string) => {
  if (!v) return "0";
  return new Intl.NumberFormat("id-ID", { style: "decimal" }).format(Number(v));
};

const formatNumber = (v: number | string) => {
  if (!v) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(v));
};

onMounted(() => {
  if (nomorPo) {
    fetchPrintData();
  }
});
</script>

<style scoped>
.print-page-container {
  background-color: #525659;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.print-sheet {
  background: white;
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 15mm;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  color: #111;
  box-sizing: border-box;
}

.print-sheet.landscape-mode {
  width: 297mm;
  min-height: 210mm;
}

.company-title {
  font-size: 15pt;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #0b2f5c;
  margin-bottom: 2px;
}

.company-address {
  font-size: 8.5pt;
  line-height: 1.3;
  color: #555;
}

.document-title {
  font-size: 16pt;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #222;
  text-align: right;
  text-transform: uppercase;
}

.header-meta-table td {
  font-size: 9pt;
  padding: 1px 4px;
  color: #333;
}

.vendor-section {
  width: 320px;
}

.vendor-box-title {
  background-color: #0b2f5c;
  color: white;
  font-size: 8pt;
  font-weight: bold;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  display: inline-block;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.vendor-content {
  font-size: 9pt;
  border: 1px solid #0b2f5c;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
  background-color: #f9fbfd;
}

.section-heading {
  font-size: 9pt;
  color: #0b2f5c;
  text-transform: uppercase;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
}

.print-table th,
.print-table td {
  border: 1px solid #bbb;
  padding: 5px 8px;
}

.print-table th {
  background-color: #f0f4f8;
  color: #1e293b;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 8pt;
  letter-spacing: 0.5px;
}

.table-footer-row {
  background-color: #f8fafc;
}

.grand-total-row {
  background-color: #e0f2fe;
}

.design-img-container {
  width: 60px;
  height: 60px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px dashed #ccc;
  border-radius: 4px;
}

.design-thumb {
  max-width: 100%;
  max-height: 60px;
  object-fit: contain;
  display: block;
}

.alokasi-section {
  width: 100%;
}

.alokasi-title {
  font-size: 8.5pt;
  color: #0b2f5c;
}

.alokasi-table th,
.alokasi-table td {
  font-size: 8pt;
  padding: 3px 6px;
}

.alokasi-table .col-no {
  width: 32px;
  color: #64748b;
}

.alokasi-table .col-jml {
  width: 70px;
}

.alokasi-table .chunk-start {
  border-left: 2px solid #94a3b8;
}

.nb-section {
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  border-radius: 4px;
  font-size: 9pt;
  min-height: 40px;
}

.signature-table {
  width: 100%;
  font-size: 9pt;
}

@media print {
  .print-page-container {
    background: none;
    padding: 0;
  }

  .print-sheet {
    box-shadow: none;
    padding: 0;
  }

  @page {
    size: A4 portrait;
  }

  .print-sheet.landscape-mode {
    width: 100% !important;
  }

  @media print {
    @page {
      size: A4 landscape;
    }
  }

  .d-print-none {
    display: none !important;
  }
}
</style>
