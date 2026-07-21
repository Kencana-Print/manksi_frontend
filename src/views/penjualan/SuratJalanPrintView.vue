<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { sjFormService as svc } from "@/services/penjualan/suratJalanFormService";
import qz from "qz-tray";

// Import Logo Perusahaan
import logoKP from "@/assets/kp.jpg";
import logoJA from "@/assets/ja.jpg";
import logoMD from "@/assets/md.jpg";

const route = useRoute();
const nomor = route.query.nomor as string;
const mode = route.query.mode as string; // "dotmatrix" | "inkjet"
const printerName = ref("192.168.1.33");
const isPrinting = ref(false);

const header = ref<any>({});
const detail = ref<any[]>([]);
const isReady = ref(false);
const isLoading = ref(true);
const doPrint = () => window.print();
const doClose = () => window.close();

const copies = computed(() => [
  { label: "ASLI" },
  { label: "COPY 1" },
  { label: "COPY 2" },
  { label: "COPY 3" },
]);

// ── Chunking Data (Pemisah Halaman Otomatis) ──────────────────────────
const rowsPerPage = 6; // Maksimal 6 baris per halaman agar note bawah tidak terpotong

const paginatedDetails = computed(() => {
  const arr = detail.value || [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += rowsPerPage) {
    chunks.push(arr.slice(i, i + rowsPerPage));
  }
  // Pastikan minimal ada 1 halaman kosong jika data tidak ada
  return chunks.length > 0 ? chunks : [[]];
});

// ── Computed Logo ─────────────────────────────────────────────────────
const companyLogo = computed(() => {
  const kode = (
    header.value.perush_kode ||
    header.value.sj_perush_kode ||
    header.value.spk_perush_kode ||
    ""
  ).toUpperCase();

  const nama = (header.value.perush_nama || "").toUpperCase();

  // Pengecekan Ganda (Kode ATAU Nama) agar logo dijamin muncul
  if (kode === "KP" || nama.includes("KENCANA")) return logoKP;
  if (kode === "JA" || nama.includes("JAYA ABADI")) return logoJA;
  if (kode === "MD" || nama.includes("MADANI")) return logoMD;
  return null;
});

// ── Format helpers ────────────────────────────────────────────────────
const fmtDate = (v: string) => {
  if (!v) return "";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
};
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Dot matrix helpers ────────────────────────────────────────────────
const padR = (s: string, n: number) =>
  (s || "").toString().padEnd(n, " ").substring(0, n);
const padL = (s: string, n: number) =>
  (s || "").toString().padStart(n, " ").substring(0, n);
const padC = (s: string, n: number) => {
  const str = (s || "").toString();
  if (str.length >= n) return str.substring(0, n);
  const p = Math.floor((n - str.length) / 2) + str.length;
  return str.padStart(p, " ").padEnd(n, " ");
};

