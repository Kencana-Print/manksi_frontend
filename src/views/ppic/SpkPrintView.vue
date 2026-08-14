<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { spkFormService } from "@/services/ppic/spkFormService";
import api from "@/services/api";
import QrcodeVue from "qrcode.vue";

const route = useRoute();
const toast = useToast();
const isLoaded = ref(false);
const isError = ref(false);
const spk = ref<any>({});
const sizes = ref<any[]>([]);
const komponenPotong = ref<any[]>([]);
const komponenCetakBordir = ref<any[]>([]);
const keteranganKhusus = ref<string[]>([]);
const layoutHeader = ref<any>(null);
const layoutProof = ref<any[]>([]);
const layoutSewing = ref<any[]>([]);
const mkbDetail = ref<any[]>([]);
const ketKomponenList = ref<any[]>([]);
const mkaFromMap = ref<{
  aksesoris: {
    kode: string;
    nama: string;
    satuan: string;
    note: string;
    qty: number;
  }[];
  komponen: {
    kode: string;
    komponen: string;
    warna: string;
    babaran: number;
    babarank: number;
  }[];
  sizeBreakdown: { komponen: string; size: string; babaran: number }[];
}>({ aksesoris: [], komponen: [], sizeBreakdown: [] });

const printNomor = String(route.params.nomor);

const getBaseUrl = () => {
  const rawBase = api.defaults.baseURL || import.meta.env.VITE_API_URL || "";
  return rawBase.replace(/\/api\/?$/, "");
};

const resolvedImageUrl = ref("");
const isLoadingImage = ref(false);
const kaosanExtIndex = ref(0);
const KAOSAN_EXTENSIONS = ["png", "jpeg", "jpg"];
const buildKaosanUrl = (cabangKaosan: string, invdc: string, ext: string) => {
  const targetUrl = `https://retail.kaosanofficial.com/images/${cabangKaosan}/${encodeURIComponent(invdc)}.${ext}`;
  return `${api.defaults.baseURL}/proxy-image?url=${encodeURIComponent(targetUrl)}`;
};
const isKaosan = computed(() => {
  const divisi = String(spk.value.spk_divisi || "").toUpperCase();
  return (
    divisi.includes("KAOSAN") || divisi === "3" || divisi.includes("DIVISI 3")
  );
});
const isNewFormatSO = computed(() =>
  String(spk.value.spk_nomor || "").startsWith("SPK-"),
);

const authStore = useAuthStore();
const isPreview = computed(() => route.query.preview === "1");
const previewWatermarkText = computed(() => {
  const user = authStore.userName || authStore.user?.kode || "USER";
  const now = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${user} • ${now} • PREVIEW - DILARANG DICETAK`;
});
const watermarkTiles = computed(() =>
  Array(60).fill(previewWatermarkText.value),
);

// Coba berantai: (1) SPK di lokal -> (2) SO di lokal -> (3) MAP -> (4) file lama di /file-gambar/
const resolveDesignImage = () => {
  if (!spk.value.spk_nomor) {
    resolvedImageUrl.value = "";
    return;
  }

  // ⚠️ Sama pola dengan SpkView.onLihatGambar / SalesOrderView —
  // SPK divisi Kaosan (turunan alur SO baru) gambarnya ada di server
  // retail Kaosan, bukan lokal MANKSI.
  if (isKaosan.value && isNewFormatSO.value && spk.value.spk_invdc) {
    kaosanExtIndex.value = 0;
    const cab = spk.value.spk_cab || "HO-";
    const invdc = spk.value.spk_invdc;
    const cabangKaosan = invdc.includes(".") ? invdc.split(".")[0] : cab;
    isLoadingImage.value = true;
    tryKaosanExt(cabangKaosan, invdc, 0);
    return;
  }

  // ── Logic lama (non-Kaosan / legacy) — TIDAK berubah ──
  const base = getBaseUrl();
  const cab = spk.value.spk_cab || "HO-";
  const nomor = spk.value.spk_nomor;
  const soRef = spk.value.spk_so_ref || "";
  const mapNomor = spk.value.spk_memo || "";
  const fallbackSoNomor = nomor.startsWith("SPK-")
    ? nomor.replace("SPK-", "SO-")
    : nomor.startsWith("SO-")
      ? nomor
      : `SO-${nomor}`;
  const isLegacyFormat = !nomor.startsWith("SPK-");
  const candidates: string[] = [];
  const mapCandidates = mapNomor
    ? [
        `/file-gambar/${encodeURIComponent(mapNomor)}.jpg`,
        `${base}/images/${cab}/map/${encodeURIComponent(mapNomor)}.jpg`,
        `${base}/images/${cab}/${encodeURIComponent(mapNomor)}.jpg`,
      ]
    : [];
  const ownCandidates = [
    `${base}/images/${cab}/${encodeURIComponent(nomor)}.jpg`,
    `/file-gambar/${encodeURIComponent(nomor)}.jpg`,
  ];
  if (isLegacyFormat) {
    candidates.push(...ownCandidates, ...mapCandidates);
  } else {
    candidates.push(...mapCandidates, ...ownCandidates);
  }
  if (soRef && soRef !== nomor) {
    candidates.push(`${base}/images/${cab}/${encodeURIComponent(soRef)}.jpg`);
    candidates.push(`/file-gambar/${encodeURIComponent(soRef)}.jpg`);
  }
  if (fallbackSoNomor !== nomor && fallbackSoNomor !== soRef) {
    candidates.push(
      `${base}/images/${cab}/${encodeURIComponent(fallbackSoNomor)}.jpg`,
    );
    candidates.push(`/file-gambar/${encodeURIComponent(fallbackSoNomor)}.jpg`);
  }
  isLoadingImage.value = true;
  resolvedImageUrl.value = "";
  const tryNext = (idx: number) => {
    if (idx >= candidates.length) {
      isLoadingImage.value = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolvedImageUrl.value = candidates[idx];
      isLoadingImage.value = false;
    };
    img.onerror = () => tryNext(idx + 1);
    img.src = candidates[idx];
  };
  tryNext(0);
};

// Coba ekstensi retail Kaosan berurutan (png → jpeg → jpg)
const tryKaosanExt = (cabangKaosan: string, invdc: string, idx: number) => {
  if (idx >= KAOSAN_EXTENSIONS.length) {
    resolvedImageUrl.value = "";
    isLoadingImage.value = false;
    return;
  }
  const url = buildKaosanUrl(cabangKaosan, invdc, KAOSAN_EXTENSIONS[idx]);
  const img = new Image();
  img.onload = () => {
    resolvedImageUrl.value = url;
    isLoadingImage.value = false;
  };
  img.onerror = () => tryKaosanExt(cabangKaosan, invdc, idx + 1);
  img.src = url;
};

const tglIndo = (val: string) => {
  if (!val) return "-";
  const s = String(val).substring(0, 10);
  const [y, m, d] = s.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d} ${months[Number(m) - 1]} ${y}`;
};

const formatWaktu = (isoStr: string) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Kolom size yang ada nilainya — tampilkan dinamis seperti tab Order
const hasAtasan = computed(() =>
  sizes.value.some(
    (s) => Number(s.ld) > 0 || Number(s.pb) > 0 || Number(s.p_bahu) > 0,
  ),
);
const hasBawahan = computed(() =>
  sizes.value.some((s) => Number(s.l_pinggang) > 0 || Number(s.p_celana) > 0),
);
const hasPlPendek = computed(() =>
  sizes.value.some((s) => Number(s.pl_pendek) > 0),
);
const hasPlPanjang = computed(() =>
  sizes.value.some((s) => Number(s.pl_panjang) > 0),
);

const totalQty = computed(() =>
  sizes.value.reduce((s, r) => s + (Number(r.qty) || 0), 0),
);

const prosesChips = computed(() => {
  const finishing = (spk.value.spk_finishing || "").toLowerCase();
  const isPolos = finishing.includes("polos");
  if (isPolos) return [];

  const arr: string[] = [];
  if (spk.value.spk_sablon === "Y") arr.push("SABLON");
  if (spk.value.spk_bordir === "Y") arr.push("BORDIR");
  if (spk.value.spk_sublim === "Y") arr.push("SUBLIM");

  // DTF hanya kalau tidak ada proses apapun dari SO
  if (arr.length === 0) arr.push("DTF");

  return arr;
});

const hasLayoutProses = computed(
  () =>
    !!layoutHeader.value &&
    (layoutProof.value.length > 0 || layoutSewing.value.length > 0),
);
const hasMkaFromMap = computed(
  () =>
    mkaFromMap.value.aksesoris.length > 0 ||
    mkaFromMap.value.komponen.length > 0,
);
const isMoveSpecialProcess = computed(() => {
  // Pindah ke kanan HANYA JIKA komponen potong > 5 baris
  return komponenPotong.value.length > 5 && keteranganKhusus.value.length > 0;
});

// --- CETAK SPK P01 ---
// ── Deteksi Workshop legacy (P01/P02/P05) → pakai format cetak lama ──
const isP01Print = computed(
  () => spk.value.spk_cab === "P01" || spk.value.spk_cab2 === "P01",
);
const isSpandukMmtPrint = computed(
  () =>
    ["P02", "P05"].includes(spk.value.spk_cab) ||
    ["P02", "P05"].includes(spk.value.spk_cab2),
);
const isAnyLegacyPrint = computed(
  () => isP01Print.value || isSpandukMmtPrint.value,
);

const spkKetKomponenText = computed(() =>
  ketKomponenList.value
    .map((k) => `${k.kode}= ${k.nama}${k.ket ? ": " + k.ket : ""}`)
    .join("\n"),
);

const alokasi = ref<any[]>([]);

const alokasiChunks = computed(() => {
  const chunkSize = 24;
  const chunks: any[][] = [];
  for (let i = 0; i < alokasi.value.length; i += chunkSize) {
    chunks.push(alokasi.value.slice(i, i + chunkSize));
  }
  return chunks;
});

// ── Signature helper (dipakai format lama, sama pola SalesOrderPrintView) ──
const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  return `/file-gambar/${encodeURIComponent(kodeUser.trim().toUpperCase())}.jpg`;
};
const handleSignatureError = (e: Event) => {
  (e.target as HTMLImageElement).style.opacity = "0";
};

