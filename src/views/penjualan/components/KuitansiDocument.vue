<script setup lang="ts">
import { computed } from "vue";
import logoKP from "@/assets/kp.jpg";
import logoJA from "@/assets/ja.jpg";
import logoMD from "@/assets/md.jpg";

const props = defineProps<{ header: any; detail: any[] }>();

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

const companyLogo = computed(() => {
  const kode = (props.header.inv_perush_kode || "").toUpperCase();
  if (kode === "KP") return logoKP;
  if (kode === "JA") return logoJA;
  if (kode === "MD") return logoMD;
  return logoMD; // fallback ke logo generic
});

const isKp = computed(() => props.header.variant === "kp");

// "Boyolali,[Date]" — Date di FastReport = tanggal SAAT DICETAK,
// BUKAN tanggal transaksi invoice.
const printedDate = computed(() => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
});

const terbilang = (n: number): string => {
  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  const f = (x: number): string => {
    if (x < 12) return satuan[x];
    if (x < 20) return f(x - 10) + " Belas";
    if (x < 100)
      return f(Math.floor(x / 10)) + " Puluh" + (x % 10 ? " " + f(x % 10) : "");
    if (x < 200) return "Seratus" + (x - 100 ? " " + f(x - 100) : "");
    if (x < 1000)
      return (
        f(Math.floor(x / 100)) + " Ratus" + (x % 100 ? " " + f(x % 100) : "")
      );
    if (x < 2000) return "Seribu" + (x - 1000 ? " " + f(x - 1000) : "");
    if (x < 1000000)
      return (
        f(Math.floor(x / 1000)) + " Ribu" + (x % 1000 ? " " + f(x % 1000) : "")
      );
    if (x < 1000000000)
      return (
        f(Math.floor(x / 1000000)) +
        " Juta" +
        (x % 1000000 ? " " + f(x % 1000000) : "")
      );
    return (
      f(Math.floor(x / 1000000000)) +
      " Milyar" +
      (x % 1000000000 ? " " + f(x % 1000000000) : "")
    );
  };
  const val = Math.floor(Math.abs(n));
  return val === 0 ? "Nol" : f(val).trim();
};
const total2 = computed(() =>
  terbilang(Number(props.header?.Total)).toUpperCase(),
);
</script>

<template>
  <div class="kwt-doc">
    <!-- ── Header perusahaan — 2 variant berbeda layout ── -->
    <div class="kwt-header" :class="{ 'kwt-header-kp': isKp }">
      <template v-if="isKp">
        <img :src="companyLogo" class="kwt-logo-kp" />
        <div class="kwt-addr-kp">
          {{ header.perush_alamat }}, {{ header.perush_kota }}
          {{ header.perush_telp }}
        </div>
      </template>
      <template v-else>
        <div class="kwt-name-generic">{{ header.perush_nama }}</div>
        <div class="kwt-addr-generic">
          {{ header.perush_alamat }}<br />
          {{ header.perush_telp }}
        </div>
        <img :src="companyLogo" class="kwt-logo-generic" />
      </template>
    </div>

    <div class="kwt-divider"></div>

    <div class="kwt-title">KUITANSI</div>
    <div class="kwt-nomor-box">{{ header.inv_nomor }}</div>

    <table class="kwt-info-tbl">
      <tr>
        <td class="kwt-lbl">Telah diterima dari</td>
        <td class="kwt-colon">:</td>
        <td>{{ header.cus_nama }}</td>
      </tr>
      <tr>
        <td class="kwt-lbl">Uang Sebanyak</td>
        <td class="kwt-colon">:</td>
        <td>{{ total2 }} RUPIAH</td>
      </tr>
      <tr v-for="(r, i) in detail" :key="i">
        <td class="kwt-lbl">{{ i === 0 ? "Guna Membayar" : "" }}</td>
        <td class="kwt-colon">{{ i === 0 ? ":" : "" }}</td>
        <td>
          {{ r.nama_barang }} Quantity {{ num(r.invd_jumlah) }}
          {{ header.unit }}
        </td>
      </tr>
    </table>

    <div class="kwt-bottom">
      <div class="kwt-total-box">Rp. {{ num(header.Total) }} .-</div>
      <div class="kwt-sign-col">
        <div>Boyolali,{{ printedDate }}</div>
        <div class="kwt-sign-space"></div>
        <div class="kwt-sign-name">{{ header.nama_mgr || "-" }}</div>
        <div v-if="header.jabatan_mgr">{{ header.jabatan_mgr }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kwt-doc {
  width: 190mm;
  min-height: 200mm;
  margin: 0 auto;
  background: white;
  padding: 10mm 12mm;
  box-sizing: border-box;
  font-family: "Trebuchet MS", Arial, sans-serif;
  font-size: 10.5pt;
  color: #000;
}

.kwt-header {
  min-height: 26mm;
  margin-bottom: 4px;
}
.kwt-header-kp {
  text-align: center;
}
.kwt-logo-kp {
  max-width: 85mm;
  max-height: 24mm;
  object-fit: contain;
}
.kwt-addr-kp {
  font-size: 9pt;
  margin-top: 2px;
}
.kwt-name-generic {
  font-size: 15pt;
  font-weight: 700;
  position: relative;
}
.kwt-addr-generic {
  font-size: 9pt;
  line-height: 1.5;
  max-width: 90mm;
  margin-top: 4px;
}
.kwt-logo-generic {
  position: absolute;
  top: 10mm;
  right: 12mm;
  max-width: 60mm;
  max-height: 28mm;
  object-fit: contain;
}

.kwt-divider {
  border-top: 3px double #000;
  margin: 4px 0 10px;
}

.kwt-title {
  text-align: center;
  font-size: 15pt;
  font-weight: 700;
  font-family: "Trebuchet MS", sans-serif;
}
.kwt-nomor-box {
  text-align: center;
  font-size: 12pt;
  font-weight: 700;
  border-bottom: 2px solid #000;
  display: inline-block;
  margin: 4px auto 16px;
  padding: 0 10px 3px;
  left: 50%;
  position: relative;
  transform: translateX(-50%);
}

.kwt-info-tbl {
  border-collapse: collapse;
  font-size: 10.5pt;
  margin-bottom: 20px;
  width: 100%;
}
.kwt-info-tbl td {
  padding: 2px 4px;
  vertical-align: top;
}
.kwt-lbl {
  width: 132px;
  white-space: nowrap;
}
.kwt-colon {
  width: 20px;
}

.kwt-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 20px;
}
.kwt-total-box {
  border-top: 3px double #000;
  border-bottom: 3px double #000;
  padding: 8px 12px;
  font-size: 10.5pt;
  font-weight: 700;
  text-align: center;
  min-width: 190px;
}
.kwt-sign-col {
  width: 175px;
  text-align: center;
  font-size: 10.5pt;
}
.kwt-sign-space {
  height: 80px;
}
.kwt-sign-name {
  font-weight: 700;
  text-decoration: underline;
}
</style>
