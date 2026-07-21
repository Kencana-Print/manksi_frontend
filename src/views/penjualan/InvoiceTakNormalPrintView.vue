<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invTakNormalFormService as svc } from "@/services/penjualan/invoiceTakNormalFormService";
import qz from "qz-tray";

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
const printerName = ref("EPSON LX-310 ESC/P on 192.168.1.41");
const isPrinting = ref(false);

const doPrint = () => window.print();
const doClose = () => window.close();

const companyLogo = computed(() => {
  const kode = (header.value.inv_perush_kode || "").toUpperCase();
  const nama = (header.value.perush_nama || "").toUpperCase();
  if (kode === "KP" || nama.includes("KENCANA")) return logoKP;
  if (kode === "JA" || nama.includes("JAYA ABADI")) return logoJA;
  if (kode === "MD" || nama.includes("MADANI")) return logoMD;
  return null;
});

const rowsPerPage = 6;
const paginatedDetails = computed(() => {
  const arr = detail.value || [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += rowsPerPage) {
    chunks.push(arr.slice(i, i + rowsPerPage));
  }
  return chunks.length > 0 ? chunks : [[]];
});

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

// ── Konstanta kertas dot matrix — 21cm (lebar cetak) x 27,8cm (panjang feed) ──
// Lebar 21cm ÷ 2,54 = 8,27" → pada pitch NORMAL 10 CPI = ~80 karakter/baris.
const PAGE_WIDTH = 80;
// Panjang 27,8cm ÷ 2,54 = 10,94" → pada 6 LPI (baris/inch) standar = ~65 baris.
const PAGE_LINES = 65;

// ── Generate TXT (Dot Matrix) — sesuai Delphi doslipINV2 ──────────────
// Fixed baris/halaman (tidak ada pilihan Standart/Full seperti Invoice
// biasa), dikalibrasi ulang ke lebar 80 kolom & tinggi ~65 baris agar
// sesuai kertas fisik 21cm x 27,8cm, dan footer tidak pernah kepotong
// di tengah halaman.
const generateTxt = () => {
  const h = header.value;
  const rows = detail.value;
  const t = totals.value;
  const LINE = "-".repeat(PAGE_WIDTH);

  const buildHeaderLines = (): string[] => {
    const cAlamat = h.inv_cus_alamat || h.cus_alamat || "";
    const alamatLines = wrapText(cAlamat, 34);
    const lines: string[] = [];
    lines.push(padR(h.perush_nama || "", PAGE_WIDTH));
    lines.push(padR(h.perush_alamat || "", PAGE_WIDTH));
    lines.push(padR(h.perush_telp || "", PAGE_WIDTH));
    lines.push("");
    lines.push(padC("I N V O I C E", PAGE_WIDTH));
    lines.push("");
    lines.push(
      `${padR("Nomor      : " + (h.inv_nomor || ""), 40)}${padR("Customer : " + (h.cus_nama || ""), 40)}`,
    );
    lines.push(
      `${padR("Tanggal    : " + (h.inv_tanggal_fmt || ""), 40)}${padR(alamatLines[0] || "", 40)}`,
    );
    lines.push(
      `${padR("Keterangan : " + (h.inv_keterangan || ""), 40)}${padR(alamatLines[1] || "", 40)}`,
    );
    for (let i = 2; i < alamatLines.length; i++) {
      lines.push(`${padR("", 40)}${padR(alamatLines[i], 40)}`);
    }
    lines.push(
      `${padR("", 40)}${padR((h.cus_telp || "") + "/" + (h.cus_fax || ""), 40)}`,
    );
    lines.push(LINE);
    lines.push(
      `${padR("No", 3)} ${padR("SPK", 10)} ${padR("Nama", 24)} ${padR("Ukuran", 13)} ${padL("Jumlah", 8)} ${padL("Harga", 10)} ${padL("Total", 10)}`,
    );
    lines.push(LINE);
    return lines;
  };

  // Tidak ada baris Disc — modul ini tidak punya konsep diskon
  const buildFooterLines = (): string[] => {
    const lines: string[] = [];
    lines.push(LINE);
    const TERBILANG = terbilang(t.grandTotal) + " Rupiah";
    const tb1 = TERBILANG.substring(0, 28);
    const tb2 = TERBILANG.length > 28 ? TERBILANG.substring(28, 56) : "";
    lines.push(
      `${padR("Terbilang : " + tb1, 55)} ${padR("Total", 12)}: ${padL(num(t.totalBarang), 12)}`,
    );
    lines.push(
      `${padR(tb2, 55)} ${padR("Total PPN", 12)}: ${padL(num(t.totalPpn), 12)}`,
    );
    lines.push(
      `${padR("", 55)} ${padR("Grand Total", 12)}: ${padL(num(t.grandTotal), 12)}`,
    );
    lines.push(
      `${padR("", 55)} ${padR("Uang Muka", 12)}: ${padL(num(t.uangMuka), 12)}`,
    );
    lines.push(
      `${padR("", 55)} ${padR("Nilai Piutang", 12)}: ${padL(num(t.nilaiPiutang), 12)}`,
    );
    lines.push("");
    lines.push(
      `${padR("Di bayarkan ke", 25)}${padR("Dibuat oleh,", 28)}${padR("Mengetahui,", 27)}`,
    );
    lines.push(padR("REKENING : " + (h.inv_rekening || ""), 50));
    lines.push(padR("ATAS NAMA: " + (h.perushd_atasnama || ""), 50));
    lines.push(padR("BANK     : " + (h.perushd_bank || ""), 50));
    lines.push("");
    lines.push("");
    lines.push(
      `${padR("", 25)}${padR("(               )", 28)}${padR("(               )", 27)}`,
    );
    return lines;
  };

  const headerLines = buildHeaderLines();
  const footerLines = buildFooterLines();
  const dataLineOf = (r: any, lineNum: number) =>
    `${padR(String(lineNum), 3)} ${padR(r.invd_spk_nomor || "", 10)} ${padR(r.nama_barang || "", 24)} ${padR(r.invd_ukuran || "", 13)} ${padL(num(r.invd_jumlah), 8)} ${padL(num(r.invd_harga), 10)} ${padL(num(Number(r.invd_jumlah) * Number(r.invd_harga)), 10)}`;

  const maxDataLinesPerPage = Math.max(1, PAGE_LINES - headerLines.length - 1);
  const xRecord = Math.min(30, maxDataLinesPerPage);

  const chunks: any[][] = [];
  for (let i = 0; i < rows.length; i += xRecord) {
    chunks.push(rows.slice(i, i + xRecord));
  }
  if (chunks.length === 0) chunks.push([]);

  const pages: string[][] = [];

  chunks.forEach((chunk, ci) => {
    const startNum = ci * xRecord;
    const dataLines = chunk.map((r: any, i: number) =>
      dataLineOf(r, startNum + i + 1),
    );
    const isLastChunk = ci === chunks.length - 1;
    const page = [...headerLines, ...dataLines];

    if (isLastChunk) {
      const blankPad = Math.max(0, xRecord - chunk.length);
      page.push(...Array(blankPad).fill(""));
      page.push(LINE);
      if (page.length + footerLines.length <= PAGE_LINES) {
        page.push(...footerLines);
        pages.push(page);
      } else {
        pages.push(page);
        pages.push([...footerLines]);
      }
    } else {
      page.push(LINE);
      pages.push(page);
    }
  });

  // Form-feed (\f) antar halaman agar printer fisik pindah lembar bersih.
  return pages.map((p) => p.join("\n")).join("\n\f\n");
};

