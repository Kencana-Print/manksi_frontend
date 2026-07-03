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
      `/garmen/bpb-jasa/cetak/${encodeURIComponent(nomor)}`,
    );
    // Pastikan assign langsung dari res.data.data
    data.value = res.data.data;
    isLoading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e: any) {
    error.value = e.response?.data?.message || "Gagal memuat data cetak.";
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="state">Memuat data cetak...</div>
  <div v-else-if="error" class="state err">{{ error }}</div>

  <template v-else-if="data">
    <div class="copy">
      <!-- Kop -->
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

      <div class="judul">PENERIMAAN JASA</div>

      <!-- Info 2 kolom -->
      <div class="info-wrap">
        <!-- Kiri -->
        <table class="itbl">
          <tr>
            <td class="lbl">Nomor</td>
            <td class="sep">:</td>
            <td>{{ data.bpj_nomor }}</td>
          </tr>
          <tr>
            <td class="lbl">Tanggal</td>
            <td class="sep">:</td>
            <td>{{ fmtDate(data.bpj_tanggal) }}</td>
          </tr>
          <tr>
            <td class="lbl">Nomor PO</td>
            <td class="sep">:</td>
            <td>
              {{ data.pojh_nomor }}
              &nbsp;&nbsp; Jml PO : {{ fmt(data.pojh_jumlah) }}
            </td>
          </tr>
          <tr>
            <td class="lbl">Product</td>
            <td class="sep">:</td>
            <td>{{ data.spk_nama }}</td>
          </tr>
          <tr>
            <td class="lbl">Jasa</td>
            <td class="sep">:</td>
            <td>{{ data.jasa_nama }}</td>
          </tr>
          <tr>
            <td style="height: 2mm" colspan="3"></td>
          </tr>
          <tr>
            <td class="lbl">Jumlah</td>
            <td class="sep">:</td>
            <td>
              <b>{{ fmt(data.bpj_jumlah) }}</b>
            </td>
          </tr>
          <tr>
            <td class="lbl">Tarif</td>
            <td class="sep">:</td>
            <td>{{ fmt(data.pojh_tarif, 0) }}</td>
          </tr>
        </table>

        <!-- Kanan: Kepada YTH -->
        <div class="info-right">
          <div class="kpd">Kepada YTH</div>
          <div class="sup-n">{{ data.sup_nama }}</div>
          <div class="sup-a">{{ data.sup_alamat }}</div>
        </div>
      </div>

      <!-- Detail -->
      <div class="dtbl-lbl">Bahan yang disertakan :</div>
      <table class="dtbl">
        <thead>
          <tr>
            <th class="c-no">No</th>
            <th class="c-kode">Kode</th>
            <th>Nama</th>
            <th class="c-qty">Qty</th>
            <th class="c-sat">Satuan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in data.detail || []" :key="i">
            <td class="tc">{{ Number(i) + 1 }} .</td>
            <td>{{ r.kode }}</td>
            <td>{{ r.nama }}</td>
            <td class="tr">{{ fmt(r.jumlah) }}</td>
            <td>{{ r.satuan }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Footer TTD -->
      <div class="foot">
        <div class="ttd-wrap">
          <div class="ttd">
            <div>Dibuat oleh,</div>
            <div class="gap"></div>
            <div>({{ data.user_create || "________________" }})</div>
          </div>
          <div class="ttd">
            <div>Checker,</div>
            <div class="gap"></div>
            <div>(________________)</div>
          </div>
          <div class="ttd">
            <div>Kepala Gudang,</div>
            <div class="gap"></div>
            <div>(________________)</div>
          </div>
        </div>
      </div>
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
  padding: 6mm 12mm 3mm;
  margin: 0 auto;
}
.cut-line {
  border-top: 1px dashed #555;
  margin: 2mm 0;
}

/* Kop */
.kop {
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
  margin: 2mm 0;
}

/* Info */
.info-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3mm;
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

.info-right {
  font-size: 8pt;
}
.kpd {
  font-weight: bold;
  font-size: 8pt;
}
.sup-n {
  font-weight: bold;
  font-size: 9pt;
  text-transform: uppercase;
}
.sup-a {
  text-transform: uppercase;
  font-size: 7.5pt;
}

/* Detail */
.dtbl-lbl {
  font-size: 8pt;
  margin-bottom: 1mm;
}
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 3mm;
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
  padding: 0.6mm 2mm;
}
.c-no {
  width: 8mm;
  text-align: center;
}
.c-kode {
  width: 26mm;
}
.c-qty {
  width: 18mm;
  text-align: right;
}
.c-sat {
  width: 18mm;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

/* Footer */
.foot {
  margin-top: 2mm;
}
.ttd-wrap {
  display: flex;
  gap: 20mm;
}
.ttd {
  text-align: center;
  font-size: 8pt;
  min-width: 40mm;
}
.gap {
  height: 10mm;
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
}
</style>
