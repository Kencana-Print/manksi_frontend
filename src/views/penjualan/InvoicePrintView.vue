<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invFormService as svc } from "@/services/penjualan/invoiceFormService";
import qz from "qz-tray";

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
const printerName = ref("192.168.1.41");
const isPrinting = ref(false);
const printingMode = ref<"standart" | "full" | null>(null);
// ── Dialog hasil aksi (pengganti alert()) ──
const resultDialog = ref<{
  show: boolean;
  type: "success" | "error";
  title: string;
  message: string;
}>({
  show: false,
  type: "success",
  title: "",
  message: "",
});
const showResult = (
  type: "success" | "error",
  title: string,
  message: string,
) => {
  resultDialog.value = { show: true, type, title, message };
};
const closeResult = () => {
  resultDialog.value.show = false;
};

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
// ✅ FIX: sebelumnya pakai Number(v).toLocaleString("id-ID"), tapi di server
// (Node.js tanpa full-ICU) locale "id-ID" fallback ke default en-US
// (koma jadi pemisah ribuan). Jadi diganti formatter manual biar gak
// gantung ketersediaan locale — titik = ribuan, koma = desimal (kalau ada).
const num = (v: any) => {
  const n = Number(v || 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  const hasDecimal = Math.round(abs * 100) % 100 !== 0;
  const fixed = abs.toFixed(hasDecimal ? 2 : 0);
  const [intPartRaw, decPart] = fixed.split(".");
  let out = "";
  let cnt = 0;
  for (let i = intPartRaw.length - 1; i >= 0; i--) {
    out = intPartRaw[i] + out;
    cnt++;
    if (cnt % 3 === 0 && i !== 0) out = "," + out;
  }
  if (decPart) out += "." + decPart;
  return (neg ? "-" : "") + out;
};

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
const fmtDateID = (v: string) => {
  if (!v) return "";
  const raw = String(v).split("T")[0];
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  // ISO (YYYY-MM-DD) — segmen pertama 4 digit
  if (parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  // Sudah format Indonesia (DD-MM-YYYY) — tinggal ganti separator jadi slash
  return parts.join("/");
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
const PAGE_WIDTH = 136;
// Panjang 27,8cm ÷ 2,54 = 10,94" → pada 6 LPI (baris/inch) standar = ~65 baris.
const PAGE_LINES = 65;

// ✅ Garis solid (bukan putus-putus): "-" ada gap antar karakter di dot
// matrix, underscore ("_") nyambung jadi garis lurus tanpa putus.
const LINE = "_".repeat(PAGE_WIDTH);

// Lebar kolom footer (Di bayarkan ke / Dibuat oleh / Mengetahui).
// Sebelumnya 42/47/47 bikin blok TTD kemepetan sama info rekening.
// Digeser: kolom rekening dipersempit + kolom TTD digeser ke kanan.
const COL_BAYAR = 58;
const COL_TTD1 = 39;
const COL_TTD2 = 39; // 58+39+39 = 136

const generateTxt = (mode: "standart" | "full") => {
  const h = header.value;
  const rows = detail.value;
  const t = totals.value;
  const isFull = mode === "full";

  // ── Bangun blok header (dipakai ulang tiap halaman utk mode standart) ──
  const buildHeaderLines = (): string[] => {
    const cAlamat = h.inv_cus_alamat || h.cus_alamat || "";
    const halfL = 67;
    const halfR = 68; // halfL + 1(spasi) + halfR = 136
    const alamatLines = wrapText(cAlamat, halfR - 12);
    const lines: string[] = [];
    lines.push(padR(h.perush_nama || "", PAGE_WIDTH));
    lines.push(padR(h.perush_alamat || "", PAGE_WIDTH));
    // ✅ Nomor telepon perusahaan di-hide dari cetakan
    lines.push("");
    lines.push(padC("I N V O I C E", PAGE_WIDTH));
    lines.push("");
    lines.push(
      `${padR("Nomor      : " + (h.inv_nomor || ""), halfL)} ${padR("Customer : " + (h.cus_nama || ""), halfR)}`,
    );
    lines.push(
      `${padR("Tanggal    : " + fmtDateID(h.inv_tanggal_fmt), halfL)} ${padR(alamatLines[0] || "", halfR)}`,
    );
    lines.push(
      `${padR("Keterangan : " + (h.inv_keterangan || ""), halfL)} ${padR(alamatLines[1] || "", halfR)}`,
    );
    for (let i = 2; i < alamatLines.length; i++) {
      lines.push(`${padR("", halfL)} ${padR(alamatLines[i], halfR)}`);
    }
    // ✅ Nomor telp/fax customer di-hide dari cetakan
    lines.push(LINE);
    lines.push("");
    lines.push(
      `${padC("No", 3)} ${padC("SPK", 16)} ${padC("Nama", 46)} ${padC("Ukuran", 22)} ${padC("Jumlah", 12)} ${padC("Harga", 16)} ${padC("Total", 16)}`,
    );
    lines.push(LINE);
    return lines;
  };

  const buildFooterLines = (): string[] => {
    const lines: string[] = [];
    lines.push(LINE);
    // ✅ Terbilang huruf kapital semua
    const TERBILANG = (terbilang(t.grandTotal) + " Rupiah").toUpperCase();
    const tb1 = TERBILANG.substring(0, 48);
    const tb2 = TERBILANG.length > 48 ? TERBILANG.substring(48, 96) : "";
    lines.push(
      `${padR("Terbilang : " + tb1, 95)} ${padR("Total", 14)}: ${padL(num(t.totalBarang), 20)}`,
    );
    const pphLabel = h.inv_pph === "PPh" ? "PPh" : "Disc";
    lines.push(
      `${padR(tb2, 95)} ${padR(pphLabel, 14)}: ${padL(num(t.disc), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Total PPN", 14)}: ${padL(num(t.totalPpn), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Grand Total", 14)}: ${padL(num(t.grandTotal), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Uang Muka", 14)}: ${padL(num(t.uangMuka), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Nilai Piutang", 14)}: ${padL(num(t.nilaiPiutang), 20)}`,
    );
    lines.push("");
    lines.push("");
    lines.push(
      `${padR("Di bayarkan ke", COL_BAYAR)}${padR("Dibuat oleh,", COL_TTD1)}${padR("Mengetahui,", COL_TTD2)}`,
    );
    lines.push(padR("REKENING : " + (h.inv_rekening || ""), COL_BAYAR));
    lines.push(padR("ATAS NAMA: " + (h.perushd_atasnama || ""), COL_BAYAR));
    lines.push(padR("BANK     : " + (h.perushd_bank || ""), COL_BAYAR));
    lines.push("");
    lines.push("");
    lines.push(
      `${padR("", COL_BAYAR)}${padR("(               )", COL_TTD1)}${padR("(               )", COL_TTD2)}`,
    );
    return lines;
  };

  const headerLines = buildHeaderLines();
  const footerLines = buildFooterLines();
  const dataLineOf = (r: any, lineNum: number) =>
    `${padR(String(lineNum), 3)} ${padR(r.invd_spk_nomor || "", 16)} ${padR(r.nama_barang || "", 46)} ${padR(r.invd_ukuran || "", 22)} ${padL(num(r.invd_jumlah), 12)} ${padL(num(r.invd_harga), 16)} ${padL(num(Number(r.invd_jumlah) * Number(r.invd_harga)), 16)}`;

  const allPages: string[][] = [];

  if (isFull) {
    const dataLines = rows.map((r: any, i: number) => dataLineOf(r, i + 1));
    const bodyLines = [...headerLines, ...dataLines, LINE];
    if (bodyLines.length + footerLines.length <= PAGE_LINES) {
      // ✅ Footer didorong ke bawah halaman fisik — blank lines disisipin
      // SEBELUM footer. PAGE_LINES perlu dikalibrasi dari hitungan fisik
      // biar gap-nya wajar (jangan sampai kegedean kayak sebelumnya).
      const pad = Math.max(
        0,
        PAGE_LINES - bodyLines.length - footerLines.length,
      );
      allPages.push([...bodyLines, ...Array(pad).fill(""), ...footerLines]);
    } else {
      const padToPage = Math.max(0, PAGE_LINES - bodyLines.length);
      allPages.push([...bodyLines, ...Array(padToPage).fill("")]);
      // Footer di halaman ke-2 juga tetap didorong ke bawah
      const footerPad = Math.max(0, PAGE_LINES - footerLines.length);
      allPages.push([...Array(footerPad).fill(""), ...footerLines]);
    }
  } else {
    // Mode Standart: xRecord baris per halaman fisik, tiap halaman
    // SELALU genap tinggi PAGE_LINES (header+data+padding kosong),
    // footer HANYA di halaman terakhir & tetap didorong ke bawah.
    const maxDataLinesPerPage = Math.max(
      1,
      PAGE_LINES - headerLines.length - 1, // -1 utk LINE penutup data
    );
    const xRecord = Math.min(31, maxDataLinesPerPage);

    const chunks: any[][] = [];
    for (let i = 0; i < rows.length; i += xRecord) {
      chunks.push(rows.slice(i, i + xRecord));
    }
    if (chunks.length === 0) chunks.push([]);

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
          const extraPad = Math.max(
            0,
            PAGE_LINES - page.length - footerLines.length,
          );
          page.push(...Array(extraPad).fill(""), ...footerLines);
          allPages.push(page);
        } else {
          allPages.push(page);
          const footerPad = Math.max(0, PAGE_LINES - footerLines.length);
          allPages.push([...Array(footerPad).fill(""), ...footerLines]);
        }
      } else {
        page.push(LINE);
        allPages.push(page);
      }
    });
  }

  // Gabungkan semua halaman, pisahkan dengan form-feed (\f) supaya
  // printer fisik pindah ke halaman baru dengan bersih.
  return allPages.map((p) => p.join("\n")).join("\n\f\n");
};

