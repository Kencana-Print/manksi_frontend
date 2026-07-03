<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const nomor = (route.params.nomor || route.query.nomor) as string;

const data = ref<any>(null);
const isLoading = ref(true);
const error = ref("");

const fmt = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

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

onMounted(async () => {
  try {
    const res = await api.get(
      `/garmen/po-jasa/cetak/${encodeURIComponent(nomor)}`,
    );
    const d = res.data.data;

    // Validasi: J08 (bordir) harus sudah approve (pojh_cetak=1)
    if (d.pojh_jasa_kode === "J08" && Number(d.pojh_cetak) !== 1) {
      error.value = "PO ini belum di approve, tidak dapat dicetak.";
      isLoading.value = false;
      return;
    }

    data.value = d;
    isLoading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message || "Gagal memuat data cetak.";
    isLoading.value = false;
  }
});

// Filter hanya komponen (bukan tab bahan / statuspotong=1)
const komponen = (detail: any[]) =>
  (detail || []).filter((r) => r.pojd_statuspotong !== 1);

// Kalkulasi total
const total = (d: any) =>
  Number(d.pojh_jumlah || 0) * Number(d.pojh_tarif || 0);
const ppnNominal = (d: any) =>
  d.pojh_status_ppn ? (total(d) * Number(d.pojh_ppn || 0)) / 100 : 0;
const grandTotal = (d: any) => total(d) + ppnNominal(d);
</script>

