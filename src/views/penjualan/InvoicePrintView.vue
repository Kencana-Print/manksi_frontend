<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invFormService as svc } from "@/services/penjualan/invoiceFormService";

// Import Logo Perusahaan
import logoKP from "@/assets/kp.jpg";
import logoJA from "@/assets/ja.jpg";
import logoMD from "@/assets/md.jpg";

const route = useRoute();
const nomor = route.query.nomor as string;
const mode = route.query.mode as string; // "dotmatrix" | "inkjet"

const header = ref<any>({});
const detail = ref<any[]>([]);
const totals = ref<any>({});
const isReady = ref(false);
const isLoading = ref(true);

const doPrint = () => window.print();
const doClose = () => window.close();

// ── Pilihan mode dot matrix ──────────────────────────────────────────
const showModeDialog = ref(false);
const dotMatrixMode = ref<"standart" | "full">("standart");

// ── Computed Logo ─────────────────────────────────────────────────────
const companyLogo = computed(() => {
  const kode = (header.value.inv_perush_kode || "").toUpperCase();
  const nama = (header.value.perush_nama || "").toUpperCase();
  if (kode === "KP" || nama.includes("KENCANA")) return logoKP;
  if (kode === "JA" || nama.includes("JAYA ABADI")) return logoJA;
  if (kode === "MD" || nama.includes("MADANI")) return logoMD;
  return null;
});

// ── Chunking detail per halaman ──────────────────────────────────────
const rowsPerPage = 6;
const paginatedDetails = computed(() => {
  const arr = detail.value || [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += rowsPerPage) {
    chunks.push(arr.slice(i, i + rowsPerPage));
  }
  return chunks.length > 0 ? chunks : [[]];
});

// ── Format helpers ────────────────────────────────────────────────────
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

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

