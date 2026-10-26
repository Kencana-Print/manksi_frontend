<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import * as lhkForm from "@/services/spanduk/lhk/lhkQuiringFormService";
import type { LhkQuiringForm } from "@/services/spanduk/lhk/lhkQuiringFormService";

const route = useRoute();
const data = ref<LhkQuiringForm | null>(null);
const loading = ref(true);
const error = ref("");

// Format angka mengikuti cetakan Delphi (2,550 dan 2.00).
// Ganti ke "id-ID" kalau mau format Indonesia (2.550 dan 2,00).
const LOCALE = "en-US";

// Format manual agar tidak bergeser karena timezone
const fmtTgl = (v: string | null | undefined): string => {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

const bulat = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });

const desimal = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const baris = computed(() => data.value?.Detail ?? []);

const total = computed(() => {
  const t = {
    oven: 0,
    jemuran: 0,
    potong: 0,
    bsQuiring: 0,
    bsCetak: 0,
    bsBahan: 0,
  };
  for (const r of baris.value) {
    t.oven += Number(r.J_Oven) || 0;
    t.jemuran += Number(r.J_Jemuran) || 0;
    t.potong += Number(r.J_Potong) || 0;
    t.bsQuiring += Number(r.BS_Quiring) || 0;
    t.bsCetak += Number(r.BS_Cetak) || 0;
    t.bsBahan += Number(r.BS_Bahan) || 0;
  }
  return t;
});

onMounted(async () => {
  try {
    data.value = await lhkForm.getById(String(route.params.nomor));
    loading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e) {
    error.value = lhkForm.pesanError(e, "Gagal memuat data LHK Quiring.");
    loading.value = false;
  }
});
</script>

<template>
  <div class="cetak">
    <div v-if="loading" class="info">Memuat...</div>
    <div v-else-if="error" class="info">{{ error }}</div>
    <template v-else-if="data">
      <h2 class="judul">Laporan Hasil Kerja Quiring</h2>

      <table class="kv">
        <tr>
          <td>Tanggal</td>
          <td>:</td>
          <td>{{ fmtTgl(data.Tanggal) }}</td>
        </tr>
        <tr>
          <td>Nomor</td>
          <td>:</td>
          <td>{{ data.Nomor }}</td>
        </tr>
        <tr>
          <td>Lokasi</td>
          <td>:</td>
          <td>{{ data.Kode_Pabrik ?? "" }}</td>
        </tr>
      </table>

      <table class="grid">
        <thead>
          <tr>
            <th rowspan="2" class="c-nama">Nama Order</th>
            <th rowspan="2" class="c-jml">Jumlah<br />Order (Pcs)</th>
            <th colspan="2">Spesifikasi</th>
            <th rowspan="2" class="c-spk">Nomor SPK</th>
            <th rowspan="2" class="c-j">Oven<br />(pcs)</th>
            <th rowspan="2" class="c-j">Jemuran<br />(meter)</th>
            <th rowspan="2" class="c-j">Potong<br />Tambahan</th>
            <th colspan="3">BS (pcs)</th>
          </tr>
          <tr>
            <th class="c-pl">P</th>
            <th class="c-pl">L</th>
            <th class="c-j">Quiring</th>
            <th class="c-j">Cetak</th>
            <th class="c-j">Bahan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in baris" :key="r.Nomor_SPK">
            <td class="nama">{{ r.Nama_SPK }}</td>
            <td class="tr">{{ bulat(r.Jumlah_Order) }}</td>
            <td class="tr">{{ desimal(r.Panjang) }}</td>
            <td class="tr">{{ desimal(r.Lebar) }}</td>
            <td>{{ r.Nomor_SPK }}</td>
            <td class="tr">{{ bulat(r.J_Oven) }}</td>
            <td class="tr">{{ bulat(r.J_Jemuran) }}</td>
            <td class="tr">{{ bulat(r.J_Potong) }}</td>
            <td class="tr">{{ bulat(r.BS_Quiring) }}</td>
            <td class="tr">{{ bulat(r.BS_Cetak) }}</td>
            <td class="tr">{{ bulat(r.BS_Bahan) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="tot-lbl">Total</td>
            <td class="tr">{{ bulat(total.oven) }}</td>
            <td class="tr">{{ bulat(total.jemuran) }}</td>
            <td class="tr">{{ bulat(total.potong) }}</td>
            <td class="tr">{{ bulat(total.bsQuiring) }}</td>
            <td class="tr">{{ bulat(total.bsCetak) }}</td>
            <td class="tr">{{ bulat(total.bsBahan) }}</td>
          </tr>
        </tfoot>
      </table>

      <div class="ttd">
        <span>Mengetahui: 1<span class="garis" /></span>
        <span>Mengetahui: 2<span class="garis" /></span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cetak {
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  background: #fff;
  width: 281mm; /* A4 landscape 297mm dikurangi margin @page 8mm kiri-kanan */
  min-height: 190mm;
  margin: 0 auto;
  padding: 4mm 0;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
}
.info {
  padding: 24px;
  font-size: 14px;
}
.judul {
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  margin: 8px 0 14px;
}

.kv {
  border-collapse: collapse;
  margin: 0 0 6px 6px;
  font-size: 12px;
}
.kv td {
  padding: 1px 3px;
}
.kv td:first-child {
  width: 56px;
}
.kv td:nth-child(2) {
  width: 8px;
}

.grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.grid th,
.grid td {
  border: 1px solid #000;
  padding: 2px 4px;
}
.grid th {
  font-weight: 400;
  text-align: center;
  vertical-align: middle;
}
.grid td {
  height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}
.grid thead {
  display: table-header-group;
}
.grid tfoot {
  display: table-footer-group;
}
.grid tr {
  break-inside: avoid;
}
.c-nama {
  width: auto;
}
.c-jml {
  width: 78px;
}
.c-pl {
  width: 44px;
}
.c-spk {
  width: 140px;
}
.c-j {
  width: 74px;
}
.nama {
  text-transform: uppercase;
}
.tr {
  text-align: right;
}
.tot-lbl {
  text-align: left;
}

.ttd {
  display: flex;
  gap: 56px;
  margin: 46px 0 0 30px;
  font-size: 12px;
}
.garis {
  display: inline-block;
  width: 190px;
  border-bottom: 1px solid #000;
  margin-left: 4px;
}

@page {
  size: A4 landscape;
  margin: 8mm;
}
@media print {
  .cetak {
    width: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
}
</style>
