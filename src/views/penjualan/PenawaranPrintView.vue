<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { penawaranFormService } from "@/services/penjualan/penawaranFormService";

// Import Logo
import logoJA from "@/assets/ja.jpg";
import logoKP from "@/assets/kp.jpg";
import logoMD from "@/assets/md.jpg";

// Import TTD Digital
import signJA from "@/assets/pen_ja.jpg";
import signKP from "@/assets/pen_kp.jpg";
import signMD from "@/assets/pen_md.jpg";

const route = useRoute();
const authStore = useAuthStore();
const data = ref<any>(null);
const isLoading = ref(true);

const nomor = route.params.nomor as string;
const withImage = route.query.img === "1";
const layoutOption = route.query.layout as string;

onMounted(async () => {
  try {
    const res = await penawaranFormService.getById(nomor);
    data.value = res.data.data;

    setTimeout(() => {
      window.print();
    }, 800);
  } catch (error) {
    console.error("Gagal memuat data print", error);
  } finally {
    isLoading.value = false;
  }
});

const perushKode = computed(
  () => data.value?.pen_perush_kode?.toUpperCase() || "KP",
);

const companyLogo = computed(() => {
  if (perushKode.value === "JA") return logoJA;
  if (perushKode.value === "MD") return logoMD;
  return logoKP;
});

const digitalSignImage = computed(() => {
  if (perushKode.value === "JA") return signJA;
  if (perushKode.value === "MD") return signMD;
  return signKP;
});

const getBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  `${window.location.protocol}//${window.location.hostname}:3088`;

const getProductImageUrl = (row: any) => {
  // Ambil identifier dari format key default atau format alias database
  const identifier =
    row.NoPermintaan || row.Gambar || row.pend_minta || row.pend_gambar;

  if (!identifier) return "";

  const cabang = authStore.user?.cabang || "HO-";

  // Ubah MH/2026/2183 menjadi MH.2026.2183 agar sesuai dengan nama file fisik
  let cleanName = identifier.replace(/\//g, ".");
  const matchMH = cleanName.match(/(MH\.\d{4}\.\d+)/i);

  if (matchMH) {
    cleanName = matchMH[1];
  } else {
    cleanName = cleanName.replace(/.*imagemintaharga/i, "");
    cleanName = cleanName.replace(/.*Downloads/i, "");
    cleanName = cleanName.replace(/\\/g, "/").split("/").pop() || "";
    cleanName = cleanName.replace(/\.(jpe?g|png)$/i, "");
  }

  return `${getBaseUrl()}/images/${cabang}/mintaharga/${cleanName}.jpg`;
};

const pageBorderColor = computed(() => {
  return perushKode.value === "JA" ? "#002060" : "#eca100"; // Kuning/emas untuk MD & KP
});

const num = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);

const parsedKeterangan = computed(() => {
  if (!data.value || !data.value.pen_tambahan) return [];
  const ids = data.value.pen_tambahan.split(",");
  const result: string[] = [];

  if (ids.length > 0 && perushKode.value === "JA") result.push("Keterangan :");

  ids.forEach((id: string) => {
    switch (id.trim()) {
      case "1":
        result.push(
          `- Ukuran kaos ${data.value.pen_panjang} x ${data.value.pen_lebar} cm.`,
        );
        break;
      case "2":
        result.push(`- Sablon tidak luntur.`);
        break;
      case "3":
        result.push(`- Harga Include ongkos kirim (Free Ongkir).`);
        break;
      case "4":
        result.push(`- Bisa Packing sesuai alokasi.`);
        break;
      case "5":
        result.push(`- Selalu ada laporan setelah barang diterima.`);
        break;
      case "6":
        result.push(`- Garansi barang sesuai yang dipesan.`);
        break;
    }
  });
  return result;
});

const grandTotal = computed(() => {
  if (!data.value || !data.value.Details) return 0;
  if (data.value.pen_cetaktotal === 1) {
    return data.value.Details.reduce(
      (sum: number, r: any) => sum + Number(r.pend_qty) * Number(r.pend_harga),
      0,
    );
  } else {
    let min = Infinity;
    data.value.Details.forEach((r: any) => {
      const val = Number(r.pend_qty) * Number(r.pend_harga);
      if (val > 0 && val < min) min = val;
    });
    return min === Infinity ? 0 : min;
  }
});
</script>