const formatPrintedAt = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ── Generate TXT (Dot Matrix) — sesuai Delphi doslipINV2 ──────────────
const generateTxt = (mode: "standart" | "full") => {
  const h = header.value;
  const rows = detail.value;
  const t = totals.value;
  const LINE = "-".repeat(120);
  let txt = "";

  const cAlamat = h.inv_cus_alamat || h.cus_alamat || "";
  const alamatLines = wrapText(cAlamat, 60);
  const xRecord = mode === "standart" ? 31 : rows.length;
  const isFull = mode === "full";

  const printHeader = () => {
    txt += `${padR(h.perush_nama || "", 120)}\n`;
    txt += `${padR(h.perush_alamat || "", 120)}\n`;
    txt += `${padR(h.perush_telp || "", 120)}\n`;
    txt += "\n";
    txt += `${padC("I N V O I C E", 120)}\n\n`;
    txt += `${padR("Nomor      : " + (h.inv_nomor || ""), 60)} ${padR("Customer : " + (h.cus_nama || ""), 60)}\n`;
    txt += `${padR("Tanggal    : " + (h.inv_tanggal_fmt || ""), 60)} ${padR(alamatLines[0] || "", 60)}\n`;
    txt += `${padR("Keterangan : " + (h.inv_keterangan || ""), 60)} ${padR(alamatLines[1] || "", 60)}\n`;
    for (let i = 2; i < alamatLines.length; i++) {
      txt += `${padR("", 60)} ${padR(alamatLines[i], 60)}\n`;
    }
    txt += `${padR("", 60)} ${padR((h.cus_telp || "") + "/" + (h.cus_fax || ""), 60)}\n`;
    txt += `${LINE}\n`;
    txt += `${padR("No", 3)} ${padR("SPK", 12)} ${padR("Nama", 40)} ${padR("Ukuran", 20)} ${padL("Jumlah", 10)} ${padL("Harga", 14)} ${padL("Total", 15)}\n`;
    txt += `${LINE}\n`;
  };

  printHeader();

  rows.forEach((r: any, i: number) => {
    const lineNum = i + 1;
    txt += `${padR(String(lineNum), 3)} `;
    txt += `${padR(r.invd_spk_nomor || "", 12)} `;
    txt += `${padR(r.nama_barang || "", 40)} `;
    txt += `${padR(r.invd_ukuran || "", 20)} `;
    txt += `${padL(num(r.invd_jumlah), 10)} `;
    txt += `${padL(num(r.invd_harga), 14)} `;
    txt += `${padL(num(Number(r.invd_jumlah) * Number(r.invd_harga)), 15)}\n`;

    if (!isFull && lineNum % xRecord === 0 && lineNum < rows.length) {
      txt += `${LINE}\n`;
      txt += "\n".repeat(5);
      printHeader();
    }
  });

  if (!isFull) {
    const sisa = xRecord - (rows.length % xRecord || xRecord);
    txt += "\n".repeat(Math.max(0, sisa));
  }

  txt += `${LINE}\n`;

  const TERBILANG = terbilang(t.grandTotal) + " Rupiah";
  txt += `${padR("Terbilang : " + TERBILANG.substring(0, 48), 81)} ${padR("Total         :", 15)} ${padL(num(t.totalBarang), 21)}\n`;
  const pphLabel = h.inv_pph === "PPh" ? "PPh" : "Disc";
  txt += `${padR(TERBILANG.length > 48 ? TERBILANG.substring(48, 108) : "", 81)} ${padR(pphLabel + "          :", 15)} ${padL(num(t.disc), 21)}\n`;
  txt += `${padR(TERBILANG.length > 108 ? TERBILANG.substring(108, 168) : "", 81)} ${padR("Total PPN     :", 15)} ${padL(num(t.totalPpn), 21)}\n`;
  txt += `${padR(TERBILANG.length > 168 ? TERBILANG.substring(168, 208) : "", 81)} ${padR("Grand Total   :", 15)} ${padL(num(t.grandTotal), 21)}\n`;
  txt += `${padR("", 81)} ${padR("Uang Muka     :", 15)} ${padL(num(t.uangMuka), 21)}\n`;
  txt += `${padR("", 81)} ${padR("Nilai Piutang :", 15)} ${padL(num(t.nilaiPiutang), 21)}\n\n`;

  txt += `${padR("Di bayarkan ke ", 25)} ${padR("", 40)} ${padR("Dibuat oleh,", 30)} ${padR("Mengetahui,", 30)}\n`;
  txt += `${padR("REKENING : " + (h.inv_rekening || ""), 65)}\n`;
  txt += `${padR("ATAS NAMA: " + (h.perushd_atasnama || ""), 65)}\n`;
  txt += `${padR("BANK     : " + (h.perushd_bank || ""), 65)}\n\n`;
  txt += `${padR(" ", 65)} ${padR("(               )", 30)} ${padR("(               )", 30)}\n\n`;

  // ── Tambahan: User Create + Date Create di bawah TTD ──
  txt += `${LINE}\n`;
  txt += `${padR("Dibuat oleh : " + (h.user_create || ""), 60)} ${padR("Dicetak : " + formatPrintedAt(), 60)}\n`;

  return txt;
};

