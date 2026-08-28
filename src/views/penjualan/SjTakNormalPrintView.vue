<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { sjTakNormalFormService as svc } from "@/services/penjualan/sjTakNormalFormService";
import qz from "qz-tray";

const route = useRoute();
const authStore = useAuthStore();
const nomor = route.query.nomor as string;
const mode = route.query.mode as string; // "dotmatrix" | undefined (inkjet)

const printerName = ref("EPSON LX-310 ESC/P");
const isPrinting = ref(false);

// ── Dialog hasil aksi (pengganti alert(), pola sama SJ normal) ──
const resultDialog = ref<{
  show: boolean;
  type: "success" | "error";
  title: string;
  message: string;
}>({ show: false, type: "success", title: "", message: "" });
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

const header = ref<any>({});
const detail = ref<any[]>([]);
const totalJumlah = ref(0);

const printedAtDisplay = ref(
  (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  })(),
);
const printedByDisplay = computed(
  () => authStore.user?.nama || authStore.user?.kode || "-",
);

const isReady = ref(false);
const isLoading = ref(true);
const doPrint = () => window.print();
const doClose = () => window.close();

// ✅ Formatter angka konsisten (sama seperti SJ normal, hindari
// toLocaleString yang bisa fallback koma di server tanpa full-ICU)
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
    if (cnt % 3 === 0 && i !== 0) out = "." + out;
  }
  if (decPart) out += "," + decPart;
  return (neg ? "-" : "") + out;
};

const rowsPerPage = 10;
const paginatedDetails = computed(() => {
  const arr = detail.value || [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += rowsPerPage) {
    chunks.push(arr.slice(i, i + rowsPerPage));
  }
  return chunks.length > 0 ? chunks : [[]];
});

// ══════════════════════════════════════════════════════════
// DOT MATRIX (sama pola persis dengan SuratJalanPrintView)
// ══════════════════════════════════════════════════════════
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

const PAGE_WIDTH = 136;
const NAMA_W = 50;
const KET_W = 26;
const MAX_DATA_ROWS_PER_PAGE = 7;
const LINE = "_".repeat(PAGE_WIDTH);

const generateTxt = () => {
  const h = header.value;
  const rows = detail.value;
  const halfL = 67;
  const halfR = 68;

  const buildHeaderLines = (): string[] => {
    const lines: string[] = [];
    lines.push(padR(h.perush_nama || "", PAGE_WIDTH));
    lines.push(padR(h.perush_alamat || "", PAGE_WIDTH));
    lines.push(padR(h.perush_telp || "", PAGE_WIDTH));
    lines.push(padC("S U R A T   J A L A N", PAGE_WIDTH));

    const kotaCustomer = h.sj_kota_customer || h.cus_kota || "";
    const baseAlamat = h.sj_alamat_customer || h.cus_alamat || "";
    const alamatFull = kotaCustomer
      ? `${baseAlamat} - ${kotaCustomer}`
      : baseAlamat;
    const alamatLines = wrapText(alamatFull, halfR);

    lines.push(
      `${padR("Nomor      : " + (h.sj_nomor || ""), halfL)} ${padR("Customer : " + (h.cus_nama || ""), halfR)}`,
    );
    lines.push(
      `${padR("Tanggal    : " + (h.sj_tanggal_fmt || "").replace(/-/g, "/"), halfL)} ${padR(alamatLines[0] || "", halfR)}`,
    );
    lines.push(
      `${padR("Keterangan : " + (h.sj_keterangan || ""), halfL)} ${padR(alamatLines[1] || "", halfR)}`,
    );
    for (let i = 2; i < alamatLines.length; i++) {
      lines.push(`${padR("", halfL)} ${padR(alamatLines[i], halfR)}`);
    }
    lines.push(LINE);
    lines.push(
      `${padR("No", 3)} ${padR("SPK", 12)} ${padR("Nama", NAMA_W)} ${padR("Ukuran", 20)} ${padL("Jumlah", 10)} ${padL("Koli", 9)} ${padR("Keterangan", KET_W)}`,
    );
    lines.push(LINE);
    return lines;
  };

  const buildFooterLines = (): string[] => {
    const totalJml = rows.reduce(
      (s: number, r: any) => s + Number(r.sjd_jumlah || 0),
      0,
    );
    const FAX_NO = h.perush_fax || h.perush_telp || "";
    const EMAIL = h.perush_email || "";
    const lines: string[] = [];
    lines.push(LINE);
    lines.push(
      padR(
        "MOHON SURAT JALAN INI DITANDATANGANI, DISTEMPEL, DAN DI FAX KE " +
          FAX_NO,
        PAGE_WIDTH,
      ),
    );
    lines.push(
      `${padR(EMAIL ? "ATAU EMAIL DI " + EMAIL : "", PAGE_WIDTH - 24)}${padL("Total Jumlah: " + num(totalJml), 24)}`,
    );
    lines.push("");
    lines.push(
      `${padR("Dibuat Oleh,", 27)} ${padR("Disiapkan Oleh,", 27)} ${padR("Kepala Gudang,", 27)} ${padR("Pengantar,", 27)} ${padR("Diterima Oleh,", 27)}`,
    );
    lines.push("");
    lines.push("");
    lines.push(
      `${padR("(               )", 27)} ${padR("(               )", 27)} ${padR("(               )", 27)} ${padR("(               )", 27)} ${padR("(               )", 27)}`,
    );
    return lines;
  };

  // GANTI dataLineOf yang lama, dan bagian chunking di bawahnya:

  const headerLines = buildHeaderLines();
  const footerLines = buildFooterLines();

  // 1. Uraikan data jadi baris fisik, termasuk wrapping nama yang panjang
  //    (persis pola SJ Normal — nama kepanjangan dipecah jadi baris tambahan)
  const allPhysicalRows: string[] = [];
  let currentRowNo = 1;

  for (const r of rows) {
    const namaFull = (r.nama_barang || "").trim();
    const namaLines = wrapText(namaFull, NAMA_W);

    allPhysicalRows.push(
      `${padR(String(currentRowNo), 3)} ${padR(r.sjd_spk_nomor || "", 12)} ${padR(namaLines[0], NAMA_W)} ${padR(r.sjd_ukuran || "", 20)} ${padL(num(r.sjd_jumlah), 10)} ${padL(num(r.sjd_koli), 9)} ${padR(r.sjd_keterangan || "", KET_W)}`,
    );
    for (let i = 1; i < namaLines.length; i++) {
      allPhysicalRows.push(
        `${padR("", 3)} ${padR("", 12)} ${padR(namaLines[i], NAMA_W)} ${padR("", 20)} ${padL("", 10)} ${padL("", 9)} ${padR("", KET_W)}`,
      );
    }
    currentRowNo++;
  }

  // 2. Chunking berdasarkan baris fisik (bukan jumlah baris data mentah),
  //    biar kapasitas 7 baris per halaman tetap akurat walau ada wrapping
  const chunks: string[][] = [];
  for (let i = 0; i < allPhysicalRows.length; i += MAX_DATA_ROWS_PER_PAGE) {
    chunks.push(allPhysicalRows.slice(i, i + MAX_DATA_ROWS_PER_PAGE));
  }
  if (chunks.length === 0) chunks.push([]);

  const allPages: string[][] = [];
  chunks.forEach((chunkLines, ci) => {
    const isLastChunk = ci === chunks.length - 1;
    const paddedData = isLastChunk
      ? chunkLines
      : [
          ...chunkLines,
          ...Array(
            Math.max(0, MAX_DATA_ROWS_PER_PAGE - chunkLines.length),
          ).fill(""),
        ];
    allPages.push([...headerLines, ...paddedData, ...footerLines]);
  });

  return allPages.map((p) => p.join("\n")).join("\n\f");
};