const printQZ = async (pilihMode: "standart" | "full") => {
  isPrinting.value = true;
  printingMode.value = pilihMode;
  try {
    if (!qz.websocket.isActive()) {
      try {
        // Biarkan QZ mencoba berbagai port bawaannya dengan 5x percobaan
        await qz.websocket.connect({ retries: 5, delay: 1 });
      } catch (err: any) {
        console.error("Detail Error Koneksi QZ:", err);
        showResult(
          "error",
          "Gagal Terhubung",
          "Gagal terhubung ke aplikasi QZ Tray di komputer ini. Pastikan QZ Tray sudah berjalan di background.",
        );
        isPrinting.value = false;
        return;
      }
    }

    const config = qz.configs.create(printerName.value);
    const content = generateTxt(pilihMode);

    const data = [
      "\x1B\x40", // ESC @: Inisialisasi/Reset printer
      "\x1B\x6C\x00", // ESC l 0: Set left margin = kolom 0
      { type: "raw", format: "plain", data: content },
      "\x0C", // Form Feed: Eject halaman
    ];

    await qz.print(config, data);
    showResult(
      "success",
      "Berhasil Dikirim",
      `Data berhasil dikirim ke printer (Mode: ${pilihMode}).`,
    );
  } catch (error: any) {
    console.error("QZ Error:", error);
    showResult(
      "error",
      "Gagal Cetak",
      "Gagal cetak via QZ Tray: " + error.message,
    );
  } finally {
    isPrinting.value = false;
    printingMode.value = null;
  }
};

