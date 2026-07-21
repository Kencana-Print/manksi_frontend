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

// ── Fungsi Terbilang (Sama seperti sebelumnya) ──
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

const numFmt = (val: any) => {
  if (!val) return "0";
  return Number(val).toLocaleString("id-ID", { maximumFractionDigits: 0 });
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

// ── UTILITAS FORMATTING TXT (80 KOLOM) ──
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

// ── Konstanta kertas dot matrix — 21cm (lebar cetak) x 27,8cm (panjang feed) ──
// Lebar cetak sudah dikalibrasi 80 kolom (10 CPI standar).
// Panjang 27,8cm ÷ 2,54 = 10,94" → pada 6 LPI (baris/inch) standar = ~65 baris.
const PAGE_LINES = 65;

// ── FUNGSI GENERATE TXT ──
const generateTxt = () => {
  const h = header.value;
  const d = details.value;
  const line = "-".repeat(80);

  // ── Bangun header (kop + judul + info) sebagai array baris ──
  const buildHeaderLines = (): string[] => {
    const lines: string[] = [];
    lines.push(h.perush_nama || "");
    lines.push(h.perushd_alamat || h.perush_alamat || "");
    lines.push(h.perush_kota || "");
    if (h.perush_telp) lines.push(`Telp: ${h.perush_telp}`);
    lines.push("");
    lines.push(padC("I N V O I C E   P R O F O R M A", 80));
    lines.push("");
    const noInv = padR(`Nomor      : ${h.inv_nomor || ""}`, 40);
    const cusNama = padR(`Customer : ${h.cus_nama || ""}`, 40);
    lines.push(`${noInv}${cusNama}`);
    const tglInv = padR(`Tanggal    : ${dFormat(h.inv_tanggal)}`, 40);
    const cusAlmt = padR(
      `           ${h.inv_cus_alamat || h.cus_alamat || ""}`,
      40,
    );
    lines.push(`${tglInv}${cusAlmt}`);
    const ketInv = padR(`Keterangan : ${h.inv_keterangan || ""}`, 40);
    const cusTelp = padR(
      `           ${h.cus_telp ? h.cus_telp + " / " : ""}${h.cus_fax || ""}`,
      40,
    );
    lines.push(`${ketInv}${cusTelp}`);
    lines.push("");
    lines.push(line);
    lines.push(
      `${padR("NO", 4)}${padR("SPK", 15)}${padR("NAMA BARANG", 23)}${padR("UKURAN", 8)}${padL("JML", 7)}${padL("HARGA", 11)}${padL("TOTAL", 12)}`,
    );
    lines.push(line);
    return lines;
  };

  // ── Bangun footer (summary + TTD) sebagai array baris ──
  const buildFooterLines = (): string[] => {
    const lines: string[] = [];
    lines.push(line);
    const lblTot =
      padR("Total", 15) + ":" + padL(numFmt(totalNominal.value), 19);
    lines.push(
      `${padR("Terbilang : " + terbilang(grandTotal.value) + " Rupiah", 45)}${lblTot}`,
    );
    const lblPpn =
      padR("Total PPN", 15) + ":" + padL(numFmt(totalPpn.value), 19);
    lines.push(`${padR("", 45)}${lblPpn}`);
    const lblGTot =
      padR("Grand Total", 15) + ":" + padL(numFmt(grandTotal.value), 19);
    lines.push(`${padR("", 45)}${lblGTot}`);
    const lblDP = padR("Uang Muka", 15) + ":" + padL(numFmt(h.uang_muka), 19);
    lines.push(`${padR("", 45)}${lblDP}`);
    const lblSisa =
      padR("Nilai Piutang", 15) + ":" + padL(numFmt(nilaiPiutang.value), 19);
    lines.push(`${padR("", 45)}${lblSisa}`);
    lines.push("");
    lines.push(
      `Di bayarkan ke:                          Dibuat oleh,         Mengetahui,`,
    );
    lines.push(`REKENING : ${padR(h.inv_rekening || "", 30)}`);
    lines.push(`ATAS NAMA: ${padR(h.perushd_atasnama || "", 30)}`);
    lines.push(`BANK     : ${padR(h.perushd_bank || "", 30)}`);
    lines.push("");
    lines.push("");
    lines.push(
      `                                         (          )         (          )`,
    );
    return lines;
  };

  const dataLineOf = (item: any, idx: number) => {
    const no = padR(String(idx + 1), 4);
    const spk = padR(item.kode || "", 15);
    const nama = padR(item.nama || "", 23);
    const ukur = padR(item.ukuran || "", 8);
    const jml = padL(numFmt(item.jumlah), 7);
    const hrg = padL(numFmt(item.harga), 11);
    const tot = padL(
      numFmt((Number(item.jumlah) || 0) * (Number(item.harga) || 0)),
      12,
    );
    return `${no}${spk}${nama}${ukur}${jml}${hrg}${tot}`;
  };

  const headerLines = buildHeaderLines();
  const footerLines = buildFooterLines();
  const dataLines = d.map((item, idx) => dataLineOf(item, idx));
  const bodyLines = [...headerLines, ...dataLines, line];

  const pages: string[][] = [];

  if (bodyLines.length + footerLines.length <= PAGE_LINES) {
    // Muat dalam satu halaman — footer langsung menyatu di bawah data.
    pages.push([...bodyLines, ...footerLines]);
  } else {
    // Data terlalu panjang: genapkan halaman ini dengan baris kosong,
    // lalu footer dimulai bersih di halaman baru (form-feed) — supaya
    // blok summary+TTD tidak pernah terpotong di tengah.
    const padToPage = Math.max(0, PAGE_LINES - bodyLines.length);
    pages.push([...bodyLines, ...Array(padToPage).fill("")]);
    pages.push([...footerLines]);
  }

  // Pisahkan antar halaman dengan form-feed (\f) agar printer fisik
  // pindah ke halaman/lembar baru dengan bersih.
  return pages.map((p) => p.join("\n")).join("\n\f\n");
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
      "\x1B\x40", // ESC @: Inisialisasi printer (reset ukuran font ke normal)
      { type: "raw", format: "plain", data: content },
      "\x0C", // Form Feed: Eject halaman
    ];

    await qz.print(config, data);
    alert("Berhasil dikirim ke printer!");
  } catch (error: any) {
    console.error("QZ Error:", error);
    alert("Gagal cetak via QZ Tray: " + error.message);
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
  // Nama file akan disesuaikan dengan nomor invoice
  link.download = `Invoice_Proforma_${nomor.replace(/\//g, "_")}.txt`;
  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const fetchData = async () => {
  try {
    const res = await invoiceProformaFormService.getDetail(nomor);
    header.value = res.data.data.header;
    details.value = res.data.data.details;
    isReady.value = true;

    // HAPUS setTimeout untuk downloadTxt() di sini
  } catch (error) {
    alert("Gagal memuat data cetak.");
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
</template>

<style scoped>
.print-instruction {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
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
</style>
