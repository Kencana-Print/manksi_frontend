<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRoute } from "vue-router";
import { useToast } from "vue-toastification";
import { soToSpkService } from "@/services/mmt/soToSpkService";
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
const alokasi = ref<any[]>([]);
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

const resolveDesignImage = () => {
  if (!spk.value.spk_nomor) {
    resolvedImageUrl.value = "";
    return;
  }

  if (isKaosan.value && isNewFormatSO.value && spk.value.spk_invdc) {
    kaosanExtIndex.value = 0;
    const cab = spk.value.spk_cab || "HO-";
    const invdc = spk.value.spk_invdc;
    const cabangKaosan = invdc.includes(".") ? invdc.split(".")[0] : cab;
    isLoadingImage.value = true;
    tryKaosanExt(cabangKaosan, invdc, 0);
    return;
  }

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

const tglIndo = (val: any) => {
  if (!val || String(val).startsWith("0000")) return "-";
  const str = String(val).trim();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Jika ISO dengan T (hasil JSON Date -> UTC), konversi ke lokal agar tidak geser -1 hari
  if (str.includes("T")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  // Jika YYYY-MM-DD atau YYYY-MM-DD HH:mm:ss → ambil Y-M-D mentah tanpa timezone
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]} ${months[Number(m[2])-1]} ${m[1]}`;
  // fallback
  const s = str.substring(0,10);
  const [y, mo, d] = s.split("-");
  if (y && mo && d) return `${d} ${months[Number(mo)-1]} ${y}`;
  return "-";
};

const formatWaktu = (isoStr: string) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formattedKeterangan = computed(() => {
  const ket = (spk.value.spk_keterangan || "").trim();
  const memo = (spk.value.spk_memo || "").trim();
  const repeat = (
    spk.value.spk_repeat ||
    spk.value.Repeat ||
    spk.value.so_repeat ||
    ""
  ).trim();

  const prefixes: string[] = [];
  if (memo) {
    prefixes.push(`Acc seperti Memo : ${memo}`);
  }
  if (repeat) {
    prefixes.push(`SO Repeat : ${repeat}`);
  }

  const prefixText = prefixes.join("\n");
  if (prefixText) {
    return ket ? `${prefixText}\n${ket}` : prefixText;
  }
  return ket;
});

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

const totalAlokasiQty = computed(() =>
  alokasi.value.reduce((s, a) => s + (Number(a.jumlah) || 0), 0),
);

// Batas baris yang muat di setengah halaman (50% x 210mm, font 8pt).
// Lebih dari ini → tabel alokasi pindah full-width ke kertas berikutnya
// agar tidak terpotong (overflow hidden di half).
const ALOKASI_SIDE_MAX = 25;
const isAlokasiLong = computed(() => alokasi.value.length > ALOKASI_SIDE_MAX);

// Kapasitas baris yang muat dalam 1 kolom halaman alokasi penuh
// (landscape 210mm, padding 12mm, font 8.5pt) ± 30 baris.
const ALOKASI_FLOW_COL_ROWS = 30;
// Maksimal kolom per halaman agar alamat tujuan tetap terbaca.
const ALOKASI_FLOW_COLS_PER_PAGE = 2;

type AlokasiColumn = {
  start: number;
  rows: any[];
  isLast: boolean;
};

// Pecah alokasi menjadi kolom-kolom: 30 baris pertama di kolom kiri,
// sisanya di kolom kanan (mis. 43 baris → 30 kiri + 13 kanan).
const alokasiFlowColumns = computed<AlokasiColumn[]>(() => {
  const rows = alokasi.value;
  if (!rows.length) return [];

  const cols: AlokasiColumn[] = [];
  for (let i = 0; i < rows.length; i += ALOKASI_FLOW_COL_ROWS) {
    cols.push({
      start: i,
      rows: rows.slice(i, i + ALOKASI_FLOW_COL_ROWS),
      isLast: false,
    });
  }
  if (cols.length) cols[cols.length - 1].isLast = true;
  return cols;
});

const alokasiFlowPages = computed<AlokasiColumn[][]>(() => {
  const pages: AlokasiColumn[][] = [];
  for (
    let i = 0;
    i < alokasiFlowColumns.value.length;
    i += ALOKASI_FLOW_COLS_PER_PAGE
  ) {
    pages.push(
      alokasiFlowColumns.value.slice(i, i + ALOKASI_FLOW_COLS_PER_PAGE),
    );
  }
  return pages;
});

const prosesChips = computed(() => {
  const finishing = (spk.value.spk_finishing || "").toLowerCase();
  if (finishing.includes("polos")) return [];

  const arr: string[] = [];
  if (spk.value.spk_sablon === "Y") arr.push("SABLON");
  if (spk.value.spk_bordir === "Y") arr.push("BORDIR");
  if (spk.value.spk_sublim === "Y") arr.push("SUBLIM");
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
  return komponenPotong.value.length > 5 && keteranganKhusus.value.length > 0;
});

const normalizeCab = (cab: any) => {
  if (!cab) return "";
  const s = String(cab).toUpperCase().trim();
  if (s === "1" || s === "01") return "P01";
  if (s === "2" || s === "02") return "P02";
  if (s === "4" || s === "04") return "P04";
  if (s === "5" || s === "05") return "P05";
  return s;
};

const currentCab = computed(() => normalizeCab(spk.value.spk_cab));
const currentCab2 = computed(() => normalizeCab(spk.value.spk_cab2));

const printOrientation = ref<"portrait" | "landscape">("landscape");

const isP04Print = computed(
  () => currentCab.value === "P04" || currentCab2.value === "P04",
);

const isP01Print = computed(
  () => currentCab.value === "P01" || currentCab2.value === "P01",
);

const isSpandukMmtPrint = computed(
  () =>
    ["P02", "P05"].includes(currentCab.value) ||
    ["P02", "P05"].includes(currentCab2.value),
);

const isP05Print = computed(
  () => currentCab.value === "P05" || currentCab2.value === "P05",
);

// Injeksi style @page presisi yang dikenali semua browser modern
const injectPrintStyle = () => {
  const oldStyle = document.getElementById("spk-dynamic-print-style");
  if (oldStyle) oldStyle.remove();

  const isLand = printOrientation.value === "landscape";
  const styleEl = document.createElement("style");
  styleEl.id = "spk-dynamic-print-style";

  styleEl.innerHTML = `
    @page {
      size: ${isLand ? "297mm 210mm" : "210mm 297mm"};
      margin: 0;
    }
  `;
  document.head.appendChild(styleEl);
};

const triggerPrint = async () => {
  injectPrintStyle();
  if (printOrientation.value === "portrait") {
    await fitPageToA4();
  }
  await nextTick();
  // Memberikan waktu browser merefresh layout sebelum dialog print keluar
  setTimeout(() => {
    window.print();
  }, 100);
};

// Dari mode Preview: buka URL yang sama TANPA ?preview=1 di tab baru —
// di sanalah dokumen asli (termasuk lanjutan alokasi full-width) bisa dicetak.
const openRealPrint = () => {
  window.open(route.path, "_blank");
};

const spkKetKomponenText = computed(() =>
  ketKomponenList.value
    .map((k) => `${k.kode}= ${k.nama}${k.ket ? ": " + k.ket : ""}`)
    .join("\n"),
);

const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  return `/file-gambar/${encodeURIComponent(kodeUser.trim().toUpperCase())}.jpg`;
};

const handleSignatureError = (e: Event) => {
  (e.target as HTMLImageElement).style.opacity = "0";
};

const sizeUkuranStr = computed(() => {
  if (!sizes.value.length) return spk.value.spk_ukuran || "-";
  return sizes.value.map((s: any) => `${s.size}=${s.qty}`).join(", ");
});

const sizeLebarPanjangStr = computed(() => {
  if (!sizes.value.length) return "";
  return sizes.value
    .map((s: any) => `${s.size}=  L: ${s.ld || 0}   P: ${s.pb || 0}`)
    .join("\n");
});

const p1PageEl = ref<HTMLElement | null>(null);
const p1InnerEl = ref<HTMLElement | null>(null);
const p1Scale = ref(1);
const p1ScaledHeightStyle = ref<string>("auto");
const p1MultiPage = ref(false);

const MIN_PRINT_SCALE = 0.65;

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

  p1Scale.value = 1;
  p1MultiPage.value = false;
  p1ScaledHeightStyle.value = "auto";

  await nextTick();
  await waitForImages(p1InnerEl.value);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  const pageHeight = p1PageEl.value.clientHeight || 1122;
  const contentHeight = p1InnerEl.value.scrollHeight;

  if (!pageHeight || !contentHeight) return;

  const computedStyle = window.getComputedStyle(p1PageEl.value);
  const paddingTop = parseFloat(computedStyle.paddingTop) || 15;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 15;
  const availableHeight = Math.max(
    0,
    pageHeight - paddingTop - paddingBottom - 25,
  );

  if (contentHeight <= availableHeight) {
    p1Scale.value = 1;
    p1ScaledHeightStyle.value = "auto";
    return;
  }

  const requiredScale = availableHeight / contentHeight;

  if (requiredScale >= MIN_PRINT_SCALE) {
    p1Scale.value = Math.min(1, requiredScale);
    p1ScaledHeightStyle.value = `${contentHeight}px`;
    p1MultiPage.value = false;
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

onMounted(() => {
  if (isPreview.value) {
    window.addEventListener("keydown", blockPrintShortcut, true);
    document.addEventListener("contextmenu", blockContextMenu);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", blockPrintShortcut, true);
  document.removeEventListener("contextmenu", blockContextMenu);
  const oldStyle = document.getElementById("spk-dynamic-print-style");
  if (oldStyle) oldStyle.remove();
});

onMounted(async () => {
  try {
    const [resDetail, resLayout, resAlokasi] = await Promise.all([
      soToSpkService.getDetail(printNomor),
      soToSpkService.getLayoutProses(printNomor),
      soToSpkService.getAlokasi(printNomor),
    ]);

    const d = resDetail.data?.data || {};
    spk.value = d.header || {};
    resolveDesignImage();

    // Default otomatis: P04 Portrait, selain itu (P05, P02, P01) Landscape
    if (isP04Print.value) {
      printOrientation.value = "portrait";
    } else {
      printOrientation.value = "landscape";
    }

    sizes.value = (d.dtlSize || []).filter((s: any) => Number(s.qty) > 0);
    komponenPotong.value = d.komponenSpk?.ListPotong || [];
    komponenCetakBordir.value = d.komponenSpk?.ListCetakBordir || [];
    keteranganKhusus.value = (d.keteranganKhusus || []).filter((k: string) =>
      k?.trim(),
    );
    ketKomponenList.value = (d.ketKomponenList || []).filter(
      (k: any) => k.checked,
    );

    alokasi.value = Array.isArray(resAlokasi.data?.data)
      ? resAlokasi.data.data
      : Array.isArray(resAlokasi.data)
        ? resAlokasi.data
        : [];

    layoutHeader.value = resLayout.data?.data?.header || null;
    layoutProof.value = resLayout.data?.data?.proof || [];
    layoutSewing.value = resLayout.data?.data?.sewing || [];

    if (spk.value.spk_so_ref) {
      const resMkb = await soToSpkService.getMkbDetail(spk.value.spk_so_ref);
      mkbDetail.value = resMkb.data?.data || [];
    }

    if (spk.value.spk_memo) {
      try {
        const resMka = await api.get(
          `/mmt/spk/form/mka-from-map/${encodeURIComponent(spk.value.spk_memo)}`,
        );
        mkaFromMap.value = resMka.data?.data || {
          aksesoris: [],
          komponen: [],
          sizeBreakdown: [],
        };
      } catch {
        mkaFromMap.value = { aksesoris: [], komponen: [], sizeBreakdown: [] };
      }
    }

    isLoaded.value = true;

    await nextTick();

    const printRoot = document.querySelector<HTMLElement>("body");
    if (printRoot) {
      await waitForImages(printRoot);
    }

    if (printOrientation.value === "portrait") {
      await fitPageToA4();
    }

    injectPrintStyle();
    await nextTick();
    notifyParentReady();
  } catch (err) {
    console.error("Gagal memuat dokumen SPK:", err);
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
    <!-- BAR KONTROL ORIENTASI CETAK -->
    <div v-if="!isPreview" class="print-control-bar no-print">
      <div class="orientation-selector">
        <span class="control-label">Pilih Orientasi Kertas:</span>
        <label :class="{ active: printOrientation === 'portrait' }">
          <input
            type="radio"
            value="portrait"
            v-model="printOrientation"
            @change="
              () => {
                injectPrintStyle();
                fitPageToA4();
              }
            "
          />
          📄 Portrait (Tegak)
        </label>
        <label :class="{ active: printOrientation === 'landscape' }">
          <input
            type="radio"
            value="landscape"
            v-model="printOrientation"
            @change="injectPrintStyle"
          />
          📑 Landscape (Mendatar)
        </label>
      </div>

      <button class="btn-print" @click="triggerPrint">🖨️ Cetak Dokumen</button>
    </div>

    <!-- Banner Mode Preview -->
    <div v-if="isPreview" class="preview-banner">
      🔒 MODE PREVIEW — Dokumen ini tidak dapat dicetak/disimpan. Aktivitas
      tercatat: {{ authStore.userName }}.
      <button class="btn-print-real" @click="openRealPrint">
        🖨️ Buka Halaman Cetak
      </button>
    </div>

    <!-- Watermark Tile -->
    <div v-if="isPreview" class="preview-watermark" aria-hidden="true">
      <span v-for="(t, i) in watermarkTiles" :key="i" class="wm-tile">
        {{ t }}
      </span>
    </div>

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
                  <tr>
                    <td class="w-label-p01">Alokasi</td>
                    <td class="w-colon-p01">:</td>
                    <td>
                      <strong>{{ alokasi.length > 0 ? "YA" : "TIDAK" }}</strong>
                    </td>
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

            <div class="kanan-p01">
              <div class="ket-box-p01">
                <div class="ket-title-p01">Ket. Produksi :</div>
                <pre class="ket-pre-p01">{{ formattedKeterangan }}</pre>
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

        <!-- Halaman Alokasi P01 -->
        <div v-if="alokasi.length > 0" class="alokasi-print-page-so">
          <div class="header-row-p01">
            <div class="title-main-p01">
              ALOKASI PENGIRIMAN — SPK: {{ spk.spk_nomor }}
            </div>
            <div class="title-po-p01">PO: {{ spk.spk_nomor_po || "-" }}</div>
          </div>

          <table class="alokasi-table-simple">
            <thead>
              <tr>
                <th style="width: 40px" class="text-center-so">No</th>
                <th class="text-left-so" style="width: 250px">Nama Toko</th>
                <th class="text-left-so">Kota / Alamat</th>
                <th style="width: 120px" class="text-center-so">
                  Jumlah (Pcs)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, idx) in alokasi" :key="`alokasi-p01-${idx}`">
                <td class="text-center-so">{{ idx + 1 }}</td>
                <td>{{ a.toko || "-" }}</td>
                <td>{{ a.kota || a.alamat || a.tujuan || "-" }}</td>
                <td class="text-center-so">
                  {{ Number(a.jumlah || 0).toLocaleString("id-ID") }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td
                  colspan="3"
                  class="fw-so text-right"
                  style="padding-right: 15px"
                >
                  Total Alokasi
                </td>
                <td class="fw-so text-center-so">
                  {{ totalAlokasiQty.toLocaleString("id-ID") }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════
        SPANDUK/MMT — Workshop P02/P05 (Landscape 2 Kolom)
    ══════════════════════════════════════════════ -->
    <template v-else-if="isSpandukMmtPrint">
      <div class="print-container-so">
        <div class="print-wrapper-so">
          <!-- SISI KIRI: DATA SPK UTAMA -->
          <div class="print-half-so border-right-so">
            <div class="header-row-so">
              <div class="title-main-so">SURAT PERINTAH KERJA</div>
              <div class="title-po-so">PO : {{ spk.spk_nomor_po || "-" }}</div>
            </div>

            <table class="info-table-so">
              <colgroup>
                <col style="width: 80px" />
                <col style="width: 12px" />
                <col style="width: auto" />
                <col v-if="isP05Print" style="width: 65px" />
              </colgroup>
              <tbody>
                <tr>
                  <td class="w-label-so">Nomor SPK</td>
                  <td class="w-colon-so">:</td>
                  <td class="fw-so">{{ spk.spk_nomor }}</td>
                  <td v-if="isP05Print" rowspan="3" class="qr-col-p05">
                    <qrcode-vue :value="spk.spk_nomor" :size="48" level="L" />
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Tanggal SPK</td>
                  <td class="w-colon-so">:</td>
                  <td>{{ tglIndo(spk.spk_tanggal) }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Jenis Order</td>
                  <td class="w-colon-so">:</td>
                  <td>{{ spk.jo_nama }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Nama Desain</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1" class="fw-so">
                    {{ spk.spk_nama }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Jumlah</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ Number(spk.spk_jumlah).toLocaleString("id-ID") }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Ukuran</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ spk.spk_panjang }} X {{ spk.spk_lebar }} M
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Bahan</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">{{ spk.spk_kain }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Gramasi</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ spk.spk_gramasi || "-" }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Finishing</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">{{ spk.spk_finishing }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Date Line</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ tglIndo(spk.spk_dateline) }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Workshop</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ spk.spk_cab }} ({{ spk.spk_workshop }}).
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Status Client</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
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
                  <td :colspan="isP05Print ? 2 : 1">
                    <strong>{{ alokasi.length > 0 ? "YA" : "TIDAK" }}</strong>
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so align-top-so">Keterangan</td>
                  <td class="w-colon-so align-top-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1" class="val-desc-so">
                    <div v-if="spkKetKomponenText" style="margin-bottom: 5px">
                      <pre class="val-pre-so">
Keterangan Komponen :&#10;{{ formattedKeterangan }}</pre
                      >
                    </div>
                    <pre class="val-pre-so">{{ formattedKeterangan }}</pre>
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
              <div v-if="!isP05Print" class="qr-box-so mt-auto-so">
                <qrcode-vue :value="spk.spk_nomor" :size="65" level="L" />
              </div>
            </div>

            <div class="footer-note-so">
              Dibuat Oleh: {{ spk.user_create }}
              {{ formatWaktu(spk.date_create) }}
            </div>
          </div>

          <!-- SISI KANAN (KONDISIONAL): TABEL ALOKASI ATAU COPY SPK KE-2 -->

          <!-- Opsi A: Jika ADA Alokasi (dan muat di setengah halaman) -->
          <div v-if="alokasi.length > 0 && !isAlokasiLong" class="print-half-so">
            <div class="header-row-so mb-2-so">
              <div class="title-main-so">ALOKASI PENGIRIMAN</div>
              <div class="title-po-so">PO : {{ spk.spk_nomor_po || "-" }}</div>
            </div>

            <table class="alokasi-table-side-simple">
              <thead>
                <tr>
                  <th style="width: 28px" class="text-center-so">No</th>
                  <th class="text-left-so" style="width: 48%">Nama Toko</th>
                  <th class="text-left-so">Kota</th>
                  <th style="width: 60px" class="text-center-so">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(a, idx) in alokasi" :key="`alokasi-side-${idx}`">
                  <td class="text-center-so">{{ idx + 1 }}</td>
                  <td>{{ a.toko || "-" }}</td>
                  <td>{{ a.kota || a.alamat || a.tujuan || "-" }}</td>
                  <td class="text-center-so">
                    {{ Number(a.jumlah || 0).toLocaleString("id-ID") }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colspan="3"
                    class="fw-so text-right"
                    style="padding-right: 8px"
                  >
                    Total
                  </td>
                  <td class="fw-so text-center-so">
                    {{ totalAlokasiQty.toLocaleString("id-ID") }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Opsi B: Jika TIDAK ADA Alokasi -->
          <div v-else class="print-half-so">
            <div class="header-row-so">
              <div class="title-main-so">SURAT PERINTAH KERJA</div>
              <div class="title-po-so">PO : {{ spk.spk_nomor_po || "-" }}</div>
            </div>

            <table class="info-table-so">
              <colgroup>
                <col style="width: 80px" />
                <col style="width: 12px" />
                <col style="width: auto" />
                <col v-if="isP05Print" style="width: 65px" />
              </colgroup>
              <tbody>
                <tr>
                  <td class="w-label-so">Nomor SPK</td>
                  <td class="w-colon-so">:</td>
                  <td class="fw-so">{{ spk.spk_nomor }}</td>
                  <td v-if="isP05Print" rowspan="3" class="qr-col-p05">
                    <qrcode-vue :value="spk.spk_nomor" :size="48" level="L" />
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Tanggal SPK</td>
                  <td class="w-colon-so">:</td>
                  <td>{{ tglIndo(spk.spk_tanggal) }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Jenis Order</td>
                  <td class="w-colon-so">:</td>
                  <td>{{ spk.jo_nama }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Nama Desain</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1" class="fw-so">
                    {{ spk.spk_nama }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Jumlah</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ Number(spk.spk_jumlah).toLocaleString("id-ID") }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Ukuran</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ spk.spk_panjang }} X {{ spk.spk_lebar }} M
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Bahan</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">{{ spk.spk_kain }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Gramasi</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ spk.spk_gramasi || "-" }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Finishing</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">{{ spk.spk_finishing }}</td>
                </tr>
                <tr>
                  <td class="w-label-so">Date Line</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ tglIndo(spk.spk_dateline) }}
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Workshop</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
                    {{ spk.spk_cab }} ({{ spk.spk_workshop }}).
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so">Status Client</td>
                  <td class="w-colon-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1">
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
                  <td :colspan="isP05Print ? 2 : 1">
                    <strong>TIDAK</strong>
                  </td>
                </tr>
                <tr>
                  <td class="w-label-so align-top-so">Keterangan</td>
                  <td class="w-colon-so align-top-so">:</td>
                  <td :colspan="isP05Print ? 2 : 1" class="val-desc-so">
                    <div v-if="spkKetKomponenText" style="margin-bottom: 5px">
                      <pre class="val-pre-so">
Keterangan Komponen :&#10;{{ formattedKeterangan }}</pre
                      >
                    </div>
                    <pre class="val-pre-so">{{ formattedKeterangan }}</pre>
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
              <div v-if="!isP05Print" class="qr-box-so mt-auto-so">
                <qrcode-vue :value="spk.spk_nomor" :size="65" level="L" />
              </div>
            </div>

            <div class="footer-note-so">
              Dibuat Oleh: {{ spk.user_create }}
              {{ formatWaktu(spk.date_create) }}
            </div>
          </div>
        </div>
      </div>

      <!-- LANJUTAN ALOKASI: full-width ke kertas berikutnya bila > 25 baris.
           Dipecah per kolom: 30 baris kiri, sisanya kolom kanan. -->
      <template v-if="isAlokasiLong">
        <div
          v-for="(pageCols, pageIdx) in alokasiFlowPages"
          :key="`alokasi-page-${pageIdx}`"
          class="alokasi-flow-so"
        >
          <div class="header-row-so mb-2-so">
            <div class="title-main-so">
              ALOKASI PENGIRIMAN
              <template v-if="alokasiFlowPages.length > 1">
                ({{ pageIdx + 1 }}/{{ alokasiFlowPages.length }})
              </template>
            </div>
            <div class="title-po-so">PO : {{ spk.spk_nomor_po || "-" }}</div>
          </div>

          <div class="alokasi-flow-columns">
            <table
              v-for="col in pageCols"
              :key="`alokasi-col-${col.start}`"
              class="alokasi-table-simple alokasi-flow-table"
            >
              <thead>
                <tr>
                  <th style="width: 35px" class="text-center-so">No</th>
                  <th class="text-left-so" style="width: 45%">Nama Toko</th>
                  <th class="text-left-so">Kota</th>
                  <th style="width: 80px" class="text-center-so">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(a, idx) in col.rows"
                  :key="`alokasi-flow-${col.start + idx}`"
                >
                  <td class="text-center-so">{{ col.start + idx + 1 }}</td>
                  <td style="overflow-wrap: anywhere; word-break: break-word">
                    {{ a.toko || "-" }}
                  </td>
                  <td style="overflow-wrap: anywhere; word-break: break-word">
                    {{ a.kota || a.alamat || a.tujuan || "-" }}
                  </td>
                  <td class="text-center-so">
                    {{ Number(a.jumlah || 0).toLocaleString("id-ID") }}
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="col.isLast">
                <tr>
                  <td
                    colspan="3"
                    class="fw-so text-right"
                    style="padding-right: 8px"
                  >
                    Total Alokasi
                  </td>
                  <td class="fw-so text-center-so">
                    {{ totalAlokasiQty.toLocaleString("id-ID") }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>
    </template>

    <!-- ══════════════════════════════════════════════
        FORMAT BARU — Workshop P04 & Lainnya
    ══════════════════════════════════════════════ -->
    <template v-else>
      <!-- HALAMAN 1 — SPK UTAMA -->
      <div
        class="print-page page-1"
        :class="{
          'print-page--multi': p1MultiPage,
          'page-landscape-mode': printOrientation === 'landscape',
        }"
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

          <!-- Body Halaman 1 -->
          <div class="p1-body">
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
                    <td class="fl">Alokasi</td>
                    <td class="fc">:</td>
                    <td class="fv">
                      <strong>{{
                        alokasi.length > 0 ? "ADA ALOKASI PENGIRIMAN" : "—"
                      }}</strong>
                    </td>
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

            <!-- Detail Size -->
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

            <!-- MKB -->
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

            <!-- Komponen Potong + MKA -->
            <div class="p1-row-potong-mka mb-6">
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

              <div
                style="
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
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

                <div v-if="isMoveSpecialProcess" class="box mka-narrow">
                  <div class="box-title">Keterangan special process</div>
                  <div
                    class="ket-list"
                    style="font-size: 7.5pt; padding: 3px 5px"
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

            <!-- Special Process + Second Process -->
            <div
              class="p1-row-komp mb-6"
              :class="{
                'no-special':
                  keteranganKhusus.length === 0 || isMoveSpecialProcess,
              }"
            >
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

            <!-- Keterangan Produksi -->
            <div class="box mb-6">
              <div class="box-title">Keterangan produksi</div>
              <pre class="ket-pre ket-produksi">{{
                formattedKeterangan || "—"
              }}</pre>
            </div>

            <!-- Planning PPIC -->
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
                <qrcode-vue :value="spk.spk_nomor" :size="50" level="L" />
                <div class="qr-lbl">{{ spk.spk_nomor }}</div>
              </div>
            </div>
          </div>

          <!-- Footer Halaman 1 -->
          <div class="pf">
            <span>
              Dibuat: {{ spk.user_create }} — {{ formatWaktu(spk.date_create) }}
            </span>
            <span>Referensi SO: {{ spk.spk_so_ref || "—" }}</span>
          </div>
        </div>
      </div>

      <!-- HALAMAN 2 — Layout Proses Sewing -->
      <div
        v-if="hasLayoutProses"
        class="print-page page-2"
        :class="{ 'page-landscape-mode': printOrientation === 'landscape' }"
      >
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

        <div class="pf">
          <span>
            Dibuat: {{ spk.user_create }} — {{ formatWaktu(spk.date_create) }}
          </span>
          <div class="qr-wrap-footer">
            <qrcode-vue :value="spk.spk_nomor" :size="40" level="L" />
            <span>{{ spk.spk_nomor }}</span>
          </div>
        </div>
      </div>

      <!-- HALAMAN 3 — Alokasi Pengiriman untuk Format Baru (Simple) -->
      <div
        v-if="alokasi.length > 0"
        class="print-page page-alokasi-new"
        :class="{ 'page-landscape-mode': printOrientation === 'landscape' }"
      >
        <div class="ph">
          <div class="ph-left">
            <img src="@/assets/logo.png" class="ph-logo" />
          </div>
          <div class="ph-center">
            <div class="ph-title">Alokasi Pengiriman</div>
          </div>
          <div class="ph-right">
            <div class="ph-nomor">{{ spk.spk_nomor }}</div>
            <div class="ph-meta">PO: {{ spk.spk_nomor_po || "—" }}</div>
          </div>
        </div>

        <table class="alokasi-table-simple" style="margin-top: 10px">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center-so">No</th>
              <th class="text-left-so" style="width: 250px">Nama Toko</th>
              <th class="text-left-so">Kota</th>
              <th style="width: 120px" class="text-center-so">Jumlah (Pcs)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, idx) in alokasi" :key="`alokasi-new-${idx}`">
              <td class="text-center-so">{{ idx + 1 }}</td>
              <td>{{ a.toko || "-" }}</td>
              <td>{{ a.kota || a.alamat || a.tujuan || "-" }}</td>
              <td class="text-center-so">
                {{ Number(a.jumlah || 0).toLocaleString("id-ID") }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td
                colspan="3"
                class="fw-so text-right"
                style="padding-right: 15px"
              >
                Total
              </td>
              <td class="fw-so text-center-so">
                {{ totalAlokasiQty.toLocaleString("id-ID") }}
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="pf" style="margin-top: 20px">
          <span>
            Dibuat: {{ spk.user_create }} — {{ formatWaktu(spk.date_create) }}
          </span>
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
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  color: #555;
}

.print-root {
  width: 100%;
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  line-height: 1.2;
  color: #000;
  background: #fff;
}

.print-control-bar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e293b;
  color: #fff;
  padding: 8px 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  font-size: 13px;
}

.orientation-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-weight: bold;
  color: #cbd5e1;
}

.orientation-selector label {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #334155;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.orientation-selector label.active {
  background: #2563eb;
  font-weight: bold;
}

.orientation-selector input {
  cursor: pointer;
}

.btn-print {
  background: #16a34a;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-print:hover {
  background: #15803d;
}

.print-page {
  width: 210mm;
  min-height: 270mm;
  margin: 10px auto;
  padding: 5mm 8mm;
  box-sizing: border-box;
  background: #fff;
  overflow: visible;
  page-break-after: always;
  break-after: page;
}

.print-page.page-landscape-mode {
  width: 297mm;
  min-height: 200mm;
  padding: 4mm 6mm;
}

.print-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.ph {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  border-bottom: 2px solid #1565c0;
  padding-bottom: 4px;
  margin-bottom: 6px;
  min-width: 0;
}

.ph-left,
.ph-center,
.ph-right {
  min-width: 0;
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
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.1;
  color: #000;
}

.ph-nomor {
  font-size: 10.5pt;
  font-weight: 700;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.ph-meta {
  font-size: 7.5pt;
  line-height: 1.2;
  color: #444;
}

.ph-logo {
  display: block;
  width: auto;
  height: 32px;
  max-width: 100%;
  object-fit: contain;
}

.p1-body {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.p1-row-top {
  width: 100%;
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  min-width: 0;
}

.p1-info {
  flex: 1 1 0;
  min-width: 0;
}

.p1-img-col {
  flex: 1.2 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.p1-row-komp {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
  gap: 6px;
  min-width: 0;
}

.p1-row-komp.no-special {
  display: block;
  width: 100%;
}

.p1-row-potong-mka {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  min-width: 0;
}

.page1-scale-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 0;
  transform-origin: top center;
}

.box {
  width: 100%;
  border: 0.5px solid #aaa;
  border-radius: 3px;
  overflow: hidden;
  min-width: 0;
  background: #fff;
  break-inside: avoid;
  page-break-inside: avoid;
}

.box-title {
  font-size: 6.8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 2px 5px;
  background: #f5f5f5;
  color: #000;
  border-bottom: 0.5px solid #aaa;
}

.box-title-note {
  font-weight: 400;
  text-transform: none;
  color: #888;
  font-size: 6.5pt;
  margin-left: 4px;
}

.ft {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.8pt;
}

.ft tr td {
  padding: 0.5px 5px;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.fl {
  width: 75px;
  color: #555;
  white-space: nowrap;
}

.fc {
  width: 10px;
  color: #555;
  text-align: center;
}

.fv {
  color: #000;
  min-width: 0;
}

.fw {
  font-weight: 700;
}

.fv-between {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.planning-tbl {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7pt;
}

.planning-tbl thead th {
  background: #f5f5f5;
  color: #000;
  padding: 2px 4px;
  font-weight: 700;
  border: 0.5px solid #ccc;
  text-align: center;
  white-space: nowrap;
}

.planning-cell {
  border: 0.5px solid #ccc;
  border-top: none;
  height: 18px;
}

.img-box-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.img-box {
  width: 100%;
  min-height: 130px;
  max-height: 165px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  overflow: hidden;
}

.design-img {
  display: block;
  max-width: 100%;
  max-height: 155px;
  width: auto;
  height: auto;
  object-fit: contain;
}

.dt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.2pt;
  min-width: 0;
}

.dt thead th {
  background: #f5f5f5;
  color: #000;
  padding: 2px 4px;
  font-weight: 700;
  border-bottom: 0.5px solid #ccc;
  white-space: nowrap;
  text-align: left;
  overflow: hidden;
}

.dt tbody td {
  padding: 1.5px 4px;
  border-bottom: 0.5px solid #eee;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.dt tfoot td {
  padding: 2px 4px;
  background: #f5f5f5;
  border-top: 1px solid #ccc;
  font-weight: 700;
}

.dt thead th.tc {
  text-align: center;
}

.dt tbody tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

.lt {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.2pt;
  border: 0.5px solid #ccc;
}

.lt thead th {
  background: #f5f5f5;
  color: #000;
  padding: 2px 4px;
  font-weight: 700;
  border: 0.5px solid #ccc;
  white-space: nowrap;
  text-align: left;
  overflow: hidden;
}

.lt tbody td {
  padding: 1.5px 4px;
  border-bottom: 0.5px solid #eee;
  border-right: 0.5px solid #eee;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.lt tbody tr:nth-child(even) td {
  background: #fafafa;
}

.lt-compact {
  width: 100%;
  font-size: 6.2pt;
  table-layout: fixed;
}

.lt-compact th,
.lt-compact td {
  padding: 1.5px 2.5px;
  overflow: hidden;
  white-space: nowrap;
}

.lt-compact .ellip {
  text-overflow: ellipsis;
}

.lt-compact .wrap {
  white-space: normal;
  word-break: break-word;
  line-height: 1.1;
}

.lt-summary {
  font-size: 7.2pt;
}

.lt-summary .ls-lbl {
  font-weight: 700;
  background: #f5f5f5;
  padding: 2px 5px;
}

.lt-summary td {
  border: 0.5px solid #ccc;
  padding: 2px 5px;
}

.tr {
  text-align: right;
}
.tc {
  text-align: center;
}
.text-left {
  text-align: left;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
.pl-2 {
  padding-left: 6px;
}
.mt-2 {
  margin-top: 6px;
}
.mb-6 {
  margin-bottom: 4px !important;
}
.fw-so,
.fw-p01 {
  font-weight: 700;
}

.proses-bg {
  display: inline-block;
  margin-right: 3px;
  padding: 0 3px;
  color: #000;
}

.bg-green-light {
  background-color: #c8e6c9;
}
.bg-blue-light {
  background-color: #bbdefb;
}
.bg-yellow-light {
  background-color: #fff59d;
}

.highlight-yellow-so {
  display: inline-block;
  background: #fff59d;
  padding: 1px 4px;
  font-weight: 700;
  border: 1px solid #ccc;
}

.ket-list {
  padding: 3px 5px;
  font-size: 7.5pt;
}
.ket-item {
  margin-bottom: 1px;
}
.ket-pre {
  margin: 3px 5px;
  font-family: inherit;
  font-size: 7.5pt;
  line-height: 1.25;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ket-small {
  font-size: 7pt;
  max-height: 50px;
  overflow: hidden;
}
.ket-produksi {
  min-height: 32px;
  padding: 4px 6px;
  font-size: 8.5pt;
  line-height: 1.35;
}
.muted {
  color: #999;
  font-style: italic;
}

.layout-info {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 4px 6px;
  background: #f5f5f5;
  border: 0.5px solid #ccc;
  border-radius: 3px;
  margin-bottom: 6px;
}

.li-item {
  min-width: 0;
  font-size: 7.2pt;
  overflow-wrap: anywhere;
}
.li-lbl {
  color: #777;
  font-size: 6.8pt;
  text-transform: uppercase;
}
.li-val {
  font-weight: 700;
  color: #000;
  overflow-wrap: anywhere;
}

.layout-section {
  width: 100%;
  margin-bottom: 6px;
  min-width: 0;
}
.layout-sec-title {
  font-size: 7.5pt;
  font-weight: 700;
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px 3px 0 0;
}
.proof-title {
  background: #455a64;
}
.sewing-title {
  background: #1565c0;
}

.layout-row {
  width: 100%;
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
}
.layout-section--half {
  flex: 1 1 0;
  min-width: 0;
  margin-bottom: 0;
}
.bahan-datang-cell {
  white-space: pre-line;
  font-size: 6.8pt;
  color: #2e7d32;
}

.ttd-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 0.5px solid #ccc;
  break-inside: avoid;
  page-break-inside: avoid;
}

.ttd-tbl {
  border-collapse: collapse;
  font-size: 7.5pt;
}
.ttd-hd {
  border: 0.5px solid #000;
  padding: 2px 18px;
  text-align: center;
  font-weight: 700;
  background: #f5f5f5;
}
.ttd-space {
  border: 0.5px solid #000;
  height: 26px;
  padding: 0 18px;
}
.ttd-name {
  border: 0.5px solid #000;
  padding: 1.5px 4px;
  font-size: 7pt;
  text-align: center;
}

.qr-wrap {
  text-align: center;
  flex-shrink: 0;
}
.qr-lbl {
  font-size: 6pt;
  margin-top: 1px;
  color: #555;
  font-family: "Courier New", monospace;
}

.qr-col-p05 {
  width: 65px;
  vertical-align: top !important;
  text-align: left !important;
  padding-left: 10px !important;
  padding-right: 0 !important;
  padding-top: 0 !important;
}

.qr-col-p05 canvas,
.qr-col-p05 svg {
  display: block;
  margin: 0;
}

.pf {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 0.5px solid #ccc;
  padding-top: 2px;
  margin-top: 4px;
  font-size: 6.2pt;
  color: #666;
  break-inside: avoid;
  page-break-inside: avoid;
}

.qr-wrap-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 6.2pt;
}

/* =========================================================
   FORMAT LAMA P01
========================================================= */
.print-container-p01 {
  width: 100%;
  max-width: 297mm;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  color: #000;
}
.print-page-p01 {
  width: 297mm;
  height: 210mm;
  min-height: 210mm;
  margin: 0 auto;
  padding: 4mm 6mm;
  box-sizing: border-box;
  background: #fff;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}

.header-row-p01 {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 8px;
  min-width: 0;
}
.title-main-p01,
.title-po-p01 {
  font-size: 13pt;
  font-weight: 700;
  text-decoration: underline;
  line-height: 1;
  overflow-wrap: anywhere;
}
.body-p01 {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  margin-top: 5px;
  overflow: hidden;
}
.kiri-p01 {
  flex: 0 0 55%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.kanan-p01 {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  font-size: 8pt;
}

.info-table-p01 {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-bottom: 4px;
}
.info-table-p01 td {
  padding: 1px 0;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.w-label-p01 {
  width: 80px;
}
.w-colon-p01 {
  width: 12px;
  text-align: center;
}
.fw-p01 {
  font-weight: 700;
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
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
.ket-box-p01 {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ket-title-p01 {
  font-weight: 700;
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
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ttd-wrap-p01 {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-top: 12px;
  flex-shrink: 0;
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
  font-weight: 700;
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
  flex-shrink: 0;
}

/* =========================================================
   SPANDUK / MMT FORMAT (P02, P05)
========================================================= */
.print-container-so {
  width: 100%;
  max-width: 297mm;
  margin: 0 auto;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  color: #000;
  box-sizing: border-box;
}
.print-wrapper-so {
  width: 100%;
  max-width: 297mm;
  height: 210mm;
  min-height: 210mm;
  margin: 0 auto;
  display: flex;
  box-sizing: border-box;
  background: #fff;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.print-half-so {
  flex: 0 0 50%;
  width: 50%;
  height: 210mm;
  min-height: 210mm;
  display: flex;
  flex-direction: column;
  padding: 6mm 8mm;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
}
.border-right-so {
  border-right: 1px dotted #999;
}

.header-row-so {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 8px;
  min-width: 0;
}
.title-main-so,
.title-po-so {
  font-size: 12pt;
  font-weight: 700;
  text-decoration: underline;
  line-height: 1;
  overflow-wrap: anywhere;
}

.info-table-so {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-bottom: 4px;
}
.info-table-so td {
  padding: 1px 0;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
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
  overflow-wrap: anywhere;
  word-break: break-word;
}

.layout-box-so {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 15px;
  margin-top: 8px;
  overflow: hidden;
}
.img-box-so {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.img-box-so img {
  display: block;
  max-width: 100%;
  max-height: 190px;
  width: auto;
  height: auto;
  object-fit: contain;
}
.ukuran-header-so {
  text-align: center;
  font-weight: 700;
  font-size: 8pt;
  letter-spacing: 1px;
  margin-bottom: 5px;
}

.bottom-ttd-wrapper-so {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-top: 12px;
  flex-shrink: 0;
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
  font-weight: 700;
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
  flex-shrink: 0;
}

/* =========================================================
   TABEL ALOKASI SEDERHANA & CEPAT (FONT SAMA DENGAN SPK)
========================================================= */
.alokasi-print-page-so {
  width: 100%;
  max-width: 297mm;
  min-width: 297mm;
  height: 210mm;
  min-height: 210mm;
  box-sizing: border-box;
  padding: 12mm 16mm;
  margin: 0 auto;
  background: #fff;
  color: #000;
  page-break-before: always;
  break-before: page;
  overflow: hidden;
  display: block;
  font-family: Arial, Helvetica, sans-serif;
}

.alokasi-table-simple {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #000;
  background: #fff;
}

.alokasi-table-simple th,
.alokasi-table-simple td {
  border: 1px solid #000;
  padding: 4px 6px;
  color: #000;
  background: #fff;
  box-sizing: border-box;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.alokasi-table-simple th {
  font-weight: 700;
  background: #f5f5f5;
}

/* Kolom alokasi lanjutan: rapatkan baris agar 30 baris muat 1 kolom */
.alokasi-flow-table th,
.alokasi-flow-table td {
  padding: 3px 6px;
  font-size: 8.5pt;
}

.alokasi-table-side-simple {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8pt;
  color: #000;
  background: #fff;
  margin-top: 4px;
}

.alokasi-table-side-simple th,
.alokasi-table-side-simple td {
  border: 1px solid #000;
  padding: 3px 5px;
  box-sizing: border-box;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.alokasi-table-side-simple th {
  font-weight: 700;
  background: #f5f5f5;
}

/* Alokasi panjang: tabel full-width mengalir ke kertas berikutnya.
   Beda dengan .alokasi-print-page-so yang tingginya dikunci 210mm. */
.alokasi-flow-so {
  width: 100%;
  max-width: 297mm;
  box-sizing: border-box;
  padding: 12mm 16mm;
  margin: 0 auto;
  background: #fff;
  color: #000;
  page-break-before: always;
  break-before: page;
  font-family: Arial, Helvetica, sans-serif;
}
.alokasi-flow-so table {
  page-break-inside: auto;
}
.alokasi-flow-columns {
  display: flex;
  gap: 8mm;
  align-items: flex-start;
}
.alokasi-flow-table {
  flex: 1 1 0;
  min-width: 0;
}
.alokasi-flow-so thead {
  display: table-header-group;
}
.alokasi-flow-so tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
.alokasi-flow-so tfoot {
  display: table-footer-group;
}

.text-left-so {
  text-align: left;
}
.text-center-so {
  text-align: center;
}
.mb-2-so {
  margin-bottom: 6px;
}

/* =========================================================
   PREVIEW SCREEN
========================================================= */
@media screen {
  body {
    background: #555;
  }
  .print-root {
    min-height: 100vh;
    background: #555;
    padding-bottom: 30px;
  }
  .print-page {
    background: #fff;
    margin: 20px auto;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
  }
  .print-page-p01,
  .alokasi-print-page-so {
    background: #fff;
    margin: 20px auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
  .print-wrapper-so {
    background: #fff;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    margin: 20px auto;
  }
}

/* =========================================================
   PRINT MEDIA RULES
========================================================= */
@media print {
  .no-print {
    display: none !important;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  *,
  *::before,
  *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-root {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  /* Khusus SPK Format Baru (P04) */
  .print-page {
    width: 100% !important;
    max-width: 210mm !important;
    height: 297mm !important;
    max-height: 297mm !important;
    margin: 0 auto !important;
    padding: 4mm 6mm !important;
    box-sizing: border-box !important;
    background: #fff !important;
    box-shadow: none !important;
    overflow: hidden !important;
    page-break-after: always !important;
    break-after: page !important;
  }

  .print-page.page-landscape-mode {
    max-width: 297mm !important;
    height: 210mm !important;
    max-height: 210mm !important;
  }

  .print-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }

  /* Khusus SPK Format Lama P01 & Spanduk/MMT P05 */
  .print-container-p01,
  .print-container-so {
    width: 100% !important;
    max-width: 297mm !important;
    margin: 0 auto !important;
    padding: 0 !important;
  }

  .print-page-p01,
  .print-wrapper-so {
    width: 100% !important;
    max-width: 297mm !important;
    height: 210mm !important;
    max-height: 210mm !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    page-break-after: always !important;
    break-after: page !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  .print-half-so {
    width: 50% !important;
    height: 210mm !important;
    padding: 6mm 8mm !important;
    box-sizing: border-box !important;
  }

  .alokasi-print-page-so {
    width: 100% !important;
    max-width: 297mm !important;
    height: 210mm !important;
    max-height: 210mm !important;
    margin: 0 auto !important;
    padding: 12mm 16mm !important;
    box-sizing: border-box !important;
    page-break-before: always !important;
    break-before: page !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  .alokasi-print-page-so:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }

  .print-root.preview-mode .print-page,
  .print-root.preview-mode .print-container-p01,
  .print-root.preview-mode .print-container-so,
  .print-root.preview-mode .alokasi-flow-so,
  .print-root.preview-mode .preview-banner,
  .print-root.preview-mode .preview-watermark {
    display: none !important;
  }

  .print-root.preview-mode .preview-print-blocked-msg {
    display: flex !important;
    width: 100vw !important;
    height: 100vh !important;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-size: 16pt;
    font-weight: 700;
    text-align: center;
    color: #000 !important;
  }
}

.preview-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #d32f2f;
  color: #fff;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  letter-spacing: 0.02em;
}

.btn-print-real {
  margin-left: 12px;
  background: #fff;
  color: #d32f2f;
  border: none;
  border-radius: 6px;
  padding: 4px 14px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.btn-print-real:hover {
  background: #ffebee;
}

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

.preview-mode {
  user-select: none;
}
.preview-mode img {
  -webkit-user-drag: none;
  pointer-events: none;
}

.preview-print-blocked-msg {
  display: none;
}
</style>