// ── String Ukuran ringkas: "S=10, M=20, L=30" ──
const sizeUkuranStr = computed(() => {
  if (!sizes.value.length) return spk.value.spk_ukuran || "-";
  return sizes.value.map((s: any) => `${s.size}=${s.qty}`).join(", ");
});

// ── String Size Lebar & Panjang Badan (format lama) ──
const sizeLebarPanjangStr = computed(() => {
  if (!sizes.value.length) return "";
  return sizes.value
    .map((s: any) => `${s.size}=  L: ${s.ld || 0}   P: ${s.pb || 0}`)
    .join("\n");
});

const p1PageEl = ref<HTMLElement | null>(null);
const p1InnerEl = ref<HTMLElement | null>(null);
const p1Scale = ref(1);
const p1ScaledHeightStyle = ref<string>("auto"); // cuma dipakai saat scale-down
const p1MultiPage = ref(false);

const MIN_PRINT_SCALE = 0.72;

// Tunggu semua <img> di dalam elemen selesai load sebelum ukur tinggi —
// kalau diukur lebih awal, gambar yang belum selesai render bikin hasil
// pengukuran lebih pendek dari kenyataan.
const waitForImages = (el: HTMLElement) => {
  const imgs = Array.from(el.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
};

const fitPageToA4 = async () => {
  if (!p1PageEl.value || !p1InnerEl.value) return;

  // 1. Reset ukuran agar bisa tumbuh maksimal sesuai isinya
  p1Scale.value = 1;
  p1MultiPage.value = false;
  p1ScaledHeightStyle.value = "max-content";
  await nextTick();
  await waitForImages(p1InnerEl.value);
  await nextTick();

  // 2. Dapatkan ukuran asli vs ukuran aman kertas A4
  const availablePx =
    p1PageEl.value.clientHeight > 0 ? p1PageEl.value.clientHeight - 40 : 1040;
  const contentPx = p1InnerEl.value.scrollHeight;

  // 3. Eksekusi kalkulasi
  if (contentPx <= availablePx) {
    p1ScaledHeightStyle.value = "auto";
    return;
  }

  const requiredScale = availablePx / contentPx;
  if (requiredScale >= MIN_PRINT_SCALE) {
    p1Scale.value = requiredScale;
    p1ScaledHeightStyle.value = `${contentPx}px`; // Kunci tingginya
  } else {
    p1Scale.value = 1;
    p1ScaledHeightStyle.value = "auto";
    p1MultiPage.value = true;
  }
};

const notifyParentReady = () => {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: "spk-print-ready",
        height: document.documentElement.scrollHeight,
      },
      "*",
    );
  }
};

// ── Blokir Ctrl+P / Cmd+P / Ctrl+S (lapisan pertama — cegah dialog
// print/save browser terbuka sama sekali). Ini best-effort: sebagian
// besar browser modern menghormati preventDefault di keydown untuk
// shortcut ini, tapi TIDAK ada jaminan 100% di semua browser/OS —
// makanya lapisan kedua (CSS @media print di bawah) yang jadi jaring
// pengaman utama, bukan blokir keyboard ini.
const blockPrintShortcut = (e: KeyboardEvent) => {
  if (!isPreview.value) return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) {
    e.preventDefault();
    e.stopPropagation();
    toast.warning("Mode Preview — dokumen ini tidak dapat dicetak/disimpan.");
  }
};
const blockContextMenu = (e: MouseEvent) => {
  if (isPreview.value) e.preventDefault();
};

let previewResizeObserver: ResizeObserver | null = null;

const injectPageStyle = (css: string) => {
  let el = document.getElementById("dynamic-page-style") as HTMLStyleElement;
  if (!el) {
    el = document.createElement("style");
    el.id = "dynamic-page-style";
    document.head.appendChild(el);
  }
  el.innerHTML = css;
};

onMounted(() => {
  if (isPreview.value) {
    window.addEventListener("keydown", blockPrintShortcut, true);
    document.addEventListener("contextmenu", blockContextMenu);
  }
});
onUnmounted(() => {
  window.removeEventListener("keydown", blockPrintShortcut, true);
  document.removeEventListener("contextmenu", blockContextMenu);
});

