<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { returBarangFormService } from "@/services/garmen/returBarangFormService";
import logoSrc from "@/assets/logo.png";

interface DetailItem {
  nominta: string;
  kode: string;
  nama: string;
  satuan: string;
  jumlah: number;
  keterangan: string;
  spk: string;
}

const route = useRoute();
const nomor = route.params.nomor as string;

const isLoading = ref(true);
const errorMsg = ref("");
const data = ref<{
  nomor: string;
  jenis: string;
  tanggal: string;
  cabang: string;
  keterangan: string;
  pic: string;
  gudangProduksi: { kode: string; nama: string };
  details: DetailItem[];
} | null>(null);

// Kolom "No.Permintaan & SPK" cuma relevan utk ACCESORIES/OBAT (sesuai
// data yang memang cuma terisi utk dua jenis itu di backend)
const showNomintaSpk = ref(false);
const showDariGudang = ref(false);

const monthsShort = [
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
const fmtTanggal = (v?: string) => {
  if (!v) return "";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d} ${monthsShort[Number(m) - 1]} ${y}`;
};

const fmtQty = (val: any) => {
  const n = Number(val) || 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Padding ke 10 slot (replikasi insertketampungan Delphi) — supaya tinggi
// tabel konsisten antar salinan meski jumlah item berbeda-beda
const MIN_ROWS = 10;
const paddedDetails = ref<(DetailItem | null)[]>([]);

const fetchData = async () => {
  isLoading.value = true;
  errorMsg.value = "";
  try {
    const res = await returBarangFormService.getDetail(nomor);
    const result = res.data.data;

    showNomintaSpk.value = ["ACCESORIES", "OBAT"].includes(result.jenis);
    showDariGudang.value =
      showNomintaSpk.value && !!result.gudangProduksi?.nama;

    const rows: (DetailItem | null)[] = [...result.details];
    while (rows.length < MIN_ROWS) rows.push(null);
    paddedDetails.value = rows;

    data.value = result;
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || "Gagal memuat data.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

const doPrint = () => window.print();
const goBack = () => window.close();
</script>

<template>
  <div class="print-page">
    <div class="no-print toolbar">
      <button class="tb-btn" @click="goBack">← Kembali</button>
      <button class="tb-btn tb-primary" @click="doPrint">🖨️ Cetak</button>
    </div>

    <div v-if="isLoading" class="state-msg">Memuat data...</div>
    <div v-else-if="errorMsg" class="state-msg error">{{ errorMsg }}</div>

    <div v-else-if="data" class="paper">
      <!-- ── SALINAN 1 & 2 ── -->
      <div v-for="copyIndex in [1, 2]" :key="copyIndex" class="copy-block">
        <div class="doc-header">
          <div class="doc-header-left">
            <div class="doc-title">RETUR {{ data.jenis }}</div>
            <table class="meta-table">
              <tr>
                <td class="meta-lbl">Nomor</td>
                <td class="meta-val">{{ data.nomor }}</td>
              </tr>
              <tr>
                <td class="meta-lbl">Tanggal</td>
                <td class="meta-val">{{ fmtTanggal(data.tanggal) }}</td>
              </tr>
              <tr>
                <td class="meta-lbl">Keterangan</td>
                <td class="meta-val">{{ data.keterangan }}</td>
              </tr>
            </table>
          </div>

          <div class="doc-header-right">
            <img :src="logoSrc" alt="Logo" class="doc-logo" />
            <table class="meta-table meta-table-right">
              <tr>
                <td class="meta-lbl">PIC</td>
                <td class="meta-val">{{ data.pic }}</td>
              </tr>
              <tr v-if="showDariGudang">
                <td class="meta-lbl">Dari Gudang</td>
                <td class="meta-val">{{ data.gudangProduksi.nama }}</td>
              </tr>
            </table>
          </div>
        </div>

        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 26px">No</th>
              <th style="width: 90px">Kode</th>
              <th>Nama</th>
              <th style="width: 50px">Satuan</th>
              <th style="width: 60px; text-align: right">Jumlah</th>
              <th style="width: 140px">Keterangan</th>
              <th v-if="showNomintaSpk" style="width: 110px">
                No.Permintaan &amp; SPK
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in paddedDetails" :key="i">
              <td class="tc">{{ row ? i + 1 : "" }}</td>
              <td>{{ row?.kode || "-" }}</td>
              <td>{{ row?.nama || "" }}</td>
              <td class="tc">{{ row?.satuan || "" }}</td>
              <td class="tr">{{ row ? fmtQty(row.jumlah) : "" }}</td>
              <td>{{ row?.keterangan || "" }}</td>
              <td v-if="showNomintaSpk">
                <div v-if="row?.nominta">{{ row.nominta }}</div>
                <div v-if="row?.spk">{{ row.spk }}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="sign-row">
          <div class="sign-box">
            <span class="sign-lbl">Diserahkan Oleh</span>
          </div>
          <div class="sign-box">
            <span class="sign-lbl">Diterima,</span>
          </div>
          <div class="sign-box">
            <span class="sign-lbl">Checkers,</span>
          </div>
          <div class="sign-box">
            <span class="sign-lbl">Kepala Gudang,</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-page {
  background: #e0e0e0;
  min-height: 100vh;
  padding: 20px 0;
  font-family: "Segoe UI", Arial, sans-serif;
}
.toolbar {
  max-width: 720px;
  margin: 0 auto 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.tb-btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  cursor: pointer;
}
.tb-primary {
  background: #1565c0;
  color: white;
  border-color: #1565c0;
  font-weight: 600;
}
.state-msg {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 13px;
}
.state-msg.error {
  color: #c62828;
}

.paper {
  max-width: 720px;
  margin: 0 auto;
  background: white;
  padding: 24px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.15);
  font-size: 10.5px;
  color: #111;
}

.copy-block {
  margin-bottom: 40px;
}
.copy-block:last-child {
  margin-bottom: 0;
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.doc-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
}
.meta-table {
  border-collapse: collapse;
  font-size: 10.5px;
}
.meta-table-right {
  margin-left: auto;
}
.meta-lbl {
  padding: 1px 8px 1px 0;
  color: #333;
  white-space: nowrap;
  vertical-align: top;
}
.meta-val {
  padding: 1px 0;
  font-weight: 600;
  white-space: nowrap;
}

.doc-header-left {
  flex: 1;
}
.doc-header-right {
  text-align: right;
  flex-shrink: 0;
}
.doc-logo {
  height: 34px;
  margin-bottom: 6px;
}

.item-table {
  width: 100%;
  border-collapse: collapse;
  min-height: 220px; /* replikasi padding 10-slot Delphi utk konsistensi tinggi */
}
.item-table th {
  border: 1px solid #333;
  background: #f0f0f0;
  padding: 3px 5px;
  font-size: 10px;
  text-align: left;
  font-weight: 700;
}
.item-table td {
  border-left: 1px solid #333;
  border-right: 1px solid #333;
  padding: 2px 5px;
  font-size: 10px;
  vertical-align: top;
}
.item-table tbody tr:first-child td {
  border-top: 1px solid #333;
}
.item-table tbody tr:last-child td {
  border-bottom: 1px solid #333;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.sign-row {
  display: flex;
  margin-top: 30px;
}
.sign-box {
  flex: 1;
  border-left: 1px dashed #333;
  border-bottom: 1px solid #333;
  height: 60px;
  display: flex;
  align-items: flex-end;
  padding: 0 8px 4px;
}
.sign-box:last-child {
  border-right: 1px dashed #333;
}
.sign-lbl {
  font-size: 10px;
  font-weight: 600;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-page {
    background: white;
    padding: 0;
  }
  .paper {
    box-shadow: none;
    max-width: 100%;
    padding: 10mm;
  }
  .copy-block {
    page-break-inside: avoid;
  }
}
</style>
