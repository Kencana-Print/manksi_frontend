<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invoiceProformaFormService } from "@/services/penjualan/invoiceProformaFormService";
import qz from "qz-tray";

const route = useRoute();
const nomor = route.params.nomor as string;
const printerName = ref("192.168.1.41");
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

const dFormat = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ── Kalkulasi Total ──
const totalNominal = computed(() =>
  details.value.reduce(
    (sum, d) => sum + (Number(d.jumlah) || 0) * (Number(d.harga) || 0),
    0,
  ),
);
const totalPpn = computed(() =>
  header.value.inv_sts_ppn === 1
    ? totalNominal.value * ((Number(header.value.inv_ppn) || 0) / 100)
    : 0,
);
const grandTotal = computed(() => totalNominal.value + totalPpn.value);
const nilaiPiutang = computed(
  () => grandTotal.value - (Number(header.value.uang_muka) || 0),
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
// continuous-form 15" di 10 CPI ≈ 136 kolom.
const PAGE_WIDTH = 136;
// Panjang 27,8cm ÷ 2,54 = 10,94" → pada 6 LPI (baris/inch) standar = ~65 baris.
const PAGE_LINES = 65;

// ✅ Garis solid (bukan putus-putus)
const LINE = "_".repeat(PAGE_WIDTH);

// Lebar kolom footer (Di bayarkan ke / Dibuat oleh / Mengetahui) —
// disamakan dengan InvoicePrintView biar TTD gak mepet ke rekening.
const COL_BAYAR = 58;
const COL_TTD1 = 39;
const COL_TTD2 = 39; // 58+39+39 = 136

// ── FUNGSI GENERATE TXT ──
const generateTxt = () => {
  const h = header.value;
  const d = details.value;

  // ── Bangun header (kop + judul + info) sebagai array baris ──
  const buildHeaderLines = (): string[] => {
    const halfL = 67;
    const halfR = 68; // halfL + 1(spasi) + halfR = 136
    const cAlamat = h.inv_cus_alamat || h.cus_alamat || "";
    const alamatLines = wrapText(cAlamat, halfR - 12);

    const lines: string[] = [];
    lines.push(padR(h.perush_nama || "", PAGE_WIDTH));
    lines.push(padR(h.perushd_alamat || h.perush_alamat || "", PAGE_WIDTH));
    // ✅ Nomor telepon perusahaan di-hide dari cetakan
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
    // ✅ Nomor telp/fax customer di-hide dari cetakan
    lines.push(LINE);
    lines.push(
      `${padR("No", 3)} ${padR("SPK", 16)} ${padR("Nama", 46)} ${padR("Ukuran", 22)} ${padL("Jumlah", 12)} ${padL("Harga", 16)} ${padL("Total", 16)}`,
    );
    lines.push(LINE);
    return lines;
  };

  // ── Bangun footer (summary + TTD) sebagai array baris ──
  const buildFooterLines = (): string[] => {
    const lines: string[] = [];
    lines.push(LINE);
    // ✅ Terbilang huruf kapital semua
    const TERBILANG = (terbilang(grandTotal.value) + " Rupiah").toUpperCase();
    const tb1 = TERBILANG.substring(0, 48);
    const tb2 = TERBILANG.length > 48 ? TERBILANG.substring(48, 96) : "";
    lines.push(
      `${padR("Terbilang : " + tb1, 95)} ${padR("Total", 14)}: ${padL(numFmt(totalNominal.value), 20)}`,
    );
    lines.push(
      `${padR(tb2, 95)} ${padR("Total PPN", 14)}: ${padL(numFmt(totalPpn.value), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Grand Total", 14)}: ${padL(numFmt(grandTotal.value), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Uang Muka", 14)}: ${padL(numFmt(h.uang_muka), 20)}`,
    );
    lines.push(
      `${padR("", 95)} ${padR("Nilai Piutang", 14)}: ${padL(numFmt(nilaiPiutang.value), 20)}`,
    );
    lines.push("");
    // ✅ Kolom digeser sama seperti Invoice: TTD gak nempel ke rekening
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

  const dataLineOf = (item: any, idx: number) =>
    `${padR(String(idx + 1), 3)} ${padR(item.kode || "", 16)} ${padR(item.nama || "", 46)} ${padR(item.ukuran || "", 22)} ${padL(numFmt(item.jumlah), 12)} ${padL(numFmt(item.harga), 16)} ${padL(numFmt((Number(item.jumlah) || 0) * (Number(item.harga) || 0)), 16)}`;

  const headerLines = buildHeaderLines();
  const footerLines = buildFooterLines();
  const dataLines = d.map((item, idx) => dataLineOf(item, idx));
  const bodyLines = [...headerLines, ...dataLines, LINE];

  const pages: string[][] = [];

  if (bodyLines.length + footerLines.length <= PAGE_LINES) {
    // ✅ FIX: blank lines disisipin SEBELUM footer (bukan langsung
    // nempel), jadi terbilang/total/TTD selalu jatuh persis di baris
    // terakhir halaman fisik — meski barangnya cuma dikit.
    const pad = Math.max(0, PAGE_LINES - bodyLines.length - footerLines.length);
    pages.push([...bodyLines, ...Array(pad).fill(""), ...footerLines]);
  } else {
    // Data terlalu panjang: genapkan halaman ini dengan baris kosong,
    // lalu footer dimulai bersih di halaman baru (form-feed) — tetap
    // didorong ke bawah halaman itu juga.
    const padToPage = Math.max(0, PAGE_LINES - bodyLines.length);
    pages.push([...bodyLines, ...Array(padToPage).fill("")]);
    const footerPad = Math.max(0, PAGE_LINES - footerLines.length);
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
      "\x1B\x40",
      "\x1B\x6C\x00",
      { type: "raw", format: "plain", data: content },
      "\x0C",
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
