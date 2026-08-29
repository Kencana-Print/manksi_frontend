<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import api from "@/services/api";
import { poInternalSpkFormService } from "@/services/garmen/poInternalSpkFormService";
import logoKP from "@/assets/kp.jpg";

const route = useRoute();
const nomor = decodeURIComponent((route.params.nomor as string) || "");

const data = ref<any>(null);
const isLoading = ref(true);
const isError = ref(false);

onMounted(async () => {
  try {
    const res = await poInternalSpkFormService.getPrintData(nomor);
    data.value = res.data.data;
    isLoading.value = false;

    await nextTick();
    await resolveDesignImage();
    await nextTick();

    const style = document.createElement("style");
    style.textContent = "@page { size: A4 portrait; margin: 10mm; }";
    document.head.appendChild(style);
    window.print();
  } catch (error) {
    isError.value = true;
    isLoading.value = false;
  }
});

const getBaseUrl = () => api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";

const resolvedImageUrl = ref("");
const isLoadingImage = ref(false);

const isKaosan = computed(() => {
  const divisi = String(data.value?.header?.Divisi || "").toUpperCase();
  return (
    divisi.includes("KAOSAN") || divisi === "3" || divisi.includes("DIVISI 3")
  );
});
const isNewFormatSO = computed(() =>
  String(data.value?.header?.NomorSPK || "").startsWith("SPK-"),
);

const KAOSAN_EXTENSIONS = ["png", "jpeg", "jpg"];
const buildKaosanUrl = (cabangKaosan: string, invdc: string, ext: string) => {
  const targetUrl = `https://retail.kaosanofficial.com/images/${cabangKaosan}/${encodeURIComponent(invdc)}.${ext}`;
  return `${api.defaults.baseURL}/proxy-image?url=${encodeURIComponent(targetUrl)}`;
};

// Coba ekstensi retail Kaosan berurutan (png → jpeg → jpg)
const tryKaosanExt = (
  cabangKaosan: string,
  invdc: string,
  idx: number,
  resolve: () => void,
) => {
  if (idx >= KAOSAN_EXTENSIONS.length) {
    resolvedImageUrl.value = "";
    isLoadingImage.value = false;
    resolve();
    return;
  }
  const url = buildKaosanUrl(cabangKaosan, invdc, KAOSAN_EXTENSIONS[idx]);
  const img = new Image();
  img.onload = () => {
    resolvedImageUrl.value = url;
    isLoadingImage.value = false;
    resolve();
  };
  img.onerror = () => tryKaosanExt(cabangKaosan, invdc, idx + 1, resolve);
  img.src = url;
};