// ── Generate TXT (Dot Matrix) ──────────────
const wrapText = (text: string, maxWidth: number): string[] => {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxWidth) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const generateTxt = () => {
  const h = header.value;
  const rows = detail.value;
  const LINE = "-".repeat(120);
  let txt = "";

  // Kop perusahaan
  txt += `${padR(h.perush_nama || "", 120)}\n`;
  txt += `${padR(h.perush_alamat || "", 120)}\n`;
  txt += `${padR(h.perush_telp || "", 120)}\n`;
  txt += "\n";

  // Judul
  txt += `${padC("S U R A T   J A L A N", 120)}\n\n`;

  // Header info
  // Alamat customer bisa panjang — pecah jadi beberapa baris jika > 60 char
  const alamatFull = h.sj_alamat_customer || h.cus_alamat || "";
  const alamatLines = wrapText(alamatFull, 60);

  txt += `${padR("Nomor      : " + (h.sj_nomor || ""), 60)} ${padR("Customer : " + (h.cus_nama || ""), 60)}\n`;
  txt += `${padR("Tanggal    : " + fmtDate(h.sj_tanggal), 60)} ${padR(alamatLines[0] || "", 60)}\n`;
  txt += `${padR("Keterangan : " + (h.sj_keterangan || ""), 60)} ${padR(alamatLines[1] || "", 60)}\n`;

  // Baris tambahan jika alamat masih ada sisa
  for (let i = 2; i < alamatLines.length; i++) {
    txt += `${padR("", 60)} ${padR(alamatLines[i], 60)}\n`;
  }

  // Telp/fax setelah alamat
  txt += `${padR("", 60)} ${padR((h.cus_telp || "") + "/" + (h.cus_fax || ""), 60)}\n`;

  txt += `${LINE}\n`;
  txt += `${padR("No", 3)} ${padR("SPK", 12)} ${padR("Nama", 40)} ${padR(
    "Ukuran",
    20,
  )} ${padL("Jumlah", 10)} ${padL("Koli", 9)} ${padR("Keterangan", 20)}\n`;
  txt += `${LINE}\n`;

  rows.forEach((r: any, i: number) => {
    txt += `${padR(String(i + 1), 3)} `;
    txt += `${padR(r.sjd_spk_nomor || "", 12)} `;
    txt += `${padR(r.spk_nama || r.spk_nama2 || "", 40)} `;
    txt += `${padR(r.sjd_ukuran || "", 20)} `;
    txt += `${padL(num(r.sjd_jumlah), 10)} `;
    txt += `${padL(num(r.sjd_koli), 9)} `;
    txt += `${padR(r.sjd_keterangan || "", 20)}\n`;

    if ((i + 1) % 12 === 0 && i + 1 < rows.length) {
      txt += `${LINE}\n`;
      txt += `${padC("LEMBAR PUTIH dan MERAH KEMBALI SOLO", 120)}\n`;
      txt += "\n".repeat(5);
      txt += `${padC("S U R A T   J A L A N", 120)}\n`;
      txt += `${padR("Nomor      : " + (h.sj_nomor || ""), 60)} ${padR(
        "Customer : " + (h.cus_nama || ""),
        60,
      )}\n`;
      txt += `${padR("Tanggal    : " + fmtDate(h.sj_tanggal), 60)} ${padR(
        h.sj_alamat_customer || h.cus_alamat || "",
        60,
      )}\n`;
      txt += `${padR("Keterangan : " + (h.sj_keterangan || ""), 60)} ${padR(
        (h.cus_telp || "") + "/" + (h.cus_fax || ""),
        60,
      )}\n`;
      txt += `${LINE}\n`;
      txt += `${padR("No", 3)} ${padR("SPK", 12)} ${padR("Nama", 40)} ${padR(
        "Ukuran",
        20,
      )} ${padL("Jumlah", 10)} ${padL("Koli", 9)} ${padR("Keterangan", 20)}\n`;
      txt += `${LINE}\n`;
    }
  });

  const sisa = 12 - (rows.length % 12 || 12);
  txt += "\n".repeat(sisa);

  txt += `${LINE}\n`;
  txt += `${padC("LEMBAR PUTIH dan MERAH KEMBALI SOLO", 120)}\n`;

  txt += `${padR("Dibuat Oleh,", 25)} ${padR("Disiapkan Oleh,", 25)} ${padR(
    "Kepala Gudang,",
    25,
  )} ${padR("Pengantar,", 25)}, ${padR("Diterima Oleh,", 25)}\n`;
  txt += "\n".repeat(3);
  txt += `${padR("(               )", 25)} ${padR(
    "(               )",
    25,
  )} ${padR("(               )", 25)} ${padR("(               )", 25)} ${padR(
    "(               )",
    25,
  )}\n`;

  return txt;
};

const totalJumlah = computed(() =>
  detail.value.reduce((s, r) => s + Number(r.sjd_jumlah || 0), 0),
);

