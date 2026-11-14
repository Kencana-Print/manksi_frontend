<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

// Duplikat pola Manksi Web CetakBastPrintView.vue untuk BAST MMT:
// backend cukup JSON getBastDetail (sudah diperkaya: proof J_Proof,
// nomor proof gabungan, barcode), render + window.print() di sini.
const route = useRoute();
const nomorMAP = route.params.nomor as string;

const printData = ref<any>(null);
const isLoading = ref(true);
const loadError = ref("");
const finalImageUrl = ref("");

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "-";

// Perkaya baris komponen tersimpan (DB tak menyimpan barcode/nomor proof)
// dengan data LHK Proof yang cocok kode bahannya.
const enrichKomponen = (data: any) => {
  const proofList: any[] = data?.proofList || [];
  if (!proofList.length || !data?.komponen?.length) return;
  const byKode = new Map<string, any>();
  for (const p of proofList) {
    const k = String(p.kode_bahan || "").trim();
    if (k && !byKode.has(k)) byKode.set(k, p);
  }
  for (const k of data.komponen) {
    if (!k.barcode) {
      const p = byKode.get(String(k.kode || "").trim());
      if (p) {
        k.barcode = String(p.barcode || "").trim();
        if (!k.proof_nomor) k.proof_nomor = p.nomor_proof || "";
      }
    }
  }
};

const preloadImageAndPrint = () => {
  if (!printData.value?.header) {
    finishLoading();
    return;
  }
  const header = printData.value.header;
  const nomor = header.mmpt_nomor || "";
  const cab = header.mmpt_cabang || "HO-";
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  const primaryUrl = `${base}/images/${cab}/map/${encodeURIComponent(nomor)}.jpg`;

  const img = new Image();
  const done = (ok: boolean) => {
    finalImageUrl.value = ok ? primaryUrl : "";
    finishLoading();
  };
  img.onload = () => done(true);
  img.onerror = () => done(false);
  setTimeout(() => {
    if (isLoading.value) done(false);
  }, 4000);
  img.src = primaryUrl;
};

const finishLoading = () => {
  isLoading.value = false;
  setTimeout(() => {
    window.print();
  }, 300);
};