const resolveDesignImage = () => {
  const nomorSpk = data.value?.header?.NomorSPK;
  if (!nomorSpk) {
    resolvedImageUrl.value = "";
    return Promise.resolve();
  }

  // ⚠️ Sama pola dengan SpkPrintView.resolveDesignImage — SPK divisi
  // Kaosan (turunan alur SO baru) gambarnya ada di server retail
  // Kaosan, bukan lokal MANKSI.
  const invdc = data.value.header.Invdc || "";
  if (isKaosan.value && isNewFormatSO.value && invdc) {
    const cab = data.value.header.GdgKode || "HO-";
    const cabangKaosan = invdc.includes(".") ? invdc.split(".")[0] : cab;
    isLoadingImage.value = true;
    resolvedImageUrl.value = "";
    return new Promise<void>((resolve) => {
      tryKaosanExt(cabangKaosan, invdc, 0, resolve);
    });
  }

  // ── Logic lama (non-Kaosan / legacy) ──
  const base = getBaseUrl();
  const cab = data.value.header.GdgKode || "HO-";
  const map = data.value.header.MapNomor || "";

  const isLegacyFormat = !nomorSpk.startsWith("SPK-");

  const mapCandidates = map
    ? [
        `/file-gambar/${encodeURIComponent(map)}.jpg`,
        `${base}/images/${cab}/map/${encodeURIComponent(map)}.jpg`,
        `${base}/images/${cab}/${encodeURIComponent(map)}.jpg`,
      ]
    : [];
  const ownCandidates = [
    `${base}/images/${cab}/${encodeURIComponent(nomorSpk)}.jpg`,
    `/file-gambar/${encodeURIComponent(nomorSpk)}.jpg`,
  ];

  const candidates: string[] = [];
  if (isLegacyFormat) {
    candidates.push(...ownCandidates, ...mapCandidates);
  } else {
    candidates.push(...mapCandidates, ...ownCandidates);
  }

  if (!isLegacyFormat) {
    const fallbackSoNomor = nomorSpk.replace("SPK-", "SO-");
    if (fallbackSoNomor !== nomorSpk) {
      candidates.push(
        `${base}/images/${cab}/${encodeURIComponent(fallbackSoNomor)}.jpg`,
        `/file-gambar/${encodeURIComponent(fallbackSoNomor)}.jpg`,
      );
    }
  }

  isLoadingImage.value = true;
  resolvedImageUrl.value = "";
  return new Promise<void>((resolve) => {
    const tryNext = (idx: number) => {
      if (idx >= candidates.length) {
        isLoadingImage.value = false;
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolvedImageUrl.value = candidates[idx];
        isLoadingImage.value = false;
        resolve();
      };
      img.onerror = () => tryNext(idx + 1);
      img.src = candidates[idx];
    };
    tryNext(0);
  });
};
const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const tglIndo = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat dokumen cetak...</div>

  <div v-else-if="isError" class="error-state">
    Gagal memuat data cetak PO Internal. Pastikan nomor benar.
  </div>

  <div v-else-if="data" class="print-wrapper">
    <div class="print-container">
      <template v-for="copyIdx in 2" :key="copyIdx">
        <div class="poi-copy">
          <!-- ── Letterhead ── -->
          <div class="header-row">
            <div class="company-info">
              <div class="font-weight-bold">CV. Kencana Print</div>
              <div>Padokan RT 04 / 04 Sawahan Ngemplak, Boyolali</div>
              <div>0271-740634/0271-740634</div>
            </div>
            <img :src="logoKP" alt="Logo" class="company-logo" />
          </div>

          <div class="doc-title">PO INTERNAL</div>

          <!-- ── Body: info kiri, gambar+SPK kanan ── -->
          <div class="body-row">
            <div class="left-col">
              <table class="info-table">
                <tr>
                  <td class="lbl">Nomor</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.Nomor }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tanggal</td>
                  <td class="sep">:</td>
                  <td class="val">{{ tglIndo(data.header.Tanggal) }}</td>
                </tr>
                <tr>
                  <td class="lbl">Dateline</td>
                  <td class="sep">:</td>
                  <td class="val">{{ tglIndo(data.header.Dateline) }}</td>
                </tr>
                <tr v-if="data.header.Keterangan">
                  <td class="lbl">Keterangan</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.Keterangan }}</td>
                </tr>
                <tr>
                  <td class="lbl">Jasa</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.JasaNama }}</td>
                </tr>
                <tr>
                  <td class="lbl">Cabang</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.GdgNama }}</td>
                </tr>
                <tr>
                  <td class="lbl">Tujuan</td>
                  <td class="sep">:</td>
                  <td class="val">{{ data.header.SupNama }}</td>
                </tr>
              </table>

              <div class="note-text">NOTE: ACUAN SAMPEL WAJIB DISERTAKAN</div>

              <table class="detail-table">
                <thead>
                  <tr>
                    <th style="width: 24px">No</th>
                    <th>Nama</th>
                    <th style="width: 55px">Satuan</th>
                    <th style="width: 70px">Size</th>
                    <th style="width: 55px">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, idx) in data.detail" :key="idx">
                    <td class="tc">{{ Number(idx) + 1 }}</td>
                    <td>{{ d.Nama }}</td>
                    <td class="tc">{{ d.Satuan }}</td>
                    <td class="tc">{{ d.Size || "-" }}</td>
                    <td class="tr">{{ num(d.Jumlah) }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="sign-row">
                <div class="sign-col">
                  <div class="sign-lbl">Dibuat oleh,</div>
                  <div class="sign-space"></div>
                  <div class="sign-name">
                    ( {{ data.header.UserCreate || "-" }} )
                  </div>
                </div>
                <div class="sign-col">
                  <div class="sign-lbl">Mengetahui</div>
                  <div class="sign-space"></div>
                  <div class="sign-name">( Manager )</div>
                </div>
                <div class="sign-col">
                  <div class="sign-lbl">Diterima oleh,</div>
                  <div class="sign-space"></div>
                  <div class="sign-name">( &#160; )</div>
                </div>
              </div>
            </div>

            <div class="right-col">
              <div class="img-box">
                <img v-if="resolvedImageUrl" :src="resolvedImageUrl" alt="" />
                <span v-else-if="!isLoadingImage" class="img-empty-text"
                  >Tidak ada gambar</span
                >
              </div>
              <div class="spk-info">
                <div class="spk-row">
                  <span class="spk-lbl">No.SPK</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.NomorSPK }}</span>
                </div>
                <div class="spk-row">
                  <span class="spk-lbl">Nama SPK</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.NamaSpk }}</span>
                </div>
                <div class="spk-row mt-1">
                  <span class="spk-lbl">Jumlah</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ num(data.header.JumlahSpk) }}</span>
                </div>
                <div class="spk-row">
                  <span class="spk-lbl">Bahan</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.Bahan }}</span>
                </div>
                <div class="spk-row">
                  <span class="spk-lbl">Ukuran</span>
                  <span class="spk-sep">:</span>
                  <span class="spk-val">{{ data.header.Ukuran }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="copyIdx === 1" class="copy-divider"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading-state,
.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  font-size: 16px;
}
.error-state {
  color: red;
}