<template>
  <div v-if="isLoading" class="state">Memuat data cetak...</div>
  <div v-else-if="error" class="state err">{{ error }}</div>

  <template v-else-if="data">
    <!-- 2 copy dalam 1 halaman A4 -->
    <div v-for="copy in [1, 2]" :key="copy" class="copy">
      <!-- Kop surat -->
      <div class="kop">
        <div class="k-nama">{{ data.comp_nama || "CV. Kencana Print" }}</div>
        <div class="k-sub">
          {{
            data.comp_alamat || "Padokan RT 04 / 04  Sawahan Ngemplak Boyolali"
          }}
        </div>
        <div class="k-sub">
          Telp {{ data.comp_telp || "0271-740634 / Fax  0271-740634" }}
        </div>
      </div>
      <div class="judul">P O J A S A</div>

      <!-- Info 2 kolom -->
      <div class="info-wrap">
        <!-- Kiri -->
        <table class="itbl">
          <tr>
            <td class="lbl">Nomor</td>
            <td>:</td>
            <td>{{ data.pojh_nomor }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td>:</td>
            <td>{{ fmtDate(data.pojh_tanggal) }}</td>
          </tr>
          <tr>
            <td class="lbl">Dateline</td>
            <td>:</td>
            <td>{{ fmtDate(data.pojh_dateline) }}</td>
          </tr>
          <tr>
            <td class="lbl">Keterangan</td>
            <td>:</td>
            <td>{{ data.pojh_keterangan }}</td>
          </tr>
          <tr>
            <td class="lbl">Product</td>
            <td>:</td>
            <td>{{ data.spk_nama }}</td>
          </tr>
          <tr>
            <td class="lbl">Ukuran</td>
            <td>:</td>
            <td>{{ data.spk_ukuran }}</td>
          </tr>
          <tr>
            <td class="lbl">Jasa</td>
            <td>:</td>
            <td>{{ data.jasa_nama }}</td>
          </tr>
          <tr>
            <td class="lbl">Jumlah</td>
            <td>:</td>
            <td>{{ fmt(data.pojh_jumlah) }}</td>
          </tr>
          <tr>
            <td class="lbl">Tarif</td>
            <td>:</td>
            <td>{{ fmt(data.pojh_tarif) }}</td>
          </tr>
        </table>
        <!-- Kanan: hanya Kepada YTH + supplier -->
        <div class="info-right">
          <div style="font-weight: bold; font-size: 8pt">Kepada YTH</div>
          <div class="sup-n">{{ data.sup_nama }}</div>
          <div class="sup-a">{{ data.sup_alamat }}</div>
          <div class="sup-a">{{ data.sup_kota }}</div>
        </div>
      </div>

      <!-- Tabel detail bahan -->
      <div class="dtbl-lbl">Bahan yang disertakan :</div>
      <table class="dtbl">
        <thead>
          <tr>
            <th class="c-no">No</th>
            <th class="c-kode">Kode</th>
            <th class="c-nama">Nama</th>
            <th class="c-qty">Qty</th>
            <th class="c-sat">Satuan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in komponen(data.detail)" :key="i">
            <td class="tc">{{ i + 1 }}</td>
            <td>{{ r.pojd_bhn_kode }}</td>
            <td>{{ r.bhn_name }}</td>
            <td class="tr">{{ fmt(r.pojd_jumlah) }}</td>
            <td>{{ r.pojd_bhn_satuan }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Footer: ttd kiri, total kanan -->
      <div class="foot">
        <div class="foot-l">
          <div class="ttd-row">
            <div class="ttd">
              <div>Dibuat oleh,</div>
              <div class="gap"></div>
              <div>(________________)</div>
            </div>
            <div class="ttd">
              <div>Mengetahui</div>
              <div class="gap"></div>
              <div>(________________)</div>
            </div>
          </div>
          <div class="note">
            note : 1. 1 x 24 jam Maksimal complain jumlah komponen masih di
            layani<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2. Lebih dari
            1x24 jam Quantity yang tercantum di PO adalah BENAR
          </div>
        </div>
        <div class="foot-r">
          <table class="ttotal">
            <tr>
              <td>Total</td>
              <td class="tr">{{ fmt(total(data)) }}</td>
            </tr>
            <tr>
              <td>Ppn</td>
              <td class="tr">{{ fmt(ppnNominal(data)) }}</td>
            </tr>
            <tr class="gt">
              <td>Grand Total</td>
              <td class="tr">{{ fmt(grandTotal(data)) }}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Pemisah copy (hanya antara copy 1 dan 2) -->
      <div v-if="copy === 1" class="cut-line"></div>
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
  font-size: 8.5pt;
  background: white;
  color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
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

/* Setiap copy ~half A4 */
.copy {
  width: 210mm;
  padding: 6mm 12mm 3mm;
}

.cut-line {
  border-top: 1px dashed #555;
  margin: 2mm 0;
  font-size: 0;
  height: 0;
}

/* Kop */
.kop {
  text-align: left;
  margin-bottom: 2mm;
}
.k-nama {
  font-size: 11pt;
  font-weight: bold;
}
.k-sub {
  font-size: 7.5pt;
}
.judul {
  text-align: center;
  font-size: 10pt;
  font-weight: bold;
  text-decoration: underline;
  letter-spacing: 5px;
  margin: 1.5mm 0 2mm;
}

/* Info */
.info-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3mm;
  margin-bottom: 1.5mm;
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
  min-width: 52px;
  white-space: nowrap;
}
.info-right {
  font-size: 8pt;
  text-align: right;
}
.info-right .itbl td:last-child {
  text-align: right;
}
.sup-n {
  font-weight: bold;
  font-size: 9pt;
  text-transform: uppercase;
  text-align: right;
}
.sup-a {
  text-transform: uppercase;
  font-size: 7.5pt;
  text-align: right;
}

/* Detail table */
.dtbl-lbl {
  font-size: 8pt;
  margin-bottom: 1mm;
}
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 2mm;
}
.dtbl thead tr {
  border-top: 1px solid black;
  border-bottom: 1px solid black;
}
.dtbl th {
  padding: 1mm 2mm;
  font-weight: bold;
  text-align: left;
}
.dtbl td {
  padding: 0.7mm 2mm;
}
.c-no {
  width: 7mm;
  text-align: center;
}
.c-kode {
  width: 28mm;
}
.c-qty {
  width: 18mm;
  text-align: right;
}
.c-sat {
  width: 16mm;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

/* Footer */
.foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.foot-l {
  flex: 1;
}
.foot-r {
  min-width: 52mm;
}
.ttd-row {
  display: flex;
  gap: 18mm;
  margin-bottom: 1mm;
}
.ttd {
  text-align: center;
  font-size: 8pt;
}
.gap {
  height: 9mm;
}
.note {
  font-size: 6.8pt;
  color: #333;
  line-height: 1.4;
  margin-top: 1mm;
}
.ttotal {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
}
.ttotal td {
  padding: 0.4mm 2mm;
}
.ttotal .tr {
  text-align: right;
}
.ttotal .gt {
  font-weight: bold;
  border-top: 1px solid black;
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