const printQZ = async () => {
  isPrinting.value = true;
  try {
    // 1. Konek ke QZ Tray jika belum konek
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({
        host: ["127.0.0.1", "localhost"],
        usingSecure: false, // Memaksa penggunaan ws:// untuk HTTP
        keepAlive: 60,
        retries: 2,
      });
    }

    // 2. Buat konfigurasi printer
    const config = qz.configs.create(printerName.value);

    // 3. Siapkan data teks. Tambahkan ESC/POS Init (\x1B\x40) agar settingan printer kereset tiap ngeprint
    const content = generateTxt();
    const data = [
      "\x1B\x40", // ESC @ (Initialize Printer)
      { type: "raw", format: "plain", data: content },
      "\x0C", // Form Feed (Eject kertas jika printer mendukung)
    ];

    // 4. Kirim ke printer
    await qz.print(config, data);
    alert("Berhasil dikirim ke printer!");
  } catch (error: any) {
    console.error("QZ Error:", error);
    alert(
      "Gagal cetak: Pastikan aplikasi QZ Tray berjalan dan nama printer benar. Detail: " +
        error.message,
    );
  } finally {
    isPrinting.value = false;
  }
};

const downloadTxt = () => {
  const content = generateTxt();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `InvoiceTakNormal_${nomor.replace(/\//g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
    };
    isReady.value = true;

    if (mode === "dotmatrix") {
      // HAPUS atau KOMENTARI downloadTxt();
      // Biarkan user klik tombol cetak QZ nanti
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
  document.title = `Invoice Tak Normal - ${nomor}`;
  fetchData();
});
</script>

<template>
  <!-- ── DOT MATRIX: langsung download, tanpa pilihan mode ── -->
  <div v-if="mode === 'dotmatrix'" class="dm-wrapper">
    <div v-if="isLoading" class="dm-card">
      <div class="spinner"></div>
      <p>Menyiapkan data cetak...</p>
    </div>

    <div v-else-if="isReady" class="dm-card">
      <div class="dm-icon">🖨️</div>
      <h2>Cetak Dot Matrix (QZ Tray)</h2>
      <p>Pastikan aplikasi QZ Tray sudah terbuka di background.</p>

      <div class="dm-steps">
        <div style="margin-bottom: 8px">
          <label style="font-weight: bold; display: block; margin-bottom: 4px"
            >Nama Printer di OS:</label
          >
          <input
            v-model="printerName"
            type="text"
            style="
              width: 100%;
              padding: 6px;
              border: 1px solid #ccc;
              border-radius: 4px;
            "
            placeholder="Contoh: EPSON LX-310"
          />
        </div>
      </div>

      <div style="display: flex; gap: 8px">
        <button class="dm-btn" @click="printQZ" :disabled="isPrinting">
          {{ isPrinting ? "Mengirim..." : "🚀 Cetak Langsung" }}
        </button>
        <!-- Tombol unduh manual tetap disediakan sebagai fallback/cadangan -->
        <button class="dm-btn" style="background: #757575" @click="downloadTxt">
          📥 Unduh TXT
        </button>
      </div>
    </div>
  </div>

  <!-- ── INKJET: layout sama pola Invoice normal ── -->
  <div v-else class="print-root">
    <div v-if="isLoading" class="loading-screen">Menyiapkan cetak...</div>
    <template v-else-if="isReady">
      <div class="no-print toolbar">
        <span style="font-weight: 700; color: #1565c0"
          >Invoice Tak Normal — {{ nomor }}</span
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

          <!-- Summary hanya tampil di halaman terakhir — TANPA baris Disc -->
          <div v-if="pi === paginatedDetails.length - 1" class="summary-box">
            <div class="summary-row">
              <span>Total</span><span>{{ num(totals.totalBarang) }}</span>
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
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