onMounted(async () => {
  try {
    const res = await api.get(
      `/mmt/bast-map/${encodeURIComponent(nomorMAP)}`,
    );
    printData.value = res.data.data || res.data;
    enrichKomponen(printData.value);
    preloadImageAndPrint();
  } catch (e: any) {
    console.error(e);
    loadError.value =
      e.response?.data?.message || "Gagal memuat data BAST untuk cetak.";
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="bast-print-loading">Memuat data BAST...</div>
  <div v-else-if="loadError || !printData" class="bast-print-loading">
    {{ loadError || "Data BAST tidak ditemukan." }}
  </div>
  <div v-else class="bast-print-container">
    <div class="bast-print-wrapper">
      <div v-for="copy in 2" :key="copy" class="bast-print-column">
        <div class="bast-header-title">BERITA ACARA SERAH TERIMA MAP</div>
        <table class="w-100 bast-info-table">
          <tr>
            <td width="24%">No. Order MMT</td>
            <td width="2%">:</td>
            <td>
              <b>{{ printData.header.mmpt_nomor }}</b>
            </td>
          </tr>
          <tr>
            <td>Tanggal</td>
            <td>:</td>
            <td>{{ fmtDate(printData.header.mmpt_tanggal) }}</td>
          </tr>
          <tr>
            <td>Nama Pekerjaan</td>
            <td>:</td>
            <td>{{ printData.header.mmpt_nama }}</td>
          </tr>
          <tr v-if="printData.header.mmpt_nama2">
            <td>Nama Ext</td>
            <td>:</td>
            <td>{{ printData.header.mmpt_nama2 }}</td>
          </tr>
          <tr>
            <td>Ukuran</td>
            <td>:</td>
            <td>{{ printData.header.mmpt_ukuran }}</td>
          </tr>
          <tr>
            <td>Bahan MMT</td>
            <td>:</td>
            <td>{{ printData.header.mmpt_kain }}</td>
          </tr>
          <tr>
            <td>Finishing</td>
            <td>:</td>
            <td>{{ printData.header.mmpt_finishing }}</td>
          </tr>
          <tr>
            <td>Nomor Proof</td>
            <td>:</td>
            <td>{{ printData.header.mmpt_proof_number || "-" }}</td>
          </tr>
          <tr>
            <td>Cabang / Workshop</td>
            <td>:</td>
            <td>
              {{ printData.header.mmpt_cabang }} /
              {{ printData.header.mmpt_workshop }}
              ({{ printData.header.mmpt_sublim }})
            </td>
          </tr>
          <tr>
            <td class="align-top">Kendala</td>
            <td class="align-top">:</td>
            <td style="white-space: pre-wrap">
              {{ printData.header.mmpt_kendala || "-" }}
            </td>
          </tr>
        </table>

        <div
          class="d-flex justify-space-between mt-2 font-weight-bold"
          style="font-size: 11px"
        >
          <div>Jumlah Cetak : {{ numFmt(printData.header.mmpt_jumlah_jadi) }}</div>
          <div>Gramasi : {{ printData.header.mmpt_gramasi || "-" }}</div>
          <div>{{ printData.header.mmpt_tipe || "" }}</div>
        </div>

        <table class="bast-detail-table mt-1 w-100">
          <thead>
            <tr>
              <th width="7%">No</th>
              <th width="33%">Kesesuaian</th>
              <th width="10%">Y/N</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in printData.checklist" :key="d.no">
              <td class="text-center">{{ d.no }}</td>
              <td>{{ d.kesesuaian }}</td>
              <td class="text-center font-weight-bold">{{ d.status }}</td>
              <td>{{ d.keterangan }}</td>
            </tr>
            <tr v-if="!printData.checklist || printData.checklist.length === 0">
              <td colspan="4" class="text-center text-grey py-2">
                Belum ada data kesesuaian BAST
              </td>
            </tr>
          </tbody>
        </table>

        <table
          v-if="printData.komponen && printData.komponen.length > 0"
          class="bast-detail-table mt-1 w-100"
        >
          <thead>
            <tr>
              <th width="7%">No</th>
              <th width="22%">Kode</th>
              <th>Nama Bahan</th>
              <th width="12%">Barcode</th>
              <th width="20%">No. Proof</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(k, i) in printData.komponen" :key="i">
              <td class="text-center">{{ Number(i) + 1 }}</td>
              <td>{{ k.kode }}</td>
              <td>{{ k.bhn_name || k.nama }}</td>
              <td>{{ k.barcode || "-" }}</td>
              <td>{{ k.proof_nomor || "-" }}</td>
            </tr>
          </tbody>
        </table>

        <div class="bast-image-box mt-2">
          <img v-if="finalImageUrl" :src="finalImageUrl" class="bast-map-image" />
          <span
            v-else
            class="text-grey"
            style="font-size: 10px; font-style: italic"
          >
            (Tidak ada gambar desain)
          </span>
        </div>

        <div class="bast-footer-section mt-4 d-flex justify-space-between align-end">
          <div class="bast-lembar-text">
            Lembar 1 : Arsip MMT<br />
            Lembar 2 : Produksi
          </div>
          <div class="bast-ttd-box">
            <div class="text-center mb-1">
              Boyolali, {{ fmtDate(new Date().toISOString()) }}
            </div>
            <table class="w-100 bast-ttd-table">
              <tr>
                <th width="50%">PIC Proofing</th>
                <th width="50%">Manager MMT</th>
              </tr>
              <tr>
                <td class="bast-ttd-space"></td>
                <td class="bast-ttd-space"></td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bast-print-loading {
  padding: 32px;
  text-align: center;
  color: #666;
  font-size: 14px;
}
.bast-print-container {
  width: 100vw;
  height: 100vh;
  overflow: auto;
  background-color: #525659;
  padding: 20px 0;
  box-sizing: border-box;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 5mm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
  }
  .bast-print-container {
    width: auto;
    height: auto;
    overflow: visible;
    background-color: transparent;
    padding: 0;
  }
  .bast-print-wrapper {
    width: 100% !important;
    height: 195mm !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }
  .bast-print-column {
    height: 100%;
    overflow: hidden;
  }
}

.bast-print-wrapper {
  width: 297mm;
  height: 210mm;
  margin: 0 auto;
  padding: 8mm;
  background: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  font-family: "Arial", sans-serif;
  color: #000;
  box-sizing: border-box;
  overflow: hidden;
}

.bast-print-column {
  width: 48%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.bast-header-title {
  border: 1px solid #000;
  padding: 4px;
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 4px;
  text-align: center;
}

.bast-info-table {
  font-size: 10px;
  line-height: 1.25;
}
.bast-info-table td {
  padding: 1px 0;
}
.align-top {
  vertical-align: top;
}

.bast-detail-table {
  border-collapse: collapse;
  font-size: 10px;
  flex-shrink: 0;
}
.bast-detail-table th,
.bast-detail-table td {
  border: 1px solid #000;
  padding: 2px 4px;
}
.bast-detail-table th {
  font-weight: bold;
}

.bast-image-box {
  border: 1px solid #000;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  margin-top: 6px;
}

.bast-map-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.bast-footer-section {
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 8px;
}
.bast-lembar-text {
  line-height: 1.3;
}

.bast-ttd-box {
  width: 210px;
}
.bast-ttd-table {
  border-collapse: collapse;
}
.bast-ttd-table th,
.bast-ttd-table td {
  border: 1px solid #000;
  text-align: center;
  font-weight: normal;
}
.bast-ttd-space {
  height: 45px;
}
.w-100 {
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-4 {
  margin-top: 16px;
}
</style>
