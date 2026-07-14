<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { salesOrderFormService } from "@/services/penjualan/salesOrderFormService";
import api from "@/services/api";
import QrcodeVue from "qrcode.vue";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const data = ref<any>({});

const printNomor = String(route.params.nomor);
const layoutMode = computed(() =>
  route.query.layout === "horizontal" ? "horizontal" : "vertical",
);
const withAlokasi = computed(() => route.query.alokasi === "true");

const kodeDivisi = computed(() => String(data.value.spk_divisi).charAt(0));
const isKaosan = computed(() => kodeDivisi.value === "3");
const isGarmen = computed(
  () => kodeDivisi.value === "4" || kodeDivisi.value === "6",
);
const isSpandukMMT = computed(
  () => kodeDivisi.value === "1" || kodeDivisi.value === "5",
);
const isComplexTtd = computed(() => isKaosan.value);

const numCopies = computed(() => {
  if (withAlokasi.value) return 1;
  if (isGarmen.value) return 1; // Garmen: 1 lembar, tidak digandakan
  return 2;
});

const totalAlokasi = computed(() => {
  if (!data.value.alokasiList) return 0;
  return data.value.alokasiList.reduce(
    (sum: number, a: any) => sum + (Number(a.jumlah) || 0),
    0,
  );
});

const mainImageUrl = computed(() => {
  if (!data.value?.spk_nomor) return "";

  const base =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
    (api.defaults.baseURL || "").replace(/\/api\/?$/, "") ||
    `${window.location.protocol}//${window.location.hostname}:3088`;

  const cab = data.value.spk_cab || "HO-";
  const memo = data.value.spk_memo;

  if (memo) {
    return `${base}/images/${cab}/map/${encodeURIComponent(memo)}.jpg`;
  }
  return `${base}/images/${cab}/${encodeURIComponent(data.value.spk_nomor)}.jpg`;
});

const getSignatureUrl = (kodeUser: string) => {
  if (!kodeUser) return "";
  return `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(kodeUser.trim().toUpperCase())}.jpg`;
};

const handleSignatureError = (e: Event) => {
  (e.target as HTMLImageElement).style.opacity = "0";
};
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;

  // Jika sudah fallback ke VPS, sembunyikan
  if (img.dataset.fallbackTried === "true") {
    img.style.display = "none";
    return;
  }
  img.dataset.fallbackTried = "true";

  const nomor = data.value.spk_memo || data.value.spk_nomor;
  if (nomor) {
    if (data.value.spk_memo) {
      img.src = `http://103.94.238.252:8888/file-gambar/map/${encodeURIComponent(nomor)}.jpg`;
    } else {
      img.src = `http://103.94.238.252:8888/file-gambar/${encodeURIComponent(nomor)}.jpg`;
    }
  } else {
    img.style.display = "none";
  }
};

