<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { returPembelianFormService } from "@/services/garmen/returPembelianFormService";
import logoSrc from "@/assets/logo.png";

interface DetailItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Jumlah: number;
}

const route = useRoute();
const nomor = route.params.nomor as string;

const isLoading = ref(true);
const errorMsg = ref("");
const header = ref<any>(null);

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
  if (n === 0) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Padding ke 14 slot — replikasi insertketampungan (a:=14) di Delphi
const MIN_ROWS = 14;
const paddedDetail = ref<(DetailItem | null)[]>([]);

const fetchData = async () => {
  isLoading.value = true;
  errorMsg.value = "";
  try {
    const res = await returPembelianFormService.getDataCetak(nomor);
    const result = res.data.data;
    header.value = result.header;

    const rows: (DetailItem | null)[] = [...result.detail];
    while (rows.length < MIN_ROWS) rows.push(null);
    paddedDetail.value = rows;
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

    <div v-else-if="header" class="paper">
      <!-- ── SALINAN 1 & 2 — kop lengkap di keduanya ── -->
      <div v-for="copyIndex in [1, 2]" :key="copyIndex" class="copy-block">
        <div class="doc-header">
          <div class="doc-header-left">
            <div class="perush-nama">{{ header.perush_nama }}</div>
            <div class="perush-sub">{{ header.perush_alamat }}</div>
            <div class="perush-sub">{{ header.perush_telp }}</div>
          </div>
          <div class="doc-header-right">
            <img :src="logoSrc" alt="Logo" class="doc-logo" />
          </div>
        </div>

        <div class="doc-title">RETUR PEMBELIAN {{ header.rb_jenis }}</div>

        <div class="info-row">
          <table class="meta-table">
            <tr>
              <td class="meta-lbl">Nomor</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ header.rb_nomor }}</td>
            </tr>
            <tr>
              <td class="meta-lbl">Tanggal</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ fmtTanggal(header.rb_tanggal) }}</td>
            </tr>
            <tr>
              <td class="meta-lbl">Keterangan</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ header.rb_keterangan }}</td>
            </tr>
          </table>

          <table v-if="header.sup_nama" class="meta-table sup-table">
            <tr>
              <td class="meta-lbl">Supplier</td>
              <td class="meta-colon">:</td>
              <td class="meta-val">{{ header.sup_nama }}</td>
            </tr>
            <tr v-if="header.sup_alamat">
              <td class="meta-lbl"></td>
              <td class="meta-colon"></td>
              <td class="meta-val">{{ header.sup_alamat }}</td>
            </tr>
            <tr v-if="header.sup_kota">
              <td class="meta-lbl"></td>
              <td class="meta-colon"></td>
              <td class="meta-val">{{ header.sup_kota }}</td>
            </tr>
          </table>
        </div>

        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 28px">No</th>
              <th style="width: 110px">Kode</th>
              <th>Nama</th>
              <th style="width: 60px">Satuan</th>
              <th style="width: 70px; text-align: center">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in paddedDetail" :key="i">
              <td class="tc">{{ row ? i + 1 : "" }}</td>
              <td>{{ row?.Kode || "" }}</td>
              <td>{{ row?.Nama || "" }}</td>
              <td class="tc">{{ row?.Satuan || "" }}</td>
              <td class="tc">{{ row ? fmtQty(row.Jumlah) : "" }}</td>
            </tr>
          </tbody>
        </table>

        <div class="sign-row">
          <div class="sign-box"><span class="sign-lbl">Dibuat Oleh,</span></div>
          <div class="sign-box"><span class="sign-lbl">Checkers,</span></div>
          <div class="sign-box">
            <span class="sign-lbl">Kepala Gudang,</span>
          </div>
          <div class="sign-box"><span class="sign-lbl">Manager,</span></div>
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
  font-size: 11px;
  color: #111;
}

.copy-block {
  margin-bottom: 30px;
  padding-bottom: 20px;
}
.copy-block:not(:last-child) {
  border-bottom: 1px dashed #999;
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}
.perush-nama {
  font-weight: 700;
  font-size: 12px;
}
.perush-sub {
  font-size: 10.5px;
  color: #222;
}
.doc-logo {
  height: 40px;
}
.doc-title {
  font-size: 16px;
  font-weight: 700;
  margin: 8px 0 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 10px;
}
.meta-table {
  border-collapse: collapse;
  font-size: 11px;
}
.sup-table {
  max-width: 300px;
}
.meta-lbl {
  padding: 1px 4px 1px 0;
  color: #333;
  white-space: nowrap;
  width: 70px;
  vertical-align: top;
}
.meta-colon {
  padding: 1px 4px;
  vertical-align: top;
}
.meta-val {
  padding: 1px 0;
  color: #1a237e;
}

.item-table {
  width: 100%;
  border-collapse: collapse;
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
  font-size: 10.5px;
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

.sign-row {
  display: flex;
  border: 1px dashed #666;
  margin-top: 14px;
  padding: 6px 0;
}
.sign-box {
  flex: 1;
  text-align: center;
  border-right: 1px solid #999;
}
.sign-box:last-child {
  border-right: none;
}
.sign-lbl {
  font-size: 11px;
  font-weight: 500;
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
