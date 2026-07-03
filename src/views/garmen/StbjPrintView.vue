<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import QrcodeVue from "qrcode.vue";

const route = useRoute();
const nomor = route.query.nomor as string;
const mode = (route.query.mode as string) || "biasa";
const copies = mode === "rangkap3" ? 3 : 2;

const WATERMARKS = ["ASLI", "COPY 1", "COPY 2"];

const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");

const fmtDate = (s: string) => {
  if (!s) return "-";
  const d = new Date(s);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

onMounted(async () => {
  try {
    const res = await api.get("/garmen/stbj-form/cetak", { params: { nomor } });
    data.value = res.data.data;
    isLoading.value = false;
    setTimeout(() => window.print(), 800);
  } catch (e: any) {
    error.value = e.response?.data?.message || "Gagal memuat data.";
    isLoading.value = false;
  }
});

const totalJumlah = (dtl: any[]) =>
  dtl.reduce((s, r) => s + Number(r.stbjd_jumlah || 0), 0);
</script>

<template>
  <div v-if="isLoading" class="state">Memuat data cetak...</div>
  <div v-else-if="error" class="state err">{{ error }}</div>

  <template v-else-if="data">
    <div v-for="(copy, ci) in copies" :key="ci" class="copy">
      <!-- Watermark rangkap 3 -->
      <div v-if="mode === 'rangkap3'" class="watermark">
        {{ WATERMARKS[ci] }}
      </div>

      <!-- Kop -->
      <div class="kop">
        <div class="kop-left">
          <div class="judul">SERAH TERIMA BARANG JADI</div>
          <table class="itbl">
            <tr>
              <td class="lbl">Nomor</td>
              <td class="sep">:</td>
              <td class="val mono">{{ data.header.stbj_nomor }}</td>
            </tr>
            <tr>
              <td class="lbl">Tanggal</td>
              <td class="sep">:</td>
              <td class="val">{{ fmtDate(data.header.stbj_tanggal) }}</td>
            </tr>
            <tr>
              <td class="lbl">Keterangan</td>
              <td class="sep">:</td>
              <td class="val">{{ data.header.stbj_keterangan }}</td>
            </tr>
          </table>
        </div>
        <div class="kop-right">
          <div style="display: flex; align-items: flex-start; gap: 3mm">
            <div style="text-align: right">
              <img src="@/assets/logo.png" class="logo" alt="Kencana Print" />
              <div class="gudang-label">
                Gudang : <b>{{ data.header.gdg_nama }}</b>
              </div>
            </div>
            <QrcodeVue :value="nomor" :size="65" level="L" />
          </div>
        </div>
      </div>

      <!-- Tabel detail -->
      <table class="dtbl">
        <thead>
          <tr>
            <th class="c-no">No</th>
            <th class="c-kode">Kode</th>
            <th>Nama</th>
            <th style="width: 80px">Ukuran</th>
            <th style="width: 55px; text-align: right">Jumlah</th>
            <th style="width: 45px; text-align: right">Jumlah<br />Koli</th>
            <th style="width: 80px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in data.detail" :key="i">
            <td class="tc">{{ Number(i) + 1 }}</td>
            <td class="mono">{{ r.stbjd_spk_nomor }}</td>
            <td>{{ r.spk_nama }}</td>
            <td>{{ r.stbjd_size }}</td>
            <td class="tr">{{ num(r.stbjd_jumlah) }}</td>
            <td class="tr">{{ r.stbjd_koli || "" }}</td>
            <td>{{ r.stbjd_keterangan }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td
              colspan="4"
              class="tr"
              style="font-weight: 700; padding-right: 4mm"
            >
              Total :
            </td>
            <td class="tr" style="font-weight: 700">
              {{ num(totalJumlah(data.detail)) }}
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <!-- TTD -->
      <div class="ttd-wrap">
        <div class="ttd">
          <div>Diserahkan Oleh,</div>
          <div class="gap"></div>
          <div>(________________)</div>
        </div>
        <div class="ttd">
          <div>Diterima,</div>
          <div class="gap"></div>
          <div>(________________)</div>
        </div>
        <div class="ttd">
          <div>Checkers,</div>
          <div class="gap"></div>
          <div>(________________)</div>
        </div>
        <div class="ttd">
          <div>Kepala Gudang,</div>
          <div class="gap"></div>
          <div>(________________)</div>
        </div>
      </div>

      <!-- Pemisah antar copy -->
      <div v-if="ci < copies - 1" class="cut-line" />
    </div>
  </template>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: Arial, sans-serif;
  font-size: 8pt;
  background: white;
  color: #000;
}
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #555;
}
.err {
  color: #c62828;
}

.copy {
  width: 210mm;
  padding: 5mm 10mm 4mm;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* Watermark */
.watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 52pt;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.07);
  white-space: nowrap;
  pointer-events: none;
  z-index: 0;
  letter-spacing: 4px;
}

.cut-line {
  border-top: 1px dashed #999;
  margin: 3mm 0;
}

/* Kop */
.kop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 3mm;
  position: relative;
  z-index: 1;
}
.kop-left {
  flex: 1;
}
.kop-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2mm;
}
.logo {
  height: 14mm;
  object-fit: contain;
}
.gudang-label {
  font-size: 8pt;
}

.judul {
  font-size: 13pt;
  font-weight: bold;
  margin-bottom: 2mm;
}
.itbl {
  border-collapse: collapse;
  font-size: 8pt;
}
.itbl td {
  padding: 0.3mm 1mm;
  vertical-align: top;
}
.lbl {
  min-width: 55px;
  white-space: nowrap;
}
.sep {
  padding: 0 1mm;
}
.mono {
  font-family: monospace;
}

/* Detail table */
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 3mm;
  position: relative;
  z-index: 1;
}
.dtbl thead tr {
  border-top: 1px solid black;
  border-bottom: 1px solid black;
}
.dtbl th {
  padding: 1mm 2mm;
  font-weight: bold;
  text-align: left;
  font-size: 8pt;
}
.dtbl td {
  padding: 0.7mm 2mm;
  vertical-align: top;
}
.dtbl tfoot tr {
  border-top: 1px solid black;
}
.c-no {
  width: 7mm;
  text-align: center;
}
.c-kode {
  width: 28mm;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

/* TTD */
.ttd-wrap {
  display: flex;
  justify-content: space-between;
  margin-top: 3mm;
  position: relative;
  z-index: 1;
}
.ttd {
  text-align: center;
  font-size: 8pt;
  flex: 1;
  border: 1px dashed #666;
  padding: 2mm;
  margin: 0 1mm;
}
.gap {
  height: 12mm;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    margin: 0;
  }
  .copy {
    page-break-inside: avoid;
  }
  .cut-line {
    border-top: none;
  }
}
</style>