// ── Date helpers (no timezone shift) ──
const tglIndo = (val: string) => {
  if (!val) return "";
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
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const labelText = computed(() => {
  const lbl = Number(data.value.spk_label) || 0;
  if (lbl === 0)
    return "[ V ] Umum (Label Luar dan Dalam)   [   ] Non Umum (Label Dalam)   [   ] Tanpa Label";
  if (lbl === 1)
    return "[   ] Umum (Label Luar dan Dalam)   [ V ] Non Umum (Label Dalam)   [   ] Tanpa Label";
  return "[   ] Umum (Label Luar dan Dalam)   [   ] Non Umum (Label Dalam)   [ V ] Tanpa Label";
});

const mitraLuarText = computed(() => {
  const parts = [];
  if (data.value.spk_mpotong === "Y") parts.push("Potong");
  if (data.value.spk_mcetak === "Y") parts.push("Cetak");
  if (data.value.spk_mbordir === "Y") parts.push("Bordir");
  if (data.value.spk_mjahit === "Y") parts.push("Jahit");
  if (data.value.spk_mfinishing === "Y") parts.push("Finishing");
  return parts.length > 0 ? "Mitra Luar: " + parts.join(", ") : "";
});

const formatSizeDetail = computed(() => {
  if (!data.value.sizeDetails?.length) return "";
  return data.value.sizeDetails
    .map((sz: any) => `${sz.size}=  L: ${sz.ld || 0}   P: ${sz.pb || 0}`) 
    .join("\n");
});

const renderKeteranganTambahan = computed(() => {
  const arr = [];
  if (data.value.spk_repeat) arr.push(`Repeat Order: ${data.value.spk_repeat}`);
  if (!isGarmen.value && !isKaosan.value && data.value.ketKomponen)
    arr.push(`Keterangan Komponen :\n${data.value.ketKomponen}`);
  return arr.join("\n\n");
});

const updateStatusCetak = async (nomor: string) => {
  try {
    await api.post("/penjualan/sales-order/update-cetak", { nomor });
  } catch {}
};

onMounted(async () => {
  try {
    const res = await salesOrderFormService.getDetail(printNomor);
    data.value = res.data.data.header;
    data.value.sizeDetails = res.data.data.dtlSize || [];
    data.value.alokasiList = res.data.data.alokasi || [];
    data.value.ketKomponen = res.data.data.ketKomponen || "";

    if (
      (isKaosan.value || isGarmen.value) &&
      data.value.sizeDetails.length > 0
    ) {
      data.value.sizeStr = data.value.sizeDetails
        .map((s: any) => `${s.size}=${s.qty}`)
        .join(", ");
    } else {
      data.value.sizeStr = data.value.spk_ukuran;
    }

    isLoaded.value = true;
    updateStatusCetak(printNomor);

    setTimeout(() => {
      window.print();
    }, 1000);
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state">Data SO tidak ditemukan.</div>
  <div v-else-if="!isLoaded" class="loading-state">
    Mempersiapkan Dokumen Cetak...
  </div>
  <div v-else class="print-container">
    <div class="print-wrapper">
      <!-- ══ GARMEN: 2 panel terpisah kiri & kanan ══ -->
      <template v-if="isGarmen">
        <div
          v-for="copy in numCopies"
          :key="'garmen-' + copy"
          class="print-half full-width"
        >
          <div class="header-row">
            <div class="title-main">SALES ORDER</div>
            <div class="title-po">PO : {{ data.spk_nomor_po || "-" }}</div>
          </div>

          <div class="garmen-body">
            <!-- ── Kolom kiri: info table ── -->
            <div class="garmen-kiri">
              <table class="info-table">
                <tbody>
                  <tr>
                    <td class="w-label">Nomor SO</td>
                    <td class="w-colon">:</td>
                    <td>
                      <span class="fw">{{ data.spk_nomor }}</span>
                      <span v-if="data.spk_tipe" class="ml-8 text-xs">
                        Tipe SO : <strong>{{ data.spk_tipe }}</strong>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td class="w-label">Tanggal SO</td>
                    <td class="w-colon">:</td>
                    <td>{{ tglIndo(data.spk_tanggal) }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Jenis Order</td>
                    <td class="w-colon">:</td>
                    <td>{{ data.jo_nama }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Nama Desain</td>
                    <td class="w-colon">:</td>
                    <td class="fw">{{ data.spk_nama }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Jumlah</td>
                    <td class="w-colon">:</td>
                    <td>
                      {{ Number(data.spk_jumlah).toLocaleString("id-ID") }}
                    </td>
                  </tr>
                  <tr>
                    <td class="w-label">Ukuran</td>
                    <td class="w-colon">:</td>
                    <td>{{ data.sizeStr }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Bahan</td>
                    <td class="w-colon">:</td>
                    <td>{{ data.spk_kain }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Gramasi</td>
                    <td class="w-colon">:</td>
                    <td>{{ data.spk_gramasi || "-" }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Finishing</td>
                    <td class="w-colon">:</td>
                    <td>{{ data.spk_finishing }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Date Line</td>
                    <td class="w-colon">:</td>
                    <td class="fw">{{ tglIndo(data.spk_dateline) }}</td>
                  </tr>
                  <tr>
                    <td class="w-label">Workshop</td>
                    <td class="w-colon">:</td>
                    <td>{{ data.spk_cab }} ({{ data.spk_workshop }})</td>
                  </tr>
                </tbody>
              </table>

              <div class="fw text-xs mt-1">
                DIKERJAKAN DI {{ data.spk_cab }} {{ data.spk_workshop }}
              </div>

              <div class="garmen-img-center">
                <img
                  :src="mainImageUrl"
                  @error="handleImageError"
                  class="garmen-img-fit"
                />
              </div>

              <div v-if="data.ketKomponen" class="ket-box ket-section mt-2">
                <div class="ket-title">Keterangan Komponen :</div>
                <pre class="ket-produksi">{{ data.ketKomponen }}</pre>
              </div>

              <div class="ket-box ket-section mt-2">
                <div class="ket-title">Size : Lebar &amp; Panjang Badan</div>
                <pre class="ket-produksi">{{
                  formatSizeDetail || (data.sizeStr ? data.sizeStr : "-")
                }}</pre>
              </div>
            </div>

            <!-- ── Kolom kanan: Ket. Produksi ── -->
            <div class="garmen-kanan">
              <div class="ket-box ket-section">
                <div class="ket-title">Ket. Produksi :</div>
                <pre class="ket-produksi">{{ data.spk_keterangan }}</pre>
              </div>
            </div>
          </div>

          <div class="bottom-ttd-wrapper mt-auto">
            <table class="ttd-table-simple">
              <tr>
                <td width="50%">MO</td>
                <td width="50%">CMO</td>
              </tr>
              <tr>
                <td class="sign-space-simple">
                  <img
                    :src="getSignatureUrl(data.user_create)"
                    class="ttd-img-simple"
                    @error="handleSignatureError"
                  />
                  <div class="sign-name">{{ data.user_create }}</div>
                </td>
                <td class="sign-space-simple">
                  <img
                    :src="getSignatureUrl(data.spk_cmo)"
                    class="ttd-img-simple"
                    @error="handleSignatureError"
                  />
                  <div class="sign-name">{{ data.spk_cmo || "-" }}</div>
                </td>
              </tr>
            </table>
            <div class="qr-box">
              <qrcode-vue :value="data.spk_nomor" :size="60" level="L" />
            </div>
          </div>

          <div class="footer-note">
            Dibuat Oleh: {{ data.user_create }}
            {{ formatWaktu(data.date_create) }}
          </div>
        </div>
      </template>

      <!-- ══ NON-GARMEN: copy loop (Kaosan 2x, Spanduk/MMT 2x) ══ -->
      <template v-else>
        <div
          v-for="copy in numCopies"
          :key="'spk-' + copy"
          class="print-half"
          :class="{
            'border-right': !withAlokasi && numCopies > 1 && copy === 1,
          }"
        >
          <div class="header-row">
            <div class="title-main">SALES ORDER</div>
            <div class="title-po">PO : {{ data.spk_nomor_po || "-" }}</div>
          </div>

          <table class="info-table">
            <tbody>
              <tr>
                <td class="w-label">Nomor SO</td>
                <td class="w-colon">:</td>
                <td class="w-val-td">{{ data.spk_nomor }}</td>
                <td class="text-right pr-1" v-if="data.spk_tipe">Tipe SO :</td>
                <td class="fw" v-if="data.spk_tipe">{{ data.spk_tipe }}</td>
              </tr>
              <tr>
                <td class="w-label">Tanggal SO</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ tglIndo(data.spk_tanggal) }}</td>
              </tr>
              <tr>
                <td class="w-label">Jenis Order</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ data.jo_nama }}</td>
              </tr>
              <tr>
                <td class="w-label">Nama Desain</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ data.spk_nama }}</td>
              </tr>
              <tr>
                <td class="w-label">Jumlah</td>
                <td class="w-colon">:</td>
                <td colspan="3">
                  {{ Number(data.spk_jumlah).toLocaleString("id-ID") }}
                </td>
              </tr>
              <tr>
                <td class="w-label">Ukuran</td>
                <td class="w-colon">:</td>
                <td colspan="3">
                  <template v-if="isSpandukMMT"
                    >{{ data.spk_panjang }} X {{ data.spk_lebar }} M</template
                  >
                  <template v-else>{{ data.sizeStr }}</template>
                </td>
              </tr>
              <tr>
                <td class="w-label">Bahan</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ data.spk_kain }}</td>
              </tr>
              <tr>
                <td class="w-label">Gramasi</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ data.spk_gramasi || "-" }}</td>
              </tr>
              <tr>
                <td class="w-label">Finishing</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ data.spk_finishing }}</td>
              </tr>
              <tr>
                <td class="w-label">Date Line</td>
                <td class="w-colon">:</td>
                <td colspan="3">{{ tglIndo(data.spk_dateline) }}</td>
              </tr>
              <tr>
                <td class="w-label">Workshop</td>
                <td class="w-colon">:</td>
                <td colspan="3">
                  {{ data.spk_cab }} ({{ data.spk_workshop }}).
                </td>
              </tr>
              <tr v-if="isSpandukMMT">
                <td class="w-label">Status Client</td>
                <td class="w-colon">:</td>
                <td colspan="3">
                  <span
                    :class="{ 'highlight-yellow': data.cus_perfect === 'Y' }"
                    >{{
                      data.cus_perfect === "Y" ? "PERFECT" : "REGULER"
                    }}</span
                  >
                </td>
              </tr>
              <tr v-if="isSpandukMMT">
                <td class="w-label">Alokasi</td>
                <td class="w-colon">:</td>
                <td colspan="3">
                  {{ data.spk_alokasi === "Y" ? "YA" : "TIDAK" }}
                </td>
              </tr>
              <tr>
                <td class="w-label align-top">Keterangan</td>
                <td class="w-colon align-top">:</td>
                <td colspan="3" class="val-desc-text">
                  <div
                    v-if="renderKeteranganTambahan"
                    style="margin-bottom: 5px"
                  >
                    <pre class="val-pre">{{ renderKeteranganTambahan }}</pre>
                  </div>
                  <pre class="val-pre">{{ data.spk_keterangan }}</pre>
                </td>
              </tr>
              <tr v-if="isKaosan">
                <td></td>
                <td></td>
                <td colspan="3" class="fw pt-1">
                  DIKERJAKAN DI {{ data.spk_cab }} {{ data.spk_workshop }}
                </td>
              </tr>
            </tbody>
          </table>

          <template v-if="isKaosan">
            <div class="row-flex mb-1 mt-1 text-xs">
              <span class="w-label fw">Label</span><span class="w-colon">:</span
              ><span>{{ labelText }}</span>
            </div>
            <div class="row-flex mb-2 text-xs">
              <span class="w-label fw">Badan :</span
              ><span class="color-val">{{ data.spk_warna_badan }}</span>
              <span class="fw pl-2">Lengan :</span
              ><span class="color-val">{{ data.spk_warna_lengan }}</span>
              <span class="fw pl-2">Lain :</span
              ><span class="color-val">{{ data.spk_warna_lain }}</span>
            </div>
          </template>

          <div v-if="mitraLuarText" class="fw text-red mb-2 text-xs">
            {{ mitraLuarText }}
          </div>

          <div class="layout-box" :class="[layoutMode, `divisi-${kodeDivisi}`]">
            <div class="img-box">
              <div class="ukuran-header" v-if="isSpandukMMT">
                {{ data.jo_nama }} {{ data.spk_panjang }} X
                {{ data.spk_lebar }} M
              </div>
              <img :src="mainImageUrl" @error="handleImageError" />
            </div>
            <div class="grid-box" v-if="isComplexTtd">
              <table class="ttd-table">
                <thead>
                  <tr>
                    <th width="25%">KAOSAN SC</th>
                    <th width="25%">APPROVAL</th>
                    <th width="25%">Kepala Produksi</th>
                    <th width="25%">Obat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="sign-space-complex valign-bottom pb-1">
                      <img
                        :src="getSignatureUrl(data.user_create)"
                        class="ttd-img-complex"
                        @error="handleSignatureError"
                      />
                      <div class="fw">{{ data.user_create || "ADMIN" }}</div>
                    </td>
                    <td class="sign-space-complex valign-bottom pb-1">
                      <img
                        :src="getSignatureUrl(data.spk_cmo)"
                        class="ttd-img-complex"
                        @error="handleSignatureError"
                      />
                      <div class="fw">{{ data.spk_cmo || "-" }}</div>
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr class="bg-grey">
                    <td>Ploter</td>
                    <td>Finishing</td>
                    <td>Afdruk</td>
                    <td>Man. Produksi</td>
                  </tr>
                  <tr>
                    <td class="h-empty"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr class="bg-grey">
                    <td>Gudang</td>
                    <td>Kepala Cetak</td>
                    <td>Pengiriman</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td class="h-empty"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div class="urutan-list">
                <div class="col-list">
                  <div>1. Marketing</div>
                  <div>2. Kepala Produksi</div>
                  <div>3. Ploter</div>
                  <div>4. Finishing</div>
                  <div>5. Obat</div>
                </div>
                <div class="col-list">
                  <div>6. Pengiriman</div>
                  <div>7. Afdruk</div>
                  <div>8. Man. Produksi</div>
                  <div>9. Gudang</div>
                  <div>10. Kepala Cetak</div>
                </div>
              </div>
            </div>
          </div>

          <div class="bottom-ttd-wrapper" v-if="!isComplexTtd">
            <table class="ttd-table-simple">
              <tr>
                <td width="50%">MO</td>
                <td width="50%">CMO</td>
              </tr>
              <tr>
                <td class="sign-space-simple">
                  <img
                    :src="getSignatureUrl(data.user_create)"
                    class="ttd-img-simple"
                    @error="handleSignatureError"
                  />
                  <div class="sign-name">{{ data.user_create }}</div>
                </td>
                <td class="sign-space-simple">
                  <img
                    :src="getSignatureUrl(data.spk_cmo)"
                    class="ttd-img-simple"
                    @error="handleSignatureError"
                  />
                  <div class="sign-name">{{ data.spk_cmo || "-" }}</div>
                </td>
              </tr>
            </table>
            <div class="qr-box mt-auto">
              <qrcode-vue :value="data.spk_nomor" :size="65" level="L" />
            </div>
          </div>
          <div class="qr-box float-right mt-auto" v-if="isComplexTtd">
            <qrcode-vue :value="data.spk_nomor" :size="65" level="L" />
          </div>
          <div class="footer-note">
            Dibuat Oleh: {{ data.user_create }}
            {{ formatWaktu(data.date_create) }}
          </div>
        </div>
      </template>

      <!-- ══ ALOKASI PANEL ══ -->
      <div v-if="withAlokasi" class="print-half alokasi-panel">
        <h2 class="title mb-3" style="text-decoration: underline">
          ALOKASI PENGIRIMAN :
        </h2>
        <table class="alokasi-table mt-2" v-if="data.alokasiList?.length > 0">
          <thead>
            <tr>
              <th class="text-left pl-2">Alokasi</th>
              <th width="80" class="text-center">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alo in data.alokasiList" :key="alo.urut">
              <td class="pl-2">{{ alo.kota || alo.alamat }}</td>
              <td class="text-center">
                {{ Number(alo.jumlah).toLocaleString("id-ID") }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="fw text-left pl-2">Total</td>
              <td class="fw text-center">
                {{ totalAlokasi.toLocaleString("id-ID") }}
              </td>
            </tr>
          </tfoot>
        </table>
        <div v-else class="text-xs mt-2 italic">
          Tidak ada data alokasi pengiriman.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial;
}
.print-container {
  width: 100%;
  margin: 0 auto;
  background: #fff;
  font-family: "Arial", sans-serif;
  font-size: 8.5pt;
  color: #000;
  box-sizing: border-box;
  padding: 0;
}
.print-wrapper {
  display: flex;
  flex-wrap: wrap; /* ← tambah ini */
  width: 297mm;
  min-height: 209mm;
  margin: 0 auto;
  box-sizing: border-box;
}