const downloadTxt = () => {
  const content = generateTxt(dotMatrixMode.value);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${nomor.replace(/\//g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const confirmDotMatrixMode = (mode: "standart" | "full") => {
  dotMatrixMode.value = mode;
  showModeDialog.value = false;
  downloadTxt();
};

const printedAtDisplay = ref(formatPrintedAt());

// ── Fetch data ────────────────────────────────────────────────────────
const fetchData = async () => {
  try {
    const res = await svc.getDataCetak(nomor);
    const d = res.data.data;
    header.value = d.header;
    detail.value = d.detail;
    totals.value = {
      totalBarang: d.totalBarang,
      totalPpn: d.totalPpn,
      grandTotal: d.grandTotal,
      uangMuka: d.uangMuka,
      nilaiPiutang: d.nilaiPiutang,
      disc: d.disc,
    };
    isReady.value = true;

    if (mode === "dotmatrix") {
      showModeDialog.value = true;
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
  document.title = `Invoice - ${nomor}`;
  fetchData();
});
</script>

<template>
  <!-- ── DOT MATRIX: pilih mode lalu download ── -->
  <div v-if="mode === 'dotmatrix'" class="dm-wrapper">
    <div v-if="isLoading" class="dm-card">
      <div class="spinner"></div>
      <p>Menyiapkan data cetak...</p>
    </div>

    <div v-else-if="showModeDialog" class="dm-card">
      <div class="dm-icon">🖨️</div>
      <h2>Mau dicetak?</h2>
      <p>
        Pilih mode cetak untuk Invoice <b>{{ nomor }}</b>
      </p>
      <div class="dm-mode-btns">
        <button
          class="dm-mode-btn dm-mode-standart"
          @click="confirmDotMatrixMode('standart')"
        >
          Standart<br /><span>Maks 31 baris/halaman</span>
        </button>
        <button
          class="dm-mode-btn dm-mode-full"
          @click="confirmDotMatrixMode('full')"
        >
          Full<br /><span>Semua dalam 1 halaman</span>
        </button>
      </div>
    </div>

    <div v-else-if="isReady" class="dm-card">
      <div class="dm-icon">🖨️</div>
      <h2>File Dot Matrix Siap</h2>
      <p>
        File <b>Invoice_{{ nomor.replace(/\//g, "_") }}.txt</b> telah diunduh.
      </p>
      <div class="dm-steps">
        <b>Cara cetak ke Dot Matrix:</b>
        <ol>
          <li>Buka file <b>.txt</b> yang baru saja terunduh</li>
          <li>Tekan <b>Ctrl+P</b> → pilih printer Dot Matrix</li>
          <li>Pastikan font <b>Courier New</b> ukuran <b>10pt</b></li>
          <li>Klik <b>Print</b></li>
        </ol>
      </div>
      <div style="display: flex; gap: 8px">
        <button
          class="dm-btn"
          style="background: #546e7a"
          @click="showModeDialog = true"
        >
          ↻ Ganti Mode
        </button>
        <button class="dm-btn" @click="downloadTxt">📥 Unduh Ulang</button>
      </div>
    </div>
  </div>

  <!-- ── INKJET: layout sama persis pola SJ ── -->
  <div v-else class="print-root">
    <div v-if="isLoading" class="loading-screen">Menyiapkan cetak...</div>
    <template v-else-if="isReady">
      <div class="no-print toolbar">
        <span style="font-weight: 700; color: #1565c0"
          >Invoice — {{ nomor }}</span
        >
        <div style="display: flex; gap: 8px">
          <button class="tbtn" @click="doPrint">🖨️ Cetak</button>
          <button class="tbtn tbtn-grey" @click="doClose">✕ Tutup</button>
        </div>
      </div>

      <div
        v-for="(pageRows, pi) in paginatedDetails"
        :key="'page-' + pi"
        class="page flex-col"
      >
        <div class="page-content">
          <div class="header-section">
            <div class="kop-left">
              <div class="kop-nama">{{ header.perush_nama }}</div>
              <div class="kop-sub">{{ header.perush_alamat }}</div>
              <div class="kop-sub" v-if="header.perush_telp">
                {{ header.perush_telp }}
              </div>
              <div class="doc-title">INVOICE</div>
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
                  <td>: {{ header.inv_nomor }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tanggal</td>
                  <td>: {{ header.inv_tanggal_fmt }}</td>
                </tr>
                <tr>
                  <td class="lbl">Keterangan</td>
                  <td>: {{ header.inv_keterangan }}</td>
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
                  <td>{{ header.inv_cus_alamat || header.cus_alamat }}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td>{{ header.cus_telp }}</td>
                </tr>
              </table>
            </div>
          </div>

          <table class="dtbl">
            <thead>
              <tr>
                <th style="width: 24px; text-align: center">No</th>
                <th style="width: 110px">SPK</th>
                <th>Nama</th>
                <th style="width: 80px">Ukuran</th>
                <th style="width: 60px; text-align: right">Jumlah</th>
                <th style="width: 80px; text-align: right">Harga</th>
                <th style="width: 95px; text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in pageRows" :key="i">
                <td style="text-align: center">
                  {{ pi * rowsPerPage + i + 1 }}
                </td>
                <td>{{ r.invd_spk_nomor }}</td>
                <td>{{ r.nama_barang }}</td>
                <td>{{ r.invd_ukuran }}</td>
                <td style="text-align: right">{{ num(r.invd_jumlah) }}</td>
                <td style="text-align: right">{{ num(r.invd_harga) }}</td>
                <td style="text-align: right">
                  {{ num(Number(r.invd_jumlah) * Number(r.invd_harga)) }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Summary hanya tampil di halaman terakhir -->
          <div v-if="pi === paginatedDetails.length - 1" class="summary-box">
            <div class="summary-row">
              <span>Total</span><span>{{ num(totals.totalBarang) }}</span>
            </div>
            <div class="summary-row">
              <span>{{ header.inv_pph === "PPh" ? "PPh" : "Disc" }}</span
              ><span>{{ num(totals.disc) }}</span>
            </div>
            <div class="summary-row">
              <span>Total PPN</span><span>{{ num(totals.totalPpn) }}</span>
            </div>
            <div class="summary-row summary-bold">
              <span>Grand Total</span><span>{{ num(totals.grandTotal) }}</span>
            </div>
            <div class="summary-row">
              <span>Uang Muka</span><span>{{ num(totals.uangMuka) }}</span>
            </div>
            <div class="summary-row summary-bold">
              <span>Nilai Piutang</span
              ><span>{{ num(totals.nilaiPiutang) }}</span>
            </div>
          </div>
        </div>

        <div class="page-footer">
          <div class="foot-row">
            <div class="foot-note" v-if="pi === paginatedDetails.length - 1">
              REKENING : {{ header.inv_rekening }}<br />
              ATAS NAMA: {{ header.perushd_atasnama }}<br />
              BANK : {{ header.perushd_bank }}
            </div>
            <div class="foot-note" v-else></div>
            <div class="foot-page">
              Page: {{ pi + 1 }} of {{ paginatedDetails.length }}
            </div>
          </div>

          <div class="ttd-row">
            <span>Dibuat Oleh,</span>
            <span>Mengetahui,</span>
          </div>
          <div class="ttd-space"></div>
          <div class="ttd-row ttd-paren">
            <span>( ....................... )</span>
            <span>( ....................... )</span>
          </div>
          <div class="printed-at">Dicetak: {{ printedAtDisplay }}</div>
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
.dm-mode-btns {
  display: flex;
  gap: 10px;
}
.dm-mode-btn {
  flex: 1;
  padding: 14px 8px;
  border: 2px solid #1565c0;
  border-radius: 6px;
  background: white;
  color: #1565c0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1.5;
}
.dm-mode-btn span {
  font-size: 10px;
  font-weight: 400;
  color: #777;
}
.dm-mode-btn:hover {
  background: #e3f2fd;
}
.dm-mode-full {
  border-color: #2e7d32;
  color: #2e7d32;
}
.dm-mode-full:hover {
  background: #e8f5e9;
}

/* ── INKJET PRINT (LANDSCAPE — sama persis pola SJ) ── */
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

.flex-col {
  display: flex;
  flex-direction: column;
}
.page-content {
  flex: 1;
}
.page-footer {
  flex-shrink: 0;
  margin-top: auto;
}

.page {
  width: 210mm;
  height: 146mm;
  background: white;
  margin: 10px auto;
  padding: 6mm 8mm 5mm 8mm;
  box-sizing: border-box;
  font-size: 8.5pt;
  font-family: "Segoe UI", Arial, sans-serif;
  position: relative;
  overflow: hidden;
  border: 1px solid #ccc;
  color: #000;
  page-break-after: always;
}

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

.summary-box {
  width: 220px;
  margin-left: auto;
  margin-bottom: 4px;
  border: 1px solid #000;
  border-radius: 2px;
  padding: 4px 8px;
  position: relative;
  z-index: 1;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 7.5pt;
  padding: 1px 0;
}
.summary-bold {
  font-weight: 700;
  border-top: 1px solid #999;
  margin-top: 2px;
  padding-top: 2px;
}

.foot-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 7.5pt;
  color: #000;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
}
.foot-note {
  max-width: 60%;
  line-height: 1.4;
}
.foot-page {
  font-size: 8pt;
  text-align: right;
  flex: 1;
}

.ttd-row {
  display: flex;
  justify-content: space-around;
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

.printed-at {
  font-size: 6.5pt;
  color: #777;
  text-align: right;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

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
    size: 210mm 148mm;
    margin: 0;
  }
  .page {
    width: 210mm;
    height: 148mm;
    border: none;
    margin: 0;
    padding: 6mm 8mm;
    box-shadow: none;
    page-break-after: always;
  }
}
</style>
