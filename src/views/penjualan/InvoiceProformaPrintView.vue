<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invoiceProformaFormService } from "@/services/penjualan/invoiceProformaFormService";
import qz from "qz-tray";

const route = useRoute();
const nomor = route.params.nomor as string;
const printerName = ref("EPSON LX-310 ESC/P");
const isPrinting = ref(false);

const header = ref<any>({});
const details = ref<any[]>([]);
const isReady = ref(false);
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

// ── Fungsi Terbilang ──
const convertTerbilang = (angka: number): string => {
  const bilangan = [
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
  let temp = "";
  if (angka < 12) temp = " " + bilangan[angka];
  else if (angka < 20) temp = convertTerbilang(angka - 10) + " Belas";
  else if (angka < 100)
    temp =
      convertTerbilang(Math.floor(angka / 10)) +
      " Puluh" +
      convertTerbilang(angka % 10);
  else if (angka < 200) temp = " Seratus" + convertTerbilang(angka - 100);
  else if (angka < 1000)
    temp =
      convertTerbilang(Math.floor(angka / 100)) +
      " Ratus" +
      convertTerbilang(angka % 100);
  else if (angka < 2000) temp = " Seribu" + convertTerbilang(angka - 1000);
  else if (angka < 1000000)
    temp =
      convertTerbilang(Math.floor(angka / 1000)) +
      " Ribu" +
      convertTerbilang(angka % 1000);
  else if (angka < 1000000000)
    temp =
      convertTerbilang(Math.floor(angka / 1000000)) +
      " Juta" +
      convertTerbilang(angka % 1000000);
  else if (angka < 1000000000000)
    temp =
      convertTerbilang(Math.floor(angka / 1000000000)) +
      " Milyar" +
      convertTerbilang(angka % 1000000000);
  else if (angka < 1000000000000000)
    temp =
      convertTerbilang(Math.floor(angka / 1000000000000)) +
      " Triliun" +
      convertTerbilang(angka % 1000000000000);
  return temp;
};

const terbilang = (angka: number): string => {
  angka = Math.floor(Math.abs(Number(angka) || 0));
  if (angka === 0) return "Nol";
  return convertTerbilang(angka).trim();
};

// ✅ FIX: sama seperti InvoicePrintView/SuratJalanPrintView —
// toLocaleString("id-ID") fallback ke koma di server (Node.js tanpa
// full-ICU). Diganti formatter manual: titik = ribuan, koma = desimal.
const numFmt = (val: any) => {
  const n = Number(val || 0);
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
    if (cnt % 3 === 0 && i !== 0) out = "." + out;
  }
  if (decPart) out += "," + decPart;
  return (neg ? "-" : "") + out;
};

const roundRp = (v: any) => Math.round(Number(v) || 0);

const dFormat = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ── Kalkulasi Total ──
const totalNominal = computed(() =>
  details.value.reduce(
    (sum, d) => sum + roundRp((Number(d.jumlah) || 0) * (Number(d.harga) || 0)),
    0,
  ),
);
const totalPpn = computed(() =>
  header.value.inv_sts_ppn === 1
    ? roundRp(totalNominal.value * ((Number(header.value.inv_ppn) || 0) / 100))
    : 0,
);
const grandTotal = computed(() => totalNominal.value + totalPpn.value);
const nilaiPiutang = computed(
  () => grandTotal.value - roundRp(header.value.uang_muka),
);

// ── UTILITAS FORMATTING TXT ──
const padR = (str: string, len: number) =>
  (str || "").toString().padEnd(len, " ").substring(0, len);
const padL = (str: string, len: number) =>
  (str || "").toString().padStart(len, " ").substring(0, len);
