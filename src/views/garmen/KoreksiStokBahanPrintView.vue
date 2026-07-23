<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { koreksiStokBahanService } from "@/services/garmen/koreksiStokBahanService";
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

// ✅ Format DD-MM-YYYY (dash) — sengaja BEDA dari formatTanggal biasa
// (yang pakai slash), soalnya ini replikasi persis format report
// Delphi lama (lihat contoh cetakan: "28-01-2022").
const fmtDateDash = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}-${m}-${y}`;
};

const numFmt = (v: any) => {
  const n = Number(v || 0);
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const totalSelisih = computed(() =>
  detail.value.reduce((s, r) => s + (Number(r.selisih) || 0), 0),
);

const fetchData = async () => {
  try {
    const res = await koreksiStokBahanService.getDataCetak(nomor);
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
  document.title = `Koreksi Stok - ${nomor}`;
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
        <span class="toolbar-title">Koreksi Stok — {{ nomor }}</span>
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
            <div class="kop-sub">0271-740634/0271-740634</div>
            <div class="doc-title">Koreksi Stok</div>
          </div>
          <div class="kop-right">
            <img :src="logoKP" class="logo-img" />
          </div>
        </div>

        <!-- Info -->
        <table class="info-tbl">
          <tr>
            <td class="lbl">Nomor</td>
            <td>: {{ header.nomor }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td>: {{ fmtDateDash(header.tanggal) }}</td>
          </tr>
          <tr>
            <td class="lbl">Keterangan</td>
            <td>: {{ header.keterangan }}</td>
          </tr>
        </table>

        <!-- Tabel detail -->
        <table class="dtbl">
          <thead>
            <tr>
              <th style="width: 24px" class="text-center">No</th>
              <th style="width: 90px">Kode</th>
              <th>Nama</th>
              <th style="width: 55px" class="text-center">Satuan</th>
              <th style="width: 70px" class="text-right">Stok</th>
              <th style="width: 70px" class="text-right">Koreksi</th>
              <th style="width: 70px" class="text-right">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in detail" :key="i">
              <td class="text-center">{{ i + 1 }}</td>
              <td>{{ r.kode }}</td>
              <td>{{ r.nama }}</td>
              <td class="text-center">{{ r.satuan }}</td>
              <td class="text-right">{{ numFmt(r.stok) }}</td>
              <td class="text-right">{{ numFmt(r.jumlah) }}</td>
              <td class="text-right">{{ numFmt(r.selisih) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right total-lbl">Total :</td>
              <td></td>
              <td class="text-right total-val">{{ numFmt(totalSelisih) }}</td>
            </tr>
          </tfoot>
        </table>

        <!-- TTD -->
        <div class="ttd-row">
          <div class="ttd-col">
            <div class="ttd-lbl">Dibuat Oleh,</div>
            <div class="ttd-space"></div>
            <div class="ttd-name">( {{ header.usr }} )</div>
          </div>
          <div class="ttd-col">
            <div class="ttd-lbl">Mengetahui,</div>
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
  margin-bottom: 10px;
}
.kop-nama {
  font-size: 12pt;
  font-weight: 700;
}
.kop-sub {
  font-size: 9.5pt;
}
.doc-title {
  font-size: 15pt;
  font-weight: 700;
  margin-top: 6px;
}
.logo-img {
  max-height: 50px;
  object-fit: contain;
}

.info-tbl {
  border-collapse: collapse;
  font-size: 10pt;
  margin-bottom: 8px;
}
.info-tbl td {
  padding: 1px 4px 1px 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 75px;
  white-space: nowrap;
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
.total-lbl {
  font-weight: 700;
  border: none !important;
}
.total-val {
  font-weight: 700;
  border-top: 1.5px solid #000 !important;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}

.ttd-row {
  display: flex;
  gap: 40px;
  margin-top: 30px;
}
.ttd-col {
  text-align: center;
  min-width: 100px;
}
.ttd-lbl {
  font-size: 10pt;
}
.ttd-space {
  height: 40px;
}
.ttd-name {
  font-size: 10pt;
  border-top: none;
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
