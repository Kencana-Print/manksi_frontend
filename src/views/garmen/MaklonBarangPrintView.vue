<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { maklonBarangService } from "@/services/garmen/maklonBarangService";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const data = ref<any>(null);

const nomor = String(route.params.nomor);

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
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
};
const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const notifyParentReady = () => {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: "maklon-print-ready",
        height: document.documentElement.scrollHeight,
      },
      "*",
    );
  }
};

const waitForImages = () => {
  const imgs = Array.from(document.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }),
  );
};

onMounted(async () => {
  try {
    const res = await maklonBarangService.getPrintData(nomor);
    data.value = res.data.data;
    isLoaded.value = true;

    let el = document.getElementById("dynamic-page-style") as HTMLStyleElement;
    if (!el) {
      el = document.createElement("style");
      el.id = "dynamic-page-style";
      document.head.appendChild(el);
    }
    el.innerHTML = "@page { size: A4 landscape; margin: 8mm 10mm; }";

    await nextTick();
    await waitForImages();
    notifyParentReady();
    setTimeout(() => window.print(), 300);
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state">
    Data Maklon Barang tidak ditemukan.
  </div>
  <div v-else-if="!isLoaded" class="loading-state">
    Mempersiapkan Dokumen Cetak...
  </div>

  <div v-else class="print-container-so">
    <div class="print-wrapper-so">
      <div
        v-for="copy in 2"
        :key="'mkl-' + copy"
        class="print-half-so"
        :class="{ 'border-right-so': copy === 1 }"
      >
        <h1 class="title-so">MAKLON BARANG</h1>

        <table class="info-table-so">
          <tbody>
            <tr>
              <td class="w-label-so">No. Maklon</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.header.mkl_nomor }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Tanggal</td>
              <td class="w-colon-so">:</td>
              <td>{{ tglIndo(data.header.mkl_tanggal) }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Dikerjakan di</td>
              <td class="w-colon-so">:</td>
              <td>
                {{ data.header.mkl_cab_tujuan }} —
                {{ data.header.NamaCabTujuan }}
              </td>
            </tr>
            <tr>
              <td class="w-label-so">Kembali ke</td>
              <td class="w-colon-so">:</td>
              <td>
                {{ data.header.mkl_cab_asal }} — {{ data.header.NamaCabAsal }}
              </td>
            </tr>
            <tr>
              <td class="w-label-so align-top-so">Keterangan</td>
              <td class="w-colon-so align-top-so">:</td>
              <td>
                <pre class="val-pre-so">{{
                  data.header.mkl_keterangan || "-"
                }}</pre>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="spk-list-so">
          <h2 class="spk-list-title-so">
            DETAIL BAHAN &amp; TARGET BARANG JADI :
          </h2>

          <div v-for="(d, di) in data.details" :key="di" class="polos-block-so">
            <div class="polos-title-so">
              {{ d.mkld_kode_polos }} — {{ d.NamaPolos }}
              <span class="polos-qty-so"
                >({{ num(d.mkld_qty_kirim) }} {{ d.mkld_satuan_kirim }})</span
              >
            </div>

            <div
              v-for="(t, ti) in d.target_jadi"
              :key="ti"
              class="target-line-so"
            >
              <img
                v-if="t.gambar && t.gambar[0]"
                :src="t.gambar[0].mklg_file_path"
                class="target-thumb-so"
              />
              <div v-else class="target-thumb-empty-so"></div>
              <div class="target-info-so">
                <div class="target-kode-so">
                  {{ t.mkldj_kode_jadi }} — {{ t.NamaJadi }}
                </div>
                <div class="target-meta-so">
                  Est. {{ num(t.mkldj_estimasi_qty) }} pcs &nbsp;·&nbsp;
                  Dateline: {{ tglIndo(t.mkldj_dateline) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bottom-ttd-wrapper-so">
          <table class="ttd-table-simple-so">
            <tr>
              <td width="50%">Dibuat Oleh,</td>
              <td width="50%">Diterima Oleh,</td>
            </tr>
            <tr>
              <td class="sign-space-simple-so"></td>
              <td class="sign-space-simple-so"></td>
            </tr>
            <tr>
              <td class="sign-name-static-so">
                {{ data.header.mkl_user_create }}
              </td>
              <td class="sign-name-static-so">&#160;</td>
            </tr>
          </table>
        </div>

        <div class="footer-note-so">
          Dokumen ini adalah referensi produksi — bukan bukti serah terima
          barang.
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
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: #555;
}

.print-container-so {
  width: 100%;
  margin: 0 auto;
  background: #fff;
  font-family: "Arial", sans-serif;
  font-size: 9pt;
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
  border: 1px solid #6a1b9a;
}
.print-half-so {
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  padding: 8mm 10mm;
  box-sizing: border-box;
  min-width: 0;
  height: 209mm;
  overflow: hidden;
}
.border-right-so {
  border-right: 1px dotted #999;
}

.title-so {
  font-size: 15pt;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 10px 0;
}

.info-table-so {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}
.info-table-so td {
  padding: 1.5px 0;
  vertical-align: top;
  font-size: 9pt;
}
.w-label-so {
  width: 95px;
}
.w-colon-so {
  width: 12px;
  text-align: center;
}
.align-top-so {
  vertical-align: top;
}
.val-pre-so {
  font-family: inherit;
  font-size: 9pt;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.3;
}

.spk-list-so {
  margin-top: 12px;
  flex: 1;
  overflow: hidden;
}
.spk-list-title-so {
  font-size: 10pt;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 6px 0;
}

.polos-block-so {
  margin-bottom: 8px;
}
.polos-title-so {
  font-size: 9pt;
  font-weight: bold;
  background: #f3e5f5;
  padding: 2px 6px;
  margin-bottom: 3px;
}
.polos-qty-so {
  font-weight: normal;
  color: #6a1b9a;
}

.target-line-so {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0 2px 8px;
}
.target-thumb-so {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border: 1px solid #ccc;
  border-radius: 2px;
  flex-shrink: 0;
}
.target-thumb-empty-so {
  width: 28px;
  height: 28px;
  border: 1px dashed #ccc;
  border-radius: 2px;
  flex-shrink: 0;
}
.target-info-so {
  flex: 1;
  min-width: 0;
}
.target-kode-so {
  font-size: 8.5pt;
  font-weight: 600;
}
.target-meta-so {
  font-size: 8pt;
  color: #555;
}

.bottom-ttd-wrapper-so {
  margin-top: auto;
  padding-top: 12px;
}
.ttd-table-simple-so {
  width: 220px;
  border-collapse: collapse;
  text-align: center;
  font-size: 8.5pt;
  border: 1px solid #000;
  color: #000;
}
.ttd-table-simple-so td {
  border: 1px solid #000;
  padding: 4px;
  font-weight: bold;
  color: #000 !important;
}
.sign-space-simple-so {
  height: 45px;
}
.sign-name-static-so {
  font-size: 8pt;
}

.footer-note-so {
  font-size: 7pt;
  color: #6a1b9a;
  margin-top: 6px;
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
@media print {
  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }
}
</style>
