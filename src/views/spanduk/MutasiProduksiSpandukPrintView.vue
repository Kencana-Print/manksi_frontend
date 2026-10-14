<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import * as mpsForm from "@/services/spanduk/mutasiProduksiSpandukFormService";
import type { MutasiProduksiSpandukForm } from "@/services/spanduk/mutasiProduksiSpandukFormService";
import { pesanError } from "@/services/spanduk/mutasiProduksiSpandukFormService";

const route = useRoute();
const data = ref<MutasiProduksiSpandukForm | null>(null);
const loading = ref(true);
const error = ref("");

// Format manual agar tidak bergeser karena timezone
const fmt = (v: string | null | undefined): string => {
  if (!v) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

const fmtNilai = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return v.toLocaleString("id-ID");
  return v;
};

const kolom = computed(() => data.value?.Detail?.Kolom ?? []);
const baris = computed(() => data.value?.Detail?.Baris ?? []);
const salinan = [1, 2];

onMounted(async () => {
  try {
    data.value = await mpsForm.getById(String(route.params.nomor));
    loading.value = false;
    setTimeout(() => window.print(), 600);
  } catch (e) {
    error.value = pesanError(e, "Gagal memuat data mutasi produksi.");
    loading.value = false;
  }
});
</script>

<template>
  <div class="cetak">
    <div v-if="loading" class="info">Memuat...</div>
    <div v-else-if="error" class="info">{{ error }}</div>
    <template v-else-if="data">
      <section v-for="n in salinan" :key="n" class="salinan">
        <h2 class="judul">M U T A S I &nbsp; P R O D U K S I</h2>

        <div class="header">
          <table class="kv">
            <tr>
              <td>Nomor</td>
              <td>:</td>
              <td>{{ data.Nomor }}</td>
            </tr>
            <tr>
              <td>Tanggal</td>
              <td>:</td>
              <td>{{ fmt(data.Tanggal) }}</td>
            </tr>
            <tr>
              <td>Lokasi</td>
              <td>:</td>
              <td>{{ data.Nama_Pabrik ?? "-" }}</td>
            </tr>
            <tr>
              <td>Keterangan</td>
              <td>:</td>
              <td>{{ data.Keterangan || "-" }}</td>
            </tr>
            <tr>
              <td>No. LHK</td>
              <td>:</td>
              <td>{{ data.Nomor_LHK }} ({{ fmt(data.Tanggal_LHK) }})</td>
            </tr>
          </table>
          <table class="kv">
            <tr>
              <td>Lini Asal</td>
              <td>:</td>
              <td>{{ data.Nama_Lini_Asal }}</td>
            </tr>
            <tr>
              <td>Lini Tujuan</td>
              <td>:</td>
              <td>{{ data.Nama_Lini_Tujuan }}</td>
            </tr>
            <tr>
              <td>No. {{ data.Jenis_Sumber }}</td>
              <td>:</td>
              <td>{{ data.Nomor_SPK }} ({{ fmt(data.Tgl_SPK) }})</td>
            </tr>
            <tr>
              <td>Product</td>
              <td>:</td>
              <td>{{ data.Nama_SPK ?? "-" }}</td>
            </tr>
            <tr>
              <td>Jml {{ data.Jenis_Sumber }}</td>
              <td>:</td>
              <td>{{ fmtNilai(data.Jumlah_Order) || "-" }}</td>
            </tr>
            <tr>
              <td>Jenis Produk</td>
              <td>:</td>
              <td>
                {{ data.Jenis_Produk ?? "-"
                }}<span v-if="data.Nama_Divisi"> / {{ data.Nama_Divisi }}</span>
              </td>
            </tr>
          </table>
        </div>

        <div class="sub">Hasil di {{ data.Nama_Lini_Asal }}</div>
        <table class="grid">
          <thead>
            <tr>
              <th v-for="k in kolom" :key="k.Key">{{ k.Label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in baris" :key="i">
              <td v-for="k in kolom" :key="k.Key">{{ fmtNilai(b[k.Key]) }}</td>
            </tr>
            <tr v-if="!baris.length">
              <td :colspan="Math.max(kolom.length, 1)" class="kosong">-</td>
            </tr>
          </tbody>
        </table>

        <div class="ttd">
          <div>
            <div>Dibuat oleh,</div>
            <div class="garis">&nbsp;</div>
          </div>
          <div>
            <div>Mengetahui</div>
            <div class="garis">&nbsp;</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cetak {
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  background: #fff;
  width: 198mm; /* A4 210mm dikurangi margin @page 6mm kiri-kanan */
  margin: 0 auto;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
}
.info {
  padding: 24px;
  font-size: 14px;
}
.salinan {
  height: 138mm;
  padding: 4mm 6mm;
  box-sizing: border-box;
  overflow: hidden;
}
.salinan + .salinan {
  border-top: 1px dashed #000;
}
.judul {
  text-align: center;
  font-size: 15px;
  margin: 0 0 8px;
}
.header {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}
.kv {
  flex: 1;
  border-collapse: collapse;
}
.kv td {
  padding: 1px 3px;
  vertical-align: top;
}
.kv td:first-child {
  width: 80px;
  white-space: nowrap;
}
.kv td:nth-child(2) {
  width: 8px;
}
.sub {
  font-weight: bold;
  margin: 4px 0;
}
.grid {
  width: 100%;
  border-collapse: collapse;
}
.grid th,
.grid td {
  border: 1px solid #000;
  padding: 2px 4px;
}
.grid th {
  background: #eee;
}
.grid thead {
  display: table-header-group;
}
.kosong {
  text-align: center;
}
.ttd {
  display: flex;
  justify-content: space-around;
  margin-top: 14px;
  text-align: center;
}
.ttd .garis {
  margin-top: 36px;
  border-top: 1px solid #000;
  width: 140px;
}

@page {
  size: A4 portrait;
  margin: 6mm;
}
@media print {
  .cetak {
    width: auto;
    margin: 0;
    box-shadow: none;
  }
  .salinan {
    break-inside: avoid;
  }
}
</style>
