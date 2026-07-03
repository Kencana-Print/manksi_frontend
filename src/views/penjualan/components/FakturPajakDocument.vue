<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  header: any;
  detail: any[];
  lembar: 1 | 2 | 3;
}>();

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Format tanggal sesuai DisplayFormat asli FastReport ──────────────
const BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const fmtShort = (v: string) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtLong = (v: string) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}`;
};

// ── Padding baris kosong sampai 9 — murni layout, tidak sentuh DB ────
const paddedDetail = computed(() => {
  const arr = [...(props.detail || [])];
  while (arr.length < 9) arr.push({ blank: true });
  return arr;
});

// ── Sesuai Memo36/Memo37/Memo38 di fr3: DPP = Harga Jual apa adanya
// (Potongan Harga & Uang Muka SELALU kosong di template asli — tidak
// ada value memo yang di-bind ke sana, murni ruang kosong buat isi
// manual kalau ada kasusnya). PPN = DPP * rate/100. ──────────────────
const hargaJual = computed(() =>
  (props.detail || []).reduce(
    (s, r) => s + Number(r.invd_harga || 0) * Number(r.qty || 0),
    0,
  ),
);
const ppnRate = computed(() => Number(props.header?.inv_ppn) || 0);
const ppnValue = computed(() => (hargaJual.value * ppnRate.value) / 100);

// ── Alamat customer — sesuai Page1/Page2/Page3 OnBeforePrint script:
// kalau inv_cus_alamat terisi, PAKAI ITU SAJA (kota ikut hilang);
// kalau kosong, pakai "cus_alamat_npwp - cus_kota_npwp". ─────────────
const customerAlamatDisplay = computed(() => {
  const h = props.header;
  if (h.inv_cus_alamat) return h.inv_cus_alamat;
  const alamat = h.cus_alamat_npwp || "";
  const kota = h.cus_kota_npwp || "";
  return kota ? `${alamat} - ${kota}` : alamat;
});

const lembarLabel = computed(() => {
  if (props.lembar === 1) return "Lembar 1 :";
  if (props.lembar === 2) return "Lembar 2 :";
  return "Lembar 3 :";
});
const lembarNote = computed(() => {
  if (props.lembar === 1)
    return "Untuk pembeli BKP /Penerima JKP\nsebagai bukti Pajak Masukan";
  if (props.lembar === 2)
    return "untuk penjualan BKP/Pemberi JKP\nSebagai bukti pajak keluaran";
  return "Untuk BUMN Lampiran SPT";
});
</script>

<template>
  <div class="fp-doc">
    <!-- Kop lembar -->
    <div class="fp-kop-row">
      <div class="fp-kop-lembar">{{ lembarLabel }}</div>
      <div class="fp-kop-note">{{ lembarNote }}</div>
    </div>
    <div class="fp-title">FAKTUR PAJAK</div>

    <table class="fp-outer">
      <tr>
        <td class="fp-lbl-inline">Kode dan Nomor Seri Faktur Pajak :</td>
        <td>{{ header.NoSeri || "-" }}</td>
        <td class="fp-lbl-inline fp-right">Invoice</td>
        <td class="fp-right">{{ header.inv_nomor }}</td>
      </tr>
    </table>

    <table class="fp-party-tbl">
      <tr>
        <td colspan="3" class="fp-section-lbl">Pengusaha Kena Pajak</td>
      </tr>
      <tr>
        <td class="fp-party-lbl">Nama</td>
        <td class="fp-colon">:</td>
        <td>{{ header.perush_nama }}</td>
      </tr>
      <tr>
        <td class="fp-party-lbl">Alamat</td>
        <td class="fp-colon">:</td>
        <td>{{ header.perush_alamat }}</td>
      </tr>
      <tr>
        <td class="fp-party-lbl">NPWP</td>
        <td class="fp-colon">:</td>
        <td>{{ header.perush_npwp }}</td>
      </tr>
      <tr>
        <td class="fp-party-lbl">Tanggal Pengukuhan PKP</td>
        <td class="fp-colon">:</td>
        <td>{{ fmtShort(header.perush_tgpkp) }}</td>
      </tr>
    </table>

    <table class="fp-party-tbl fp-party-tbl-buyer">
      <tr>
        <td colspan="3" class="fp-section-lbl">
          Pembeli Barang Kena Pajak /<br />Penerima Jasa Kena Pajak
        </td>
      </tr>
      <tr>
        <td class="fp-party-lbl">Nama</td>
        <td class="fp-colon">:</td>
        <td>{{ header.cus_nama_npwp || header.cus_nama }}</td>
      </tr>
      <tr>
        <td class="fp-party-lbl">Alamat</td>
        <td class="fp-colon">:</td>
        <td>{{ customerAlamatDisplay }}</td>
      </tr>
      <tr>
        <td class="fp-party-lbl">NPWP</td>
        <td class="fp-colon">:</td>
        <td>{{ header.cus_npwp || "-" }}</td>
      </tr>
    </table>

    <table class="fp-item-tbl">
      <thead>
        <tr>
          <th style="width: 26px">No.</th>
          <th>Nama Barang Kena Pajak / Jasa Kena Pajak</th>
          <th style="width: 45px; text-align: center">Qty</th>
          <th style="width: 110px; text-align: right">
            Harga Jual/Pengganti/Uang Muka/ Termin (Rp)
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in paddedDetail" :key="i">
          <td style="text-align: center">{{ r.blank ? "" : i + 1 }}</td>
          <td>{{ r.blank ? "" : r.spk_nama }}</td>
          <td style="text-align: center">{{ r.blank ? "" : num(r.qty) }}</td>
          <td style="text-align: right">
            {{ r.blank ? "" : num(Number(r.invd_harga) * Number(r.qty)) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Ringkasan — sesuai Memo36(HargaJual)/Memo37(DPP)/Memo38(PPN).
         Potongan Harga & Uang Muka SENGAJA kosong (tidak ada value
         di-bind di template asli — murni ruang isi manual). -->
    <table class="fp-summary-tbl">
      <tr>
        <td>Harga Jual / Penggantian / Uang Muka / Termin</td>
        <td class="fp-summary-val">{{ num(hargaJual) }}</td>
      </tr>
      <tr>
        <td>Dikurangi Potongan Harga</td>
        <td class="fp-summary-val"></td>
      </tr>
      <tr>
        <td>Dikurangi Uang Muka yang Telah Diterima</td>
        <td class="fp-summary-val"></td>
      </tr>
      <tr class="fp-summary-line">
        <td>Dasar Pengenaan Pajak</td>
        <td class="fp-summary-val">{{ num(hargaJual) }}</td>
      </tr>
      <tr class="fp-summary-line">
        <td>PPN = {{ ppnRate }}% X Dasar Pengenaan Pajak</td>
        <td class="fp-summary-val">{{ num(ppnValue) }}</td>
      </tr>
    </table>

    <!-- Pajak Penjualan Atas Barang Mewah — kosong/manual di template
         asli (tidak ada field DB yang di-bind), disediakan sbg ruang
         kosong utk isi tangan kalau relevan. -->
    <div class="fp-ppnbm">
      <div class="fp-ppnbm-title">Pajak Penjualan Atas Barang Mewah</div>
      <table class="fp-ppnbm-tbl">
        <tr>
          <td class="fp-ppnbm-cell">Tarif<br />&nbsp;</td>
          <td class="fp-ppnbm-cell">DPP<br />Rp.</td>
          <td class="fp-ppnbm-cell">PPn BM<br />Rp.</td>
        </tr>
        <tr>
          <td class="fp-ppnbm-cell">%<br />&nbsp;</td>
          <td class="fp-ppnbm-cell">Rp.<br />&nbsp;</td>
          <td class="fp-ppnbm-cell">Rp.<br />&nbsp;</td>
        </tr>
        <tr>
          <td class="fp-ppnbm-cell">%<br />&nbsp;</td>
          <td class="fp-ppnbm-cell">Rp.<br />&nbsp;</td>
          <td class="fp-ppnbm-cell">Rp.<br />&nbsp;</td>
        </tr>
        <tr>
          <td class="fp-ppnbm-cell" colspan="1">Jumlah</td>
          <td class="fp-ppnbm-cell" colspan="2">Rp.</td>
        </tr>
      </table>
    </div>

    <div class="fp-note">*) Coret Yang Tidak Perlu</div>

    <!-- Tanda tangan — "Boyolali," hardcoded di template asli, BUKAN
         dari field DB manapun (perush_kota tidak dipakai di sini). -->
    <div class="fp-sign-block">
      <div class="fp-sign-col">
        <div>Boyolali, {{ fmtLong(header.inv_tanggal) }}</div>
        <div class="fp-sign-space"></div>
        <div class="fp-sign-name">{{ header.perush_namapemilik || "-" }}</div>
        <div>{{ header.perush_jabatan || "-" }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fp-doc {
  width: 190mm;
  min-height: 260mm;
  background: white;
  padding: 8mm 10mm;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
  font-size: 9.5pt;
  color: #000;
}
.fp-kop-row {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 4px;
}
.fp-title {
  text-align: center;
  font-size: 15pt;
  font-weight: 700;
  margin-top: -22px; /* naik ke sejajar baris pertama .fp-kop-row */
  margin-bottom: 6px;
}
.fp-kop-lembar {
  font-size: 9pt;
  font-family: Calibri, sans-serif;
  white-space: nowrap;
  flex-shrink: 0;
}
.fp-kop-note {
  width: 148px;
  font-size: 9pt;
  font-family: Calibri, sans-serif;
  white-space: pre-line;
  text-align: left;
  line-height: 1.3;
}

.fp-outer {
  width: 100%;
  border: 1px solid #000;
  border-collapse: collapse;
  margin-bottom: 4px;
  font-size: 9.5pt;
}
.fp-outer td {
  padding: 3px 6px;
}
.fp-right {
  text-align: right;
}
.fp-lbl-inline {
  white-space: nowrap;
}

.fp-party-tbl {
  width: 100%;
  border: 1px solid #000;
  border-top: none;
  border-collapse: collapse;
  font-size: 9.5pt;
}
.fp-party-tbl-buyer {
  border-top: 1px solid #000;
}
.fp-section-lbl {
  padding: 3px 6px;
  font-weight: 400;
  border-bottom: 1px solid #000;
}
.fp-party-lbl {
  width: 170px;
  padding: 2px 6px;
  vertical-align: top;
}
.fp-colon {
  width: 12px;
  vertical-align: top;
}
.fp-party-tbl td {
  padding: 2px 6px;
}

.fp-item-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  margin-top: 4px;
  margin-bottom: 6px;
}
.fp-item-tbl th {
  border: 1px solid #000;
  padding: 3px 4px;
  font-weight: 700;
}
.fp-item-tbl td {
  border-left: 1px solid #000;
  border-right: 1px solid #000;
  padding: 1px 4px;
  height: 14px;
}
.fp-item-tbl tbody tr:last-child td {
  border-bottom: 1px solid #000;
}

.fp-summary-tbl {
  width: 78%;
  margin-left: auto;
  border-collapse: collapse;
  font-size: 9pt;
  margin-bottom: 4px;
}
.fp-summary-tbl td {
  padding: 1px 4px;
  border: 1px solid #000;
  border-top: none;
}
.fp-summary-tbl tr:first-child td {
  border-top: 1px solid #000;
}
.fp-summary-val {
  text-align: right;
  width: 110px;
  white-space: nowrap;
}
.fp-summary-line td {
  font-weight: 700;
}

.fp-ppnbm {
  margin-top: 6px;
  margin-bottom: 6px;
}
.fp-ppnbm-title {
  font-size: 9pt;
  margin-bottom: 2px;
}
.fp-ppnbm-tbl {
  width: 55%;
  border-collapse: collapse;
  font-size: 8pt;
  text-align: center;
}
.fp-ppnbm-cell {
  border: 1px solid #000;
  padding: 3px;
}

.fp-note {
  font-size: 8.5pt;
  margin-top: 4px;
}

.fp-sign-block {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.fp-sign-col {
  width: 200px;
  text-align: center;
  font-size: 9pt;
}
.fp-sign-space {
  height: 46px;
}
.fp-sign-name {
  font-weight: 700;
  text-decoration: underline;
}
</style>
