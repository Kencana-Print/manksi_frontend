<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { koreksiStokFormService } from "@/services/garmen/koreksiStokBarangFormService";
import logoSrc from "@/assets/logo.png";

interface DetailItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Stok: number;
  Koreksi: number;
  Selisih: number;
  Keterangan: string;
}

const route = useRoute();
const nomor = route.params.nomor as string;

const isLoading = ref(true);
const errorMsg = ref("");
const header = ref<any>(null);
const detail = ref<DetailItem[]>([]);
const totalSelisih = ref(0);

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
  return `${d}-${monthsShort[Number(m) - 1]}-${y}`;
};

const fmtQty = (val: any) => {
  const n = Number(val) || 0;
  const s = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0
    ? `-${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : s;
};

const fetchData = async () => {
  isLoading.value = true;
  errorMsg.value = "";
  try {
    const res = await koreksiStokFormService.getDataCetak(nomor);
    const result = res.data.data;
    header.value = result.header;
    detail.value = result.detail;
    totalSelisih.value = result.totalSelisih;
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
      <div class="doc-header">
        <div class="doc-header-left">
          <div class="perush-nama">{{ header.perush_nama }}</div>
          <div class="perush-sub">{{ header.perush_alamat }}</div>
          <div class="perush-sub">{{ header.perush_telp }}</div>
          <div class="doc-title">Koreksi Stok {{ header.kor_jenis }}</div>
        </div>
        <div class="doc-header-right">
          <img :src="logoSrc" alt="Logo" class="doc-logo" />
        </div>
      </div>

      <div class="info-row">
        <table class="meta-table">
          <tr>
            <td class="meta-lbl">Nomor</td>
            <td class="meta-colon">:</td>
            <td class="meta-val">{{ header.kor_nomor }}</td>
          </tr>
          <tr>
            <td class="meta-lbl">Tanggal</td>
            <td class="meta-colon">:</td>
            <td class="meta-val">{{ fmtTanggal(header.kor_tanggal) }}</td>
          </tr>
          <tr>
            <td class="meta-lbl">Keterangan</td>
            <td class="meta-colon">:</td>
            <td class="meta-val">{{ header.kor_ket }}</td>
          </tr>
        </table>
        <div class="cab-box">Cabang : {{ header.kor_cab }}</div>
      </div>

      <table class="item-table">
        <thead>
          <tr>
            <th style="width: 28px">No</th>
            <th style="width: 100px">Kode</th>
            <th>Nama</th>
            <th style="width: 55px">Satuan</th>
            <th style="width: 70px; text-align: right">Stok</th>
            <th style="width: 70px; text-align: right">Koreksi</th>
            <th style="width: 70px; text-align: right">Selisih</th>
            <th style="width: 130px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in detail" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td>{{ row.Kode }}</td>
            <td>{{ row.Nama }}</td>
            <td class="tc">{{ row.Satuan }}</td>
            <td class="tr">{{ fmtQty(row.Stok) }}</td>
            <td class="tr">{{ fmtQty(row.Koreksi) }}</td>
            <td class="tr">{{ fmtQty(row.Selisih) }}</td>
            <td>{{ row.Keterangan }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="total-lbl">Total :</td>
            <td class="tr total-val">{{ fmtQty(totalSelisih) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div class="sign-row">
        <div class="sign-col">
          <div class="sign-lbl">Admin,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( {{ header.user_create }} )</div>
        </div>
        <div class="sign-col">
          <div class="sign-lbl">Ka. Gudang,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
        </div>
        <div class="sign-col">
          <div class="sign-lbl">Accounting,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
        </div>
        <div class="sign-col">
          <div class="sign-lbl">Audit,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
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

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.perush-nama {
  font-weight: 700;
  font-size: 12px;
}
.perush-sub {
  font-size: 10.5px;
  color: #222;
}
.doc-title {
  font-size: 15px;
  font-weight: 700;
  margin-top: 8px;
}
.doc-logo {
  height: 46px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.meta-table {
  border-collapse: collapse;
  font-size: 11px;
}
.meta-lbl {
  padding: 1px 4px 1px 0;
  color: #333;
  white-space: nowrap;
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
.cab-box {
  font-size: 11px;
  color: #111;
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
.total-lbl {
  text-align: right;
  font-weight: 700;
  padding: 4px 5px;
}
.total-val {
  font-weight: 700;
}

.sign-row {
  display: flex;
  margin-top: 40px;
}
.sign-col {
  flex: 1;
  text-align: left;
  padding-right: 20px;
}
.sign-lbl {
  font-size: 11px;
  font-weight: 600;
}
.sign-space {
  height: 40px;
}
.sign-name {
  font-size: 11px;
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
}
</style>
