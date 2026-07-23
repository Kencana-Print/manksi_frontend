<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { spkFormService } from "@/services/ppic/spkFormService";
import api from "@/services/api";
import QrcodeVue from "qrcode.vue";

const route = useRoute();
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

// Coba berantai: (1) file milik SO/SPK sendiri di lokal → (2) file MAP
// di lokal (folder map/) → (3) VPS lama. Sebelumnya cuma nyoba path #1
// via @error, sehingga kalau SPK berasal dari MAP (gambar tersimpan di
// folder map/ dengan nama spk_memo, bukan spk_so_ref), gambar selalu
// gagal tanpa pernah mencoba kandidat lain.
const resolveDesignImage = () => {
  if (!spk.value.spk_nomor) {
    resolvedImageUrl.value = "";
    return;
  }
  const base = getBaseUrl();
  const cab = spk.value.spk_cab || "HO-";
  const soRef = spk.value.spk_so_ref || spk.value.spk_nomor;
  const mapNomor = spk.value.spk_memo || "";

  const candidates = [`${base}/images/${cab}/${encodeURIComponent(soRef)}.jpg`];
  if (mapNomor) {
    candidates.push(
      `${base}/images/${cab}/map/${encodeURIComponent(mapNomor)}.jpg`,
    );
  }
  candidates.push(`/file-gambar/${encodeURIComponent(mapNomor || soRef)}.jpg`);

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

const hasLayoutProses = computed(() => !!layoutHeader.value);
const hasMkaFromMap = computed(
  () =>
    mkaFromMap.value.aksesoris.length > 0 ||
    mkaFromMap.value.komponen.length > 0,
);

// --- CETAK SPK P01 ---
// ── Deteksi Workshop P01 → pakai format cetak lama (single page) ──
const isP01 = computed(
  () => spk.value.spk_cab === "P01" || spk.value.spk_cab2 === "P01",
);

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

// ── Auto-fit A4 khusus Page 1 (format baru/non-P01): coba scale-down
// dulu biar 1 halaman, fallback ke multi-halaman natural kalau
// kontennya kepanjangan buat diperkecil tanpa jadi susah dibaca.
const p1PageEl = ref<HTMLElement | null>(null);
const p1InnerEl = ref<HTMLElement | null>(null);
const p1Scale = ref(1);
const p1InnerHeightStyle = ref<string>("auto");
const p1MultiPage = ref(false);

const MIN_PRINT_SCALE = 0.72;

const fitPageToA4 = async () => {
  if (!p1PageEl.value || !p1InnerEl.value) return;
  // Reset ke kondisi "natural" dulu — height:auto, scale:1 — biar
  // scrollHeight yang diukur adalah tinggi ASLI konten, bukan yang
  // sudah kepotong batasan tinggi manapun.
  p1Scale.value = 1;
  p1MultiPage.value = false;
  p1InnerHeightStyle.value = "auto";
  await nextTick();

  const availablePx = p1PageEl.value.clientHeight; // 297mm dikurangi padding
  const contentPx = p1InnerEl.value.scrollHeight; // tinggi asli konten

  if (contentPx <= availablePx) {
    // Konten pendek — paksa tinggi penuh 1 halaman biar flex:1 +
    // margin-top:auto pada .ttd-row tetap berfungsi ngedorong TTD
    // ke bawah halaman (persis behavior desain aslinya).
    p1InnerHeightStyle.value = `${availablePx}px`;
    return;
  }

  const requiredScale = availablePx / contentPx;
  if (requiredScale >= MIN_PRINT_SCALE) {
    p1Scale.value = requiredScale;
    // height tetap 'auto' (natural) — jangan dipaksa penuh, biar gak
    // ada ruang kosong ekstra yang bikin proporsi rusak setelah di-scale.
  } else {
    p1Scale.value = 1;
    p1MultiPage.value = true;
  }
};

onMounted(async () => {
  try {
    const [resDetail, resLayout] = await Promise.all([
      spkFormService.getDetail(printNomor),
      spkFormService.getLayoutProses(printNomor),
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
    if (!isP01.value) {
      await nextTick();
      await fitPageToA4();
    }
    setTimeout(() => window.print(), 400);
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

  <div v-else class="print-root">
    <!-- ══════════════════════════════════════════════
       FORMAT LAMA — khusus Workshop P01
  ══════════════════════════════════════════════ -->
    <div v-if="isP01" class="print-page-old">
      <div class="old-border">
        <div class="old-header-row">
          <div class="old-title">SURAT PERINTAH KERJA</div>
          <div class="old-po">PO : {{ spk.spk_nomor_po || "-" }}</div>
        </div>

        <div class="old-body">
          <!-- Kolom kiri: info dasar -->
          <table class="old-info-table">
            <tbody>
              <tr>
                <td class="old-lbl">Nomor SPK</td>
                <td class="old-colon">:</td>
                <td>{{ spk.spk_nomor }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Tanggal SPK</td>
                <td class="old-colon">:</td>
                <td>{{ tglIndo(spk.spk_tanggal) }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Jenis Order</td>
                <td class="old-colon">:</td>
                <td>{{ spk.jo_nama }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Nama Desain</td>
                <td class="old-colon">:</td>
                <td>{{ spk.spk_nama }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Jumlah</td>
                <td class="old-colon">:</td>
                <td>{{ Number(spk.spk_jumlah).toLocaleString("id-ID") }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Ukuran</td>
                <td class="old-colon">:</td>
                <td>{{ sizeUkuranStr }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Kain</td>
                <td class="old-colon">:</td>
                <td>{{ spk.spk_kain }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Gramasi</td>
                <td class="old-colon">:</td>
                <td>{{ spk.spk_gramasi || "-" }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Finishing</td>
                <td class="old-colon">:</td>
                <td>{{ spk.spk_finishing }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Date Line</td>
                <td class="old-colon">:</td>
                <td>{{ tglIndo(spk.spk_dateline) }}</td>
              </tr>
              <tr>
                <td class="old-lbl">Workshop</td>
                <td class="old-colon">:</td>
                <td>{{ spk.spk_cab }} ({{ spk.spk_workshop }})</td>
              </tr>
            </tbody>
          </table>

          <!-- Tipe SPK — kanan atas info table -->
          <div class="old-tipe">Tipe SPK : {{ spk.spk_tipe || "-" }}</div>

          <!-- Gambar desain -->
          <div class="old-img-wrap">
            <img
              v-if="resolvedImageUrl"
              :src="resolvedImageUrl"
              class="old-img"
            />
          </div>

          <!-- Keterangan Komponen (checklist manual aksesoris) -->
          <div class="old-section">
            <div class="old-section-title">Keterangan Komponen :</div>
            <div v-if="ketKomponenList.length > 0" class="old-komp-list">
              <div
                v-for="(k, idx) in ketKomponenList"
                :key="idx"
                class="old-komp-item"
              >
                {{ idx + 1 }}. {{ k.nama
                }}<span v-if="k.ket"> - {{ k.ket }}</span>
              </div>
            </div>
          </div>

          <!-- Size : Lebar & Panjang Badan -->
          <div class="old-section">
            <div class="old-section-title">
              Size : Lebar &amp; Panjang Badan
            </div>
            <pre class="old-size-pre">{{ sizeLebarPanjangStr || "-" }}</pre>
          </div>

          <!-- Keterangan Produksi -->
          <div v-if="spk.spk_keterangan" class="old-section old-ket-produksi">
            <div class="old-section-title">Ket. Produksi :</div>
            <pre class="old-ket-pre">{{ spk.spk_keterangan }}</pre>
          </div>
        </div>

        <!-- TTD MO / CMO -->
        <div class="old-ttd-wrap">
          <table class="old-ttd-table">
            <tr>
              <td width="50%">MO</td>
              <td width="50%">CMO</td>
            </tr>
            <tr>
              <td class="old-sign-space">
                <img
                  :src="getSignatureUrl(spk.user_create)"
                  class="old-ttd-img"
                  @error="handleSignatureError"
                />
                <div class="old-sign-name">{{ spk.user_create }}</div>
              </td>
              <td class="old-sign-space">
                <img
                  :src="getSignatureUrl(spk.spk_cmo)"
                  class="old-ttd-img"
                  @error="handleSignatureError"
                />
                <div class="old-sign-name">{{ spk.spk_cmo || "-" }}</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="old-footer">
          Dibuat Oleh: {{ spk.user_create }} {{ formatWaktu(spk.date_create) }}
        </div>
      </div>
    </div>

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
            height: p1InnerHeightStyle,
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

            <!-- Baris 4: MKA (bawah MKB) -->
            <!-- MKA dari BAST MAP — dipakai kalau SPK berasal dari MAP dan BAST
     MAP-nya sudah punya accessories/babaran diinput -->
            <div v-if="hasMkaFromMap" class="box mb-6">
              <div class="box-title">
                Kebutuhan Aksesoris &amp; Babaran (dari BAST MAP
                {{ spk.spk_memo }})
              </div>
              <table v-if="mkaFromMap.komponen.length" class="dt">
                <thead>
                  <tr>
                    <th style="width: 100px">Komponen</th>
                    <th style="width: 80px">Warna</th>
                    <th style="width: 60px" class="tc">Babaran</th>
                    <th style="width: 70px" class="tc">Std. Kalkulasi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(k, idx) in mkaFromMap.komponen" :key="idx">
                    <td>{{ k.komponen }}</td>
                    <td>{{ k.warna || "-" }}</td>
                    <td class="tc">
                      {{ Number(k.babaran).toLocaleString("id-ID") }}
                    </td>
                    <td class="tc">
                      {{ Number(k.babarank).toLocaleString("id-ID") }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <!-- ── Babaran per Size — tambahan ── -->
              <table v-if="mkaFromMap.sizeBreakdown.length" class="dt">
                <thead>
                  <tr>
                    <th style="width: 100px">Komponen</th>
                    <th style="width: 80px">Size</th>
                    <th style="width: 70px" class="tc">Babaran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(s, idx) in mkaFromMap.sizeBreakdown" :key="idx">
                    <td>{{ s.komponen }}</td>
                    <td>{{ s.size }}</td>
                    <td class="tc">
                      {{ Number(s.babaran).toLocaleString("id-ID") }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <table class="dt">
                <thead>
                  <tr>
                    <th style="width: 60px">Kode</th>
                    <th style="width: 160px">Nama</th>
                    <th style="width: 50px">Satuan</th>
                    <th style="width: 50px" class="tr">Qty/Kaos</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, idx) in mkaFromMap.aksesoris" :key="idx">
                    <td class="fw">{{ a.kode }}</td>
                    <td>{{ a.nama }}</td>
                    <td class="tc">{{ a.satuan }}</td>
                    <td class="tr">{{ a.qty }}</td>
                    <td>{{ a.note || "—" }}</td>
                  </tr>
                  <tr v-if="mkaFromMap.aksesoris.length === 0">
                    <td colspan="5" class="tc muted">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Fallback: checklist manual MKA (A/B/C...) — dipakai kalau tidak
     ada data dari BAST MAP -->
            <div v-else class="box mb-6">
              <div class="box-title">Kebutuhan Aksesoris (MKA)</div>
              <table class="dt">
                <thead>
                  <tr>
                    <th style="width: 30px">Kode</th>
                    <th style="width: 140px">Nama</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(k, idx) in ketKomponenList" :key="idx">
                    <td class="tc fw">{{ k.kode }}</td>
                    <td>{{ k.nama }}</td>
                    <td>{{ k.ket || "—" }}</td>
                  </tr>
                  <tr v-if="ketKomponenList.length === 0">
                    <td colspan="3" class="tc muted">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Baris 5: Komponen Potong + Second Process -->
            <div
              class="p1-row-komp mb-6"
              :class="{ 'no-special': keteranganKhusus.length === 0 }"
            >
              <!-- Slot kiri-atas: Special Process (kalau ada) ATAU Komponen Potong (kalau Special Process kosong) -->
              <div v-if="keteranganKhusus.length > 0" class="box">
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
              <div v-else class="box">
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

              <!-- Slot kanan: Second Process (selalu tampil di sini) -->
              <div class="box">
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

            <!-- Baris 6: Komponen Potong (kalau Special Process ADA, tampil di sini penuh) + Produksi -->
            <div class="p1-row-ket mb-6">
              <div v-if="keteranganKhusus.length > 0" class="box">
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
                class="box"
                :class="{ 'full-span': keteranganKhusus.length === 0 }"
              >
                <div class="box-title">Keterangan produksi</div>
                <pre class="ket-pre ket-produksi">{{
                  spk.spk_keterangan || "—"
                }}</pre>
              </div>
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
            <div class="ph-company">KENCANA PRINT</div>
            <div class="ph-sub">Layout Proses Kerja Sewing</div>
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

        <!-- Tabel Proof (atas) -->
        <div class="layout-section">
          <div class="layout-sec-title proof-title">Line Proof</div>
          <table class="lt">
            <thead>
              <tr>
                <th style="width: 22px">No</th>
                <th>Proses</th>
                <th style="width: 50px">M/C</th>
                <th style="width: 50px">Uk.Jarum</th>
                <th style="width: 55px">Sepatu</th>
                <th style="width: 40px">K.Jarum</th>
                <th style="width: 44px" class="tr">CT(jam)</th>
                <th style="width: 40px" class="tr">CT(dt)</th>
                <th style="width: 28px" class="tr">MP</th>
                <th style="width: 70px">Operator</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in layoutProof" :key="i">
                <td class="tc">{{ r.no_urut }}</td>
                <td>{{ r.proses }}</td>
                <td>{{ r.mc }}</td>
                <td>{{ r.ukjarum }}</td>
                <td>{{ r.sepatu }}</td>
                <td>{{ r.kjarum }}</td>
                <td class="tr">{{ r.ct_jam }}</td>
                <td class="tr">{{ r.ct_dt }}</td>
                <td class="tr">{{ r.mp }}</td>
                <td>{{ r.nama_op }}</td>
              </tr>
              <tr v-if="layoutProof.length === 0">
                <td colspan="10" class="tc muted">Tidak ada data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabel Sewing (bawah) -->
        <div class="layout-section">
          <div class="layout-sec-title sewing-title">Sewing</div>
          <table class="lt">
            <thead>
              <tr>
                <th style="width: 22px">No</th>
                <th>Proses</th>
                <th style="width: 50px">M/C</th>
                <th style="width: 50px">Uk.Jarum</th>
                <th style="width: 55px">Sepatu</th>
                <th style="width: 40px">K.Jarum</th>
                <th style="width: 44px" class="tr">CT(jam)</th>
                <th style="width: 40px" class="tr">CT(dt)</th>
                <th style="width: 28px" class="tr">MP</th>
                <th style="width: 70px">Operator</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in layoutSewing" :key="i">
                <td class="tc">{{ r.no_urut }}</td>
                <td>{{ r.proses }}</td>
                <td>{{ r.mc }}</td>
                <td>{{ r.ukjarum }}</td>
                <td>{{ r.sepatu }}</td>
                <td>{{ r.kjarum }}</td>
                <td class="tr">{{ r.ct_jam }}</td>
                <td class="tr">{{ r.ct_dt }}</td>
                <td class="tr">{{ r.mp }}</td>
                <td>{{ r.nama_op }}</td>
              </tr>
              <tr v-if="layoutSewing.length === 0">
                <td colspan="10" class="tc muted">Tidak ada data</td>
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
}
.ph-center {
  flex: 1;
  text-align: center;
}
.ph-right {
  flex: 1;
  text-align: right;
}
.ph-company {
  font-size: 13pt;
  font-weight: bold;
  color: #1565c0;
}
.ph-sub {
  font-size: 7.5pt;
  color: #555;
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
.p1-row-ket {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 8px;
}
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
  height: 297mm;
  overflow: hidden;
}
.print-page.page-1.print-page--multi {
  height: auto;
  min-height: 297mm;
  overflow: visible;
}
.page1-scale-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Cegah baris tabel/box kepotong di tengah pas fallback multi-halaman */
.dt tbody tr {
  break-inside: avoid;
}
.box {
  break-inside: avoid;
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
    margin: 10mm 12mm;
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
    padding: 0;
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  .print-page:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
}
</style>