<template>
  <div v-if="isLoading" class="loading-state">Memuat Dokumen...</div>

  <div v-else-if="data" class="print-wrapper">
    <div class="print-container" :style="{ borderColor: pageBorderColor }">
      <div v-if="perushKode === 'JA'" class="print-header-ja">
        <div class="header-left">
          <img :src="companyLogo" alt="Logo" class="company-logo" />
        </div>
        <div class="header-right">
          <div>
            Surakarta,
            {{
              new Date(data.pen_tanggal).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            }}
          </div>
        </div>
      </div>

      <div v-else class="print-header-mdkp">
        <div class="header-top-row">
          <img :src="companyLogo" alt="Logo" class="company-logo-mdkp" />
          <div class="our-services">
            <div class="font-weight-bold">OUR SERVICES :</div>
            <div>- GARMENT (T-SHIRT, POLO SHIRT, KEMEJA, WEARPACK, Etc).</div>
            <div>- MANUAL PRINTING (SPANDUK/UMBUL KAIN).</div>
            <div>- DIGITAL PRINTING (X BANNER, ROLL BANNER, FLEXI,</div>
            <div style="padding-left: 6px">ALBATROS, TENDA, STICKER, Etc).</div>
          </div>
        </div>

        <div class="company-info-mdkp mt-4">
          <div class="font-weight-bold text-lg mb-1">
            {{ data.Perush_nama }}
          </div>
          <div>{{ data.perush_alamatnpwp }}</div>
          <div>
            Telp {{ data.perush_telp }}
            <span v-if="data.perush_fax && data.perush_fax !== ''">
              / Fax {{ data.perush_fax }}</span
            >
          </div>
          <div v-if="data.perush_email">{{ data.perush_email }}</div>
        </div>
      </div>

      <div v-if="perushKode === 'JA'">
        <div class="print-recipient">
          <div>Kepada Yth.</div>
          <div v-if="data.pen_up" class="font-weight-bold text-uppercase">
            {{ data.pen_up }}
          </div>
          <div class="font-weight-bold text-uppercase">{{ data.cus_nama }}</div>
          <div class="pre-wrap text-uppercase">{{ data.cus_alamat }}</div>
          <div class="text-uppercase">{{ data.cus_kota }}</div>
        </div>

        <table class="meta-table">
          <tr>
            <td style="width: 80px">Nomor</td>
            <td style="width: 10px">:</td>
            <td class="font-weight-bold">{{ data.pen_nomor }}</td>
          </tr>
          <tr>
            <td>Perihal</td>
            <td>:</td>
            <td class="font-weight-bold">Surat Penawaran Harga</td>
          </tr>
          <tr v-if="data.pen_keterangan">
            <td>Keterangan</td>
            <td>:</td>
            <td>{{ data.pen_keterangan }}</td>
          </tr>
        </table>
      </div>

      <div v-else class="mdkp-meta-section mt-4 mb-3">
        <div class="recipient-box">
          <div>Kepada YTH</div>
          <div class="font-weight-bold text-uppercase">{{ data.cus_nama }}</div>
          <div class="pre-wrap text-uppercase">{{ data.cus_alamat }}</div>
          <div class="text-uppercase">{{ data.cus_kota }}</div>
          <div class="font-weight-bold mt-1 text-uppercase" v-if="data.pen_up">
            U.P. {{ data.pen_up }}
          </div>
        </div>
        <div class="meta-box">
          <table class="meta-table-mdkp">
            <tr>
              <td style="width: 60px">Tanggal</td>
              <td style="width: 10px">:</td>
              <td>
                {{
                  new Date(data.pen_tanggal).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                }}
              </td>
            </tr>
            <tr>
              <td>Perihal</td>
              <td>:</td>
              <td>Penawaran Harga</td>
            </tr>
            <tr>
              <td>No</td>
              <td>:</td>
              <td>{{ data.pen_nomor }}</td>
            </tr>
            <tr v-if="data.pen_keterangan">
              <td>Keterangan</td>
              <td>:</td>
              <td>{{ data.pen_keterangan }}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="print-opening">
        <p>Dengan Hormat,</p>

        <template v-if="perushKode === 'JA'">
          <p>
            Pertama kami mengucapkan terima kasih atas kesempatan yang diberikan
            kepada kami untuk memberikan Surat Penawaran Harga kepada perusahaan
            yang Bapak / Ibu pimpin.
          </p>
          <p>
            Kami dari <b>{{ data.Perush_nama }}</b> yang bergerak di bidang
            penyedia material promosi dalam bidang printing dan garment
            bermaksud untuk memberikan penawaran harga atas beberapa pekerjaan
            yang tersebut di bawah ini :
          </p>
        </template>

        <template v-else>
          <p>
            Bersama dengan surat ini kami perusahaan yang bergerak di garmen,
            manual printing dan digital printing akan mengajukan penawaran harga
            untuk item-item barang tersebut di bawah ini:
          </p>
        </template>
      </div>

      <table v-if="!withImage" class="detail-table">
        <thead>
          <tr>
            <th style="width: 30px">No</th>
            <th>Nama</th>
            <th style="width: 100px">Bahan</th>
            <th style="width: 110px">Ukuran</th>
            <th style="width: 50px">Satuan</th>
            <th style="width: 60px">Qty</th>
            <th style="width: 80px">Harga</th>
            <th style="width: 100px">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in data.Details" :key="row.pend_id">
            <td class="text-center">{{ Number(idx) + 1 }} .</td>
            <td>{{ row.pend_nama_barang }}</td>
            <td>{{ row.pend_bahan }}</td>
            <td>{{ row.pend_ukuran }}</td>
            <td class="text-center">{{ row.pend_satuan }}</td>
            <td class="text-right">{{ num(row.pend_qty) }}</td>
            <td class="text-right">{{ num(row.pend_harga) }}</td>
            <td class="text-right font-weight-bold">
              {{ num(row.pend_qty * row.pend_harga) }}
            </td>
          </tr>
          <tr class="total-row">
            <td colspan="7">Grand Total</td>
            <td class="text-right font-weight-bold">{{ num(grandTotal) }}</td>
          </tr>
        </tbody>
      </table>

      <table v-else class="detail-table">
        <thead>
          <tr>
            <th style="width: 30px">No</th>
            <th>Nama</th>
            <th style="width: 50px">Satuan</th>
            <th style="width: 60px">Qty</th>
            <th style="width: 80px">Harga</th>
            <th style="width: 100px">Total</th>
            <th style="width: 160px">Desain</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in data.Details" :key="row.pend_id">
            <td class="text-center valign-top">{{ Number(idx) + 1 }} .</td>
            <td class="valign-top">
              <div class="text-uppercase">{{ row.pend_nama_barang }}</div>
              <div v-if="row.pend_bahan">Bahan : {{ row.pend_bahan }}</div>
              <div v-if="row.pend_ukuran">Ukuran : {{ row.pend_ukuran }}</div>
            </td>
            <td class="text-center valign-top">{{ row.pend_satuan }}</td>
            <td class="text-right valign-top">{{ num(row.pend_qty) }}</td>
            <td class="text-right valign-top">{{ num(row.pend_harga) }}</td>
            <td class="text-right font-weight-bold valign-top">
              {{ num(row.pend_qty * row.pend_harga) }}
            </td>
            <td class="text-center pa-1">
              <img
                v-if="
                  row.NoPermintaan ||
                  row.Gambar ||
                  row.pend_mintaharga ||
                  row.pend_nopermintaan ||
                  row.pend_gambar
                "
                :src="getProductImageUrl(row)"
                class="row-image"
                :class="layoutOption === 'vert' ? 'img-vert' : 'img-horz'"
                @error="
                  (e) => {
                    const el = e.target as HTMLImageElement;
                    if (!el.src.includes('8888')) {
                      const identifier =
                        row.NoPermintaan ||
                        row.Gambar ||
                        row.pend_mintaharga ||
                        row.pend_nopermintaan ||
                        row.pend_gambar ||
                        '';
                      const match = identifier.match(/(MH\.\d{4}\.\d+)/i);
                      const name = match
                        ? match[1]
                        : identifier
                            .split('/')
                            .pop()
                            ?.replace(/\.(jpe?g|png)$/i, '') || '';
                      if (name)
                        el.src = `http://103.94.238.252:8888/file-gambar/mintaharga/${name}.jpg`;
                    }
                  }
                "
              />
            </td>
            <td class="text-center pa-1">
              <img
                v-if="
                  row.NoPermintaan ||
                  row.Gambar ||
                  row.pend_minta ||
                  row.pend_gambar
                "
                :src="getProductImageUrl(row)"
                class="row-image"
                :class="layoutOption === 'vert' ? 'img-vert' : 'img-horz'"
                @error="
                  (e) => {
                    const el = e.target as HTMLImageElement;
                    if (!el.src.includes('8888')) {
                      let identifier =
                        row.NoPermintaan ||
                        row.Gambar ||
                        row.pend_minta ||
                        row.pend_gambar ||
                        '';
                      identifier = identifier.replace(/\//g, '.');
                      const match = identifier.match(/(MH\.\d{4}\.\d+)/i);
                      const name = match
                        ? match[1]
                        : identifier
                            .split('/')
                            .pop()
                            ?.replace(/\.(jpe?g|png)$/i, '') || '';
                      if (name) {
                        el.src = `http://103.94.238.252:8888/file-gambar/mintaharga/${name}.jpg`;
                      }
                    }
                  }
                "
              />
            </td>
          </tr>
          <tr class="total-row">
            <td colspan="5">Grand Total</td>
            <td class="text-right font-weight-bold">{{ num(grandTotal) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="note-section">
          <p v-if="data.pen_status_harga === 0" class="font-italic text-sm">
            * Note : Harga belum termasuk PPN 11%
          </p>
          <p v-else class="font-italic text-sm">
            * Note : Harga sudah termasuk PPN 11%
          </p>

          <div v-if="perushKode === 'JA'" class="mt-2 text-sm">
            <p>
              Keterangan lebih lanjut bisa menghubungi marketing kami di nomor
              atau <b>{{ data.pen_marketing_telp }}</b
              >.
            </p>
            <p class="mt-3">
              Demikian Surat Penawaran ini kami sampaikan, kabar baik dari
              Bapak/Ibu sangat kami nantikan. Atas perhatian dan kerja samanya
              kami ucapkan terima kasih.
            </p>
          </div>

          <div v-else class="mt-2 text-sm">
            <p>
              Demikian penawaran ini kami ajukan, apabila ada informasi yang
              perlu diketahui mengenai penawaran ini lebih lanjut maka Bapak/Ibu
              dapat menghubungi kami. Atas perhatian dan kerja samanya kami
              ucapkan terima kasih.
            </p>
          </div>

          <div v-if="data.pen_note" class="note-box-yellow mt-2">
            <div v-if="perushKode !== 'JA'" class="font-weight-bold mb-1">
              Note :
            </div>
            {{ data.pen_note }}
          </div>

          <div
            v-if="data.pen_mx === 'Y'"
            class="note-box-yellow mt-2 font-weight-bold"
          >
            *Harga include finishing jahit.*
          </div>

          <div v-if="parsedKeterangan.length > 0" class="mt-3 text-sm">
            <div v-for="(ket, idx) in parsedKeterangan" :key="idx">
              {{ ket }}
            </div>
          </div>

          <div v-if="perushKode !== 'JA'" class="mt-4 text-sm">
            <table class="payment-table">
              <tr v-if="data.pen_dpper > 0">
                <td style="width: 70px">DP</td>
                <td>: {{ data.pen_dpper }}%</td>
              </tr>
              <tr v-if="data.pen_rekening">
                <td>Rekening</td>
                <td>: {{ data.pen_rekening }}</td>
              </tr>
              <tr v-if="data.perushd_bank">
                <td>Bank</td>
                <td>: {{ data.perushd_bank }}</td>
              </tr>
              <tr v-if="data.perushd_atasnama">
                <td>A.n / Cbg</td>
                <td>
                  : {{ data.perushd_atasnama }} / {{ data.perushd_cabang }}
                </td>
              </tr>
            </table>
            <div v-if="data.pen_rekening" class="mt-1 font-italic">
              Bukti Pembayaran mohon di email ke {{ data.perush_email }}
            </div>
          </div>
        </div>

        <div class="signature-section">
          <div class="text-center mb-10">Hormat Kami,</div>
          <div v-if="data.pen_digitalsign === 'Y'" class="digital-stamp">
            <img :src="digitalSignImage" class="sign-image" />
          </div>
          <div class="text-center font-weight-bold text-decoration-underline">
            {{ data.pen_ttd }}
          </div>
          <div class="text-center">{{ data.pen_ttd_jabatan }}</div>
        </div>
      </div>
    </div>
    <div v-if="perushKode === 'JA'" class="page-footer-ja">
      <div class="footer-line"></div>
      <div class="font-weight-bold" style="font-size: 13px">
        {{ data.Perush_nama }}
      </div>
      <div class="font-italic">{{ data.perush_alamatnpwp }}</div>
      <div class="font-italic">
        Telp {{ data.perush_telp }}
        <span v-if="data.perush_fax"> / Fax {{ data.perush_fax }}</span>
      </div>
      <div class="font-italic">
        {{ data.perush_web || "www.jayaabadimulia.com" }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* WAJIB UNTUK BACKGROUND KUNING SAAT CETAK */
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

@media print {
  @page {
    size: A4;
    margin: 10mm;
  }
  body {
    background: white;
  }
  .print-wrapper {
    min-height: 270mm;
  }
  .page-footer-ja {
    position: fixed;
    bottom: 10mm;
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: Arial, sans-serif;
  font-size: 16px;
  color: #555;
}

.print-wrapper {
  position: relative;
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  padding-bottom: 30mm;
}

.print-container {
  border: 2px solid; /* Warna dari :style computed */
  padding: 20px 25px;
  background: white;
  font-family: "Arial", "Helvetica", sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: #000;
  min-height: 240mm;
}

/* Header JA */
.print-header-ja {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.company-logo {
  max-height: 65px;
  width: auto;
  object-fit: contain;
}
.header-right {
  text-align: right;
  font-size: 11px;
  font-weight: 600;
  margin-top: 10px;
}

/* Header MD & KP */
.header-top-row {
  display: flex;
  gap: 30px; /* Memberi jarak antara logo dan Our Services */
  align-items: flex-start; /* Sejajarkan ke atas */
}
.company-logo-mdkp {
  max-height: 85px; /* <-- UKURAN LOGO DIPERBESAR */
  width: auto;
  object-fit: contain;
}
.our-services {
  font-size: 11px; /* Sedikit diperbesar agar pas dengan logo */
  line-height: 1.3;
  padding-top: 5px;
}
.company-info-mdkp {
  font-size: 12px; /* Ukuran font alamat diperbesar sedikit */
  line-height: 1.4;
}
.text-lg {
  font-size: 18px; /* Ukuran Nama Perusahaan dibesarkan sesuai gambar */
  letter-spacing: 0.5px;
}

/* Tujuan MD & KP (Dalam Kotak) */
.mdkp-meta-section {
  display: flex;
  gap: 15px;
}
.recipient-box {
  flex: 1;
  border: 1px solid #000;
  padding: 8px 10px;
  line-height: 1.3;
}
.meta-box {
  width: 240px;
}
.meta-table-mdkp td {
  padding: 1px 0;
  vertical-align: top;
}

.print-recipient {
  margin-bottom: 15px;
  line-height: 1.3;
}
.pre-wrap {
  white-space: pre-wrap;
}
.text-uppercase {
  text-transform: uppercase;
}

.meta-table {
  margin-bottom: 15px;
}
.meta-table td {
  padding: 1px 0;
  vertical-align: top;
}

.print-opening p {
  margin-bottom: 6px;
  text-align: justify;
}

/* Tabel Detail */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
  font-size: 11px;
}
.detail-table th,
.detail-table td {
  border: 1px solid #000;
  padding: 4px 6px;
}
.detail-table th {
  font-weight: bold;
  text-align: center;
}
.valign-top {
  vertical-align: top !important;
}

/* Gambar Detail */
.row-image {
  object-fit: contain;
  display: block;
  margin: 0 auto;
}
.row-image.img-vert {
  max-height: 140px;
  width: 100%;
}
.row-image.img-horz {
  max-height: 70px;
  width: 100%;
}

.total-row td {
  font-size: 11px;
}

/* Footer */
.print-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  page-break-inside: avoid;
}
.note-section {
  flex: 1;
  padding-right: 30px;
}
.note-section p {
  margin-bottom: 3px;
}

/* BACKGROUND KUNING FIXED */
.note-box-yellow {
  background-color: yellow !important;
  padding: 6px 10px;
  display: inline-block;
  line-height: 1.3;
  max-width: 100%;
}

.payment-table {
  border-collapse: collapse;
}
.payment-table td {
  padding: 1px 4px 1px 0;
  vertical-align: top;
}

.signature-section {
  width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.digital-stamp {
  height: 80px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}
.sign-image {
  max-width: 160px;
  max-height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

/* Page Footer JA */
.page-footer-ja {
  position: absolute;
  bottom: 0;
  left: 15px;
  right: 15px;
  font-size: 11px;
  line-height: 1.2;
  color: #000;
}
.footer-line {
  border-top: 1.5px solid #000;
  margin-bottom: 4px;
  width: 100%;
}

/* Utils */
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.font-weight-bold {
  font-weight: bold;
}
.font-italic {
  font-style: italic;
}
.text-decoration-underline {
  text-decoration: underline;
}
.pa-1 {
  padding: 4px;
}
.mt-1 {
  margin-top: 4px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.mt-4 {
  margin-top: 16px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-3 {
  margin-bottom: 12px;
}
.mb-10 {
  margin-bottom: 40px;
}
.d-inline-block {
  display: inline-block;
}
.text-sm {
  font-size: 11px;
}
</style>