onMounted(async () => {
  try {
    const [resDetail, resLayout, resAlokasi] = await Promise.all([
      spkFormService.getDetail(printNomor),
      spkFormService.getLayoutProses(printNomor),
      spkFormService.getAlokasi(printNomor),
    ]);

    const d = resDetail.data.data;
    spk.value = d.header || {};
    resolveDesignImage();
    sizes.value = (d.dtlSize || []).filter((s: any) => Number(s.qty) > 0);
    komponenPotong.value = d.komponenSpk?.ListPotong || [];
    komponenCetakBordir.value = d.komponenSpk?.ListCetakBordir || [];
    keteranganKhusus.value = (d.keteranganKhusus || []).filter((k: string) =>
      k?.trim(),
    );
    ketKomponenList.value = (d.ketKomponenList || []).filter(
      (k: any) => k.checked,
    );
    alokasi.value = resAlokasi.data.data || [];

    layoutHeader.value = resLayout.data.data?.header || null;
    layoutProof.value = resLayout.data.data?.proof || [];
    layoutSewing.value = resLayout.data.data?.sewing || [];

    // Fetch MKB pakai spk_so_ref yang sudah diketahui
    if (spk.value.spk_so_ref) {
      const resMkb = await spkFormService.getMkbDetail(spk.value.spk_so_ref);
      mkbDetail.value = resMkb.data.data || [];
    }

    // Fetch MKA (accessories + babaran) dari BAST MAP kalau SPK ini
    // berasal dari MAP — sama sumbernya dgn panel di SpkTabKeterangan
    if (spk.value.spk_memo) {
      try {
        const resMka = await api.get(
          `/ppic/spk/form/mka-from-map/${encodeURIComponent(spk.value.spk_memo)}`,
        );
        mkaFromMap.value = resMka.data.data || {
          aksesoris: [],
          komponen: [],
          sizeBreakdown: [],
        };
      } catch {
        mkaFromMap.value = { aksesoris: [], komponen: [], sizeBreakdown: [] };
      }
    }

    isLoaded.value = true;
    if (isSpandukMmtPrint.value || isP01Print.value) {
      injectPageStyle("@page { size: A4 landscape; margin: 8mm 10mm; }");
    } else {
      injectPageStyle("@page { size: A4 portrait; margin: 0; }");
      if (!isAnyLegacyPrint.value) {
        await nextTick();
        await fitPageToA4();
      }
    }

    // Ukuran akhir baru stabil di titik ini — kabari parent (preview dialog)
    await nextTick();
    notifyParentReady();

    if (!isPreview.value) {
      setTimeout(() => window.print(), 400);
    }
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state">Data SPK tidak ditemukan.</div>
  <div v-else-if="!isLoaded" class="loading-state">
    Mempersiapkan Dokumen Cetak...
  </div>

  <div v-else class="print-root" :class="{ 'preview-mode': isPreview }">
    <!-- Banner mode preview -->
    <div v-if="isPreview" class="preview-banner">
      🔒 MODE PREVIEW — Dokumen ini tidak dapat dicetak/disimpan. Aktivitas
      tercatat: {{ authStore.userName }}.
    </div>

    <!-- Watermark tile, hanya render di mode preview -->
    <div v-if="isPreview" class="preview-watermark" aria-hidden="true">
      <span v-for="(t, i) in watermarkTiles" :key="i" class="wm-tile">{{
        t
      }}</span>
    </div>

    <!-- Pesan yang MUNCUL kalau print tetap ke-trigger (fallback CSS) -->
    <div class="preview-print-blocked-msg">
      Dokumen ini tidak dapat dicetak melalui mode Preview.<br />
      Silakan gunakan tombol "Cetak" resmi di halaman SPK.
    </div>
    <!-- ══════════════════════════════════════════════
       FORMAT LAMA — khusus Workshop P01
  ══════════════════════════════════════════════ -->
    <template v-if="isP01Print">
      <div class="print-container-p01">
        <div class="print-page-p01">
          <div class="header-row-p01">
            <div class="title-main-p01">SURAT PERINTAH KERJA</div>
            <div class="title-po-p01">PO : {{ spk.spk_nomor_po || "-" }}</div>
          </div>

          <div class="body-p01">
            <!-- Kiri -->
            <div class="kiri-p01">
              <table class="info-table-p01">
                <tbody>
                  <tr>
                    <td class="w-label-p01">Nomor SPK</td>
                    <td class="w-colon-p01">:</td>
                    <td>
                      <span class="fw-p01">{{ spk.spk_nomor }}</span>
                      <span v-if="spk.spk_tipe" class="ml-8-p01 text-xs-p01">
                        Tipe SPK : <strong>{{ spk.spk_tipe }}</strong>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Tanggal SPK</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ tglIndo(spk.spk_tanggal) }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Jenis Order</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ spk.jo_nama }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Nama Desain</td>
                    <td class="w-colon-p01">:</td>
                    <td class="fw-p01">{{ spk.spk_nama }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Jumlah</td>
                    <td class="w-colon-p01">:</td>
                    <td>
                      {{ Number(spk.spk_jumlah).toLocaleString("id-ID") }}
                    </td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Ukuran</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ sizeUkuranStr }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Kain</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ spk.spk_kain }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Gramasi</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ spk.spk_gramasi || "-" }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Finishing</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ spk.spk_finishing }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Date Line</td>
                    <td class="w-colon-p01">:</td>
                    <td class="fw-p01">{{ tglIndo(spk.spk_dateline) }}</td>
                  </tr>
                  <tr>
                    <td class="w-label-p01">Workshop</td>
                    <td class="w-colon-p01">:</td>
                    <td>{{ spk.spk_cab }} ({{ spk.spk_workshop }})</td>
                  </tr>
                </tbody>
              </table>

              <div class="fw-p01 text-xs-p01 mt-1-p01">
                DIKERJAKAN DI {{ spk.spk_cab }} {{ spk.spk_workshop }}
              </div>

              <div class="img-center-p01">
                <img
                  v-if="resolvedImageUrl"
                  :src="resolvedImageUrl"
                  class="img-fit-p01"
                />
              </div>

              <div
                v-if="ketKomponenList.length > 0"
                class="ket-box-p01 mt-2-p01"
              >
                <div class="ket-title-p01">Keterangan Komponen :</div>
                <pre class="ket-pre-p01">{{ spkKetKomponenText }}</pre>
              </div>

              <div v-if="sizes.length > 0" class="ket-box-p01 mt-2-p01">
                <div class="ket-title-p01">
                  Size : Lebar &amp; Panjang Badan
                </div>
                <pre class="ket-pre-p01">{{ sizeLebarPanjangStr || "-" }}</pre>
              </div>
            </div>

            <!-- Kanan: Ket. Produksi -->
            <div class="kanan-p01">
              <div class="ket-box-p01">
                <div class="ket-title-p01">Ket. Produksi :</div>
                <pre class="ket-pre-p01">{{ spk.spk_keterangan }}</pre>
              </div>
            </div>
          </div>

          <div class="ttd-wrap-p01">
            <table class="ttd-table-p01">
              <tr>
                <td width="50%">MO</td>
                <td width="50%">CMO</td>
              </tr>
              <tr>
                <td class="sign-space-p01">
                  <img
                    :src="getSignatureUrl(spk.user_create)"
                    class="ttd-img-p01"
                    @error="handleSignatureError"
                  />
                  <div class="sign-name-p01">{{ spk.user_create }}</div>
                </td>
                <td class="sign-space-p01">
                  <img
                    :src="getSignatureUrl(spk.spk_cmo)"
                    class="ttd-img-p01"
                    @error="handleSignatureError"
                  />
                  <div class="sign-name-p01">{{ spk.spk_cmo || "-" }}</div>
                </td>
              </tr>
            </table>
            <div class="qr-box-p01">
              <qrcode-vue :value="spk.spk_nomor" :size="60" level="L" />
            </div>
          </div>

          <div class="footer-note-p01">
            Dibuat Oleh: {{ spk.user_create }}
            {{ formatWaktu(spk.date_create) }}
          </div>
        </div>

        <!-- Alokasi — tetap halaman terpisah kalau ada -->
        <div v-if="alokasi.length > 0" class="print-page-p01 alokasi-page-p01">
          <h2 class="alokasi-title-p01">ALOKASI PENGIRIMAN :</h2>
          <table class="alokasi-table-p01 mt-2-p01">
            <thead>
              <tr>
                <th class="text-left-p01 pl-2-p01">Alokasi</th>
                <th width="80" class="text-center-p01">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, idx) in alokasi" :key="idx">
                <td class="pl-2-p01">{{ a.kota || a.alamat }}</td>
                <td class="text-center-p01">
                  {{ Number(a.jumlah).toLocaleString("id-ID") }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="fw-p01 text-left-p01 pl-2-p01">Total</td>
                <td class="fw-p01 text-center-p01">
                  {{
                    alokasi
                      .reduce((s, a) => s + (Number(a.jumlah) || 0), 0)
                      .toLocaleString("id-ID")
                  }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════
       SPANDUK/MMT — Workshop P02/P05, gaya SO landscape 2-copy
  ══════════════════════════════════════════════ -->
    <template v-else-if="isSpandukMmtPrint">
      <div class="print-container-so">
        <div class="print-wrapper-so">
          <div
            v-for="copy in 2"
            :key="'spk-so-' + copy"
            class="print-half-so"
            :class="{ 'border-right-so': copy === 1 }"
          >
            <div class="header-row-so">
              <div class="title-main-so">SURAT PERINTAH KERJA</div>
              <div class="title-po-so">PO : {{ spk.spk_nomor_po || "-" }}</div>
            </div>

            <table class="info-table-so">
              <tbody>
                <tr>
                  <td class="w-label-so">Nomor SPK</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ spk.spk_nomor }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Tanggal SPK</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ tglIndo(spk.spk_tanggal) }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Jenis Order</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ spk.jo_nama }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Nama Desain</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ spk.spk_nama }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Jumlah</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">
                    {{ Number(spk.spk_jumlah).toLocaleString("id-ID") }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Ukuran</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">
                    {{ spk.spk_panjang }} X {{ spk.spk_lebar }} M
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Bahan</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ spk.spk_kain }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Gramasi</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ spk.spk_gramasi || "-" }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Finishing</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ spk.spk_finishing }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Date Line</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ tglIndo(spk.spk_dateline) }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Workshop</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">
                    {{ spk.spk_cab }} ({{ spk.spk_workshop }}).
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Status Client</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">
                    <span
                      :class="{
                        'highlight-yellow-so': spk.cus_perfect === 'Y',
                      }"
                    >
                      {{ spk.cus_perfect === "Y" ? "PERFECT" : "REGULER" }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Alokasi</td>
                  <td class="w-colon-so">:</td>
                  <td colspan="3">{{ alokasi.length > 0 ? "YA" : "TIDAK" }}</td>
                </tr>
                <tr>
                  <td class="w-label-so align-top-so">Keterangan</td>
                  <td class="w-colon-so align-top-so">:</td>
                  <td colspan="3" class="val-desc-so">
                    <div v-if="spkKetKomponenText" style="margin-bottom: 5px">
                      <pre class="val-pre-so">
Keterangan Komponen :
{{ spkKetKomponenText }}</pre
                      >
                    </div>
                    <pre class="val-pre-so">{{ spk.spk_keterangan }}</pre>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="layout-box-so">
              <div class="img-box-so">
                <div class="ukuran-header-so">
                  {{ spk.jo_nama }} {{ spk.spk_panjang }} X
                  {{ spk.spk_lebar }} M
                </div>
                <img v-if="resolvedImageUrl" :src="resolvedImageUrl" />
              </div>
            </div>

            <div class="bottom-ttd-wrapper-so">
              <table class="ttd-table-simple-so">
                <tr>
                  <td width="50%">MO</td>
                  <td width="50%">CMO</td>
                </tr>
                <tr>
                  <td class="sign-space-simple-so">
                    <img
                      :src="getSignatureUrl(spk.user_create)"
                      class="ttd-img-simple-so"
                      @error="handleSignatureError"
                    />
                    <div class="sign-name-so">{{ spk.user_create }}</div>
                  </td>
                  <td class="sign-space-simple-so">
                    <img
                      :src="getSignatureUrl(spk.spk_cmo)"
                      class="ttd-img-simple-so"
                      @error="handleSignatureError"
                    />
                    <div class="sign-name-so">{{ spk.spk_cmo || "-" }}</div>
                  </td>
                </tr>
              </table>
              <div class="qr-box-so mt-auto-so">
                <qrcode-vue :value="spk.spk_nomor" :size="65" level="L" />
              </div>
            </div>

            <div class="footer-note-so">
              Dibuat Oleh: {{ spk.user_create }}
              {{ formatWaktu(spk.date_create) }}
            </div>
          </div>

          <!-- Alokasi — halaman terpisah, sama gaya panel SO -->
          <div v-if="alokasi.length > 0" class="print-half-so alokasi-panel-so">
            <h2 class="alokasi-title-so">ALOKASI PENGIRIMAN :</h2>
            <div class="alokasi-cols-so mt-2-so">
              <table
                class="alokasi-table-so"
                v-for="(chunk, idx) in alokasiChunks"
                :key="idx"
              >
                <thead>
                  <tr>
                    <th class="text-left-so pl-2-so">Alokasi</th>
                    <th width="60" class="text-center-so">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, i2) in chunk" :key="i2">
                    <td class="pl-2-so">{{ a.kota || a.alamat }}</td>
                    <td class="text-center-so">
                      {{ Number(a.jumlah).toLocaleString("id-ID") }}
                    </td>
                  </tr>
                </tbody>
                <tfoot v-if="idx === alokasiChunks.length - 1">
                  <tr>
                    <td class="fw-so text-left-so pl-2-so">Total</td>
                    <td class="fw-so text-center-so">
                      {{
                        alokasi
                          .reduce((s, a) => s + (Number(a.jumlah) || 0), 0)
                          .toLocaleString("id-ID")
                      }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════
       FORMAT BARU — semua workshop selain P01
  ══════════════════════════════════════════════ -->
    <template v-else>
      <!-- ══════════════════════════════════════════════
         HALAMAN 1 — Data SPK
    ══════════════════════════════════════════════ -->
      <div
        class="print-page page-1"
        :class="{ 'print-page--multi': p1MultiPage }"
        ref="p1PageEl"
      >
        <div
          class="page1-scale-inner"
          ref="p1InnerEl"
          :style="{
            height: p1ScaledHeightStyle,
            overflow: p1Scale < 1 ? 'hidden' : 'visible',
            transform: `scale(${p1Scale})`,
            transformOrigin: 'top center',
          }"
        >
          <!-- Header -->
          <div class="ph">
            <div class="ph-left">
              <img src="@/assets/logo.png" class="ph-logo" />
            </div>
            <div class="ph-center">
              <div class="ph-title">Surat Perintah Kerja</div>
            </div>
            <div class="ph-right">
              <div class="ph-nomor">{{ spk.spk_nomor }}</div>
              <div class="ph-meta">Tgl: {{ tglIndo(spk.spk_tanggal) }}</div>
              <div class="ph-meta">Workshop: {{ spk.spk_cab }}</div>
            </div>
          </div>

          <!-- Body halaman 1 -->
          <div class="p1-body">
            <!-- Baris 1: Info SO (kiri) + Gambar (kanan) -->
            <div class="p1-row-top">
              <div class="box p1-info">
                <div class="box-title">Referensi Sales Order</div>
                <table class="ft">
                  <tr>
                    <td class="fl">No. SO</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_so_ref || "-" }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Nama pekerjaan</td>
                    <td class="fc">:</td>
                    <td class="fv fw">{{ spk.spk_nama }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Customer</td>
                    <td class="fc">:</td>
                    <td class="fv">
                      <div class="fv-between">
                        <span>{{ spk.spk_cus_kode }}</span>
                        <span
                          v-if="spk.cus_perfect === 'Y'"
                          class="proses-bg bg-yellow-light"
                        >
                          PERFECT
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="fl">No. MAP</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_memo || "-" }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Jenis order</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.jo_nama }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Kepentingan</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_statuskerja }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Qty order</td>
                    <td class="fc">:</td>
                    <td class="fv fw">
                      {{ Number(spk.spk_jumlah).toLocaleString("id-ID") }} pcs
                    </td>
                  </tr>
                  <tr>
                    <td class="fl">Kain</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_kain }}</td>
                  </tr>
                  <tr v-if="spk.spk_gramasi">
                    <td class="fl">Gramasi</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_gramasi }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Finishing</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_finishing }}</td>
                  </tr>
                  <tr v-if="spk.spk_warna_badan">
                    <td class="fl">Warna</td>
                    <td class="fc">:</td>
                    <td class="fv">
                      {{
                        [
                          spk.spk_warna_badan,
                          spk.spk_warna_lengan,
                          spk.spk_warna_lain,
                        ]
                          .filter(Boolean)
                          .join(" / ")
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="fl">No. PO</td>
                    <td class="fc">:</td>
                    <td class="fv">{{ spk.spk_nomor_po || "-" }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Dateline</td>
                    <td class="fc">:</td>
                    <td class="fv fw">{{ tglIndo(spk.spk_dateline) }}</td>
                  </tr>
                  <tr>
                    <td class="fl">Proses</td>
                    <td class="fc">:</td>
                    <td class="fv">
                      <template v-if="prosesChips.length">
                        <span
                          v-for="p in prosesChips"
                          :key="p"
                          class="proses-bg"
                          :class="
                            p === 'DTF' ? 'bg-blue-light' : 'bg-green-light'
                          "
                        >
                          {{ p }}
                        </span>
                      </template>
                      <span v-else class="muted">—</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div class="p1-img-col">
                <div class="box img-box-wrap">
                  <div class="box-title">Gambar desain</div>
                  <div class="img-box">
                    <img
                      v-if="resolvedImageUrl"
                      :src="resolvedImageUrl"
                      class="design-img"
                    />
                    <div
                      v-else-if="!isLoadingImage"
                      class="muted"
                      style="font-size: 8pt"
                    >
                      (Tidak ada gambar desain)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baris 2: Detail Size -->
            <div v-if="sizes.length > 0" class="box mb-6">
              <div class="box-title">Detail size</div>
              <table class="dt">
                <thead>
                  <tr>
                    <th class="tc">Size</th>
                    <th class="tc">Qty</th>
                    <th v-if="hasAtasan" class="tc">LD</th>
                    <th v-if="hasAtasan" class="tc">PB</th>
                    <th v-if="hasPlPendek" class="tc">PL Pendek</th>
                    <th v-if="hasPlPanjang" class="tc">PL Panjang</th>
                    <th v-if="hasAtasan" class="tc">P.Bahu</th>
                    <th v-if="hasAtasan" class="tc">L.Lengan</th>
                    <th v-if="hasAtasan" class="tc">L.Manset</th>
                    <th v-if="hasBawahan" class="tc">L.Pinggang</th>
                    <th v-if="hasBawahan" class="tc">P.Celana</th>
                    <th v-if="hasBawahan" class="tc">L.Panggul</th>
                    <th v-if="hasBawahan" class="tc">L.Paha</th>
                    <th v-if="hasBawahan" class="tc">Pesak</th>
                    <th v-if="hasBawahan" class="tc">L.Lutut</th>
                    <th v-if="hasBawahan" class="tc">L.Bawah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sz in sizes" :key="sz.size">
                    <td class="tc">{{ sz.size }}</td>
                    <td class="tc">
                      {{ Number(sz.qty).toLocaleString("id-ID") }}
                    </td>
                    <td v-if="hasAtasan" class="tc">{{ sz.ld || 0 }}</td>
                    <td v-if="hasAtasan" class="tc">{{ sz.pb || 0 }}</td>
                    <td v-if="hasPlPendek" class="tc">
                      {{ sz.pl_pendek || 0 }}
                    </td>
                    <td v-if="hasPlPanjang" class="tc">
                      {{ sz.pl_panjang || 0 }}
                    </td>
                    <td v-if="hasAtasan" class="tc">{{ sz.p_bahu || 0 }}</td>
                    <td v-if="hasAtasan" class="tc">{{ sz.l_lengan || 0 }}</td>
                    <td v-if="hasAtasan" class="tc">{{ sz.l_manset || 0 }}</td>
                    <td v-if="hasBawahan" class="tc">
                      {{ sz.l_pinggang || 0 }}
                    </td>
                    <td v-if="hasBawahan" class="tc">{{ sz.p_celana || 0 }}</td>
                    <td v-if="hasBawahan" class="tc">
                      {{ sz.l_panggul || 0 }}
                    </td>
                    <td v-if="hasBawahan" class="tc">{{ sz.l_paha || 0 }}</td>
                    <td v-if="hasBawahan" class="tc">{{ sz.pesak || 0 }}</td>
                    <td v-if="hasBawahan" class="tc">{{ sz.l_lutut || 0 }}</td>
                    <td v-if="hasBawahan" class="tc">{{ sz.l_bawah || 0 }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td class="tc fw">Total</td>
                    <td class="tc fw">
                      {{ totalQty.toLocaleString("id-ID") }}
                    </td>
                    <td
                      :colspan="
                        (hasAtasan ? 5 : 0) +
                        (hasPlPendek ? 1 : 0) +
                        (hasPlPanjang ? 1 : 0) +
                        (hasBawahan ? 7 : 0)
                      "
                    ></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Baris 3: MKB (atas) -->
            <div class="box mb-6">
              <div class="box-title">Kebutuhan Bahan (MKB)</div>
              <table class="dt">
                <thead>
                  <tr>
                    <th style="width: 24px">No</th>
                    <th style="width: 80px">No. MKB</th>
                    <th style="width: 70px">Kode</th>
                    <th>Nama Bahan</th>
                    <th style="width: 50px">Warna</th>
                    <th style="width: 40px">Babaran</th>
                    <th style="width: 45px" class="tr">Butuh</th>
                    <th style="width: 35px">Sat</th>
                    <th style="width: 100px">Bahan Datang</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, idx) in mkbDetail" :key="idx">
                    <td class="tc">{{ idx + 1 }}</td>
                    <td>{{ m.Nomor }}</td>
                    <td>{{ m.Kode }}</td>
                    <td>{{ m.NamaBahan }}</td>
                    <td>{{ m.Warna }}</td>
                    <td>{{ m.Babaran }}</td>
                    <td class="tr">
                      {{ Number(m.Butuh).toLocaleString("id-ID") }}
                    </td>
                    <td>{{ m.Satuan }}</td>
                    <td class="bahan-datang-cell">
                      {{ m.BahanDatang || "—" }}
                    </td>
                  </tr>
                  <tr v-if="mkbDetail.length === 0">
                    <td colspan="9" class="tc muted">Belum ada MKB</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Baris 4: Komponen Potong (kiri) + MKA (kanan) -->
            <div class="p1-row-potong-mka mb-6">
              <!-- Kiri: Komponen Potong -->
              <div class="box">
                <div class="box-title">Komponen Potong</div>
                <table class="dt">
                  <thead>
                    <tr>
                      <th style="width: 24px">No</th>
                      <th style="width: 80px">Kode</th>
                      <th>Nama komponen</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in komponenPotong" :key="idx">
                      <td class="tc">{{ idx + 1 }}</td>
                      <td>{{ item.Kode }}</td>
                      <td>{{ item.Nama }}</td>
                    </tr>
                    <tr v-if="komponenPotong.length === 0">
                      <td colspan="3" class="tc muted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Kanan: MKA + (Special Process JIKA dipindah) -->
              <div
                style="
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  min-width: 0;
                "
              >
                <div v-if="hasMkaFromMap" class="box mka-narrow">
                  <div class="box-title">
                    Aksesoris &amp; Babaran (BAST MAP {{ spk.spk_memo }})
                  </div>
                  <table v-if="mkaFromMap.komponen.length" class="dt dt-narrow">
                    <thead>
                      <tr>
                        <th>Komponen</th>
                        <th>Warna</th>
                        <th class="tc">Babaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(k, idx) in mkaFromMap.komponen" :key="idx">
                        <td>{{ k.komponen }}</td>
                        <td>{{ k.warna || "-" }}</td>
                        <td class="tc">
                          {{ Number(k.babaran).toLocaleString("id-ID") }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table
                    v-if="mkaFromMap.sizeBreakdown.length"
                    class="dt dt-narrow"
                  >
                    <thead>
                      <tr>
                        <th>Komponen</th>
                        <th>Size</th>
                        <th class="tc">Babaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(s, idx) in mkaFromMap.sizeBreakdown"
                        :key="idx"
                      >
                        <td>{{ s.komponen }}</td>
                        <td>{{ s.size }}</td>
                        <td class="tc">
                          {{ Number(s.babaran).toLocaleString("id-ID") }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table class="dt dt-narrow">
                    <thead>
                      <tr>
                        <th>Kode</th>
                        <th>Nama</th>
                        <th class="tr">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(a, idx) in mkaFromMap.aksesoris" :key="idx">
                        <td class="fw">{{ a.kode }}</td>
                        <td>{{ a.nama }}</td>
                        <td class="tr">{{ a.qty }}</td>
                      </tr>
                      <tr v-if="mkaFromMap.aksesoris.length === 0">
                        <td colspan="3" class="tc muted">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else class="box mka-narrow">
                  <div class="box-title">Kebutuhan Aksesoris (MKA)</div>
                  <table class="dt dt-narrow">
                    <thead>
                      <tr>
                        <th style="width: 30px">Kode</th>
                        <th>Nama</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(k, idx) in ketKomponenList" :key="idx">
                        <td class="tc fw">{{ k.kode }}</td>
                        <td>
                          {{ k.nama }}<span v-if="k.ket"> — {{ k.ket }}</span>
                        </td>
                      </tr>
                      <tr v-if="ketKomponenList.length === 0">
                        <td colspan="2" class="tc muted">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- SPECIAL PROCESS (Muncul di sini HANYA JIKA dipindah) -->
                <div v-if="isMoveSpecialProcess" class="box mka-narrow">
                  <div class="box-title">Keterangan special process</div>
                  <div
                    class="ket-list"
                    style="font-size: 7.5pt; padding: 4px 6px"
                  >
                    <div
                      v-for="(k, idx) in keteranganKhusus"
                      :key="idx"
                      class="ket-item"
                    >
                      {{ idx + 1 }}. {{ k }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baris 5: Special Process (Normal) + Second Process -->
            <div
              class="p1-row-komp mb-6"
              :class="{
                'no-special':
                  keteranganKhusus.length === 0 || isMoveSpecialProcess,
              }"
            >
              <!-- SPECIAL PROCESS (Muncul di posisi asli JIKA TIDAK dipindah) -->
              <div
                v-if="keteranganKhusus.length > 0 && !isMoveSpecialProcess"
                class="box"
              >
                <div class="box-title">Keterangan special process</div>
                <div class="ket-list ket-small">
                  <div
                    v-for="(k, idx) in keteranganKhusus"
                    :key="idx"
                    class="ket-item"
                  >
                    {{ idx + 1 }}. {{ k }}
                  </div>
                </div>
              </div>

              <!-- SECOND PROCESS -->
              <div
                class="box"
                :class="{
                  'full-span':
                    keteranganKhusus.length === 0 || isMoveSpecialProcess,
                }"
              >
                <div class="box-title">Second Process (Cetak/Bordir)</div>
                <table class="dt">
                  <thead>
                    <tr>
                      <th style="width: 24px">No</th>
                      <th style="width: 80px">Kode</th>
                      <th>Nama</th>
                      <th style="width: 60px">Proses</th>
                      <th style="width: 90px">Penempatan</th>
                      <th style="width: 70px">Ukuran</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in komponenCetakBordir" :key="idx">
                      <td class="tc">{{ idx + 1 }}</td>
                      <td>{{ item.Kode }}</td>
                      <td>{{ item.Nama }}</td>
                      <td>
                        <span
                          class="proses-bg"
                          :class="
                            item.Proses === 'DTF'
                              ? 'bg-blue-light'
                              : 'bg-green-light'
                          "
                        >
                          {{ item.Proses }}
                        </span>
                      </td>
                      <td>{{ item.Penempatan }}</td>
                      <td>{{ item.Ukuran }}</td>
                    </tr>
                    <tr v-if="komponenCetakBordir.length === 0">
                      <td colspan="6" class="tc muted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Baris 6: Keterangan Produksi — full width sekarang -->
            <div class="box mb-6">
              <div class="box-title">Keterangan produksi</div>
              <pre class="ket-pre ket-produksi">{{
                spk.spk_keterangan || "—"
              }}</pre>
            </div>

            <!-- Planning PPIC — breakdown target per proses, diisi manual pakai bolpoin -->
            <div class="box mb-6">
              <div class="box-title">
                Planning PPIC — Target Tiap Proses
                <span class="box-title-note">(diisi manual)</span>
              </div>
              <table class="planning-tbl">
                <thead>
                  <tr>
                    <th>Cutting</th>
                    <th>Sablon / Bordir</th>
                    <th>Sewing</th>
                    <th>Packing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="planning-cell"></td>
                    <td class="planning-cell"></td>
                    <td class="planning-cell"></td>
                    <td class="planning-cell"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- TTD -->
            <div class="ttd-row">
              <table class="ttd-tbl">
                <tr>
                  <td class="ttd-hd">Dibuat (PPIC)</td>
                  <td class="ttd-hd">Manajer Produksi</td>
                </tr>
                <tr>
                  <td class="ttd-space"></td>
                  <td class="ttd-space"></td>
                </tr>
                <tr>
                  <td class="ttd-name">{{ spk.user_create || "" }}</td>
                  <td class="ttd-name"></td>
                </tr>
              </table>
              <div class="qr-wrap">
                <qrcode-vue :value="spk.spk_nomor" :size="56" level="L" />
                <div class="qr-lbl">{{ spk.spk_nomor }}</div>
              </div>
            </div>
          </div>

          <!-- Footer halaman 1 -->
          <div class="pf">
            <span
              >Dibuat: {{ spk.user_create }} —
              {{ formatWaktu(spk.date_create) }}</span
            >
            <span>Referensi SO: {{ spk.spk_so_ref || "—" }}</span>
          </div>
        </div>
      </div>
      <!-- ══════════════════════════════════════════════
         HALAMAN 2 — Layout Proses Sewing
    ══════════════════════════════════════════════ -->
      <div v-if="hasLayoutProses" class="print-page page-2">
        <!-- Header -->
        <div class="ph">
          <div class="ph-left">
            <img src="@/assets/logo.png" class="ph-logo" />
          </div>
          <div class="ph-center">
            <div class="ph-title">Layout Proses Sewing</div>
          </div>
          <div class="ph-right">
            <div class="ph-nomor">{{ spk.spk_nomor }}</div>
            <div class="ph-meta">{{ spk.spk_nama }}</div>
          </div>
        </div>
        <!-- Info header layout -->
        <div class="layout-info">
          <div class="li-item">
            <div class="li-lbl">No memo</div>
            <div class="li-val">{{ layoutHeader?.lh_no_memo || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">Nama memo</div>
            <div class="li-val">{{ layoutHeader?.lh_nama_memo || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">Line</div>
            <div class="li-val">{{ layoutHeader?.lh_line || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">POJ</div>
            <div class="li-val">{{ layoutHeader?.lh_poj || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">MP</div>
            <div class="li-val">{{ layoutHeader?.lh_mp || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">JK</div>
            <div class="li-val">{{ layoutHeader?.lh_jk || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">Efisiensi</div>
            <div class="li-val">{{ layoutHeader?.lh_efisiensi || "—" }}</div>
          </div>
          <div class="li-item">
            <div class="li-lbl">Target/hari</div>
            <div class="li-val">{{ layoutHeader?.lh_target_hari || "—" }}</div>
          </div>
        </div>
        <!-- Tabel Proof (kiri) & Sewing (kanan) — side by side seperti Excel -->
        <div class="layout-row">
          <div class="layout-section layout-section--half">
            <div class="layout-sec-title proof-title">Proses</div>
            <table class="lt lt-compact">
              <colgroup>
                <col style="width: 14%" />
                <col style="width: 7%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 10%" />
                <col style="width: 27%" />
                <col style="width: 6%" />
              </colgroup>
              <thead>
                <tr>
                  <th>Operator</th>
                  <th class="tr">MP</th>
                  <th class="tr">CT(dt)</th>
                  <th class="tr">CT(jm)</th>
                  <th>Sepatu</th>
                  <th>K.Jrm</th>
                  <th>M/C</th>
                  <th>Proses</th>
                  <th class="tc">No</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in [...layoutProof].reverse()" :key="i">
                  <td class="ellip">{{ r.nama_op }}</td>
                  <td class="tr">{{ r.mp }}</td>
                  <td class="tr">{{ r.ct_dt }}</td>
                  <td class="tr">{{ r.ct_jam }}</td>
                  <td class="ellip">{{ r.sepatu }}</td>
                  <td class="ellip">{{ r.kjarum }}</td>
                  <td class="wrap">{{ r.mc }}</td>
                  <td class="wrap">{{ r.proses }}</td>
                  <td class="tc">{{ r.no_urut }}</td>
                </tr>
                <tr v-if="layoutProof.length === 0">
                  <td colspan="9" class="tc muted">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="layout-section layout-section--half">
            <div class="layout-sec-title sewing-title">Proses</div>
            <table class="lt lt-compact">
              <colgroup>
                <col style="width: 6%" />
                <col style="width: 27%" />
                <col style="width: 10%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 7%" />
                <col style="width: 14%" />
              </colgroup>
              <thead>
                <tr>
                  <th class="tc">No</th>
                  <th>Proses</th>
                  <th>M/C</th>
                  <th>Uk.Jrm</th>
                  <th>Sepatu</th>
                  <th class="tr">CT(jm)</th>
                  <th class="tr">CT(dt)</th>
                  <th class="tr">MP</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in [...layoutSewing].reverse()" :key="i">
                  <td class="tc">{{ r.no_urut }}</td>
                  <td class="wrap">{{ r.proses }}</td>
                  <td class="wrap">{{ r.mc }}</td>
                  <td class="ellip">{{ r.ukjarum }}</td>
                  <td class="ellip">{{ r.sepatu }}</td>
                  <td class="tr">{{ r.ct_jam }}</td>
                  <td class="tr">{{ r.ct_dt }}</td>
                  <td class="tr">{{ r.mp }}</td>
                  <td class="ellip">{{ r.nama_op }}</td>
                </tr>
                <tr v-if="layoutSewing.length === 0">
                  <td colspan="9" class="tc muted">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Summary & Total -->
        <div class="layout-section">
          <table class="lt lt-summary">
            <tbody>
              <tr>
                <td class="ls-lbl">SUMMARY 1</td>
                <td class="tr">{{ layoutHeader?.lh_summary1_mp }}</td>
                <td class="tr">{{ layoutHeader?.lh_summary1_ct_dt }}</td>
                <td class="tr">{{ layoutHeader?.lh_summary1_ct_jam }}</td>
                <td class="ls-lbl">SUMMARY 2</td>
                <td class="tr">{{ layoutHeader?.lh_summary2_ct_jam }}</td>
                <td class="tr">{{ layoutHeader?.lh_summary2_ct_dt }}</td>
                <td class="tr">{{ layoutHeader?.lh_summary2_mp }}</td>
              </tr>
              <tr>
                <td class="ls-lbl">TOTAL</td>
                <td class="tr">{{ layoutHeader?.lh_total_mp }}</td>
                <td class="tr">{{ layoutHeader?.lh_total_ct_dt }}</td>
                <td class="tr" colspan="5">
                  {{ layoutHeader?.lh_total_ct_jam }}
                </td>
              </tr>
              <tr>
                <td class="ls-lbl">TOTAL DALAM MENIT</td>
                <td class="tr" colspan="7">
                  {{ layoutHeader?.lh_total_menit }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Footer halaman 2 -->
        <div class="pf">
          <span
            >Dibuat: {{ spk.user_create }} —
            {{ formatWaktu(spk.date_create) }}</span
          >
          <div class="qr-wrap-footer">
            <qrcode-vue :value="spk.spk_nomor" :size="40" level="L" />
            <span>{{ spk.spk_nomor }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: #555;
}

/* ── Root ── */
.print-root {
  font-family: "Arial", "Helvetica", sans-serif;
  font-size: 8.5pt;
  color: #000;
  background: #fff;
}

/* ── Page ── */
.print-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 10mm 12mm 10mm 12mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* ── Print header ── */
.ph {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #1565c0;
  padding-bottom: 6px;
  margin-bottom: 8px;
}
.ph-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.ph-center {
  flex: 1;
  text-align: center;
}
.ph-right {
  flex: 1;
  text-align: right;
}
.ph-title {
  font-size: 14pt;
  font-weight: bold;
  letter-spacing: 1px;
  color: #000;
}
.ph-nomor {
  font-size: 11pt;
  font-weight: bold;
}
.ph-meta {
  font-size: 7.5pt;
  color: #444;
}
.ph-logo {
  height: 36px;
  object-fit: contain;
}

/* ── Page 1 layout ── */
.p1-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.p1-row-top {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}
.p1-info {
  flex: 1;
  min-width: 0;
}
.p1-img-col {
  flex: 1.3;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.p1-row-komp {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 8px;
}
.p1-row-komp.no-special {
  display: block; /* Menghapus sistem grid agar kotak otomatis 100% */
  width: 100%;
}
.p1-row-ket {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 8px;
}

.p1-row-komp .full-span,
.p1-row-ket .full-span {
  grid-column: 1 / -1;
}
/* Special process dan gudang lebih compact */
.ket-small {
  font-size: 7.5pt;
  max-height: 60px;
  overflow: hidden;
}

/* Keterangan produksi — lebih tinggi, font sedikit lebih besar */
.ket-produksi {
  font-size: 9pt;
  min-height: 54px;
  line-height: 1.6;
  padding: 6px 8px;
}
.mb-6 {
  margin-bottom: 6px;
}

/* ── Boxes ── */
.box {
  border: 0.5px solid #aaa;
  border-radius: 3px;
  overflow: hidden;
}
.box-title {
  font-size: 7pt;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 3px 6px;
  background: #f5f5f5;
  color: #000;
  border-bottom: 0.5px solid #aaa;
}
.box-title-note {
  font-weight: normal;
  text-transform: none;
  color: #888;
  font-size: 6.5pt;
  margin-left: 4px;
}
.planning-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  table-layout: fixed;
}
.planning-tbl thead th {
  background: #f5f5f5;
  color: #000;
  padding: 3px 5px;
  font-weight: bold;
  border: 0.5px solid #ccc;
  text-align: center;
}
.planning-cell {
  border: 0.5px solid #ccc;
  border-top: none;
  height: 22px;
}
.img-box-wrap {
  display: flex;
  flex-direction: column;
}
.img-box {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  flex: 1;
}
.design-img {
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
}

/* ── Field table ── */
.ft {
  width: 100%;
  border-collapse: collapse;
  padding: 4px 6px;
  display: table;
}
.ft tr td {
  padding: 1px 6px;
  vertical-align: top;
  font-size: 8pt;
}
.fl {
  width: 80px;
  color: #555;
  white-space: nowrap;
}
.fc {
  width: 10px;
  color: #555;
}
.fv {
  color: #000;
}
.fw {
  font-weight: bold;
}

/* ── Data table ── */
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
}
.dt thead th {
  background: #f5f5f5;
  color: #000;
  padding: 3px 5px;
  font-weight: bold;
  border-bottom: 0.5px solid #ccc;
  white-space: nowrap;
  text-align: left;
}
.dt tbody td {
  padding: 2px 5px;
  border-bottom: 0.5px solid #eee;
}
.dt tfoot td {
  padding: 3px 5px;
  background: #f5f5f5;
  border-top: 1px solid #ccc;
  font-weight: bold;
}

/* ── Proses (Back Color Saja) ── */
.proses-bg {
  display: inline-block;
  margin-right: 4px;
  padding: 0 4px; /* Sedikit spasi agar tidak terlalu mepet teks */
  color: #000; /* Teks tetap hitam normal */
}
.fv-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bg-green-light {
  background-color: #c8e6c9; /* Hijau muda */
}
.bg-blue-light {
  background-color: #bbdefb; /* Biru muda */
}
.bg-yellow-light {
  background-color: #fff59d; /* Kuning muda, sama pola dgn secondary process */
}

/* Tambahkan ini untuk memastikan table header yang center benar-benar di tengah */
.dt thead th.tc {
  text-align: center;
}

/* ── Keterangan ── */
.ket-list {
  padding: 4px 6px;
  font-size: 8pt;
}
.ket-item {
  margin-bottom: 2px;
}
.ket-pre {
  font-family: inherit;
  font-size: 8pt;
  white-space: pre-wrap;
  margin: 4px 6px;
}
.muted {
  color: #999;
  font-style: italic;
}

/* ── TTD ── */
.ttd-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;
  padding-top: 6px;
  border-top: 0.5px solid #ccc;
}
.ttd-tbl {
  border-collapse: collapse;
  font-size: 8pt;
}
.ttd-hd {
  border: 0.5px solid #000;
  padding: 3px 24px;
  text-align: center;
  font-weight: bold;
  background: #f5f5f5;
}
.ttd-space {
  border: 0.5px solid #000;
  height: 36px;
  padding: 0 24px;
}
.ttd-name {
  border: 0.5px solid #000;
  padding: 2px 6px;
  font-size: 7.5pt;
  text-align: center;
}
.qr-wrap {
  text-align: center;
}
.qr-lbl {
  font-size: 6.5pt;
  margin-top: 2px;
  color: #555;
  font-family: "Courier New", monospace;
}

/* ── Page footer ── */
.pf {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 0.5px solid #ccc;
  padding-top: 3px;
  margin-top: 6px;
  font-size: 6.5pt;
  color: #666;
}
.qr-wrap-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 6.5pt;
}

/* ── Auto-fit A4 (Page 1, format baru) ── */
.print-page.page-1 {
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  margin: 0 auto;
  padding: 10mm 12mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.print-page.page-1.print-page--multi {
  height: auto;
  max-height: none;
  overflow: visible;
}

.page1-scale-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0 !important; /* <--- KUNCI UTAMA: Mencegah tergencet! */
  transform-origin: top center;
}

/* Cegah baris tabel/box kepotong di tengah pas fallback multi-halaman */
.dt tbody tr {
  break-inside: avoid;
}
.box {
  break-inside: avoid;
}

.ttd-row,
.pf {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* ── Page 2 — Layout ── */
.layout-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 6px 8px;
  background: #f5f5f5;
  border: 0.5px solid #ccc;
  border-radius: 3px;
  margin-bottom: 8px;
}
.li-item {
  font-size: 7.5pt;
}
.li-lbl {
  color: #777;
  font-size: 7pt;
  text-transform: uppercase;
}
.li-val {
  font-weight: bold;
  color: #000;
}

.layout-section {
  margin-bottom: 8px;
}
.layout-sec-title {
  font-size: 8pt;
  font-weight: bold;
  color: #fff;
  padding: 3px 8px;
  border-radius: 3px 3px 0 0;
}
.proof-title {
  background: #455a64;
}
.sewing-title {
  background: #1565c0;
}

/* ── Layout table ── */
.lt {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  border: 0.5px solid #ccc;
}
.lt thead th {
  background: #f5f5f5;
  color: #000;
  padding: 3px 5px;
  font-weight: bold;
  border: 0.5px solid #ccc;
  white-space: nowrap;
  text-align: left;
}
.lt tbody td {
  padding: 2px 5px;
  border-bottom: 0.5px solid #eee;
  border-right: 0.5px solid #eee;
}
.lt tbody tr:nth-child(even) td {
  background: #fafafa;
}

.tr {
  text-align: right;
}
.tc {
  text-align: center;
}

.bahan-datang-cell {
  white-space: pre-line;
  font-size: 7pt;
  color: #2e7d32;
}

.merged-title {
  background: #1565c0;
}

/* ══ FORMAT LAMA (P01) ══ */
.print-page-old {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 12mm;
  box-sizing: border-box;
  font-family: "Arial", sans-serif;
  font-size: 9pt;
  color: #000;
}
.old-border {
  border: 1px solid #b8860b;
  padding: 14px 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.old-header-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}
.old-title {
  font-size: 15pt;
  font-weight: bold;
  text-decoration: underline;
}
.old-po {
  font-size: 12pt;
  font-weight: bold;
  text-decoration: underline;
}
.old-body {
  flex: 1;
  position: relative;
}
.old-info-table {
  border-collapse: collapse;
  font-size: 9pt;
}
.old-info-table td {
  padding: 1.5px 4px;
  vertical-align: top;
}
.old-lbl {
  width: 90px;
  font-weight: normal;
}
.old-colon {
  width: 10px;
}
.old-tipe {
  position: absolute;
  top: 40px;
  left: 320px;
  font-weight: bold;
  font-size: 9pt;
}
.old-img-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 140px;
  max-height: 200px;
  margin: 14px 0;
}
.old-img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}
.old-section {
  margin-top: 12px;
}
.old-section-title {
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 4px;
  font-size: 9pt;
}
.old-komp-list {
  font-size: 8.5pt;
}
.old-komp-item {
  margin-bottom: 2px;
}
.old-size-pre,
.old-ket-pre {
  font-family: inherit;
  font-size: 8.5pt;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.4;
}
.old-ket-produksi {
  margin-top: 14px;
}
.old-ttd-wrap {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.old-ttd-table {
  width: 220px;
  border-collapse: collapse;
  text-align: center;
  font-size: 9pt;
  border: 1px solid #000;
}
.old-ttd-table td {
  border: 1px solid #000;
  padding: 3px;
  font-weight: bold;
}
.old-sign-space {
  position: relative;
  height: 55px;
  vertical-align: bottom;
  padding-bottom: 3px;
}
.old-ttd-img {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  height: 36px;
  object-fit: contain;
}
.old-sign-name {
  position: absolute;
  bottom: 3px;
  left: 0;
  right: 0;
  font-size: 8pt;
}
.old-footer {
  text-align: center;
  font-size: 8pt;
  margin-top: 6px;
  color: #444;
}

.layout-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.layout-section--half {
  flex: 1 1 0;
  min-width: 0;
  margin-bottom: 0;
}
.lt-compact {
  font-size: 6.3pt;
  table-layout: fixed;
  width: 100%;
}
.lt-compact th,
.lt-compact td {
  padding: 2px 3px;
  overflow: hidden;
  white-space: nowrap;
}
.lt-compact .ellip {
  text-overflow: ellipsis;
}
.lt-compact .wrap {
  white-space: normal;
  word-break: break-word;
  line-height: 1.15;
}

.lt-summary {
  font-size: 7.5pt;
}
.lt-summary .ls-lbl {
  font-weight: bold;
  background: #f5f5f5;
  padding: 3px 6px;
}
.lt-summary td {
  border: 0.5px solid #ccc;
  padding: 3px 6px;
}

.alokasi-page-old {
  page-break-before: always;
  break-before: page;
}
.alokasi-title-old {
  font-size: 15pt;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 12px;
}
.alokasi-table-old {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  color: #000;
}
.alokasi-table-old th,
.alokasi-table-old td {
  border: 1px solid #000;
  padding: 4px 6px;
  color: #000 !important;
}
.alokasi-table-old th {
  font-weight: bold;
}
.text-left {
  text-align: left;
}
.text-center {
  text-align: center;
}
.pl-2 {
  padding-left: 8px;
}
.mt-2 {
  margin-top: 8px;
}

.p1-row-potong-mka {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 8px;
  align-items: start;
}
.mka-narrow {
  font-size: 6.8pt;
}
.dt-narrow {
  font-size: 6.8pt;
  margin-bottom: 4px;
}
.dt-narrow th,
.dt-narrow td {
  padding: 2px 4px;
}
/* ── Screen preview ── */
@media screen {
  body {
    background: #555;
  }
  .print-page {
    background: white;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
    margin: 20px auto;
  }
}

/* ── Print ── */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  body {
    margin: 0;
    padding: 0;
    background: white;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-page {
    margin: 0;
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  .print-page:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
}

/* ── Mode Preview: banner ── */
.preview-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #d32f2f;
  color: white;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  letter-spacing: 0.02em;
}

/* ── Mode Preview: watermark tile, transparan, non-interaktif ── */
.preview-watermark {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 40px 24px;
  padding: 20px;
  pointer-events: none;
  overflow: hidden;
  transform: rotate(-28deg) scale(1.4);
  transform-origin: center;
}
.wm-tile {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 0, 0, 0.12);
  white-space: nowrap;
  user-select: none;
}

/* ── Mode Preview: cegah select/drag sebagai deterrent tambahan
   (BUKAN pencegahan screenshot — screenshot tetap tidak bisa dicegah
   dari sisi web sama sekali) ── */
.preview-mode {
  user-select: none;
}
.preview-mode img {
  -webkit-user-drag: none;
  pointer-events: none;
}

/* ── Fallback CSS: kalau print TETAP ke-trigger (misal lewat menu
   browser yang tidak bisa di-preventDefault via JS), swap seluruh
   konten jadi pesan blokir. Ini lapisan JAMINAN UTAMA, jauh lebih
   reliable daripada blokir keydown di atas. ── */
.preview-print-blocked-msg {
  display: none;
}
@media print {
  .print-root.preview-mode .print-page,
  .print-root.preview-mode .print-page-old,
  .print-root.preview-mode .preview-banner,
  .print-root.preview-mode .preview-watermark {
    display: none !important;
  }
  .print-root.preview-mode .preview-print-blocked-msg {
    display: flex !important;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 16pt;
    font-weight: 700;
    text-align: center;
    color: #000;
  }
}

/* ══ SPANDUK/MMT — gaya SO landscape 2-copy ══ */
.print-container-so {
  width: 100%;
  margin: 0 auto;
  background: #fff;
  font-family: "Arial", sans-serif;
  font-size: 8.5pt;
  color: #000;
  box-sizing: border-box;
}
.print-wrapper-so {
  display: flex;
  flex-wrap: wrap;
  width: 297mm;
  min-height: 209mm;
  margin: 0 auto;
  box-sizing: border-box;
}
.print-half-so {
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  padding: 7mm 10mm 7mm 9mm;
  box-sizing: border-box;
  min-width: 0;
  height: 209mm;
  overflow: hidden;
}
.border-right-so {
  border-right: 1px dotted #999;
}
.alokasi-panel-so {
  flex: 0 0 100%;
  width: 100%;
  padding: 7mm 10mm;
  break-before: page;
  page-break-before: always;
}
.header-row-so {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  align-items: flex-end;
}
.title-main-so,
.title-po-so {
  font-size: 12pt;
  font-weight: bold;
  text-decoration: underline;
  line-height: 1;
}
.info-table-so {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 4px;
}
.info-table-so td {
  padding: 1px 0;
  vertical-align: top;
}
.w-label-so {
  width: 80px;
}
.w-colon-so {
  width: 12px;
  text-align: center;
}
.align-top-so {
  vertical-align: top;
}
.val-desc-so {
  padding-top: 2px;
}
.val-pre-so {
  font-family: inherit;
  font-size: 7.5pt;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.2;
}
.highlight-yellow-so {
  background: yellow;
  padding: 1px 4px;
  font-weight: bold;
  border: 1px solid #ccc;
}
.layout-box-so {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 15px;
  margin-top: 8px;
}
.img-box-so {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.img-box-so img {
  max-width: 100%;
  max-height: 190px;
  object-fit: contain;
}
.ukuran-header-so {
  text-align: center;
  font-weight: bold;
  font-size: 8pt;
  letter-spacing: 1px;
  margin-bottom: 5px;
}
.bottom-ttd-wrapper-so {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 12px;
}
.ttd-table-simple-so {
  width: 180px;
  border-collapse: collapse;
  text-align: center;
  font-size: 7.5pt;
  border: 1px solid #000;
  color: #000;
}
.ttd-table-simple-so td {
  border: 1px solid #000;
  padding: 2px;
  font-weight: bold;
  color: #000 !important;
}
.sign-space-simple-so {
  position: relative;
  height: 45px;
  vertical-align: bottom;
  padding-bottom: 2px;
}
.ttd-img-simple-so {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  height: 32px;
  object-fit: contain;
  z-index: 1;
}
.sign-name-so {
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  z-index: 2;
}
.qr-box-so {
  flex-shrink: 0;
}
.mt-auto-so {
  margin-top: auto;
}
.footer-note-so {
  text-align: right;
  font-size: 6.5pt;
  border-top: 1px solid #000;
  padding-top: 3px;
  margin-top: 5px;
}
.alokasi-title-so {
  font-size: 15pt;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 12px;
}
.alokasi-table-so {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  color: #000;
}
.alokasi-table-so th,
.alokasi-table-so td {
  border: 1px solid #000;
  padding: 4px 6px;
  color: #000 !important;
}
.alokasi-cols-so {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}
.alokasi-cols-so .alokasi-table-so {
  flex: 1;
  min-width: 0;
}
.fw-so {
  font-weight: bold;
}
.text-left-so {
  text-align: left;
}
.text-center-so {
  text-align: center;
}
.pl-2-so {
  padding-left: 8px;
}
.mt-2-so {
  margin-top: 8px;
}

@media screen {
  .print-container-so {
    background: #555;
    padding: 20px;
  }
  .print-wrapper-so {
    background: white;
    margin: 0 auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
}

/* ══ SPK P01 — landscape, 2 halaman, kanan = Ket. Produksi ══ */
.print-container-p01 {
  width: 100%;
  font-family: "Arial", sans-serif;
  font-size: 8.5pt;
  color: #000;
}
.print-page-p01 {
  width: 277mm;
  min-height: 190mm;
  margin: 0 auto;
  padding: 4mm 6mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.alokasi-page-p01 {
  page-break-before: always;
  break-before: page;
}
.header-row-p01 {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  align-items: flex-end;
}
.title-main-p01,
.title-po-p01 {
  font-size: 13pt;
  font-weight: bold;
  text-decoration: underline;
  line-height: 1;
}
.body-p01 {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  margin-top: 5px;
}
.kiri-p01 {
  flex: 0 0 55%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.kanan-p01 {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 8pt;
}
.info-table-p01 {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 4px;
}
.info-table-p01 td {
  padding: 1px 0;
  vertical-align: top;
}
.w-label-p01 {
  width: 80px;
}
.w-colon-p01 {
  width: 12px;
  text-align: center;
}
.fw-p01 {
  font-weight: bold;
}
.text-xs-p01 {
  font-size: 7.5pt;
}
.ml-8-p01 {
  margin-left: 8px;
}
.mt-1-p01 {
  margin-top: 4px;
}
.mt-2-p01 {
  margin-top: 8px;
}
.img-center-p01 {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  padding: 8px 0;
}
.img-fit-p01 {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.ket-box-p01 {
  display: flex;
  flex-direction: column;
}
.ket-title-p01 {
  font-weight: bold;
  font-size: 8.5pt;
  margin-bottom: 4px;
  border-bottom: 1px solid #000;
  padding-bottom: 2px;
}
.ket-pre-p01 {
  font-family: inherit;
  font-size: 8pt;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.35;
}
.ttd-wrap-p01 {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 12px;
}
.ttd-table-p01 {
  width: 180px;
  border-collapse: collapse;
  text-align: center;
  font-size: 7.5pt;
  border: 1px solid #000;
  color: #000;
}
.ttd-table-p01 td {
  border: 1px solid #000;
  padding: 2px;
  font-weight: bold;
  color: #000 !important;
}
.sign-space-p01 {
  position: relative;
  height: 45px;
  vertical-align: bottom;
  padding-bottom: 2px;
}
.ttd-img-p01 {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  height: 32px;
  object-fit: contain;
  z-index: 1;
}
.sign-name-p01 {
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  z-index: 2;
}
.footer-note-p01 {
  text-align: right;
  font-size: 6.5pt;
  border-top: 1px solid #000;
  padding-top: 3px;
  margin-top: 5px;
}
.alokasi-title-p01 {
  font-size: 15pt;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 12px;
}
.alokasi-table-p01 {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  color: #000;
}
.alokasi-table-p01 th,
.alokasi-table-p01 td {
  border: 1px solid #000;
  padding: 4px 6px;
  color: #000 !important;
}
.text-left-p01 {
  text-align: left;
}
.text-center-p01 {
  text-align: center;
}
.pl-2-p01 {
  padding-left: 8px;
}

@media screen {
  .print-page-p01 {
    background: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    margin: 20px auto;
  }
}
@media print {
  .print-page-p01 {
    margin: 0 auto;
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  .print-page-p01:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
}
</style>
