<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { invoiceProformaFormService } from "@/services/penjualan/invoiceProformaFormService";

const route = useRoute();
const nomor = route.params.nomor as string;

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

// ── FUNGSI GENERATE TXT ──
const generateTxt = () => {
  const h = header.value;
  const d = details.value;
  const line = "-".repeat(80);
  const empty = " ".repeat(80);
  let txt = "";

  // 1. KOP PERUSAHAAN
  txt += `${h.perush_nama || ""}\n`;
  txt += `${h.perushd_alamat || h.perush_alamat || ""}\n`;
  txt += `${h.perush_kota || ""}\n`;
  if (h.perush_telp) txt += `Telp: ${h.perush_telp}\n`;
  txt += `\n`;

  // 2. JUDUL
  txt += `${padC("I N V O I C E   P R O F O R M A", 80)}\n\n`;

  // 3. HEADER INFO (Kiri 40 char, Kanan 40 char)
  const noInv = padR(`Nomor      : ${h.inv_nomor || ""}`, 40);
  const cusNama = padR(`Customer : ${h.cus_nama || ""}`, 40);
  txt += `${noInv}${cusNama}\n`;

  const tglInv = padR(`Tanggal    : ${dFormat(h.inv_tanggal)}`, 40);
  const cusAlmt = padR(
    `           ${h.inv_cus_alamat || h.cus_alamat || ""}`,
    40,
  );
  txt += `${tglInv}${cusAlmt}\n`;

  const ketInv = padR(`Keterangan : ${h.inv_keterangan || ""}`, 40);
  const cusTelp = padR(
    `           ${h.cus_telp ? h.cus_telp + " / " : ""}${h.cus_fax || ""}`,
    40,
  );
  txt += `${ketInv}${cusTelp}\n\n`;

  // 4. TABEL BARANG (Total 80 char)
  // No(4) SPK(15) Nama(23) Ukuran(8) Jml(7) Harga(11) Total(12)
  txt += `${line}\n`;
  txt += `${padR("NO", 4)}${padR("SPK", 15)}${padR("NAMA BARANG", 23)}${padR("UKURAN", 8)}${padL("JML", 7)}${padL("HARGA", 11)}${padL("TOTAL", 12)}\n`;
  txt += `${line}\n`;

  d.forEach((item, idx) => {
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
    txt += `${no}${spk}${nama}${ukur}${jml}${hrg}${tot}\n`;
  });
  txt += `${line}\n`;

  // 5. KAKI / SUMMARY
  // Kiri Terbilang (45 char), Kanan Summary (35 char)
  const lblTot = padR("Total", 15) + ":" + padL(numFmt(totalNominal.value), 19);
  txt += `${padR("Terbilang : " + terbilang(grandTotal.value) + " Rupiah", 45)}${lblTot}\n`;

  const lblPpn = padR("Total PPN", 15) + ":" + padL(numFmt(totalPpn.value), 19);
  txt += `${padR("", 45)}${lblPpn}\n`;

  const lblGTot =
    padR("Grand Total", 15) + ":" + padL(numFmt(grandTotal.value), 19);
  txt += `${padR("", 45)}${lblGTot}\n`;

  const lblDP = padR("Uang Muka", 15) + ":" + padL(numFmt(h.uang_muka), 19);
  txt += `${padR("", 45)}${lblDP}\n`;

  const lblSisa =
    padR("Nilai Piutang", 15) + ":" + padL(numFmt(nilaiPiutang.value), 19);
  txt += `${padR("", 45)}${lblSisa}\n\n`;

  // 6. TANDA TANGAN
  txt += `Di bayarkan ke:                          Dibuat oleh,         Mengetahui,\n`;
  txt += `REKENING : ${padR(h.inv_rekening || "", 30)}\n`;
  txt += `ATAS NAMA: ${padR(h.perushd_atasnama || "", 30)}\n`;
  txt += `BANK     : ${padR(h.perushd_bank || "", 30)}\n`;
  txt += `\n\n\n`;
  txt += `                                         (          )         (          )\n`;

  return txt;
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

    // Auto download text file
    setTimeout(() => {
      downloadTxt();
    }, 500);
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
        ✅ File Teks Berhasil Disiapkan
      </h2>
      <p style="margin-bottom: 15px; color: #555">
        File invoice telah diunduh dengan nama: <br />
        <strong>Invoice_Proforma_{{ nomor.replace(/\//g, "_") }}.txt</strong>
      </p>

      <div class="instructions">
        <strong>Cara Cetak ke Dot-Matrix:</strong>
        <ol style="margin-top: 8px; margin-left: 20px; line-height: 1.6">
          <li>Buka file <b>.txt</b> yang baru saja terunduh.</li>
          <li>File akan terbuka di aplikasi <b>Notepad</b>.</li>
          <li>Tekan <b>Ctrl + P</b> (atau klik File > Print).</li>
          <li>Pilih printer Dot-Matrix Anda (Epson LX-310 / LQ-2190).</li>
          <li>Klik <b>Print</b>. Printer akan mencetak dengan cepat.</li>
        </ol>
      </div>

      <button class="btn-download" @click="downloadTxt">
        📥 Unduh Ulang File .txt
      </button>
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