const downloadTxt = () => {
  // Kertas continuous-form yang dipakai printer ini sudah karbon
  // rangkap (biasanya 4 lapis), sehingga SATU kali cetak otomatis
  // menghasilkan salinan fisik ke seluruh lapisan kertas. Tidak perlu
  // generate teks berulang per "lembar" — itu justru bikin isi
  // tercetak 3x lipat di atas kertas yang sama.
  const content = generateTxt();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SuratJalan_${nomor.replace(/\//g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const printQZ = async () => {
  isPrinting.value = true;
  try {
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const config = qz.configs.create(printerName.value);
    const content = generateTxt();

    const data = [
      "\x1B\x40", // ESC @: Inisialisasi/Reset printer
      { type: "raw", format: "plain", data: content },
      "\x0C", // Form Feed: Eject halaman
    ];

    await qz.print(config, data);
    alert("Berhasil dikirim ke printer Surat Jalan!");
  } catch (error: any) {
    console.error("QZ Error:", error);
    alert("Gagal cetak via QZ Tray: " + error.message);
  } finally {
    isPrinting.value = false;
  }
};

const fetchData = async () => {
  try {
    const res = await svc.getDataCetak(nomor);
    header.value = res.data.data.header;
    detail.value = res.data.data.detail;
    isReady.value = true;

    if (mode === "dotmatrix") {
      // Tidak melakukan apa-apa, biarkan user yang klik tombol cetak
    } else {
      setTimeout(() => window.print(), 600);
    }
  } catch {
    alert("Gagal memuat data cetak.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  document.title = `Surat Jalan - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div v-if="mode === 'dotmatrix'" class="dm-wrapper">
    <div v-if="isLoading" class="dm-card">
      <div class="spinner"></div>
      <p>Menyiapkan file cetak...</p>
    </div>
    <div v-else-if="isReady" class="dm-card">
      <div class="dm-icon">🖨️</div>
      <h2>Cetak Surat Jalan Dot Matrix</h2>
      <p style="margin-bottom: 12px; line-height: 1.4">
        Pastikan QZ Tray berjalan di background.<br />
        <span style="font-size: 11px; color: #d32f2f; font-weight: bold"
          >Cukup 1x cetak (kertas continuous-form / karbon rangkap).</span
        >
      </p>

      <div class="dm-steps" style="margin-bottom: 16px">
        <label style="font-weight: bold; display: block; margin-bottom: 4px"
          >Target Printer (IP / Nama):</label
        >
        <input
          v-model="printerName"
          type="text"
          style="
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
          "
        />
      </div>

      <div style="display: flex; gap: 10px; flex-direction: column">
        <button class="dm-btn" @click="printQZ" :disabled="isPrinting">
          {{ isPrinting ? "Mengirim Data..." : "🚀 Cetak Langsung" }}
        </button>
        <button
          class="dm-btn"
          style="background-color: #757575"
          @click="downloadTxt"
        >
          📥 Unduh File .txt (Cadangan)
        </button>
      </div>
    </div>
  </div>

  <div v-else class="print-root">
    <div v-if="isLoading" class="loading-screen">Menyiapkan cetak...</div>
    <template v-else-if="isReady">
      <div class="no-print toolbar">
        <span style="font-weight: 700; color: #1565c0"
          >Surat Jalan — {{ nomor }}</span
        >
        <div style="display: flex; gap: 8px">
          <button class="tbtn" @click="doPrint">🖨️ Cetak</button>
          <button class="tbtn tbtn-grey" @click="doClose">✕ Tutup</button>
        </div>
      </div>

      <div v-for="(copy, ci) in copies" :key="'copy-' + ci">
        <div
          v-for="(pageRows, pi) in paginatedDetails"
          :key="'copy-' + ci + '-page-' + pi"
          class="page flex-col"
        >
          <div class="watermark">{{ copy.label }}</div>

          <div class="page-content">
            <div class="header-section">
              <div class="kop-left">
                <div class="kop-nama">{{ header.perush_nama }}</div>
                <div class="kop-sub">{{ header.perush_alamat }}</div>
                <div class="kop-sub" v-if="header.perush_telp">
                  {{ header.perush_telp }}
                </div>
                <div class="doc-title">SURAT JALAN</div>
              </div>
              <div class="kop-right" v-if="companyLogo">
                <img :src="companyLogo" class="logo-img" />
              </div>
            </div>

            <div class="title-row">
              <div>
                <table class="info-tbl">
                  <tr>
                    <td class="lbl">Nomor</td>
                    <td>: {{ header.sj_nomor }}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Tanggal</td>
                    <td>: {{ fmtDate(header.sj_tanggal) }}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Keterangan</td>
                    <td>: {{ header.sj_keterangan }}</td>
                  </tr>
                </table>
              </div>
              <div class="cus-box">
                <table class="info-tbl" style="width: 100%">
                  <tr>
                    <td class="lbl" style="vertical-align: top">Customer</td>
                    <td style="vertical-align: top; width: 10px">:</td>
                    <td style="font-weight: 700">{{ header.cus_nama }}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>
                      {{ header.sj_alamat_customer || header.cus_alamat }}
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>{{ header.sj_kota_customer || header.cus_kota }}</td>
                  </tr>
                </table>
              </div>
            </div>

            <table class="dtbl">
              <thead>
                <tr>
                  <th style="width: 24px; text-align: center">No</th>
                  <th style="width: 110px">Spk</th>
                  <th>Nama</th>
                  <th style="width: 80px">Ukuran</th>
                  <th style="width: 60px; text-align: right">Jumlah</th>
                  <th style="width: 40px; text-align: right">Koli</th>
                  <th style="width: 140px">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in pageRows" :key="i">
                  <td style="text-align: center">
                    {{ pi * rowsPerPage + i + 1 }}
                  </td>
                  <td>{{ r.sjd_spk_nomor }}</td>
                  <td>{{ r.spk_nama || r.spk_nama2 }}</td>
                  <td>{{ r.sjd_ukuran }}</td>
                  <td style="text-align: right">{{ num(r.sjd_jumlah) }}</td>
                  <td style="text-align: right">{{ num(r.sjd_koli) }}</td>
                  <td style="font-size: 8pt">{{ r.sjd_keterangan }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="page-footer">
            <div class="foot-row">
              <div class="foot-note">
                Mohon Surat Jalan ini ditanda tangani, distempel, dan di fax
                ke<br />
                atau email ke solokencana2@gmail.com
              </div>

              <div class="foot-page">
                Page: {{ pi + 1 }} of {{ paginatedDetails.length }}
              </div>
            </div>

            <div class="ttd-row">
              <span>Dibuat Oleh,</span>
              <span>Disiapkan Oleh,</span>
              <span>Kepala Gudang,</span>
              <span>Pengantar,</span>
              <span>Diterima Oleh,</span>
            </div>
            <div class="ttd-space"></div>
            <div class="ttd-row ttd-paren">
              <span>( ....................... )</span>
              <span>( ....................... )</span>
              <span>( ....................... )</span>
              <span>( ....................... )</span>
              <span>( ....................... )</span>
            </div>

            <div class="bottom-note">
              Note : Pengaduan konsumen maks. 14 hari dari tanggal penerimaan
              barang.<br />
              Melebihi batas waktu pengaduan, tidak diterima.
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── DOT MATRIX UI ── */
.dm-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: "Segoe UI", Arial, sans-serif;
  padding: 20px;
  box-sizing: border-box;
}
.dm-card {
  background: white;
  padding: 32px 36px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-width: 480px;
  width: 100%;
  text-align: center;
}
.dm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.dm-card h2 {
  color: #1565c0;
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
}
.dm-card p {
  color: #555;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 16px;
}
.dm-steps {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  color: #5d4037;
  margin-bottom: 20px;
}
.dm-steps ol {
  margin: 8px 0 0 18px;
  padding: 0;
  line-height: 1.8;
}
.dm-btn {
  width: 100%;
  padding: 11px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.dm-btn:hover {
  background: #0d47a1;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e3f2fd;
  border-top-color: #1565c0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── INKJET PRINT (LANDSCAPE) ── */
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: #777;
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

/* Base structural flexbox for page to prevent overflow */
.flex-col {
  display: flex;
  flex-direction: column;
}
.page-content {
  flex: 1; /* Mengisi ruang kosong */
}
.page-footer {
  flex-shrink: 0;
  margin-top: auto; /* Mendorong footer agar selalu mentok bawah box */
}

.page {
  width: 210mm; /* Lebar A5 Landscape */
  height: 146mm; /* Menggunakan tinggi absolute agar DOM tidak merenggang lebih dari kertas */
  background: white;
  margin: 10px auto;
  padding: 6mm 8mm 5mm 8mm; /* Sesuaikan margin agar tidak memakan ruang cetak */
  box-sizing: border-box;
  font-size: 8.5pt;
  font-family: "Segoe UI", Arial, sans-serif;
  position: relative;
  overflow: hidden;
  border: 1px solid #ccc; /* Border bayangan UI Web */
  color: #000;
  page-break-after: always;
}

/* Watermark */
.watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 55pt;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.05);
  letter-spacing: 0.1em;
  pointer-events: none;
  white-space: nowrap;
  z-index: 0;
}

/* Header & Logo */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2px;
  position: relative;
  z-index: 1;
}
.kop-nama {
  font-size: 10pt;
  font-weight: 700;
}
.kop-sub {
  font-size: 8pt;
}
.logo-img {
  max-height: 38px;
  object-fit: contain;
}
.doc-title {
  text-align: left;
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

/* Info */
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}
.info-tbl {
  border-collapse: collapse;
  font-size: 8.5pt;
}
.info-tbl td {
  padding: 0 4px 0 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 65px;
  white-space: nowrap;
}

.cus-box {
  text-align: left;
  font-size: 8.5pt;
  min-width: 45%;
  max-width: 50%;
}

/* Tabel Full Putih Tanpa Warna */
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
}
.dtbl th {
  border: 1px solid #000;
  border-bottom: 2px solid #000;
  padding: 3px 4px;
  font-weight: 700;
  text-align: left;
  background: transparent !important;
  color: #000;
}
.dtbl td {
  border: 1px solid #000;
  padding: 3px 4px;
  background: transparent !important;
}
.dtbl tbody tr td {
  background: transparent !important;
}

/* Footer Info */
.foot-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 8pt;
  color: #000;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
}
.foot-note {
  max-width: 60%;
  line-height: 1.3;
}
.foot-total {
  font-size: 8.5pt;
  margin-left: 10px;
}
.foot-page {
  font-size: 8pt;
  text-align: right;
  flex: 1;
}

/* Tanda Tangan */
.ttd-row {
  display: flex;
  justify-content: space-between;
  font-size: 8pt;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}
.ttd-row span {
  flex: 1;
  text-align: center;
}
.ttd-space {
  height: 35px;
}
.ttd-paren {
  font-size: 8pt;
}

/* Bottom note */
.bottom-note {
  font-size: 7pt;
  color: #000;
  margin-top: 4px;
  line-height: 1.3;
  position: relative;
  z-index: 1;
}

/* ── PENGATURAN CETAK (PRINT) ── */
@media print {
  .no-print {
    display: none !important;
  }
  .print-root {
    background: white;
    padding: 0;
    margin: 0;
  }

  @page {
    size: 210mm 148mm; /* Kertas A5 Landscape */
    margin: 0;
  }

  .page {
    width: 210mm;
    height: 148mm;
    border: none; /* Hilangkan border abu-abu saat dicetak */
    margin: 0;
    padding: 6mm 8mm; /* Jarak aman tepi kertas */
    box-shadow: none;
    page-break-after: always;
  }
}
</style>
