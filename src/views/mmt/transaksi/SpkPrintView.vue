<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/services/api";
import { format, parseISO } from "date-fns";

interface AlokasiItem {
  Alokasi: string;
  Jumlah: number;
}

interface SpkData {
  SPK: string;
  PO?: string;
  Nama: string;
  Tanggal: string;
  Jumlah: number;
  Ukuran: string;
  Bahan: string;
  Gramasi: string;
  Finishing?: string;
  Deadline?: string;
  Workshop?: string;
  StatusClient?: string;
  Alokasi?: string;
  Daftar_Alokasi?: AlokasiItem[];
  Pesan?: string;
  Tipe_SPK: string;
  Ngedit: string;
  Design_Image?: string;
  QR_Data?: string;
  Created?: string;
  Kepentingan?: string;
  MO?: string;
  CMO?: string;
}

const route = useRoute();
const router = useRouter();
const printData = ref<SpkData | null>(null);
const isLoading = ref(true);

// State kontrol untuk pop-up konfirmasi alokasi
const showAlokasiDialog = ref(false);
const forceHideAlokasi = ref(false); // Mengabaikan tampilan alokasi jika user memilih "TIDAK"

// Melacak status pemuatan gambar utama
const isImageLoaded = ref(false);

const handleImageLoad = () => {
  isImageLoaded.value = true;
};

const handleImageError = (e: any) => {
  e.target.src = "https://via.placeholder.com/180x150?text=No+Image";
  isImageLoaded.value = true;
};

const getAssetUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `/file-gambar/${path}`;
};

const formatDateSafe = (
  dateString: string | undefined,
  formatStr: string = "dd MMM yyyy",
) => {
  if (!dateString) return "-";
  try {
    const date = dateString.includes("T")
      ? parseISO(dateString)
      : new Date(dateString);
    return isNaN(date.getTime()) ? "-" : format(date, formatStr);
  } catch (e) {
    return "-";
  }
};

const getTotalAlokasi = (items: AlokasiItem[] | undefined) => {
  if (!items || items.length === 0) return printData.value?.Jumlah || 0;
  return items.reduce((sum, item) => sum + Number(item.Jumlah || 0), 0);
};

const fetchPrintData = async (nomor: string) => {
  try {
    const response = await api.get(`/mmt/spk/print/${nomor}`);
    const data = response.data;

    if (data.Ngedit !== "ACC" && data.Ngedit !== "") {
      alert(`SPK ${nomor} belum di-ACC, tidak dapat dicetak.`);
      router.back();
      return;
    }

    printData.value = data;
    document.title = `SPK - ${data.SPK}`;

    // LOGIKA POP-UP: Jika data memiliki alokasi, munculkan dialog pilihan dulu
    if (data.Alokasi === "YA" || data.Alokasi === "Y") {
      showAlokasiDialog.value = true;
    }
  } catch (error) {
    console.error("Error fetching SPK print data:", error);
    alert("Gagal memuat data SPK.");
    router.back();
  } finally {
    isLoading.value = false;
  }
};

// Fungsi pemicu printer setelah user menentukan pilihan di Pop-up
const triggerPrintWindow = () => {
  nextTick(() => {
    setTimeout(() => {
      window.print();
    }, 500);
  });
};

// Pilihan 1: User memilih cetak DENGAN alokasi
const chooseWithAlokasi = () => {
  showAlokasiDialog.value = false;
  forceHideAlokasi.value = false;
  triggerPrintWindow();
};

// Pilihan 2: User memilih cetak TANPA alokasi (Sistem otomatis beralih ke mode Double Kiri-Kanan)
const chooseWithoutAlokasi = () => {
  showAlokasiDialog.value = false;
  forceHideAlokasi.value = true; // Paksa sistem membaca seolah-olah tanpa alokasi
  triggerPrintWindow();
};