const downloadTxt = () => {
  const content = generateTxt();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SJTakNormal_${nomor.replace(/\//g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
      "\x1B\x4F",
      "\x1B\x43\x21",
      { type: "raw", format: "plain", data: content },
      "\x0C",
    ];
    await qz.print(config, data);
    showResult(
      "success",
      "Berhasil Dikirim",
      `Data berhasil dikirim ke printer Surat Jalan Tak Normal.`,
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

const fetchData = async () => {
  try {
    const res = await svc.getDataCetak(nomor);
    const d = res.data.data;
    header.value = d.header;
    detail.value = d.detail;
    totalJumlah.value = d.totalJumlah;
    isReady.value = true;
    if (mode === "dotmatrix") {
      // Tidak melakukan apa-apa, tunggu user klik tombol cetak
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
  document.title = `Surat Jalan Tak Normal - ${nomor}`;
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
      <h2>Cetak Surat Jalan Tak Normal Dot Matrix</h2>
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
          >Surat Jalan Tak Normal — {{ nomor }}</span
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
        <div class="page-frame">
          <div class="page-content">
            <div class="header-section">
              <div class="kop-left">
                <div class="kop-nama">{{ header.perush_nama }}</div>
                <div class="kop-sub">{{ header.perush_alamat }}</div>
                <div
                  class="kop-sub"
                  v-if="header.perush_telp || header.perush_fax"
                >
                  {{ header.perush_telp
                  }}<span v-if="header.perush_telp && header.perush_fax">/</span
                  >{{ header.perush_fax }}
                </div>
              </div>
            </div>
            <div class="doc-title">S U R A T &nbsp; J A L A N</div>
            <div class="title-row">
              <table class="info-tbl">
                <tr>
                  <td class="lbl">Nomor</td>
                  <td>: {{ header.sj_nomor }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tanggal</td>
                  <td>: {{ header.sj_tanggal_fmt }}</td>
                </tr>
                <tr>
                  <td class="lbl">Keterangan</td>
                  <td>: {{ header.sj_keterangan }}</td>
                </tr>
              </table>
              <div class="cus-box">
                <div class="page-indicator">
                  Page: {{ pi + 1 }}/{{ paginatedDetails.length }}
                </div>
                <div class="cus-line">
                  <b>Customer :</b> {{ header.cus_nama }}
                </div>
                <div class="cus-alamat">
                  {{ header.sj_alamat_customer || header.cus_alamat }}
                </div>
                <div class="cus-alamat">
                  {{ header.sj_kota_customer || header.cus_kota }}
                </div>
              </div>
            </div>
            <table class="dtbl">
              <thead>
                <tr>
                  <th style="width: 28px; text-align: center">No.</th>
                  <th style="width: 110px">Spk</th>
                  <th>Nama</th>
                  <th style="width: 90px">Ukuran</th>
                  <th style="width: 55px; text-align: right">Jml</th>
                  <th style="width: 50px; text-align: right">Koli</th>
                  <th style="min-width: 120px">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in pageRows" :key="i">
                  <td style="text-align: center">
                    {{ pi * rowsPerPage + i + 1 }}
                  </td>
                  <td>{{ r.sjd_spk_nomor }}</td>
                  <td>{{ r.nama_barang }}</td>
                  <td>{{ r.sjd_ukuran }}</td>
                  <td style="text-align: right">{{ num(r.sjd_jumlah) }}</td>
                  <td style="text-align: right">{{ num(r.sjd_koli) }}</td>
                  <td>{{ r.sjd_keterangan }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="page-footer">
            <div class="foot-divider"></div>
            <div
              v-if="pi === paginatedDetails.length - 1"
              class="foot-note-row"
            >
              <div class="foot-note">
                MOHON SURAT JALAN INI DITANDATANGANI, DISTEMPEL, DAN DI FAX KE
                {{ header.perush_fax || header.perush_telp
                }}<br v-if="header.perush_email" />
                <template v-if="header.perush_email">
                  ATAU EMAIL DI {{ header.perush_email }}
                </template>
              </div>
              <div class="foot-total">Total Jumlah: {{ num(totalJumlah) }}</div>
            </div>
            <div v-if="pi === paginatedDetails.length - 1" class="ttd-row">
              <span>Dibuat Oleh,</span>
              <span>Disiapkan Oleh,</span>
              <span>Kepala Gudang,</span>
              <span>Pengantar,</span>
              <span>Diterima Oleh,</span>
            </div>
            <div
              v-if="pi === paginatedDetails.length - 1"
              class="ttd-space"
            ></div>
            <div
              v-if="pi === paginatedDetails.length - 1"
              class="ttd-row ttd-paren"
            >
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
              <span>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Dialog hasil aksi (pengganti alert()) -->
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
/* ── DOT MATRIX UI (identik SJ normal) ── */
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
/* ── Result Dialog ── */
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

/* ── INKJET PRINT — TIDAK BERUBAH dari sebelumnya ── */
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
.page {
  width: 297mm;
  min-height: 210mm;
  background: white;
  margin: 10px auto;
  box-sizing: border-box;
  border: 1px solid #ccc;
  page-break-after: always;
}
.page-frame {
  margin: 8mm;
  border: 2px solid #b8860b;
  padding: 6mm 8mm;
  font-family: "Courier New", monospace;
  font-size: 10pt;
  color: #000;
  display: flex;
  flex-direction: column;
  min-height: calc(210mm - 16mm - 12mm);
}
.page-content {
  flex: 1;
}
.header-section {
  margin-bottom: 4px;
}
.kop-nama {
  font-weight: 700;
}
.kop-sub {
  font-size: 10pt;
}
.doc-title {
  text-align: center;
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: 0.15em;
  margin: 6px 0 10px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}
.info-tbl {
  border-collapse: collapse;
  font-size: 10pt;
  flex-shrink: 0;
}
.info-tbl td {
  padding: 0 4px 2px 0;
  vertical-align: top;
}
.info-tbl .lbl {
  width: 65px;
  white-space: nowrap;
}
.cus-box {
  font-size: 10pt;
  max-width: 55%;
  min-width: 0;
  text-align: right;
}
.cus-line {
  word-wrap: break-word;
}
.cus-alamat {
  line-height: 1.4;
  word-wrap: break-word;
}
.page-indicator {
  font-size: 9pt;
  text-align: right;
  margin-bottom: 2px;
}
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  margin-bottom: 12px;
}
.dtbl th {
  border-top: 1px solid #000;
  border-bottom: 2px solid #000;
  padding: 4px 6px;
  font-weight: 700;
  text-align: left;
}
.dtbl td {
  padding: 4px 6px;
  border-bottom: none;
  vertical-align: top;
}
.page-footer {
  flex-shrink: 0;
}
.foot-divider {
  border-top: 1px solid #000;
  margin-bottom: 6px;
}
.foot-note-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 9.5pt;
  margin-bottom: 14px;
}
.foot-note {
  line-height: 1.5;
}
.foot-total {
  font-weight: 700;
  white-space: nowrap;
}
.ttd-row {
  display: flex;
  justify-content: space-between;
  font-size: 10pt;
}
.ttd-row span {
  flex: 1;
  text-align: left;
}
.ttd-space {
  height: 45px;
}
.ttd-paren {
  font-size: 10pt;
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
    size: 297mm 210mm;
    margin: 0;
  }
  .page {
    width: 297mm;
    min-height: 210mm;
    border: none;
    margin: 0;
    box-shadow: none;
    page-break-after: always;
  }
}
</style>
