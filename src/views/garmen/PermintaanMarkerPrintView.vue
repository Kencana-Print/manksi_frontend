<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import {
  permintaanMarkerFormService,
  type PermintaanMarkerLoaded,
  type MarkerDetailLoaded,
} from "@/services/garmen/permintaanMarkerFormService";

interface KelompokSpk {
  spkNomor: string;
  spkNama: string;
  subtotal: number;
  rows: MarkerDetailLoaded[];
}

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const data = ref<PermintaanMarkerLoaded | null>(null);

const nomor = String(route.params.nomor);

const tglIndo = (val: string | null | undefined) => {
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
const num = (val: number | string | null | undefined) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const kelompok = computed<KelompokSpk[]>(() => {
  const peta = new Map<string, KelompokSpk>();
  for (const r of data.value?.detail ?? []) {
    const g = peta.get(r.spkNomor) ?? {
      spkNomor: r.spkNomor,
      spkNama: r.spkNama ?? "",
      subtotal: 0,
      rows: [],
    };
    g.rows.push(r);
    g.subtotal += Number(r.jml);
    peta.set(r.spkNomor, g);
  }
  return [...peta.values()];
});

const totalMarker = computed(() =>
  kelompok.value.reduce((s, g) => s + g.subtotal, 0),
);

onMounted(async () => {
  try {
    const res = await permintaanMarkerFormService.getDetail(nomor);
    data.value = res.data.data as PermintaanMarkerLoaded;
    isLoaded.value = true;

    let el = document.getElementById("dynamic-page-style") as HTMLStyleElement;
    if (!el) {
      el = document.createElement("style");
      el.id = "dynamic-page-style";
      document.head.appendChild(el);
    }
    el.innerHTML = "@page { size: A4 landscape; margin: 8mm 10mm; }";

    await nextTick();
    setTimeout(() => window.print(), 300);
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state">
    Data Permintaan Marker tidak ditemukan.
  </div>
  <div v-else-if="!isLoaded || !data" class="loading-state">
    Mempersiapkan Dokumen Cetak...
  </div>

  <div v-else class="print-container-so">
    <div class="print-wrapper-so">
      <div
        v-for="copy in 2"
        :key="'pmk-' + copy"
        class="print-half-so"
        :class="{ 'border-right-so': copy === 1 }"
      >
        <h1 class="title-so">PERMINTAAN MARKER</h1>

        <table class="info-table-so">
          <tbody>
            <tr>
              <td class="w-label-so">No. Permintaan</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.nomor }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Tanggal</td>
              <td class="w-colon-so">:</td>
              <td>{{ tglIndo(data.tanggal) }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Deadline</td>
              <td class="w-colon-so">:</td>
              <td class="val-deadline-so">{{ tglIndo(data.deadline) }}</td>
            </tr>
            <tr v-if="data.asalNomor">
              <td class="w-label-so">Revisi dari</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.asalNomor }}</td>
            </tr>
            <tr v-if="data.statusManual">
              <td class="w-label-so">Status</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.statusManual }} — {{ data.statusKeterangan }}</td>
            </tr>
            <tr>
              <td class="w-label-so align-top-so">Keterangan</td>
              <td class="w-colon-so align-top-so">:</td>
              <td>
                <pre class="val-pre-so">{{ data.keterangan || "-" }}</pre>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="spk-list-so">
          <h2 class="spk-list-title-so">
            DETAIL SPK &amp; BAHAN
            <span v-if="totalMarker > 0" class="total-so"
              >(Total {{ num(totalMarker) }} marker)</span
            >
            :
          </h2>

          <div v-for="g in kelompok" :key="g.spkNomor" class="spk-block-so">
            <div class="spk-title-so">
              {{ g.spkNomor }}<span v-if="g.spkNama"> — {{ g.spkNama }}</span>
              <span v-if="g.subtotal > 0" class="spk-qty-so"
                >({{ num(g.subtotal) }} marker)</span
              >
            </div>

            <div v-for="d in g.rows" :key="d.id" class="bahan-line-so">
              <div class="bahan-kode-so">{{ d.kode }} — {{ d.namaBahan }}</div>
              <div class="bahan-meta-so">
                Setting: {{ d.setting }}
                <span v-if="Number(d.jml) > 0">
                  &nbsp;·&nbsp; Jml Marker: <b>{{ num(d.jml) }}</b></span
                >
                <span v-if="d.satuan">
                  &nbsp;·&nbsp; Satuan: {{ d.satuan }}</span
                >
              </div>
              <div v-if="d.alasan" class="bahan-alasan-so">
                Di luar MKB: {{ d.alasan }}
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
              <td class="sign-name-static-so">{{ data.userCreate }}</td>
              <td class="sign-name-static-so">&#160;</td>
            </tr>
          </table>
        </div>

        <div class="footer-note-so">
          Dokumen ini adalah permintaan kerja marker. Hasil pengerjaan dicatat
          di LHK Marker.
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
  margin: 0 auto;
  box-sizing: border-box;
  border: 1px solid #1565c0;
}
/* min-height (bukan height + overflow hidden): permintaan dengan banyak SPK
   tidak boleh terpotong diam-diam, lebih baik lanjut ke halaman berikutnya */
.print-half-so {
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  padding: 8mm 10mm;
  box-sizing: border-box;
  min-width: 0;
  min-height: 188mm;
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
.val-deadline-so {
  font-weight: bold;
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
}
.spk-list-title-so {
  font-size: 10pt;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 6px 0;
}
.total-so {
  font-weight: normal;
  text-decoration: none;
  display: inline-block;
}

.spk-block-so {
  margin-bottom: 8px;
  break-inside: avoid;
}
.spk-title-so {
  font-size: 9pt;
  font-weight: bold;
  background: #e3f2fd;
  padding: 2px 6px;
  margin-bottom: 3px;
}
.spk-qty-so {
  font-weight: normal;
  color: #1565c0;
  margin-left: 4px;
}

.bahan-line-so {
  padding: 2px 0 3px 8px;
  break-inside: avoid;
}
.bahan-kode-so {
  font-size: 8.5pt;
  font-weight: 600;
}
.bahan-meta-so {
  font-size: 8pt;
  color: #555;
}
.bahan-alasan-so {
  font-size: 7.5pt;
  color: #c62828;
  font-style: italic;
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
  color: #1565c0;
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
  .print-wrapper-so {
    width: 277mm;
  }
}
</style>
