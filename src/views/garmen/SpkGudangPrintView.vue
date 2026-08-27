<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { spkGudangFormService } from "@/services/garmen/spkGudangFormService";

const route = useRoute();
const isLoaded = ref(false);
const isError = ref(false);
const data = ref<any>({});

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

// "NO. SPK :" list — 1 baris per SPK item, format "nomor= nama warna"
const spkLines = (val: string) => (val || "").split("\n").filter(Boolean);

const notifyParentReady = () => {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: "spk-gudang-print-ready",
        height: document.documentElement.scrollHeight,
      },
      "*",
    );
  }
};

onMounted(async () => {
  try {
    const res = await spkGudangFormService.getDataCetak(nomor);
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
    notifyParentReady();
    setTimeout(() => window.print(), 400);
  } catch {
    isError.value = true;
  }
});
</script>

<template>
  <div v-if="isError" class="loading-state">
    Data SPK Gudang tidak ditemukan.
  </div>
  <div v-else-if="!isLoaded" class="loading-state">
    Mempersiapkan Dokumen Cetak...
  </div>

  <div v-else class="print-container-so">
    <div class="print-wrapper-so">
      <div
        v-for="copy in 2"
        :key="'skg-' + copy"
        class="print-half-so"
        :class="{ 'border-right-so': copy === 1 }"
      >
        <h1 class="title-so">SPK GUDANG</h1>

        <table class="info-table-so">
          <tbody>
            <tr>
              <td class="w-label-so">No.Transaksi</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.spg_nomor }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Tanggal SPK</td>
              <td class="w-colon-so">:</td>
              <td>{{ tglIndo(data.spg_tanggal) }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Jenis Order</td>
              <td class="w-colon-so">:</td>
              <td></td>
            </tr>
            <tr>
              <td class="w-label-so">Nama Desain</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.nama }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Jumlah</td>
              <td class="w-colon-so">:</td>
              <td></td>
            </tr>
            <tr>
              <td class="w-label-so">Ukuran</td>
              <td class="w-colon-so">:</td>
              <td></td>
            </tr>
            <tr>
              <td class="w-label-so">Kain</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.spg_kaink }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Gramasi</td>
              <td class="w-colon-so">:</td>
              <td></td>
            </tr>
            <tr>
              <td class="w-label-so">Finishing</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.spg_finishing }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Date Line</td>
              <td class="w-colon-so">:</td>
              <td>{{ tglIndo(data.spg_dateline) }}</td>
            </tr>
            <tr>
              <td class="w-label-so">Workshop</td>
              <td class="w-colon-so">:</td>
              <td>{{ data.spg_workshop }} {{ data.pab_nama }}</td>
            </tr>
            <tr>
              <td class="w-label-so align-top-so">Keterangan</td>
              <td class="w-colon-so align-top-so">:</td>
              <td>
                <pre class="val-pre-so">{{ data.spg_ket }}</pre>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="spk-list-so">
          <h2 class="spk-list-title-so">NO. SPK :</h2>
          <div
            v-for="(line, i) in spkLines(data.warna)"
            :key="i"
            class="spk-line-so"
          >
            {{ line }}
          </div>
        </div>

        <div class="bottom-ttd-wrapper-so">
          <table class="ttd-table-simple-so">
            <tr>
              <td width="50%">Dibuat Oleh,</td>
              <td width="50%">Mengetahui,</td>
            </tr>
            <tr>
              <td class="sign-space-simple-so"></td>
              <td class="sign-space-simple-so"></td>
            </tr>
            <tr>
              <td class="sign-name-static-so">
                {{ data.user_create }}<br />Admin
              </td>
              <td class="sign-name-static-so">Manager</td>
            </tr>
          </table>
        </div>

        <div class="footer-note-so">Created: {{ data.created }}</div>
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
  border: 1px solid #c9a227;
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
  margin-top: 24px;
}
.spk-list-title-so {
  font-size: 10pt;
  font-weight: bold;
  text-decoration: underline;
  margin: 0 0 6px 0;
}
.spk-line-so {
  font-size: 9pt;
  line-height: 1.5;
}

.bottom-ttd-wrapper-so {
  margin-top: auto;
  padding-top: 24px;
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
  height: 55px;
}
.sign-name-static-so {
  font-size: 8pt;
}

.footer-note-so {
  font-size: 7pt;
  color: #444;
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