.print-wrapper {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
}

.print-container {
  border: 2px solid #eca100;
  padding: 14px 18px;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  box-sizing: border-box;
}

.poi-copy {
  padding: 6px 0;
}
.copy-divider {
  border-top: 1px solid #000;
  margin: 8px 0;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}
.company-info {
  font-size: 10px;
  line-height: 1.4;
  color: #000;
}
.company-logo {
  max-height: 40px;
  width: auto;
  object-fit: contain;
}

.doc-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 6px;
}

.body-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.left-col {
  flex: 1;
  min-width: 0;
}
.right-col {
  width: 200px;
  flex-shrink: 0;
}

.info-table {
  border-collapse: collapse;
  font-size: 10px;
  margin-bottom: 6px;
}
.info-table td {
  padding: 1px 0;
  vertical-align: top;
}
.info-table .lbl {
  width: 68px;
  font-weight: 600;
}
.info-table .sep {
  width: 10px;
}
.info-table .val {
  color: #000;
}

.note-text {
  font-size: 10px;
  font-weight: bold;
  color: #000;
  margin-bottom: 6px;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin-bottom: 10px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 3px 5px;
}
.detail-table th {
  text-align: left;
  font-weight: bold;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.sign-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
}
.sign-col {
  flex: 1;
  text-align: center;
  font-size: 10px;
}
.sign-space {
  height: 34px;
}

.img-box {
  width: 100%;
  height: 110px;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 6px;
  background: #fafafa;
}
.img-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.img-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.img-empty-text {
  font-size: 9px;
  color: #999;
  font-style: italic;
}

.spk-info {
  font-size: 10px;
  line-height: 1.5;
}
.spk-row {
  display: flex;
  gap: 4px;
}
.spk-lbl {
  width: 62px;
  flex-shrink: 0;
}
.spk-val {
  flex: 1;
}
.mt-1 {
  margin-top: 5px;
}
.font-weight-bold {
  font-weight: bold;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
