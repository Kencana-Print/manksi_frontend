<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import * as lhkForm from "@/services/spanduk/lhk/lhkLipatFormService";
import type { LhkLipatForm } from "@/services/spanduk/lhk/lhkLipatFormService";

const route = useRoute();
const data = ref<LhkLipatForm | null>(null);
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
  const t = { lipat: 0, mata: 0, bs: 0 };
  for (const r of baris.value) {
    t.lipat += Number(r.Qty_Lipat) || 0;
    t.mata += Number(r.Mata_Ayam) || 0;
    t.bs += Number(r.BS_Lipat) || 0;
  }
  return t;
});

// Karyawan unik per NIK (jam kerja sama di semua SPK dalam satu LHK)
const karyawanUnik = computed(() => {
  const peta = new Map<string, { nama: string; jam: string; qty: number }>();
  for (const r of baris.value) {
    for (const k of r.Karyawan ?? []) {
      const ada = peta.get(k.NIK);
      if (ada) {
        ada.qty += Number(k.Qty) || 0;
      } else {
        peta.set(k.NIK, {
          nama: k.Nama ?? k.NIK,
          jam: k.Jam_Kerja,
          qty: Number(k.Qty) || 0,
        });
      }
    }
  }
  return [...peta.values()];
});

onMounted(async () => {
  try {
    data.value = await lhkForm.getById(String(route.params.nomor));
    loading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e) {
    error.value = lhkForm.pesanError(e, "Gagal memuat data LHK Lipat.");
    loading.value = false;
  }
});
</script>

<template>
  <div class="cetak">
    <div v-if="loading" class="info">Memuat...</div>
    <div v-else-if="error" class="info">{{ error }}</div>
    <template v-else-if="data">
      <h2 class="judul">Laporan Hasil Kerja Lipat</h2>

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
            <th rowspan="2" class="c-j">J. Lipat<br />(pcs)</th>
            <th rowspan="2" class="c-t">Mata<br />Ayam</th>
            <th rowspan="2" class="c-t">BS<br />Lipat</th>
          </tr>
          <tr>
            <th class="c-pl">P</th>
            <th class="c-pl">L</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in baris" :key="r.Nomor_SPK">
            <td class="nama">{{ r.Nama_SPK }}</td>
            <td class="tr">{{ bulat(r.Jumlah_Order) }}</td>
            <td class="tr">{{ desimal(r.Panjang) }}</td>
            <td class="tr">{{ desimal(r.Lebar) }}</td>
            <td>{{ r.Nomor_SPK }}</td>
            <td class="tr">{{ bulat(r.Qty_Lipat) }}</td>
            <td class="tr">{{ bulat(r.Mata_Ayam) }}</td>
            <td class="tr">{{ bulat(r.BS_Lipat) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="tot-lbl">Total</td>
            <td class="tr">{{ bulat(total.lipat) }}</td>
            <td class="tr">{{ bulat(total.mata) }}</td>
            <td class="tr">{{ bulat(total.bs) }}</td>
          </tr>
        </tfoot>
      </table>

      <template v-if="!data.Legacy && karyawanUnik.length > 0">
        <div class="sub-judul">Karyawan</div>
        <table class="grid kar-grid">
          <thead>
            <tr>
              <th class="c-no">No</th>
              <th>Nama</th>
              <th class="c-j">Jam Kerja</th>
              <th class="c-j">Qty (pcs)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(k, i) in karyawanUnik" :key="i">
              <td class="tr">{{ i + 1 }}</td>
              <td>{{ k.nama }}</td>
              <td class="tr">{{ k.jam }}</td>
              <td class="tr">{{ bulat(k.qty) }}</td>
            </tr>
          </tbody>
        </table>
      </template>

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
  width: 198mm; /* A4 portrait 210mm dikurangi margin @page 6mm kiri-kanan */
  min-height: 270mm;
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
  width: 72px;
}
.c-pl {
  width: 40px;
}
.c-spk {
  width: 128px;
}
.c-j {
  width: 62px;
}
.c-t {
  width: 54px;
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
  gap: 40px;
  margin: 46px 0 0 30px;
  font-size: 12px;
}
.garis {
  display: inline-block;
  width: 160px;
  border-bottom: 1px solid #000;
  margin-left: 4px;
}
.sub-judul {
  font-weight: 700;
  font-size: 12px;
  margin: 12px 0 4px 2px;
}
.kar-grid {
  width: 60%;
}
.c-no {
  width: 30px;
}

@page {
  size: A4 portrait;
  margin: 6mm;
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
