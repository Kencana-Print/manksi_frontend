<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";

const route = useRoute();
const nomorMAP = route.params.nomor as string;
const printData = ref<any>(null);

const isLoading = ref(true);
const finalImageUrl = ref("");

const handleImgError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (img.dataset.tried === "true") {
    img.style.display = "none"; // Sembunyikan jika fallback juga gagal
    return;
  }
  img.dataset.tried = "true";
  const nomor =
    printData.value.header.MSPK_Nomor || printData.value.header.mspk_nomor;
  // ✅ FIX: path relatif, gak hardcode host/port. (Fungsi ini gak
  // dipakai di template sekarang — logic fallback yang beneran jalan
  // ada di preloadImageAndPrint — tapi dibenerin juga jaga-jaga kalau
  // nanti ada yang nambahin @error="handleImgError" lagi.)
  img.src = `/file-gambar/${encodeURIComponent(nomor)}.jpg`;
};

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const preloadImageAndPrint = () => {
  if (!printData.value?.header) {
    finishLoading();
    return;
  }

  const header = printData.value.header;
  const nomor = header.MSPK_Nomor || header.mspk_nomor;
  const cab = header.mspk_cabang || header.mspk_cab || "HO-";
  const base = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
  const primaryUrl = `${base}/images/${cab}/map/${encodeURIComponent(nomor)}.jpg`;
  // ✅ FIX: path relatif, gak hardcode host/port
  const fallbackUrl = `/file-gambar/${encodeURIComponent(nomor)}.jpg`;

  // Preload gambar secara gaib (belakang layar)
  const img = new Image();

  img.onload = () => {
    // Jika gambar lokal sukses
    finalImageUrl.value = primaryUrl;
    finishLoading();
  };

  img.onerror = () => {
    // Jika gambar lokal gagal, coba preload dari VPS
    const fbImg = new Image();
    fbImg.onload = () => {
      finalImageUrl.value = fallbackUrl;
      finishLoading();
    };
    fbImg.onerror = () => {
      // Keduanya gagal
      finalImageUrl.value = "";
      finishLoading();
    };
    fbImg.src = fallbackUrl;
  };

  // Trigger proses download
  img.src = primaryUrl;
};

const finishLoading = () => {
  isLoading.value = false;
  // Delay 300ms hanya untuk memberi waktu Vue merender DOM dari gambar yang sudah di-cache
  setTimeout(() => {
    window.print();
  }, 300);
};