/* ── Half ── */
.print-half {
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  padding: 7mm 10mm 7mm 9mm;
  box-sizing: border-box;
  min-width: 0;
  height: 209mm;
  overflow: hidden;
}
.print-half.full-width {
  flex: 0 0 100%;
  width: 100%;
}
.border-right {
  border-right: 1px dotted #999;
}
.alokasi-panel {
  flex: 0 0 100%;
  width: 100%;
  padding: 7mm 10mm;
  break-before: page;
  page-break-before: always;
}

/* ══ GARMEN BODY ══ */
.garmen-body {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  margin-top: 5px;
}
.garmen-kiri {
  flex: 0 0 55%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.garmen-kanan {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 8pt;
}

/* Keterangan boxes */
.ket-box {
  display: flex;
  flex-direction: column;
}
.ket-section {
  display: flex;
  flex-direction: column;
}
.ket-title {
  font-weight: bold;
  font-size: 8.5pt;
  margin-bottom: 4px;
  border-bottom: 1px solid #000;
  padding-bottom: 2px;
}
.ket-space-gudang {
  height: 45px;
}
.ket-space {
  height: 30px;
}
.ket-produksi {
  font-family: inherit;
  font-size: 8pt;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.35;
  /* Tidak uppercase — biarkan as-is sesuai input user */
}

/* Gambar + Size + Komponen dalam satu baris */
.garmen-img-center {
  flex: 1; /* isi sisa ruang antara info table dan TTD */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  padding: 8px 0;
}

.garmen-img-fit {
  max-width: 100%;
  max-height: 100%; /* tidak melebihi flex container */
  object-fit: contain;
}
.garmen-size-box {
  flex: 0 0 200px;
  font-size: 7.5pt;
  min-width: 110px;
}
.garmen-komp-box {
  flex: 1;
  font-size: 7.5pt;
  min-width: 0;
}

/* ── Typography ── */
.header-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  align-items: flex-end;
}
.title-main {
  font-size: 13pt;
  font-weight: bold;
  text-decoration: underline;
  line-height: 1;
}
.title-po {
  font-size: 12pt;
  font-weight: bold;
  text-decoration: underline;
  line-height: 1;
}
.fw {
  font-weight: bold;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
.text-left {
  text-align: left;
}
.text-red {
  color: #d32f2f;
}
.text-xs {
  font-size: 7.5pt;
}
.italic {
  font-style: italic;
}
.align-top {
  vertical-align: top;
}
.valign-bottom {
  vertical-align: bottom;
}
.pr-1 {
  padding-right: 4px;
}
.pl-2 {
  padding-left: 8px;
}
.ml-8 {
  margin-left: 8px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-auto {
  margin-top: auto;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mb-3 {
  margin-bottom: 12px;
}
.pt-1 {
  padding-bottom: 4px;
}
.pt-2 {
  padding-top: 8px;
}
.pb-1 {
  padding-bottom: 4px;
}

/* ── Info Table ── */
.info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 4px;
}
.info-table td {
  padding: 1px 0;
  vertical-align: top;
}
.w-label {
  width: 80px;
}
.w-colon {
  width: 12px;
  text-align: center;
}
.w-val-td {
  width: 100px;
}
.val-desc-text {
  padding-top: 2px;
}
.val-pre {
  font-family: inherit;
  font-size: 7.5pt;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.2;
}
.highlight-yellow {
  background: yellow;
  padding: 1px 4px;
  font-weight: bold;
  border: 1px solid #ccc;
}
.row-flex {
  display: flex;
  align-items: center;
}
.color-val {
  border-bottom: 1px dotted #000;
  min-width: 50px;
  display: inline-block;
  text-align: center;
  font-size: 8pt;
  padding-bottom: 1px;
}
.spec-title {
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 2px;
  font-size: 7.5pt;
}

/* ── Layout Box (Non-Garmen) ── */
.layout-box {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 15px;
  margin-top: 8px;
}
.img-box {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.img-box img {
  max-width: 100%;
  object-fit: contain;
}
.ukuran-header {
  text-align: center;
  font-weight: bold;
  font-size: 8pt;
  letter-spacing: 1px;
  margin-bottom: 5px;
}
.layout-box.divisi-3.vertical {
  flex-direction: row;
}
.layout-box.divisi-3.vertical .img-box img {
  max-height: 190px;
}
.layout-box.divisi-3.horizontal {
  flex-direction: column;
  align-items: center;
}
.layout-box.divisi-3.horizontal .img-box img {
  max-height: 140px;
}
.grid-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 5px;
  min-width: 0;
}

/* ── TTD KOMPLEKS ── */
.ttd-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  font-size: 6.5pt;
  color: #000;
}
.ttd-table th,
.ttd-table td {
  border: 1px solid #000;
  padding: 2px;
  color: #000 !important;
}
.ttd-table th {
  font-weight: bold;
}
.bg-grey td {
  background: #f0f0f0 !important;
  font-weight: bold;
  border-top: 1px solid #000;
  color: #000 !important;
}
.h-empty {
  height: 25px;
}
.sign-space-complex {
  position: relative;
  height: 35px;
}
.ttd-img-complex {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 30px;
  object-fit: contain;
  z-index: 1;
}
.urutan-list {
  font-size: 6.5pt;
  display: flex;
  gap: 15px;
  margin-top: 3px;
  line-height: 1.3;
}
.col-list {
  display: flex;
  flex-direction: column;
}

/* ── TTD SIMPLE ── */
.bottom-ttd-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 12px;
}
.ttd-table-simple {
  width: 180px;
  border-collapse: collapse;
  text-align: center;
  font-size: 7.5pt;
  border: 1px solid #000;
  color: #000;
}
.ttd-table-simple td {
  border: 1px solid #000;
  padding: 2px;
  font-weight: bold;
  color: #000 !important;
}
.sign-space-simple {
  position: relative;
  height: 45px;
  vertical-align: bottom;
  padding-bottom: 2px;
}
.ttd-img-simple {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  height: 32px;
  object-fit: contain;
  z-index: 1;
}
.sign-name {
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  z-index: 2;
}

/* ── Alokasi ── */
.alokasi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  color: #000;
}
.alokasi-table th,
.alokasi-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  color: #000 !important;
}
.alokasi-table th {
  font-weight: bold;
}

/* ── Footer ── */
.float-right {
  float: right;
}
.footer-note {
  text-align: right;
  font-size: 6.5pt;
  border-top: 1px solid #000;
  padding-top: 3px;
  margin-top: 5px;
}

.garmen-info-col {
  flex: 1;
  display: flex;
  flex-direction: column; /* atas-bawah */
  gap: 6px;
  min-width: 0;
  padding-left: 8px;
}

@media screen {
  .print-container {
    background: #555;
    padding: 20px;
  }
  .print-wrapper {
    background: white;
    margin: 0 auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
}
@media print {
  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }
  body {
    zoom: 90%;
    margin: 0;
    padding: 0;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-wrapper {
    width: 100%;
    height: auto; /* ← jangan fixed height */
  }
  .alokasi-panel {
    page-break-before: always;
    break-before: page;
  }
  body {
    margin: 0;
    padding: 0;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-container {
    padding: 0;
    background: transparent;
  }
}
</style>