// Fungsi unduh diubah agar menerima parameter mode untuk tombol cadangan
const downloadTxtMode = (pilihMode: "standart" | "full") => {
  const content = generateTxt(pilihMode);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice_${nomor.replace(/\//g, "_")}_${pilihMode}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    showResult(
      "error",
      "Gagal Memuat",
      "Gagal memuat data cetak. Silakan coba muat ulang halaman.",
    );
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

    <div v-else-if="isReady" class="dm-card" style="position: relative">
      <div v-if="isPrinting" class="dm-loading-overlay">
        <div class="spinner"></div>
        <p style="margin: 0; font-weight: 600; color: #1565c0">
          Mengirim ke printer...
        </p>
      </div>
      <div class="dm-icon">🖨️</div>
      <h2>Cetak Invoice Dot Matrix</h2>
      <p style="margin-bottom: 12px">
        Pastikan QZ Tray berjalan di background.
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

      <div
        style="
          text-align: left;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
          color: #1565c0;
        "
      >
        Pilih Mode Cetak Langsung:
      </div>
      <div class="dm-mode-btns" style="margin-bottom: 20px">
        <button
          class="dm-mode-btn dm-mode-standart"
          @click="printQZ('standart')"
          :disabled="isPrinting"
        >
          <span v-if="printingMode === 'standart'">⏳ Mengirim...</span>
          <template v-else>
            🚀 Standart<br /><span>Maks 31 baris/halaman</span>
          </template>
        </button>
        <button
          class="dm-mode-btn dm-mode-full"
          @click="printQZ('full')"
          :disabled="isPrinting"
        >
          <span v-if="printingMode === 'full'">⏳ Mengirim...</span>
          <template v-else>
            🚀 Full<br /><span>Semua dalam 1 halaman</span>
          </template>
        </button>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 16px">
        <div
          style="
            font-size: 11px;
            color: #757575;
            margin-bottom: 8px;
            text-align: left;
          "
        >
          Cadangan jika printer error (Unduh .txt):
        </div>
        <div style="display: flex; gap: 8px">
          <button
            class="dm-btn"
            style="background: #757575"
            @click="downloadTxtMode('standart')"
          >
            📥 TXT Standart
          </button>
          <button
            class="dm-btn"
            style="background: #757575"
            @click="downloadTxtMode('full')"
          >
            📥 TXT Full
          </button>
        </div>
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
        </div>
      </div>
    </template>
  </div>

  <!-- ── Dialog hasil aksi (pengganti alert()) ── -->
  <Teleport to="body">
    <div v-if="resultDialog.show" class="rd-backdrop" @click.self="closeResult">
      <div class="rd-card" :class="`rd-${resultDialog.type}`">
        <div class="rd-icon">
          {{ resultDialog.type === "success" ? "✅" : "⚠️" }}
        </div>
        <div class="rd-title">{{ resultDialog.title }}</div>
        <div class="rd-message">{{ resultDialog.message }}</div>
        <button class="rd-btn" @click="closeResult">OK</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── DOT MATRIX UI ── */
.dm-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: "Consolas", "Courier New", monospace;
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
.dm-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 8px;
  z-index: 10;
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

/* ── Result Dialog (pengganti alert()) ── */
.rd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: rd-fade-in 0.15s ease;
}
@keyframes rd-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.rd-card {
  background: white;
  border-radius: 10px;
  padding: 28px 30px;
  max-width: 360px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25);
  animation: rd-pop-in 0.18s ease;
}
@keyframes rd-pop-in {
  from {
    transform: scale(0.92);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.rd-icon {
  font-size: 40px;
  margin-bottom: 10px;
}
.rd-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #212121;
}
.rd-message {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin-bottom: 20px;
}
.rd-btn {
  padding: 9px 28px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: white;
}
.rd-success .rd-btn {
  background: #2e7d32;
}
.rd-success .rd-btn:hover {
  background: #1b5e20;
}
.rd-error .rd-btn {
  background: #c62828;
}
.rd-error .rd-btn:hover {
  background: #8e0000;
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