onMounted(async () => {
  try {
    const res = await api.get(
      `/garmen/cetak-bast/form/print/${encodeURIComponent(nomorMAP)}`,
    );
    printData.value = res.data.data;

    // Jangan print dulu, tapi preload gambarnya
    preloadImageAndPrint();
  } catch (e) {
    console.error(e);
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="print-container" v-if="!isLoading && printData">
    <div class="print-wrapper">
      <div v-for="copy in 2" :key="copy" class="print-column">
        <div class="header-title">BERITA ACARA SERAH TERIMA MAP</div>
        <table class="w-100 info-table">
          <tr>
            <td width="22%">Nomor Memo</td>
            <td width="2%">:</td>
            <td>
              {{ printData.header.MSPK_Nomor || printData.header.mspk_nomor }}
            </td>
          </tr>
          <tr>
            <td>Tanggal</td>
            <td>:</td>
            <td>
              {{
                fmtDate(
                  printData.header.Mspk_Tanggal ||
                    printData.header.mspk_tanggal,
                )
              }}
            </td>
          </tr>
          <tr>
            <td>Nama Desain</td>
            <td>:</td>
            <td>
              {{ printData.header.Mspk_nama || printData.header.mspk_nama }}
            </td>
          </tr>
          <tr>
            <td>Ukuran</td>
            <td>:</td>
            <td>
              {{ printData.header.Mspk_ukuran || printData.header.mspk_ukuran }}
            </td>
          </tr>
          <tr>
            <td>Kain</td>
            <td>:</td>
            <td>
              {{ printData.header.Mspk_kain || printData.header.mspk_kain }}
            </td>
          </tr>
          <tr>
            <td>Finishing</td>
            <td>:</td>
            <td>
              {{
                printData.header.Mspk_finishing ||
                printData.header.mspk_finishing
              }}
            </td>
          </tr>
          <tr>
            <td class="align-top">Catatan</td>
            <td class="align-top">:</td>
            <td style="white-space: pre-wrap">
              {{
                printData.header.Mspk_keterangan ||
                printData.header.mspk_keterangan
              }}
            </td>
          </tr>
        </table>

        <div
          class="d-flex justify-space-between mt-2 font-weight-bold"
          style="font-size: 11px"
        >
          <div>
            Jumlah :
            {{
              printData.header.mspk_jumlah_jadi ||
              printData.header.Mspk_jumlah ||
              0
            }}
          </div>
          <div>
            Gramasi :
            {{ printData.header.mspk_gramasi || printData.header.Mspk_gramasi }}
          </div>
          <div>
            {{ printData.header.mspk_tipe || printData.header.Mspk_tipe }}
          </div>
        </div>

        <table class="detail-table mt-1 w-100">
          <thead>
            <tr>
              <th width="8%">No</th>
              <th width="35%">Kesesuaian</th>
              <th width="10%">Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in printData.details" :key="d.no">
              <td class="text-center">{{ d.no }}</td>
              <td>{{ d.kesesuaian }}</td>
              <td class="text-center font-weight-bold">{{ d.status }}</td>
              <td>{{ d.keterangan }}</td>
            </tr>
            <tr v-if="!printData.details || printData.details.length === 0">
              <td colspan="4" class="text-center text-grey py-2">
                Belum ada data kesesuaian BAST
              </td>
            </tr>
          </tbody>
        </table>

        <div class="image-box mt-2">
          <img v-if="finalImageUrl" :src="finalImageUrl" class="map-image" />
          <span
            v-else
            class="text-grey"
            style="font-size: 10px; font-style: italic"
          >
            (Tidak ada gambar desain)
          </span>
        </div>

        <div class="footer-section mt-4 d-flex justify-space-between align-end">
          <div class="lembar-text">
            Lembar 1 : Arsip Garment<br />
            Lembar 2 : Marketing Officer
          </div>
          <div class="ttd-box">
            <div class="text-center mb-1">
              Boyolali, {{ fmtDate(new Date().toISOString()) }}
            </div>
            <table class="w-100 ttd-table">
              <tr>
                <th width="50%">PIC Proofing</th>
                <th width="50%">Garment Manager</th>
              </tr>
              <tr>
                <td class="ttd-space"></td>
                <td class="ttd-space"></td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-container {
  width: 100vw;
  height: 100vh;
  overflow: auto;
  background-color: #525659;
  padding: 20px 0;
  box-sizing: border-box;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 5mm;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
  }
  .print-container {
    width: auto;
    height: auto;
    overflow: visible;
    background-color: transparent;
    padding: 0;
  }
  .print-wrapper {
    width: 100% !important;
    height: 195mm !important; /* Disesuaikan agar aman dari margin printer */
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }
  .print-column {
    height: 100%;
    overflow: hidden;
  }
}

.print-wrapper {
  width: 297mm;
  height: 210mm;
  margin: 0 auto;
  padding: 8mm; /* Padding dikurangi dari 10mm ke 8mm untuk ekstra ruang */
  background: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  font-family: "Arial", sans-serif;
  color: #000;
  box-sizing: border-box;
  overflow: hidden;
}

.print-column {
  width: 48%;
  display: flex;
  flex-direction: column;
  height: 100%; /* WAJIB 100% agar flex child di dalamnya tahu batas maksimal */
}

.header-title {
  border: 1px solid #000;
  padding: 4px;
  font-weight: bold;
  font-size: 13px; /* Dikecilkan 1px */
  margin-bottom: 4px; /* Margin bawah dirapatkan */
  text-align: center;
}

.info-table {
  font-size: 10px; /* Dikecilkan 1px */
  line-height: 1.25; /* Rapatkan spasi antar baris di Catatan */
}
.info-table td {
  padding: 1px 0; /* Rapatkan padding vertikal */
}
.align-top {
  vertical-align: top;
}

.detail-table {
  border-collapse: collapse;
  font-size: 10px; /* Dikecilkan 1px */
  flex-shrink: 0; /* Tabel tidak boleh ikut menyusut */
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 2px 4px; /* Padding dirapatkan */
}
.detail-table th {
  font-weight: bold;
}

.image-box {
  border: 1px solid #000;
  flex: 1 1 0; /* KUNCI UTAMA: Flex-basis 0 agar gambar yang mengalah/menyusut, bukan footer yang terdorong */
  min-height: 0; /* KUNCI UTAMA: Boleh menyusut hingga habis jika teks catatan sangat penuh */
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  margin-top: 6px;
}

.map-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.footer-section {
  font-size: 10px;
  flex-shrink: 0; /* KUNCI UTAMA: Area TTD ini kebal, Dilarang keras menyusut atau hilang */
  margin-top: 8px; /* Jarak atas dirapatkan sedikit */
}
.lembar-text {
  line-height: 1.3;
}

.ttd-box {
  width: 210px;
}
.ttd-table {
  border-collapse: collapse;
}
.ttd-table th,
.ttd-table td {
  border: 1px solid #000;
  text-align: center;
  font-weight: normal;
}
.ttd-space {
  height: 45px; /* Ruang tanda tangan sedikit dikurangi dari 60px ke 45px untuk menghemat kertas */
}
.w-100 {
  width: 100%;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-4 {
  margin-top: 12px; /* Margin bawaan mt-4 dirapatkan */
}
.mb-1 {
  margin-bottom: 4px;
}
</style>