const padC = (str: string, len: number) => {
  const s = (str || "").toString();
  if (s.length >= len) return s.substring(0, len);
  const padStart = Math.floor((len - s.length) / 2) + s.length;
  return s.padStart(padStart, " ").padEnd(len, " ");
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

// ── Konstanta kertas dot matrix — disamakan dengan InvoicePrintView ──
const PAGE_WIDTH = 125;
const BASE_WIDTH = 136; // jangan diubah — acuan kalibrasi original
const SCALE = PAGE_WIDTH / BASE_WIDTH;
const col = (n: number) => Math.max(1, Math.round(n * SCALE));

const PAGE_LINES = 65;
const FOOTER_ANCHOR_LINE = 54;

const LINE = "_".repeat(PAGE_WIDTH);

// Lebar kolom footer (Di bayarkan ke / Dibuat oleh / Mengetahui) —
// sekarang proporsional juga.
const COL_BAYAR = col(58);
const COL_TTD1 = col(39);
const COL_TTD2 = col(39);

// ── FUNGSI GENERATE TXT ──
const generateTxt = () => {
  const h = header.value;
  const d = details.value;

  // ── Bangun header (kop + judul + info) sebagai array baris ──
  const buildHeaderLines = (): string[] => {
    const halfL = col(67);
    const halfR = PAGE_WIDTH - halfL - 1; // sisa lebar, dikurangi 1 spasi pemisah
    const cAlamat = h.inv_cus_alamat || h.cus_alamat || "";
    const alamatLines = wrapText(cAlamat, halfR - 12);

    const lines: string[] = [];
    lines.push(padR(h.perush_nama || "", PAGE_WIDTH));
    lines.push(padR(h.perushd_alamat || h.perush_alamat || "", PAGE_WIDTH));
    lines.push("");
    lines.push(padC("I N V O I C E   P R O F O R M A", PAGE_WIDTH));
    lines.push("");
    lines.push(
      `${padR("Nomor      : " + (h.inv_nomor || ""), halfL)} ${padR("Customer : " + (h.cus_nama || ""), halfR)}`,
    );
    lines.push(
      `${padR("Tanggal    : " + dFormat(h.inv_tanggal), halfL)} ${padR(alamatLines[0] || "", halfR)}`,
    );
    lines.push(
      `${padR("Keterangan : " + (h.inv_keterangan || ""), halfL)} ${padR(alamatLines[1] || "", halfR)}`,
    );
    for (let i = 2; i < alamatLines.length; i++) {
      lines.push(`${padR("", halfL)} ${padR(alamatLines[i], halfR)}`);
    }
    lines.push(LINE);
    lines.push(
      `${padR("No", col(3))} ${padR("SPK", col(16))} ${padR("Nama", col(46))} ${padR("Ukuran", col(22))} ${padL("Jumlah", col(12))} ${padL("Harga", col(16))} ${padL("Total", col(16))}`,
    );
    lines.push(LINE);
    return lines;
  };

  // ── Bangun footer (summary + TTD) sebagai array baris ──
  const buildFooterLines = (): string[] => {
    const lines: string[] = [];
    lines.push(LINE);
    const wTerbilang = col(95);
    const wLabel = col(14);
    const wAngka = col(20);
    const TERBILANG = (terbilang(grandTotal.value) + " Rupiah").toUpperCase();

    // ⬅ FIX: sama pola dgn InvoicePrintView/InvoiceTakNormalPrintView.
    const LABEL_TERBILANG = "Terbilang : ";
    const tb1Width = wTerbilang - LABEL_TERBILANG.length;
    const tb1 = TERBILANG.substring(0, tb1Width);
    const tb2 =
      TERBILANG.length > tb1Width
        ? TERBILANG.substring(tb1Width, tb1Width + wTerbilang)
        : "";

    lines.push(
      `${padR(LABEL_TERBILANG + tb1, wTerbilang)} ${padR("Total", wLabel)}: ${padL(numFmt(totalNominal.value), wAngka)}`,
    );
    lines.push(
      `${padR(tb2, wTerbilang)} ${padR("Total PPN", wLabel)}: ${padL(numFmt(totalPpn.value), wAngka)}`,
    );
    lines.push(
      `${padR("", wTerbilang)} ${padR("Grand Total", wLabel)}: ${padL(numFmt(grandTotal.value), wAngka)}`,
    );
    lines.push(
      `${padR("", wTerbilang)} ${padR("Uang Muka", wLabel)}: ${padL(numFmt(h.uang_muka), wAngka)}`,
    );
    lines.push(
      `${padR("", wTerbilang)} ${padR("Nilai Piutang", wLabel)}: ${padL(numFmt(nilaiPiutang.value), wAngka)}`,
    );
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

  const wrapNamaBarang = (text: string) => wrapText(text || "", col(46));

  const dataLinesOf = (item: any, lineNum: number): string[] => {
    const namaLines = wrapNamaBarang(item.nama);
    const first = `${padR(String(lineNum), col(3))} ${padR(item.kode || "", col(16))} ${padR(namaLines[0] || "", col(46))} ${padR(item.ukuran || "", col(22))} ${padL(numFmt(item.jumlah), col(12))} ${padL(numFmt(item.harga), col(16))} ${padL(numFmt(roundRp((Number(item.jumlah) || 0) * (Number(item.harga) || 0))), col(16))}`;
    const rest = namaLines
      .slice(1)
      .map(
        (ln) =>
          `${padR("", col(3))} ${padR("", col(16))} ${padR(ln, col(46))} ${padR("", col(22))} ${padR("", col(12))} ${padR("", col(16))} ${padR("", col(16))}`,
      );
    return [first, ...rest];
  };

  const headerLines = buildHeaderLines();
  const footerLines = buildFooterLines();

  // ⬅ FIX: dataLines sekarang di-flatMap dari dataLinesOf (bisa >1 baris
  // per item kalau nama panjang), nomor urut hanya nambah per ITEM asli.
  const dataLines: string[] = [];
  d.forEach((item, idx) => {
    dataLines.push(...dataLinesOf(item, idx + 1));
  });

  const bodyLines = [...headerLines, ...dataLines];

  const pages: string[][] = [];

  if (bodyLines.length + footerLines.length <= FOOTER_ANCHOR_LINE) {
    const pad = Math.max(
      0,
      FOOTER_ANCHOR_LINE - bodyLines.length - footerLines.length,
    );
    pages.push([...bodyLines, ...Array(pad).fill(""), ...footerLines]);
  } else {
    const padToPage = Math.max(0, PAGE_LINES - bodyLines.length);
    pages.push([...bodyLines, ...Array(padToPage).fill("")]);
    const footerPad = Math.max(0, FOOTER_ANCHOR_LINE - footerLines.length);
    pages.push([...Array(footerPad).fill(""), ...footerLines]);
  }

  // Pisahkan antar halaman dengan form-feed (\f) agar printer fisik
  // pindah ke halaman/lembar baru dengan bersih.
  return pages.map((p) => p.join("\n")).join("\n\f\n");
};

const printQZ = async () => {
  isPrinting.value = true;
  try {
    if (!qz.websocket.isActive()) {
      try {
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
    const content = generateTxt();

    const data = [
      "\x1B\x40", // ESC @: Inisialisasi/Reset printer
      "\x1B\x43" + String.fromCharCode(66), // ESC C 66: Set panjang kertas 66 baris (11 inci)
      "\x0F", // SI: aktifkan condensed print (~17 cpi) karena lebar 136 kolom
      "\x1B\x6C\x00", // ESC l 0: Set margin kiri = 0
      { type: "raw", format: "plain", data: content },
      "\x12", // DC2: batalkan condensed print
      "\x0C", // Form Feed: Eject halaman
    ];

    await qz.print(config, data);
    showResult(
      "success",
      "Berhasil Dikirim",
      "Data berhasil dikirim ke printer.",
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
  }
};

// ── Eksekusi & Download ──
const downloadTxt = () => {
  const content = generateTxt();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice_Proforma_${nomor.replace(/\//g, "_")}.txt`;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const fetchData = async () => {
  try {
    const res = await invoiceProformaFormService.getDetail(nomor);
    header.value = res.data.data.header;
    details.value = res.data.data.details;
    isReady.value = true;
  } catch (error) {
    showResult(
      "error",
      "Gagal Memuat",
      "Gagal memuat data cetak. Silakan coba muat ulang halaman.",
    );
  }
};

onMounted(() => {
  document.title = `INV PROFORMA - ${nomor}`;
  fetchData();
});
</script>

<template>
  <div class="print-instruction" v-if="isReady">
    <div class="card-info">
      <h2 style="color: #1565c0; margin-bottom: 10px">
        🖨️ Cetak Invoice Proforma
      </h2>
      <p style="margin-bottom: 15px; color: #555">
        Pastikan aplikasi QZ Tray berjalan di background komputer.
      </p>

      <div class="instructions" style="margin-bottom: 15px">
        <label style="font-weight: bold; display: block; margin-bottom: 4px"
          >Target Printer:</label
        >
        <input
          v-model="printerName"
          type="text"
          style="
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
          "
        />
      </div>

      <div style="display: flex; gap: 10px; flex-direction: column">
        <button class="btn-download" @click="printQZ" :disabled="isPrinting">
          {{ isPrinting ? "Mengirim Data..." : "🚀 Cetak Langsung (QZ Tray)" }}
        </button>
        <button
          class="btn-download"
          style="background-color: #757575"
          @click="downloadTxt"
        >
          📥 Unduh File .txt (Cadangan)
        </button>
      </div>
    </div>
  </div>
  <div
    v-else
    style="padding: 40px; text-align: center; font-family: sans-serif"
  >
    Menyiapkan data cetak...
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
.print-instruction {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
  font-family: "Consolas", "Courier New", monospace;
}
.card-info {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 450px;
  text-align: left;
}
.instructions {
  background: #fff8e1;
  border: 1px solid #ffe082;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  color: #5d4037;
  font-size: 13px;
}
.btn-download {
  width: 100%;
  padding: 10px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-download:hover {
  background: #0d47a1;
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
</style>