// Watcher dimodifikasi agar tidak langsung nge-print jika dialog alokasi sedang aktif
watch([isLoading, isImageLoaded], ([newLoading, newImgLoaded]) => {
  if (newLoading === false && newImgLoaded === true && printData.value) {
    // Jika tidak ada alokasi sama sekali, langsung print mode double seperti biasa
    if (printData.value.Alokasi !== "YA" && printData.value.Alokasi !== "Y") {
      triggerPrintWindow();
    }
  }
});

onMounted(() => {
  const nomor = route.params.nomor as string;
  if (nomor) fetchPrintData(nomor);
});
</script>

<template>
  <div class="print-container">
    <div class="no-print floating-action" v-if="!isLoading">
      <v-btn color="grey" @click="router.back()" class="ml-2">Kembali</v-btn>
    </div>

    <v-dialog
      v-model="showAlokasiDialog"
      max-width="400"
      persistent
      class="no-print"
    >
      <v-card>
        <v-card-title class="text-h6 justify-center d-flex pt-4">
          Konfirmasi Cetak SPK
        </v-card-title>
        <v-card-text class="text-center text-body-1 py-4">
          SPK ini memiliki data alokasi pengiriman.<br />
          Apakah Anda ingin mencetak <strong>Dengan Alokasi</strong>?
        </v-card-text>
        <v-card-actions class="justify-center pb-4 gap-4">
          <v-btn color="primary" variant="elevated" @click="chooseWithAlokasi">
            YA (Dengan Alokasi)
          </v-btn>
          <v-btn color="error" variant="outlined" @click="chooseWithoutAlokasi">
            TIDAK (Tanpa Alokasi)
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div v-if="printData">
      <div
        v-if="
          (printData.Alokasi === 'YA' || printData.Alokasi === 'Y') &&
          !forceHideAlokasi
        "
        class="page-wrapper-alokasi"
      >
        <div class="left-content-block">
          <header class="header-section">
            <div class="title-group">
              <h1 class="main-title">SURAT PERINTAH KERJA</h1>
              <div class="po-number">PO : {{ printData.PO || "-" }}</div>
            </div>
          </header>

          <div class="sub-header-info">
            <div
              class="urgent-tag"
              v-if="
                printData.Kepentingan === 'TOP URGENT' ||
                printData.Kepentingan === 'URGENT'
              "
            >
              {{ printData.Kepentingan }}
            </div>
            <div class="type-tag">
              Tipe SPK : <span>{{ printData.Tipe_SPK || "Medium" }}</span>
            </div>
          </div>

          <main class="content-section">
            <table class="details-table">
              <tr>
                <td class="label">Nomor SPK</td>
                <td>: {{ printData.SPK }}</td>
              </tr>
              <tr>
                <td class="label">Tanggal SPK</td>
                <td>: {{ formatDateSafe(printData.Tanggal) }}</td>
              </tr>
              <tr>
                <td class="label">Jenis Order</td>
                <td>: MMT OUTDOOR</td>
              </tr>
              <tr>
                <td class="label">Nama Desain</td>
                <td>: {{ printData.Nama }}</td>
              </tr>
              <tr>
                <td class="label">Jumlah</td>
                <td>: {{ printData.Jumlah?.toLocaleString("id-ID") }}</td>
              </tr>
              <tr>
                <td class="label">Ukuran</td>
                <td>: {{ printData.Ukuran }}</td>
              </tr>
              <tr>
                <td class="label">Bahan</td>
                <td>: {{ printData.Bahan }}</td>
              </tr>
              <tr>
                <td class="label">Gramasi</td>
                <td>: {{ printData.Gramasi || "-" }}</td>
              </tr>
              <tr>
                <td class="label">Finishing</td>
                <td>: {{ printData.Finishing || "-" }}</td>
              </tr>
              <tr>
                <td class="label">Date Line</td>
                <td>: {{ formatDateSafe(printData.Deadline) }}</td>
              </tr>
              <tr>
                <td class="label">Workshop</td>
                <td>: {{ printData.Workshop || "P05 (MMT)" }}</td>
              </tr>
              <tr>
                <td class="label">Status Client</td>
                <td>
                  :
                  <span class="highlight-bg">{{
                    printData.StatusClient || "PERFECT"
                  }}</span>
                </td>
              </tr>
              <tr>
                <td class="label">Alokasi</td>
                <td>: YA</td>
              </tr>
              <tr>
                <td class="label">Keterangan</td>
                <td class="val-notes">
                  :
                  <span class="notes-content">{{
                    printData.Pesan || "-"
                  }}</span>
                </td>
              </tr>
            </table>
          </main>
        </div>

        <div class="right-content-block">
          <div class="alokasi-title">ALOKASI PENGIRIMAN :</div>
          <div class="alokasi-table-wrapper">
            <table class="alokasi-table">
              <thead>
                <tr>
                  <th>Alokasi</th>
                  <th style="width: 80px; text-align: right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-if="
                    printData.Daftar_Alokasi &&
                    printData.Daftar_Alokasi.length > 0
                  "
                >
                  <tr v-for="(alk, idx) in printData.Daftar_Alokasi" :key="idx">
                    <td class="text-uppercase">{{ alk.Alokasi || "-" }}</td>
                    <td style="text-align: right">
                      {{ alk.Jumlah?.toLocaleString("id-ID") }}
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr>
                    <td style="color: #666; font-style: italic">
                      TERLAMPIR (Lihat Keterangan)
                    </td>
                    <td style="text-align: right">
                      {{ printData.Jumlah?.toLocaleString("id-ID") }}
                    </td>
                  </tr>
                </template>

                <tr class="font-weight-bold total-row">
                  <td>Total</td>
                  <td style="text-align: right">
                    {{
                      getTotalAlokasi(printData.Daftar_Alokasi).toLocaleString(
                        "id-ID",
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="absolute-footer-wrapper">
          <div class="footer-block">
            <div class="design-preview-container">
              <img
                :src="
                  printData.Design_Image
                    ? getAssetUrl(printData.Design_Image)
                    : getAssetUrl(`${printData.SPK}.jpg`)
                "
                class="design-image"
                @load="handleImageLoad"
                @error="handleImageError"
              />
            </div>
            <div class="validation-container">
              <table class="approval-table">
                <thead>
                  <tr>
                    <th>MO</th>
                    <th>CMO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="sign-cell">
                      <img
                        v-if="printData.MO"
                        :src="getAssetUrl(`${printData.MO}.jpg`)"
                        class="signature-img"
                        @error="
                          (e: any) => (e.target.style.visibility = 'hidden')
                        "
                      />
                      <div class="signer-name">{{ printData.MO || "N/A" }}</div>
                    </td>
                    <td class="sign-cell">
                      <img
                        v-if="printData.CMO"
                        :src="getAssetUrl(`${printData.CMO}.jpg`)"
                        class="signature-img"
                        @error="
                          (e: any) => (e.target.style.visibility = 'hidden')
                        "
                      />
                      <div class="signer-name">{{ printData.CMO || "NO" }}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="qr-wrapper">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(printData.QR_Data || printData.SPK)}`"
                  alt="QR Validation"
                  class="qr-code-img"
                />
              </div>
            </div>
          </div>
          <div class="print-meta-text">
            Dibuat Oleh: {{ printData.Created || "-" }} |
            {{ format(new Date(), "dd-MM-yyyy HH:mm:ss") }}
          </div>
        </div>
      </div>

      <div v-else class="page-wrapper-double">
        <div class="spk-card-double" v-for="i in 2" :key="i">
          <header class="header-section">
            <div class="title-group">
              <h1 class="main-title">SURAT PERINTAH KERJA</h1>
              <div class="po-number">PO : {{ printData.PO || "-" }}</div>
            </div>
          </header>

          <div class="sub-header-info-double">
            <div
              class="urgent-tag"
              v-if="
                printData.Kepentingan === 'TOP URGENT' ||
                printData.Kepentingan === 'URGENT'
              "
            >
              {{ printData.Kepentingan }}
            </div>
            <div class="type-tag">
              Tipe SPK : <span>{{ printData.Tipe_SPK || "Medium" }}</span>
            </div>
          </div>

          <main class="content-section">
            <table class="details-table">
              <tr>
                <td class="label">Nomor SPK</td>
                <td>: {{ printData.SPK }}</td>
              </tr>
              <tr>
                <td class="label">Tanggal SPK</td>
                <td>: {{ formatDateSafe(printData.Tanggal) }}</td>
              </tr>
              <tr>
                <td class="label">Jenis Order</td>
                <td>: MMT OUTDOOR</td>
              </tr>
              <tr>
                <td class="label">Nama Desain</td>
                <td>: {{ printData.Nama }}</td>
              </tr>
              <tr>
                <td class="label">Jumlah</td>
                <td>: {{ printData.Jumlah }}</td>
              </tr>
              <tr>
                <td class="label">Ukuran</td>
                <td>: {{ printData.Ukuran }}</td>
              </tr>
              <tr>
                <td class="label">Bahan</td>
                <td>: {{ printData.Bahan }}</td>
              </tr>
              <tr>
                <td class="label">Gramasi</td>
                <td>: {{ printData.Gramasi || "-" }}</td>
              </tr>
              <tr>
                <td class="label">Finishing</td>
                <td>: {{ printData.Finishing || "-" }}</td>
              </tr>
              <tr>
                <td class="label">Date Line</td>
                <td>: {{ formatDateSafe(printData.Deadline) }}</td>
              </tr>
              <tr>
                <td class="label">Workshop</td>
                <td>: {{ printData.Workshop || "P05 (MMT)" }}</td>
              </tr>
              <tr>
                <td class="label">Status Client</td>
                <td>
                  :
                  <span class="highlight-bg">{{
                    printData.StatusClient || "PERFECT"
                  }}</span>
                </td>
              </tr>
              <tr>
                <td class="label">Alokasi</td>
                <td>: TIDAK</td>
              </tr>
              <tr>
                <td class="label">Keterangan</td>
                <td class="val-notes">
                  :
                  <span class="notes-content">{{
                    printData.Pesan || "-"
                  }}</span>
                </td>
              </tr>
            </table>
          </main>

          <div class="footer-block-double">
            <div class="design-preview-container-double">
              <img
                :src="
                  printData.Design_Image
                    ? getAssetUrl(printData.Design_Image)
                    : getAssetUrl(`${printData.SPK}.jpg`)
                "
                class="design-image"
                @load="handleImageLoad"
                @error="handleImageError"
              />
            </div>

            <div class="right-footer-wrapper-double">
              <div class="validation-container-double">
                <table class="approval-table">
                  <thead>
                    <tr>
                      <th>MO</th>
                      <th>CMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="sign-cell">
                        <img
                          v-if="printData.MO"
                          :src="getAssetUrl(`${printData.MO}.jpg`)"
                          class="signature-img"
                          @error="
                            (e: any) => (e.target.style.visibility = 'hidden')
                          "
                        />
                        <div class="signer-name">
                          {{ printData.MO || "N/A" }}
                        </div>
                      </td>
                      <td class="sign-cell">
                        <img
                          v-if="printData.CMO"
                          :src="getAssetUrl(`${printData.CMO}.jpg`)"
                          class="signature-img"
                          @error="
                            (e: any) => (e.target.style.visibility = 'hidden')
                          "
                        />
                        <div class="signer-name">
                          {{ printData.CMO || "NO" }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="qr-wrapper">
                  <img
                    :src="`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(printData.QR_Data || printData.SPK)}`"
                    alt="QR Validation"
                    class="qr-code-img"
                  />
                </div>
              </div>

              <div class="print-meta-text-double">
                Dibuat Oleh: {{ printData.Created || "-" }} |
                {{ format(new Date(), "dd-MM-yyyy HH:mm:ss") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================================================
   1. SCREEN PREVIEW MODE (Tampilan Layar Monitor Agar Lebih Menarik)
   ========================================================================== */
.print-container {
  background: radial-gradient(circle, #606468 0%, #3a3d40 100%);
  min-height: 100vh;
  padding: 30px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
  color: #111;
  transition: background 0.3s ease;
}

/* Elevasi Kertas Cetak di Layar */
.page-wrapper-alokasi,
.page-wrapper-double {
  background: #ffffff;
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.25),
    0 10px 10px rgba(0, 0, 0, 0.22);
  border-radius: 6px;
  box-sizing: border-box;
  position: relative;
  transition: transform 0.2s ease;
}

.page-wrapper-alokasi:hover,
.page-wrapper-double:hover {
  transform: translateY(-2px);
}

.page-wrapper-alokasi {
  width: 297mm;
  height: 210mm;
  padding: 12mm 12mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-wrapper-double {
  width: 297mm;
  height: 200mm;
  padding: 8mm 10mm;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
}

/* Tata Letak Blok Konten */
.left-content-block {
  width: 64%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.right-content-block {
  width: 33%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  margin-top: 5px;
}

.alokasi-table-wrapper {
  width: 100%;
  max-height: 380px;
  overflow-y: hidden;
  border-radius: 4px;
}

.absolute-footer-wrapper {
  position: absolute;
  bottom: 10mm;
  left: 10mm;
  right: 10mm;
  display: flex;
  flex-direction: column;
}

.spk-card-double {
  width: 48.5%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
}

/* ==========================================================================
   2. REUSABLE COMPONENT ELEMENTS
   ========================================================================== */
.header-section {
  border-bottom: 2px solid #000000;
  padding-bottom: 6px;
  width: 100%;
}

.title-group {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.main-title {
  font-size: 15pt;
  font-weight: 800;
  text-decoration: underline;
  margin: 0;
  letter-spacing: 0.5px;
}

.po-number {
  font-size: 11pt;
  font-weight: bold;
  color: #222;
}

/* Status Kerja & Urgensi */
.sub-header-info {
  position: absolute;
  top: 34px;
  right: 0;
  text-align: right;
  z-index: 10;
}

.sub-header-info-double {
  position: absolute;
  top: 35px;
  right: 0;
  text-align: right;
  z-index: 10;
}

.urgent-tag {
  color: #d32f2f;
  font-weight: 800;
  font-size: 9.5pt;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: pulse 2s infinite;
}

.type-tag {
  font-size: 8.5pt;
  color: #333;
}
.type-tag span {
  font-weight: bold;
}

/* Pengaturan Tabel Spesifikasi Utama */
.content-section {
  margin-top: 12px;
  width: 100%;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
}

.details-table td {
  padding: 2px 0;
  font-size: 9pt;
  vertical-align: top;
  color: #000000;
}

.details-table td.label {
  width: 110px;
  color: #333333;
  font-weight: 600;
}

.highlight-bg {
  background-color: #ffff00;
  font-weight: bold;
  padding: 1px 5px;
  border-radius: 2px;
}

.val-notes {
  font-size: 8.5pt !important;
}

.notes-content {
  font-size: 8.5pt;
  white-space: pre-wrap;
  line-height: 1.3;
}

/* Pengaturan Tabel Alokasi */
.alokasi-title {
  font-size: 10pt;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.alokasi-table {
  width: 100%;
  border-collapse: collapse;
}

.alokasi-table th,
.alokasi-table td {
  border: 1px solid #000000;
  padding: 4px 8px;
  font-size: 8.5pt;
}

.alokasi-table th {
  background-color: #f5f5f2;
  font-weight: bold;
}

/* ==========================================================================
   3. JALUR FOOTER & TANDA TANGAN (KONDISI 1 & KONDISI 2)
   ========================================================================== */
/* Kondisi 1: Footer Tunggal (Ada Alokasi) */
.footer-block {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  height: 140px;
}

.design-preview-container {
  width: 45%;
  height: 100%;
  border: 1px dashed #666666;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdfdfd;
  box-sizing: border-box;
  overflow: hidden;
}

.validation-container {
  width: 52%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

/* Kondisi 2: Footer Berpasangan (Tanpa Alokasi / Double) */
.footer-block-double {
  position: absolute;
  bottom: 15px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  height: 120px;
  box-sizing: border-box;
}

.design-preview-container-double {
  width: 40%;
  height: 95px;
  border: 1px dashed #666666;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdfdfd;
  box-sizing: border-box;
  overflow: hidden;
}

.right-footer-wrapper-double {
  width: 57%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.validation-container-double {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

/* Komponen Gambar Desain, Validasi, TTD & QR */
.design-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.approval-table {
  width: 65%;
  border-collapse: collapse;
  margin-bottom: 2px;
}

.approval-table th,
.approval-table td {
  border: 1px solid #000000;
  text-align: center;
  font-size: 8pt;
}

.approval-table th {
  background: #e1e2e5;
  font-weight: bold;
  padding: 3px 0;
  width: 50%;
  letter-spacing: 0.3px;
}

.sign-cell {
  height: 52px;
  vertical-align: bottom;
  padding-bottom: 3px;
  position: relative;
  background-color: #fff;
}

.signature-img {
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  max-height: 34px;
  max-width: 90%;
  object-fit: contain;
  mix-blend-mode: multiply; /* Menghilangkan background putih pada file scan ttd */
}

.signer-name {
  font-size: 7.5pt;
  font-weight: bold;
  text-transform: uppercase;
}

.qr-wrapper {
  width: 30%;
  display: flex;
  justify-content: flex-end;
}

.qr-code-img {
  width: 65px;
  height: 65px;
  object-fit: contain;
  border: 1px solid #eee;
  padding: 2px;
  background: #fff;
}

/* Metadata "Dibuat Oleh" */
.print-meta-text {
  font-size: 7pt;
  text-align: left;
  margin-top: 4px;
  color: #444444;
}

.print-meta-text-double {
  font-size: 7pt;
  text-align: left;
  color: #444444;
  width: 100%;
}

.floating-action {
  position: fixed;
  top: 25px;
  left: 25px;
  z-index: 9999;
}

/* Animasi Pulse lembut untuk Tag Urgent di monitor */
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

/* ==========================================================================
   4. PRINT MEDIA RULES (Aturan Mutlak Ketika Fisik Dicetak Printer)
   ========================================================================== */
@media print {
  @page {
    size: A4 landscape !important;
    margin: 0 !important;
  }

  html,
  body {
    background: #ffffff !important;
    height: 210mm !important;
    max-height: 210mm !important;
    overflow: hidden !important;
  }

  .print-container {
    padding: 0 !important;
    background: white !important;
    display: block !important;
  }

  .no-print {
    display: none !important;
  }

  .page-wrapper-alokasi,
  .page-wrapper-double {
    box-shadow: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    width: 297mm !important;
    height: 210mm !important;
    max-height: 210mm !important;
    background: white !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-wrapper-alokasi {
    padding: 10mm 10mm !important;
  }

  .page-wrapper-double {
    padding: 6mm 8mm !important;
  }

  /* Menjaga presisi garis hitam solid bawaan Delphi */
  .alokasi-table th,
  .alokasi-table td,
  .approval-table th,
  .approval-table td {
    border: 1px solid #000000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .highlight-bg {
    background-color: #ffff00 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .alokasi-table td {
    padding: 2px 6px !important;
  }

  .text-uppercase {
    text-transform: uppercase;
  }

  .total-row td {
    background-color: #ffffff !important;
    border-top: 2px double #000000 !important;
  }
}
</style>
