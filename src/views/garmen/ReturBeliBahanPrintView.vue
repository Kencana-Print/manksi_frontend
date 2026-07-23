<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { returBeliBahanService } from "@/services/garmen/returBeliBahanService";
import logoKP from "@/assets/kp.jpg";

const route = useRoute();
const nomor = route.params.nomor as string;

const header = ref<any>({});
const detail = ref<any[]>([]);
const isReady = ref(false);
const isLoading = ref(true);
const errorMsg = ref("");

const doPrint = () => window.print();
const doClose = () => window.close();

const fmtDateSlash = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

const numFmt = (v: any) => {
  const n = Number(v || 0);
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fetchData = async () => {
  try {
    const res = await returBeliBahanService.getDataCetak(nomor);
    header.value = res.data.data.header;
    detail.value = res.data.data.detail;
    isReady.value = true;
    setTimeout(() => window.print(), 500);
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || "Gagal memuat data cetak.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  document.title = `Retur Pembelian - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-root">
    <div v-if="isLoading" class="state-screen">Menyiapkan cetak...</div>
    <div v-else-if="errorMsg" class="state-screen error">
      {{ errorMsg }}
    </div>

    <template v-else-if="isReady">
      <div class="no-print toolbar">
        <span class="toolbar-title">Retur Pembelian — {{ nomor }}</span>
        <div style="display: flex; gap: 8px">
          <button class="tbtn" @click="doPrint">🖨️ Cetak</button>
          <button class="tbtn tbtn-grey" @click="doClose">✕ Tutup</button>
        </div>
      </div>

      <div class="page">
        <!-- Kop -->
        <div class="header-section">
          <div class="kop-left">
            <div class="kop-nama">CV. Kencana Print</div>
            <div class="kop-sub">
              Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali
            </div>
            <div class="kop-sub">0271-740634</div>
          </div>
          <div class="kop-right">
            <img :src="logoKP" class="logo-img" />
          </div>
        </div>

        <div class="doc-title">RETUR PEMBELIAN</div>

        <!-- Info -->
        <table class="info-tbl">
          <tr>
            <td class="lbl">Nomor</td>
            <td class="sep">:</td>
            <td>{{ header.nomor }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td class="sep">:</td>
            <td>{{ fmtDateSlash(header.tanggal) }}</td>
          </tr>
          <tr>
            <td class="lbl">Keterangan</td>
            <td class="sep">:</td>
            <td>{{ header.keterangan }}</td>
          </tr>
        </table>

        <!-- Tabel detail -->
        <table class="dtbl">
          <thead>
            <tr>
              <th style="width: 28px" class="text-center">No</th>
              <th style="width: 110px">Kode</th>
              <th>Nama</th>
              <th style="width: 60px" class="text-center">Satuan</th>
              <th style="width: 90px" class="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in detail" :key="i">
              <td class="text-center">{{ i + 1 }}</td>
              <td>{{ r.kode }}</td>
              <td>{{ r.nama }}</td>
              <td class="text-center">{{ r.satuan }}</td>
              <td class="text-right">{{ numFmt(r.jumlah) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- TTD (4 kolom) -->
        <div class="ttd-row">
          <div class="ttd-col">
            <div class="ttd-lbl">Dibuat Oleh,</div>
            <div class="ttd-space"></div>
            <div class="ttd-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
          </div>
          <div class="ttd-col">
            <div class="ttd-lbl">Checkers,</div>
            <div class="ttd-space"></div>
            <div class="ttd-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
          </div>
          <div class="ttd-col">
            <div class="ttd-lbl">Kepala Gudang,</div>
            <div class="ttd-space"></div>
            <div class="ttd-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
          </div>
          <div class="ttd-col">
            <div class="ttd-lbl">Manager,</div>
            <div class="ttd-space"></div>
            <div class="ttd-name">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.state-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #777;
}
.state-screen.error {
  color: #c62828;
  font-weight: 600;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #1565c0;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;
}
.toolbar-title {
  font-weight: 700;
}
.tbtn {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.tbtn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.tbtn-grey {
  background: rgba(0, 0, 0, 0.2);
}

.print-root {
  background: #e0e0e0;
  min-height: 100vh;
  padding-top: 50px;
  padding-bottom: 20px;
}

.page {
  width: 210mm;
  min-height: 297mm;
  background: white;
  margin: 10px auto;
  padding: 15mm;
  box-sizing: border-box;
  font-family: Arial, "Segoe UI", sans-serif;
  font-size: 10.5pt;
  color: #000;
  border: 1px solid #ccc;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}
.kop-nama {
  font-size: 12pt;
  font-weight: 700;
}
.kop-sub {
  font-size: 9.5pt;
}
.logo-img {
  max-height: 50px;
  object-fit: contain;
}

.doc-title {
  font-size: 16pt;
  font-weight: 700;
  margin: 10px 0 12px;
}

.info-tbl {
  border-collapse: collapse;
  font-size: 10pt;
  margin-bottom: 10px;
}
.info-tbl td {
  padding: 1px 4px 1px 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 75px;
  white-space: nowrap;
}
.info-tbl .sep {
  width: 10px;
}

.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  margin-top: 6px;
}
.dtbl th {
  border: 1px solid #000;
  padding: 3px 5px;
  font-weight: 700;
  text-align: left;
}
.dtbl td {
  border: 1px solid #000;
  padding: 3px 5px;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}

.ttd-row {
  display: flex;
  gap: 20px;
  margin-top: 40px;
}
.ttd-col {
  text-align: center;
  flex: 1;
}
.ttd-lbl {
  font-size: 10pt;
}
.ttd-space {
  height: 40px;
}
.ttd-name {
  font-size: 10pt;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-root {
    background: white;
    padding: 0;
  }
  @page {
    size: A4;
    margin: 0;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    border: none;
    margin: 0;
    box-shadow: none;
  }
}
</style>
